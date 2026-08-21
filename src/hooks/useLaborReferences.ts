import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface LaborReference {
  id: string;
  company_id: string;
  company: string;
  phone: string | null;
  email: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

export type LaborReferenceInput = Pick<LaborReference, 'company' | 'phone' | 'email' | 'observations'>;

export function useLaborReferences() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['selection-labor-references', currentCompanyId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(currentCompanyId),
    queryFn: async (): Promise<LaborReference[]> => {
      const { data, error } = await supabase
        .from('selection_labor_references')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('company');
      if (error) throw error;
      return data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });
  const createMutation = useMutation({
    mutationFn: async (input: LaborReferenceInput) => {
      if (!currentCompanyId) throw new Error('No hay una empresa seleccionada.');
      const { error } = await supabase.from('selection_labor_references').insert({
        ...input,
        company: input.company.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        observations: input.observations?.trim() || null,
        company_id: currentCompanyId,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Referencia laboral creada.'); },
    onError: (error: unknown) => toast.error((error as { code?: string })?.code === '23505' ? 'Ya existe una referencia para esta empresa.' : 'No se pudo crear la referencia laboral.'),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: LaborReferenceInput & { id: string }) => {
      const { error } = await supabase.from('selection_labor_references').update({
        company: input.company.trim(), phone: input.phone?.trim() || null,
        email: input.email?.trim() || null, observations: input.observations?.trim() || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Referencia laboral actualizada.'); },
    onError: (error: unknown) => toast.error((error as { code?: string })?.code === '23505' ? 'Ya existe una referencia para esta empresa.' : 'No se pudo actualizar la referencia laboral.'),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('selection_labor_references').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Referencia laboral eliminada.'); },
    onError: () => toast.error('No se pudo eliminar la referencia laboral.'),
  });

  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch, create: createMutation.mutateAsync, update: updateMutation.mutateAsync, remove: deleteMutation.mutateAsync, isSaving: createMutation.isPending || updateMutation.isPending, isDeleting: deleteMutation.isPending };
}
