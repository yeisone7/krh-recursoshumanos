import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface MedicalExamInformation {
  id: string; company_id: string; operation_center_id: string; exam_type: string; vaccination_scheme: string[]; ips: string | null; order_type: 'propia' | 'ocupasalud'; contact: string | null; email: string | null; address: string | null; observations: string | null;
  operation_centers: { id: string; name: string } | null;
}
export type MedicalExamInformationInput = Omit<MedicalExamInformation, 'id' | 'company_id' | 'operation_centers'>;
const table = 'selection_medical_exam_information';
export function useMedicalExamInformation() {
  const { currentCompanyId } = useAuth(); const queryClient = useQueryClient(); const queryKey = ['selection-medical-exam-information', currentCompanyId];
  const query = useQuery({ queryKey, enabled: Boolean(currentCompanyId), queryFn: async (): Promise<MedicalExamInformation[]> => { const { data, error } = await supabase.from(table).select('*, operation_centers(id, name)').eq('company_id', currentCompanyId).order('created_at', { ascending: false }); if (error) throw error; return (data || []) as unknown as MedicalExamInformation[]; } });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const normalize = (input: MedicalExamInformationInput) => ({ ...input, exam_type: input.exam_type.trim(), ips: input.ips?.trim() || null, contact: input.contact?.trim() || null, email: input.email?.trim() || null, address: input.address?.trim() || null, observations: input.observations?.trim() || null });
  const createMutation = useMutation({ mutationFn: async (input: MedicalExamInformationInput) => { if (!currentCompanyId) throw new Error('No hay una empresa seleccionada.'); const { error } = await supabase.from(table).insert({ ...normalize(input), company_id: currentCompanyId }); if (error) throw error; }, onSuccess: () => { invalidate(); toast.success('Información de exámenes médicos creada.'); }, onError: () => toast.error('No se pudo crear la información.') });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...input }: MedicalExamInformationInput & { id: string }) => { const { error } = await supabase.from(table).update(normalize(input)).eq('id', id); if (error) throw error; }, onSuccess: () => { invalidate(); toast.success('Información de exámenes médicos actualizada.'); }, onError: () => toast.error('No se pudo actualizar la información.') });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; }, onSuccess: () => { invalidate(); toast.success('Registro eliminado.'); }, onError: () => toast.error('No se pudo eliminar el registro.') });
  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch, create: createMutation.mutateAsync, update: updateMutation.mutateAsync, remove: deleteMutation.mutateAsync, isSaving: createMutation.isPending || updateMutation.isPending, isDeleting: deleteMutation.isPending };
}
