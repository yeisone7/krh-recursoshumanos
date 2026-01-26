import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CatalogBank {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  nit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBanksCatalog() {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['catalog_banks', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      
      const { data, error } = await supabase
        .from('catalog_banks')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as CatalogBank[];
    },
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<CatalogBank>) => {
      if (!currentCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from('catalog_banks')
        .insert({
          name: item.name!,
          code: item.code || null,
          nit: item.nit || null,
          is_active: item.is_active ?? true,
          company_id: currentCompanyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog_banks'] });
      toast.success('Banco creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un banco con ese nombre');
      } else {
        toast.error('Error al crear el banco');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<CatalogBank> & { id: string }) => {
      const { data, error } = await supabase
        .from('catalog_banks')
        .update({
          name: item.name,
          code: item.code,
          nit: item.nit,
          is_active: item.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog_banks'] });
      toast.success('Banco actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating:', error);
      toast.error('Error al actualizar el banco');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('catalog_banks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog_banks'] });
      toast.success('Banco eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar el banco');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
