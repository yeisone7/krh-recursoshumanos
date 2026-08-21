import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface VacancyInformation {
  id: string; company_id: string; operation_center_id: string; rotation: boolean; module_type: 'normal' | 'ep_onshore';
  residence_letter_validation: string | null; available_compensation_funds: string | null; publication_compensation_funds: string | null;
  spe_email: string | null; spe_username: string | null; spe_compensation_fund_access: string | null; spe_password: string | null;
  compensation_fund_contacts: string | null; social_contacts: string | null; special_observations: string | null;
  operation_centers: { id: string; name: string } | null;
}
export type VacancyInformationInput = Omit<VacancyInformation, 'id' | 'company_id' | 'operation_centers'>;
const table = 'selection_vacancy_information';

export function useVacancyInformation() {
  const { currentCompanyId } = useAuth(); const queryClient = useQueryClient(); const queryKey = ['selection-vacancy-information', currentCompanyId];
  const query = useQuery({ queryKey, enabled: Boolean(currentCompanyId), queryFn: async (): Promise<VacancyInformation[]> => {
    const { data, error } = await supabase.from(table).select('*, operation_centers(id, name)').eq('company_id', currentCompanyId).order('created_at', { ascending: false });
    if (error) throw error; return (data || []) as unknown as VacancyInformation[];
  }});
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const normalize = (input: VacancyInformationInput) =>
    Object.fromEntries(Object.entries(input).map(([key, value]) => [key, typeof value === 'string' && key !== 'module_type' ? value.trim() || null : value]));
  const createMutation = useMutation({ mutationFn: async (input: VacancyInformationInput) => {
    if (!currentCompanyId) throw new Error('No hay una empresa seleccionada.');
    const { error } = await supabase.from(table).insert({ ...normalize(input), company_id: currentCompanyId } as never); if (error) throw error;
  }, onSuccess: () => { invalidate(); toast.success('Información de vacante creada.'); }, onError: (error: unknown) => toast.error((error as { code?: string })?.code === '23505' ? 'Ya existe información para este centro de operación.' : 'No se pudo crear la información.') });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...input }: VacancyInformationInput & { id: string }) => {
    const { error } = await supabase.from(table).update(normalize(input) as never).eq('id', id); if (error) throw error;
  }, onSuccess: () => { invalidate(); toast.success('Información de vacante actualizada.'); }, onError: () => toast.error('No se pudo actualizar la información.') });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; }, onSuccess: () => { invalidate(); toast.success('Información de vacante eliminada.'); }, onError: () => toast.error('No se pudo eliminar la información.') });
  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch, create: createMutation.mutateAsync, update: updateMutation.mutateAsync, remove: deleteMutation.mutateAsync, isSaving: createMutation.isPending || updateMutation.isPending, isDeleting: deleteMutation.isPending };
}
