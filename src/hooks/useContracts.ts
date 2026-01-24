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

export function useContracts() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['contracts', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employees!inner(
            id, first_name, last_name, document_number, company_id,
            operation_centers(id, name)
          ),
          contract_extensions(*)
        `)
        .eq('employees.company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          employees(id, first_name, last_name, document_number),
          contract_extensions(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
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
        .select(`*, employees(first_name, last_name)`)
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        const employeeName = data.employees 
          ? `${(data.employees as any).first_name} ${(data.employees as any).last_name}`
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
        .select('*, employees(first_name, last_name)')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user && oldData) {
        const employeeName = oldData.employees 
          ? `${(oldData.employees as any).first_name} ${(oldData.employees as any).last_name}`
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
        .select('*, employees(first_name, last_name)')
        .eq('id', extension.contract_id)
        .single();

      const { data, error } = await supabase
        .from('contract_extensions')
        .insert({ ...extension, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user && contract) {
        const employeeName = contract.employees 
          ? `${(contract.employees as any).first_name} ${(contract.employees as any).last_name}`
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
