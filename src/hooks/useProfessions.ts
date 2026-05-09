import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Profession {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfessions(companyId?: string) {
  const { currentCompanyId: authCompanyId } = useAuth();
  const targetCompanyId = companyId || authCompanyId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['professions', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return [];
      
      const { data, error } = await supabase
        .from('professions')
        .select('*')
        .eq('company_id', targetCompanyId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching professions:', error);
        return [];
      }
      return (data || []) as Profession[];
    },
    enabled: !!targetCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!targetCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from('professions')
        .insert({
          name,
          company_id: targetCompanyId,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      toast.success('Profesión creada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating profession:', error);
      toast.error(`Error al crear la profesión: ${error.message || 'Error desconocido'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, is_active }: { id: string; name: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('professions')
        .update({
          name,
          is_active: is_active ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      toast.success('Profesión actualizada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating profession:', error);
      toast.error('Error al actualizar la profesión');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('professions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      toast.success('Profesión eliminada exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting profession:', error);
      toast.error('Error al eliminar la profesión');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
