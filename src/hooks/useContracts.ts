import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { formatDateForSupabase, type AutomaticExtensionPreview } from '@/lib/contractExtensionRegularization';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractExtension = Database['public']['Tables']['contract_extensions']['Row'];
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
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
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
      document_type,
      company_id,
      is_active,
      status,
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
      if (!currentCompanyId) return [];

      // Keep the list query lean; contract details still fetch the complete record on demand.
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          company_id,
          employee_id,
          contract_number,
          contract_type,
          start_date,
          end_date,
          salary,
          salary_type,
          special_clauses,
          work_labor_description,
          is_terminated,
          is_approved,
          created_at,
          updated_at,
          contract_extensions(id, extension_number, start_date, end_date, extension_type, reason),
          employees:employees_v2!contracts_employee_id_fkey(
            id, 
            first_name, 
            middle_name,
            last_name, 
            second_last_name,
            document_number,
            document_type,
            company_id,
            is_active,
            status,
            employee_work_info(
              id,
              position_name,
              operation_center_id,
              is_current,
              operation_centers(id, name)
            )
          )
        `)
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching contracts:', error);
        throw error;
      }

      if (!data) return [];

      // Post-process to structure the data as expected by the UI
      return data.map((contract) => {
        const employee = contract.employees;
        const currentWorkInfo = employee?.employee_work_info?.find((w) => w.is_current);
        
        return {
          ...contract,
          employees: employee ? {
            id: employee.id,
            first_name: employee.first_name,
            middle_name: employee.middle_name,
            last_name: employee.last_name,
            second_last_name: employee.second_last_name,
            document_number: employee.document_number,
            document_type: employee.document_type,
            company_id: employee.company_id,
            is_active: employee.is_active,
            status: employee.status,
            position_name: currentWorkInfo?.position_name || null,
            operation_center_id: currentWorkInfo?.operation_center_id || null,
            operation_centers: currentWorkInfo?.operation_centers || null
          } : null
        };
      }).filter(c => c.employees !== null);
    },
    enabled: !!currentCompanyId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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
          document_number: employee.document_number,
          document_type: employee.document_type,
          is_active: employee.is_active,
          status: employee.status,
          operation_centers: employee.employee_work_info?.[0]?.operation_centers || null,
          employee_work_info: employee.employee_work_info || []
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
    mutationFn: async (contract: Omit<ContractInsert, 'created_by' | 'company_id'>) => {
      // Check if employee already has an active contract
      const { data: existingContracts, error: checkError } = await supabase
        .from('contracts')
        .select('id, contract_number, contract_type, is_terminated')
        .eq('employee_id', contract.employee_id)
        .or('is_terminated.is.null,is_terminated.eq.false');

      if (checkError) throw checkError;

      if (existingContracts && existingContracts.length > 0) {
        const existing = existingContracts[0];
        throw new Error(
          `Este empleado ya tiene un contrato activo (${existing.contract_number || existing.contract_type}). Debe terminar el contrato existente antes de crear uno nuevo.`
        );
      }

      // Generate automatic contract number using the database function
      let contractNumber: string | null = null;
      if (currentCompanyId) {
        const { data: numberResult, error: numberError } = await supabase
          .rpc('get_next_contract_number', {
            _company_id: currentCompanyId,
            _prefix: null // Let the DB function decide based on company config
          });
        
        if (!numberError && numberResult) {
          contractNumber = numberResult;
        }
      }

      // Validate contract number was generated
      if (!contractNumber) {
        throw new Error('No se pudo generar el consecutivo del contrato. Verifique que la empresa esté configurada correctamente e intente de nuevo.');
      }

      const { data, error } = await supabase
        .from('contracts')
        .insert({ 
          ...contract, 
          created_by: user?.id,
          contract_number: contractNumber,
          company_id: currentCompanyId!,
        })
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
          `Contrato ${data.contract_number || data.contract_type} - ${employeeName}`,
          undefined,
          { contract_number: data.contract_number, contract_type: data.contract_type, start_date: data.start_date, salary: data.salary }
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
    mutationFn: async (extension: Omit<ContractExtensionInsert, 'created_by' | 'company_id'>) => {
      // Get contract info for logging
      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', extension.contract_id)
        .single();

      const { data, error } = await supabase
        .from('contract_extensions')
        .insert({ ...extension, created_by: user?.id, company_id: currentCompanyId! })
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

export function useUpdateContractExtension() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractExtension> & { id: string }) => {
      const { data: oldData, error: oldError } = await supabase
        .from('contract_extensions')
        .select('*, contracts(employee_id)')
        .eq('id', id)
        .single();

      if (oldError) throw oldError;

      const { data, error } = await supabase
        .from('contract_extensions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const contract = Array.isArray((oldData as any).contracts)
        ? (oldData as any).contracts[0]
        : (oldData as any).contracts;
      const employee = contract?.employee_id ? await getEmployeeV2Info(contract.employee_id) : null;

      if (user) {
        const employeeName = employee
          ? `${employee.first_name} ${employee.last_name}`
          : 'Empleado';

        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'update_contract_extension',
          'contract_extension',
          data.id,
          `Prórroga #${oldData.extension_number} - ${employeeName}`,
          {
            extension_number: oldData.extension_number,
            start_date: oldData.start_date,
            end_date: oldData.end_date,
            extension_type: oldData.extension_type,
            reason: oldData.reason,
          },
          {
            extension_number: data.extension_number,
            start_date: data.start_date,
            end_date: data.end_date,
            extension_type: data.extension_type,
            reason: data.reason,
          }
        );
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', data.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    },
  });
}

