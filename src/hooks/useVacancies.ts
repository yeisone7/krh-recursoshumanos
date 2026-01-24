import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Vacancy = Database['public']['Tables']['vacancies']['Row'];
type VacancyInsert = Database['public']['Tables']['vacancies']['Insert'];

export function useVacancies() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacancies', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacancies')
        .select(`
          *,
          operation_centers(id, name),
          candidates(id, status)
        `)
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useVacancy(id: string | undefined) {
  return useQuery({
    queryKey: ['vacancy', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('vacancies')
        .select(`
          *,
          operation_centers(id, name),
          candidates(
            id, first_name, last_name, document_number, status, application_date, email, mobile,
            selection_steps(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateVacancy() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (vacancy: Omit<VacancyInsert, 'company_id' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('vacancies')
        .insert({
          ...vacancy,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    },
  });
}

export function useUpdateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Vacancy> & { id: string }) => {
      const { data, error } = await supabase
        .from('vacancies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['vacancy', data.id] });
    },
  });
}

export function useDeleteVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vacancies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    },
  });
}

// Open vacancies for dropdowns
export function useOpenVacancies() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['open_vacancies', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacancies')
        .select('id, position_title, operation_centers(name)')
        .eq('company_id', currentCompanyId!)
        .in('status', ['open', 'in_process'])
        .order('position_title');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}
