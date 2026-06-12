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
          candidates(id, status),
          personnel_requisitions:requisition_id(id, requisition_code, cargo_solicitado, estado_requisicion),
          vacancy_education_levels(
            education_levels(id, name)
          )
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
          personnel_requisitions:requisition_id(
            id, requisition_code, cargo_solicitado, estado_requisicion, fecha_requisicion, 
            solicitante_nombre, motivo_solicitud, operation_centers(name)
          ),
          cancelled_by_profile:cancelled_by(id, full_name),
          candidates(
            id, first_name, last_name, document_number, status, application_date, email, mobile,
            selection_steps(*)
          ),
          vacancy_education_levels(
            education_levels(id, name)
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
    mutationFn: async ({ educationLevelIds, ...vacancy }: Omit<VacancyInsert, 'company_id' | 'created_by'> & { educationLevelIds?: string[] }) => {
      // 1. Create the vacancy
      const { data: newVacancy, error: vacancyError } = await supabase
        .from('vacancies')
        .insert({
          ...vacancy,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (vacancyError) throw vacancyError;

      // 2. Insert education levels if provided
      if (educationLevelIds && educationLevelIds.length > 0) {
        const educationLevelsToInsert = educationLevelIds.map(levelId => ({
          vacancy_id: newVacancy.id,
          education_level_id: levelId,
          company_id: currentCompanyId!,
        }));

        const { error: levelsError } = await supabase
          .from('vacancy_education_levels')
          .insert(educationLevelsToInsert);

        if (levelsError) throw levelsError;
      }

      return newVacancy;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approved-requisitions'] });
      if (data.requisition_id) {
        queryClient.invalidateQueries({ queryKey: ['requisition', data.requisition_id] });
        queryClient.invalidateQueries({ queryKey: ['requisition-vacancies', data.requisition_id] });
      }
    },
  });
}

export function useUpdateVacancy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, educationLevelIds, ...updates }: Partial<Vacancy> & { id: string, educationLevelIds?: string[] }) => {
      // 1. Update the vacancy
      const { data: updatedVacancy, error: vacancyError } = await supabase
        .from('vacancies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (vacancyError) throw vacancyError;

      // 2. Update education levels if provided
      if (educationLevelIds) {
        // Delete existing relations
        const { error: deleteError } = await supabase
          .from('vacancy_education_levels')
          .delete()
          .eq('vacancy_id', id);

        if (deleteError) throw deleteError;

        // Insert new relations if any
        if (educationLevelIds.length > 0) {
          const educationLevelsToInsert = educationLevelIds.map(levelId => ({
            vacancy_id: id,
            education_level_id: levelId,
            company_id: updatedVacancy.company_id,
          }));

          const { error: levelsError } = await supabase
            .from('vacancy_education_levels')
            .insert(educationLevelsToInsert);

          if (levelsError) throw levelsError;
        }
      }

      return updatedVacancy;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['vacancy', data.id] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approved-requisitions'] });
      if (data.requisition_id) {
        queryClient.invalidateQueries({ queryKey: ['requisition', data.requisition_id] });
        queryClient.invalidateQueries({ queryKey: ['requisition-vacancies', data.requisition_id] });
      }
    },
  });
}

export function useDeleteVacancy() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('vacancies')
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompanyId!)
        .eq('status', 'open')
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('Solo se pueden eliminar vacantes con estado Abierta.');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['approved-requisitions'] });
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
        .in('status', ['open', 'in_process', 'paused'])
        .order('position_title');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}
