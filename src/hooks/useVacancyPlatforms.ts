import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VacancyPublicationPlatform {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useVacancyPlatforms() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vacancy_platforms', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('vacancy_publication_platforms' as any)
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as VacancyPublicationPlatform[];
    },
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<VacancyPublicationPlatform>) => {
      if (!currentCompanyId) throw new Error('No company');
      const { data, error } = await supabase
        .from('vacancy_publication_platforms' as any)
        .insert({
          name: item.name!,
          description: item.description || null,
          url: item.url || null,
          is_active: item.is_active ?? true,
          company_id: currentCompanyId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancy_platforms'] });
      toast.success('Plataforma creada exitosamente');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Ya existe una plataforma con ese nombre');
      } else {
        toast.error('Error al crear la plataforma');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<VacancyPublicationPlatform> & { id: string }) => {
      const { data, error } = await supabase
        .from('vacancy_publication_platforms' as any)
        .update({
          name: item.name,
          description: item.description,
          url: item.url,
          is_active: item.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancy_platforms'] });
      toast.success('Plataforma actualizada');
    },
    onError: () => toast.error('Error al actualizar la plataforma'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vacancy_publication_platforms' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacancy_platforms'] });
      toast.success('Plataforma eliminada');
    },
    onError: () => toast.error('Error al eliminar la plataforma'),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
