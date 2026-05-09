import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EducationLevel {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useEducationLevels(companyId?: string) {
  const { currentCompanyId: authCompanyId } = useAuth();
  const targetCompanyId = companyId || authCompanyId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['education_levels', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return [];
      
      const { data, error } = await supabase
        .from('education_levels')
        .select('*')
        .eq('company_id', targetCompanyId)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching education levels:', error);
        return [];
      }
      return (data || []) as EducationLevel[];
    },
    enabled: !!targetCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!targetCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from('education_levels')
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
      queryClient.invalidateQueries({ queryKey: ['education_levels'] });
      toast.success('Nivel educativo creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating education level:', error);
      toast.error(`Error al crear el nivel educativo: ${error.message || 'Error desconocido'}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, is_active }: { id: string; name: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('education_levels')
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
      queryClient.invalidateQueries({ queryKey: ['education_levels'] });
      toast.success('Nivel educativo actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating education level:', error);
      toast.error('Error al actualizar el nivel educativo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('education_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education_levels'] });
      toast.success('Nivel educativo eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting education level:', error);
      toast.error('Error al eliminar el nivel educativo');
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
