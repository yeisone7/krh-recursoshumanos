import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface AcademicReference {
  id: string;
  company_id: string;
  institution: string;
  phone: string | null;
  email: string | null;
  platform: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export type AcademicReferenceInput = Pick<AcademicReference, 'institution' | 'phone' | 'email' | 'platform' | 'observations'>;
const table = 'selection_academic_references';
const duplicateError = (error: unknown) => (error as { code?: string })?.code === '23505';

export function useAcademicReferences() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['selection-academic-references', currentCompanyId];
  const query = useQuery({
    queryKey, enabled: Boolean(currentCompanyId), staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000,
    queryFn: async (): Promise<AcademicReference[]> => {
      const { data, error } = await supabase.from(table).select('*').eq('company_id', currentCompanyId).order('institution');
      if (error) throw error;
      return data || [];
    },
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const normalize = (input: AcademicReferenceInput) => ({
    institution: input.institution.trim(), phone: input.phone?.trim() || null, email: input.email?.trim() || null,
    platform: input.platform?.trim() || null, observations: input.observations?.trim() || null,
  });
  const createMutation = useMutation({
    mutationFn: async (input: AcademicReferenceInput) => {
      if (!currentCompanyId) throw new Error('No hay una empresa seleccionada.');
      const { error } = await supabase.from(table).insert({ ...normalize(input), company_id: currentCompanyId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Referencia académica creada.'); },
    onError: (error: unknown) => toast.error(duplicateError(error) ? 'Ya existe una referencia para esta institución.' : 'No se pudo crear la referencia académica.'),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: AcademicReferenceInput & { id: string }) => {
      const { error } = await supabase.from(table).update(normalize(input)).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Referencia académica actualizada.'); },
    onError: (error: unknown) => toast.error(duplicateError(error) ? 'Ya existe una referencia para esta institución.' : 'No se pudo actualizar la referencia académica.'),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { invalidate(); toast.success('Referencia académica eliminada.'); },
    onError: () => toast.error('No se pudo eliminar la referencia académica.'),
  });
  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch, create: createMutation.mutateAsync, update: updateMutation.mutateAsync, remove: deleteMutation.mutateAsync, isSaving: createMutation.isPending || updateMutation.isPending, isDeleting: deleteMutation.isPending };
}
