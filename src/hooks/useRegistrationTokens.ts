import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RegistrationToken {
  id: string;
  company_id: string;
  token: string;
  target_type: 'candidate' | 'employee';
  vacancy_id: string | null;
  enabled_fields: string[];
  is_used: boolean;
  used_at: string | null;
  expires_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useRegistrationTokens(vacancyId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['registration-tokens', currentCompanyId, vacancyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      let query = supabase
        .from('self_registration_tokens')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });

      if (vacancyId) {
        query = query.eq('vacancy_id', vacancyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as RegistrationToken[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateRegistrationToken() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      target_type: 'candidate' | 'employee';
      vacancy_id?: string;
      enabled_fields: string[];
      expires_at: string;
    }) => {
      if (!currentCompanyId) throw new Error('No company');
      const { data, error } = await supabase
        .from('self_registration_tokens')
        .insert({
          company_id: currentCompanyId,
          target_type: input.target_type,
          vacancy_id: input.vacancy_id || null,
          enabled_fields: input.enabled_fields as any,
          expires_at: input.expires_at,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as RegistrationToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-tokens'] });
    },
  });
}

export function useDeactivateRegistrationToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('self_registration_tokens')
        .update({ is_used: true, used_at: new Date().toISOString() } as any)
        .eq('id', tokenId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-tokens'] });
    },
  });
}

export function useDeleteRegistrationToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from('self_registration_tokens')
        .delete()
        .eq('id', tokenId) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registration-tokens'] });
    },
  });
}
