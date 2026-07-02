import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type DbError = { message?: string };
type QueryResult<T = unknown> = PromiseLike<{ data: T | null; error: DbError | null }>;
type QueryBuilder = {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: readonly unknown[]) => QueryBuilder;
  upsert: (record: unknown, options?: Record<string, unknown>) => QueryBuilder;
  maybeSingle: <T = unknown>() => QueryResult<T>;
  single: <T = unknown>() => QueryResult<T>;
};
type LooseSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

const db = supabase as unknown as LooseSupabaseClient;

export interface LaborDisconnectionPolicy {
  id: string;
  company_id: string;
  enabled: boolean;
  policy_name: string;
  legal_reference: string;
  protected_start_time: string;
  protected_end_time: string;
  applies_weekends: boolean;
  applies_holidays: boolean;
  exception_notes: string | null;
  responsible_user_id: string | null;
  last_review_date: string | null;
  next_review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LaborDisconnectionPolicyInput {
  enabled: boolean;
  policy_name: string;
  legal_reference: string;
  protected_start_time: string;
  protected_end_time: string;
  applies_weekends: boolean;
  applies_holidays: boolean;
  exception_notes?: string | null;
  responsible_user_id?: string | null;
  last_review_date?: string | null;
  next_review_date?: string | null;
}

export interface CompanyPolicyUser {
  id: string;
  label: string;
}

export function useLaborDisconnectionPolicy() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['labor-disconnection-policy', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return null;

      const { data, error } = await db
        .from('labor_disconnection_policies')
        .select('*')
        .eq('company_id', currentCompanyId)
        .maybeSingle();

      if (error) throw error;
      return data as LaborDisconnectionPolicy | null;
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpsertLaborDisconnectionPolicy() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: LaborDisconnectionPolicyInput) => {
      if (!currentCompanyId) throw new Error('No hay empresa activa.');

      const record = {
        ...input,
        company_id: currentCompanyId,
        created_by: user?.id || null,
      };

      const { data, error } = await db
        .from('labor_disconnection_policies')
        .upsert(record, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data as LaborDisconnectionPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labor-disconnection-policy'] });
      queryClient.invalidateQueries({ queryKey: ['unified-alerts'] });
    },
    onError: (error: DbError) => {
      toast({
        title: 'Error al guardar desconexion laboral',
        description: error.message || 'No se pudo guardar la politica.',
        variant: 'destructive',
      });
    },
  });
}

export function useCompanyPolicyUsers() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['labor-disconnection-policy-users', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [] as CompanyPolicyUser[];

      const { data: assignments, error: assignmentsError } = await db
        .from('user_company_assignments')
        .select('user_id')
        .eq('company_id', currentCompanyId);

      if (assignmentsError) throw assignmentsError;

      const ids = Array.from(new Set((assignments || []).map((row: { user_id: string }) => row.user_id))).filter(Boolean);
      if (ids.length === 0) return [] as CompanyPolicyUser[];

      const { data: profiles, error: profilesError } = await db
        .from('user_profiles')
        .select('id, full_name, display_name')
        .in('id', ids);

      if (profilesError) throw profilesError;

      return ids
        .map((id) => {
          const profile = ((profiles || []) as Array<{ id: string; full_name: string | null; display_name: string | null }>)
            .find((item) => item.id === id);
          return {
            id,
            label: profile?.full_name || profile?.display_name || id,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    },
    enabled: !!currentCompanyId,
  });
}
