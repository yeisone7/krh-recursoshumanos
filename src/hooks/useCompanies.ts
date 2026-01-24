import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type OperationCenter = Database['public']['Tables']['operation_centers']['Row'];
type OperationCenterInsert = Database['public']['Tables']['operation_centers']['Insert'];

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
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useCreateOperationCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (center: Omit<OperationCenterInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('operation_centers')
        .insert({ ...center, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operation_centers'] });
    },
  });
}
