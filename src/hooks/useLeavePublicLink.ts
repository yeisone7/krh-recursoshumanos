import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface LeavePublicLinkStatus {
  active: boolean;
  id?: string;
  created_at?: string;
  expires_at?: string | null;
  expired?: boolean;
  token_available?: boolean;
  token?: string | null;
}

const key = (companyId: string | null) => ['leave-public-link', companyId] as const;

export function useLeavePublicLinkStatus(enabled = true) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: key(currentCompanyId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leave_public_link_status', {
        p_company_id: currentCompanyId,
      });
      if (error) throw error;
      return data as LeavePublicLinkStatus;
    },
    enabled: enabled && Boolean(currentCompanyId),
    refetchOnMount: 'always',
  });
}

export function useRotateLeavePublicLink() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expiresAt: string | null) => {
      const { data, error } = await supabase.rpc('rotate_leave_public_link', {
        p_company_id: currentCompanyId,
        p_expires_at: expiresAt,
      });
      if (error) throw error;
      return data as LeavePublicLinkStatus & { token: string };
    },
    onSuccess: (data) => queryClient.setQueryData(key(currentCompanyId), data),
  });
}

export function useRevokeLeavePublicLink() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('revoke_leave_public_link', {
        p_company_id: currentCompanyId,
      });
      if (error) throw error;
      return Boolean(data);
    },
    onSuccess: () => {
      queryClient.setQueryData(key(currentCompanyId), {
        active: false,
        token_available: false,
        token: null,
      } satisfies LeavePublicLinkStatus);
      void queryClient.invalidateQueries({ queryKey: key(currentCompanyId) });
    },
  });
}
