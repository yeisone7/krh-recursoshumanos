import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { clearSelectionCatalogCache, getSelectionCatalogCache, setSelectionCatalogCache } from '@/lib/selectionCatalogCache';

export interface PinkListEntry {
  id: string; company_id: string; reference_date: string; full_name: string; document_number: string;
  position_id: string; operation_center_id: string; observations: string | null;
  positions: { id: string; name: string } | null;
  operation_centers: { id: string; name: string } | null;
}
export type PinkListInput = Pick<PinkListEntry, 'reference_date' | 'full_name' | 'document_number' | 'position_id' | 'operation_center_id' | 'observations'>;
const table = 'selection_pink_list';

export function usePinkList() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['selection-pink-list', currentCompanyId];
  const cacheKey = `pink-list:${currentCompanyId}`;
  const query = useQuery({ queryKey, enabled: Boolean(currentCompanyId), staleTime: 15 * 60 * 1000, gcTime: 60 * 60 * 1000, refetchOnMount: false, initialData: () => getSelectionCatalogCache<PinkListEntry[]>(cacheKey)?.data, initialDataUpdatedAt: () => getSelectionCatalogCache<PinkListEntry[]>(cacheKey)?.updatedAt, queryFn: async (): Promise<PinkListEntry[]> => {
    const { data, error } = await supabase.from(table).select('*, positions(id, name), operation_centers(id, name)').eq('company_id', currentCompanyId).order('reference_date', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw error;
    const records = (data || []) as unknown as PinkListEntry[];
    setSelectionCatalogCache(cacheKey, records);
    return records;
  }});
  const invalidate = () => { clearSelectionCatalogCache(cacheKey); return queryClient.invalidateQueries({ queryKey }); };
  const normalize = (input: PinkListInput) => ({ ...input, full_name: input.full_name.trim(), document_number: input.document_number.trim(), observations: input.observations?.trim() || null });
  const createMutation = useMutation({ mutationFn: async (input: PinkListInput) => {
    if (!currentCompanyId) throw new Error('No hay una empresa seleccionada.');
    const { error } = await supabase.from(table).insert({ ...normalize(input), company_id: currentCompanyId }); if (error) throw error;
  }, onSuccess: () => { invalidate(); toast.success('Registro agregado a Lista Rosada.'); }, onError: () => toast.error('No se pudo crear el registro.') });
  const updateMutation = useMutation({ mutationFn: async ({ id, ...input }: PinkListInput & { id: string }) => {
    const { error } = await supabase.from(table).update(normalize(input)).eq('id', id); if (error) throw error;
  }, onSuccess: () => { invalidate(); toast.success('Registro de Lista Rosada actualizado.'); }, onError: () => toast.error('No se pudo actualizar el registro.') });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from(table).delete().eq('id', id); if (error) throw error; }, onSuccess: () => { invalidate(); toast.success('Registro eliminado de Lista Rosada.'); }, onError: () => toast.error('No se pudo eliminar el registro.') });
  return { data: query.data || [], isLoading: query.isLoading, refetch: query.refetch, create: createMutation.mutateAsync, update: updateMutation.mutateAsync, remove: deleteMutation.mutateAsync, isSaving: createMutation.isPending || updateMutation.isPending, isDeleting: deleteMutation.isPending };
}
