import { supabase } from '@/integrations/supabase/client';
import type {
  CopasstAnalyticsData, CopasstCandidate, CopasstElection, CopasstElectionPayload,
  CopasstElector, CopasstEmployeeOption, CopasstPublicBallot, CopasstSummary,
} from '@/types/copasst';

// The generated Database type is refreshed after this migration is applied; this bridge keeps the
// feature deployable in the same release as its schema.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

interface CandidateEmployeeRow {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  document_number: string;
  avatar_url: string | null;
  employee_work_info: Array<{
    position_name: string | null;
    is_current: boolean;
    operation_centers: { name: string } | null;
  }>;
}

export const COPASST_PERMISSIONS = {
  elections: 'copasst_elecciones',
  compliance: 'copasst_cumplimiento',
  analytics: 'analitica_copasst',
} as const;

export const COPASST_REFRESH_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
  refetchOnReconnect: 'always',
} as const;

export function getEffectiveCopasstStatus(election: CopasstElection) {
  if (election.status === 'cancelled' || election.status === 'closed') return election.status;
  if (election.status === 'draft') return 'draft';
  const now = Date.now();
  if (new Date(election.ends_at).getTime() <= now) return 'closed';
  if (new Date(election.starts_at).getTime() > now) return 'scheduled';
  return 'open';
}

export function bogotaInputToIso(value: string) {
  return value ? new Date(`${value.length === 16 ? value + ':00' : value}-05:00`).toISOString() : '';
}

export function isoToBogotaInput(value: string) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export async function listCopasstElections(companyId: string): Promise<CopasstElection[]> {
  const { data, error } = await client.from('copasst_elections').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCopasstCandidates(electionId: string): Promise<CopasstCandidate[]> {
  const { data, error } = await client.from('copasst_candidates').select('*').eq('election_id', electionId).order('ballot_order');
  if (error) throw error;
  return data ?? [];
}

export async function listCandidateEmployees(companyId: string): Promise<CopasstEmployeeOption[]> {
  const { data, error } = await client.from('employees_v2').select(`
    id, first_name, middle_name, last_name, second_last_name, document_number, avatar_url,
    employee_work_info(position_name, is_current, operation_centers(name))
  `).eq('company_id', companyId).eq('is_active', true).eq('status', 'active').order('first_name');
  if (error) throw error;
  return ((data ?? []) as CandidateEmployeeRow[]).map((employee) => {
    const work = (employee.employee_work_info ?? []).find((row) => row.is_current);
    return {
      id: employee.id,
      display_name: [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name].filter(Boolean).join(' '),
      document_number: employee.document_number,
      avatar_url: employee.avatar_url,
      position_name: work?.position_name ?? null,
      operation_center_name: work?.operation_centers?.name ?? null,
    };
  });
}

export const createCopasstElection = (payload: CopasstElectionPayload) => rpc<CopasstElection>('create_copasst_election', { payload });
export const updateCopasstDraft = (electionId: string, payload: CopasstElectionPayload) => rpc<CopasstElection>('update_copasst_draft', { election_id: electionId, payload });
export const publishCopasstElection = (electionId: string) => rpc<CopasstElection>('publish_copasst_election', { election_id: electionId });
export const closeCopasstElection = (electionId: string) => rpc<unknown>('close_copasst_election', { election_id: electionId });
export const rotateCopasstToken = (electionId: string) => rpc<string>('rotate_copasst_token', { election_id: electionId });
export const updateCopasstSchedule = (electionId: string, startsAt: string, endsAt: string) => rpc<CopasstElection>('update_copasst_schedule', { election_id: electionId, starts_at: startsAt, ends_at: endsAt });
export const setCopasstTokenActive = (electionId: string, active: boolean) => rpc<boolean>('set_copasst_token_active', { election_id: electionId, active });
export const deleteCopasstDraft = (electionId: string) => rpc<boolean>('delete_copasst_draft', { election_id: electionId });
export const cancelCopasstElection = (electionId: string, note: string) => rpc<CopasstElection>('cancel_copasst_election', { election_id: electionId, note });
export const resolveCopasstTie = (electionId: string, candidateIds: string[], note: string) => rpc('resolve_copasst_tie', { election_id: electionId, candidate_ids: candidateIds, note });

export async function getCopasstCompliance(electionId: string): Promise<{ summary: CopasstSummary; electors: CopasstElector[] }> {
  return rpc('get_copasst_compliance', { election_id: electionId });
}
export const getCopasstAnalytics = (electionId: string) => rpc<CopasstAnalyticsData>('get_copasst_analytics', { election_id: electionId });
export const getCopasstBallot = (token: string) => rpc<CopasstPublicBallot>('get_copasst_ballot', { token });
export const verifyCopasstVoter = (token: string, document: string) => rpc<{ eligible: boolean; already_voted: boolean; message: string }>('verify_copasst_voter', { token, document });
export const castCopasstVote = (token: string, document: string, candidateId: string | null, blankVote: boolean) => rpc<{ success: boolean; receipt_code: string }>('cast_copasst_vote', { token, document, candidate_id: candidateId, blank_vote: blankVote });
export const logCopasstExport = (electionId: string, exportType: 'minutes_pdf' | 'electorate_xlsx' | 'center_participation_xlsx') => rpc<boolean>('log_copasst_export', { election_id: electionId, export_type: exportType });

export async function uploadCopasstCandidatePhoto(companyId: string, employeeId: string, file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${companyId}/${crypto.randomUUID()}-${employeeId}.${extension}`;
  const { error } = await client.storage.from('copasst-assets').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return client.storage.from('copasst-assets').getPublicUrl(path).data.publicUrl as string;
}

export function publicCopasstUrl(token: string) {
  return `${window.location.origin}/copasst/votar?token=${encodeURIComponent(token)}`;
}
