import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Employee = Database['public']['Tables']['employees']['Row'];
type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];

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

export function useEmployees() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employees', currentCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('employees')
        .select(`
          *,
          operation_centers(id, name),
          contracts(id, contract_type, start_date, end_date, is_terminated)
        `)
        .order('last_name', { ascending: true });

      if (currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          operation_centers(id, name, city),
          contracts(*),
          dotation_deliveries(*),
          medical_exams(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (employee: Omit<EmployeeInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'create',
          'employee',
          data.id,
          `${data.first_name} ${data.last_name}`,
          undefined,
          { first_name: data.first_name, last_name: data.last_name, position: data.position }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string }) => {
      // Get old values first
      const { data: oldData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'update',
          'employee',
          data.id,
          `${data.first_name} ${data.last_name}`,
          oldData || undefined,
          updates
        );
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', data.id] });
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get employee data before delete
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      if (user && employee) {
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'delete',
          'employee',
          id,
          `${employee.first_name} ${employee.last_name}`,
          employee,
          undefined
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