export function useRegularizeAutomaticContractExtensions() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      contractId,
      extensions,
    }: {
      contractId: string;
      extensions: AutomaticExtensionPreview[];
    }) => {
      if (!currentCompanyId) {
        throw new Error('No hay empresa activa para registrar la regularizacion.');
      }

      if (extensions.length === 0) {
        throw new Error('No hay prorrogas automaticas pendientes por regularizar.');
      }

      const { data: contract } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      const rows: ContractExtensionInsert[] = extensions.map((extension) => ({
        contract_id: contractId,
        extension_number: extension.extensionNumber,
        start_date: formatDateForSupabase(extension.startDate),
        end_date: formatDateForSupabase(extension.endDate),
        reason: extension.reason,
        extension_type: 'automatica',
        created_by: user?.id,
        company_id: currentCompanyId,
      }));

      const { data, error } = await supabase
        .from('contract_extensions')
        .insert(rows)
        .select();

      if (error) throw error;

      const employee = contract ? await getEmployeeV2Info(contract.employee_id) : null;

      if (user && contract) {
        const employeeName = employee
          ? `${employee.first_name} ${employee.last_name}`
          : 'Empleado';

        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'regularize_contract_extensions',
          'contract',
          contractId,
          `Regularizacion de prorrogas automaticas - ${employeeName}`,
          undefined,
          {
            generated_extensions: rows.map((row) => ({
              extension_number: row.extension_number,
              start_date: row.start_date,
              end_date: row.end_date,
              extension_type: row.extension_type,
              reason: row.reason,
            })),
            generated_count: rows.length,
          }
        );
      }

      return data || [];
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.contractId] });
    },
  });
}

export function useBulkRegularizeAutomaticContractExtensions() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (
      items: Array<{
        contractId: string;
        employeeName: string;
        extensions: AutomaticExtensionPreview[];
      }>
    ) => {
      if (!currentCompanyId) {
        throw new Error('No hay empresa activa para registrar la regularizacion.');
      }

      const rows: ContractExtensionInsert[] = items.flatMap((item) =>
        item.extensions.map((extension) => ({
          contract_id: item.contractId,
          extension_number: extension.extensionNumber,
          start_date: formatDateForSupabase(extension.startDate),
          end_date: formatDateForSupabase(extension.endDate),
          reason: extension.reason,
          extension_type: 'automatica',
          created_by: user?.id,
          company_id: currentCompanyId,
        }))
      );

      if (rows.length === 0) {
        throw new Error('No hay prorrogas automaticas pendientes por regularizar.');
      }

      const { data, error } = await supabase
        .from('contract_extensions')
        .insert(rows)
        .select();

      if (error) throw error;

      if (user) {
        await Promise.all(
          items.map((item) =>
            logAuditEvent(
              user.id,
              user.email,
              currentCompanyId,
              'bulk_regularize_contract_extensions',
              'contract',
              item.contractId,
              `Regularizacion masiva de prorrogas automaticas - ${item.employeeName}`,
              undefined,
              {
                generated_extensions: item.extensions.map((extension) => ({
                  extension_number: extension.extensionNumber,
                  start_date: formatDateForSupabase(extension.startDate),
                  end_date: formatDateForSupabase(extension.endDate),
                  extension_type: 'automatica',
                  reason: extension.reason,
                })),
                generated_count: item.extensions.length,
              }
            )
          )
        );
      }

      return data || [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
    },
  });
}

export function useApproveContract() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          is_approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', contractId)
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
          'approve_contract',
          'contract',
          data.id,
          `Contrato aprobado - ${employeeName}`,
          { is_approved: false },
          { is_approved: true, approved_by: user.id, approved_at: data.approved_at }
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
