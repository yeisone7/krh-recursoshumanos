import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type OperationCenter = Database['public']['Tables']['operation_centers']['Row'];
type OperationCenterInsert = Database['public']['Tables']['operation_centers']['Insert'];

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

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useOperationCenters() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['operation_centers', currentCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('operation_centers')
        .select('*')
        .order('name', { ascending: true });

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

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (company: Omit<CompanyInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert({ ...company, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        await logAuditEvent(
          user.id,
          user.email,
          data.id,
          'create',
          'company',
          data.id,
          data.name,
          undefined,
          { name: data.name, nit: data.nit }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useCreateOperationCenter() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (center: Omit<OperationCenterInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('operation_centers')
        .insert({ ...center, created_by: user?.id })
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
          'operation_center',
          data.id,
          data.name,
          undefined,
          { name: data.name, city: data.city, manager_name: data.manager_name }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation_centers'] });
    },
  });
}
