import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ExamCatalogItem {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useExamCatalog() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['exam_catalog', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_catalog' as any)
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return (data as any[] || []) as ExamCatalogItem[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateExamCatalogItem() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (item: { name: string; code?: string; description?: string }) => {
      const { data, error } = await supabase
        .from('exam_catalog' as any)
        .insert({
          company_id: currentCompanyId!,
          name: item.name,
          code: item.code || null,
          description: item.description || null,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_catalog'] });
    },
  });
}

export function useUpdateExamCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; code?: string; description?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('exam_catalog' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_catalog'] });
    },
  });
}

export function useDeleteExamCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_catalog' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_catalog'] });
    },
  });
}
