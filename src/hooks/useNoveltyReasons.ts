import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NoveltyReason {
  id: string;
  company_id: string;
  item_number: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useNoveltyReasons(onlyActive = false) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['novelty_reasons', currentCompanyId, onlyActive],
    queryFn: async () => {
      let query = supabase
        .from('novelty_reasons')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('item_number', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as NoveltyReason[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateNoveltyReason() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (reason: { item_number: number; name: string; description?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('novelty_reasons')
        .insert({
          ...reason,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novelty_reasons'] });
    },
  });
}

export function useUpdateNoveltyReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; item_number?: number; name?: string; description?: string; is_active?: boolean }) => {
      const { data, error } = await supabase
        .from('novelty_reasons')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novelty_reasons'] });
    },
  });
}

export function useDeleteNoveltyReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('novelty_reasons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['novelty_reasons'] });
    },
  });
}
