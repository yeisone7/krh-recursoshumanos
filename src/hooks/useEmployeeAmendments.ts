import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import type { AmendmentData } from '@/types/amendment';

// Keep the new RPC boundary typed until generated database types are refreshed.
const api = supabase as unknown as {
  rpc(name: 'employee_amendments' | 'employee_amendment_command', args: Record<string, Json | undefined>): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
export async function fetchAmendments(employeeId: string, date?: string): Promise<AmendmentData> {
  const { data, error } = await api.rpc('employee_amendments', { p_employee_id: employeeId, p_at_date: date || null });
  if (error) throw new Error(error.message);
  return data as AmendmentData;
}
export function useEmployeeAmendments(employeeId: string, date?: string) {
  const auth = useAuth();
  return useQuery({
    queryKey: ['employee-amendments', auth.currentCompanyId, employeeId, date || 'current'],
    queryFn: () => fetchAmendments(employeeId, date),
    enabled: !!employeeId && (auth.canView('otrosi') || auth.isAdmin || auth.isRRHH || auth.isSuperAdmin),
    refetchInterval: 60_000,
  });
}
export function useAmendmentCommand() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, payload }: { action: string; payload: Record<string, unknown> }) => {
      const { data, error } = await api.rpc('employee_amendment_command', { p_action: action, p_payload: payload as Json });
      if (error) throw new Error(error.message);
      return data as string;
    },
    // Conditions are shared by employee lists, contracts, reports and schedules.
    onSuccess: () => client.invalidateQueries(),
  });
}
export async function uploadAmendmentFile(path: string, file: Blob) {
  const { error } = await supabase.storage.from('amendments').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
export async function openAmendmentFile(path: string) {
  const { data, error } = await supabase.storage.from('amendments').createSignedUrl(path, 300);
  if (error) throw error;
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
