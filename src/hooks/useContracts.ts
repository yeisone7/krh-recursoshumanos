import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractExtensionInsert = Database['public']['Tables']['contract_extensions']['Insert'];

// Helper function to log audit events
async function logAuditEvent(
  userId: string,
  userEmail: string | undefined,
  companyId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      company_id: companyId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: oldValues,
      new_values: newValues,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Helper to get employee full name from employees_v2
async function getEmployeeV2Info(employeeId: string) {
  const { data } = await supabase
    .from('employees_v2')
    .select(`
      id, 
      first_name, 
      middle_name,
      last_name, 
      second_last_name,
      document_number,
      company_id,
      employee_work_info!inner(
        id,
        position_name,
        operation_center_id,
        operation_centers(id, name)
      )
    `)
    .eq('id', employeeId)
    .eq('employee_work_info.is_current', true)
    .maybeSingle();
  
  return data;
}

export function useContracts() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['contracts', currentCompanyId],
    queryFn: async () => {
      // Get contracts
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_extensions(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!contracts) return [];

      // Get unique employee IDs
      const employeeIds = [...new Set(contracts.map(c => c.employee_id))];
      
      // Fetch employees from employees_v2 with work info
      const { data: employees } = await supabase
        .from('employees_v2')
        .select(`
          id, 
          first_name, 
          middle_name,
          last_name, 
          second_last_name,
          document_number,
          company_id,
          employee_work_info(
            id,
            position_name,
            operation_center_id,
            is_current,
            operation_centers(id, name)
          )
        `)
        .in('id', employeeIds)
        .eq('company_id', currentCompanyId!);

      // Create a map for quick lookup
      const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);

      // Combine contracts with employee data
      return contracts
        .map(contract => {
          const employee = employeeMap.get(contract.employee_id);
          if (!employee) return null; // Filter out contracts without matching employee in company
          
          const currentWorkInfo = employee.employee_work_info?.find((w: any) => w.is_current);
          
          return {
            ...contract,
            employees: {
              id: employee.id,
              first_name: employee.first_name,
              middle_name: employee.middle_name,
              last_name: employee.last_name,
              second_last_name: employee.second_last_name,
              document_number: employee.document_number,
              company_id: employee.company_id,
              operation_centers: currentWorkInfo?.operation_centers || null
            }
          };
        })
        .filter(Boolean);
    },
    enabled: !!currentCompanyId,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_extensions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch employee info from employees_v2
      const employee = await getEmployeeV2Info(contract.employee_id);

      return {
        ...contract,
        employees: employee ? {
          id: employee.id,
          first_name: employee.first_name,
          middle_name: employee.middle_name,
          last_name: employee.last_name,
          second_last_name: employee.second_last_name,
          document_number: employee.document_number
        } : null
      };
    },
    enabled: !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (contract: Omit<ContractInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert({ ...contract, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Get employee info for audit log
      const employee = await getEmployeeV2Info(data.employee_id);

      // Log audit event
      if (user) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
          : 'Empleado';
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'create',
          'contract',
          data.id,
          `Contrato ${data.contract_type} - ${employeeName}`,
          undefined,
          { contract_type: data.contract_type, start_date: data.start_date, salary: data.salary }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contract> & { id: string }) => {
      // Get old values first
      const { data: oldData } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Get employee info for audit log
      const employee = oldData ? await getEmployeeV2Info(oldData.employee_id) : null;

      // Log audit event
      if (user && oldData) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
          : 'Empleado';
        
        // Check if this is a termination
        const action = updates.is_terminated ? 'terminate_contract' : 'update';
        
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          action,
          'contract',
          data.id,
          `Contrato - ${employeeName}`,
          oldData,
          updates
        );
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', data.id] });
    },
  });
}

export function useCreateContractExtension() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (extension: Omit<ContractExtensionInsert, 'created_by'>) => {
      // Get contract info for logging
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', extension.contract_id)
        .single();

      const { data, error } = await supabase
        .from('contract_extensions')
        .insert({ ...extension, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Get employee info for audit log
      const employee = contract ? await getEmployeeV2Info(contract.employee_id) : null;

      // Log audit event
      if (user && contract) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
          : 'Empleado';
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'extend_contract',
          'contract',
          extension.contract_id,
          `Prórroga #${extension.extension_number} - ${employeeName}`,
          undefined,
          { extension_number: extension.extension_number, start_date: extension.start_date, end_date: extension.end_date }
        );
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', data.contract_id] });
    },
  });
}
