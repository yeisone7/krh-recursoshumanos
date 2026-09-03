export type CopasstStoredStatus = 'draft' | 'published' | 'closed' | 'cancelled';
export type CopasstEffectiveStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'cancelled';

export interface CopasstElection {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  term_label: string;
  seats: number;
  allow_blank_vote: boolean;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: CopasstStoredStatus;
  public_token: string;
  token_active: boolean;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface CopasstCandidate {
  id: string;
  election_id: string;
  employee_id: string;
  ballot_order: number;
  display_name: string;
  position_name: string | null;
  operation_center_name: string | null;
  photo_url: string;
}

export interface CopasstEmployeeOption {
  id: string;
  display_name: string;
  document_number: string;
  avatar_url: string | null;
  position_name: string | null;
  operation_center_name: string | null;
}

export interface CopasstElectionPayload {
  company_id: string;
  title: string;
  description: string;
  term_label: string;
  seats: number;
  allow_blank_vote: boolean;
  starts_at: string;
  ends_at: string;
  candidates: Array<{ employee_id: string; photo_url: string }>;
}

export interface CopasstElector {
  id: string;
  employee_id: string;
  document_number: string;
  display_name: string;
  gender: string | null;
  operation_center_name: string | null;
  area_name: string | null;
  position_name: string | null;
  voted_at: string | null;
}

export interface CopasstSummary {
  eligible: number;
  voted: number;
  pending: number;
  participation: number;
}

export interface CopasstTally {
  id: string;
  display_name: string;
  position_name: string | null;
  operation_center_name: string | null;
  photo_url: string;
  ballot_order: number;
  votes: number;
}

export interface CopasstResults {
  candidates: CopasstTally[];
  blank_votes: number;
  total_votes: number;
  tie_pending: boolean;
  winners: Array<{ candidate_id: string; selection_order: number; selection_source: string; resolution_note: string | null }>;
}

export interface CopasstSegment { label: string; eligible: number; voted: number }

export interface CopasstAnalyticsData {
  election: Pick<CopasstElection, 'id' | 'title' | 'term_label' | 'seats' | 'starts_at' | 'ends_at'> & { status: CopasstEffectiveStatus };
  kpis: CopasstSummary;
  results: CopasstResults;
  segments: Record<'gender' | 'center' | 'area' | 'position', CopasstSegment[]>;
  timeline: Array<{ bucket: string; votes: number }>;
  quality: { missing_gender: number; missing_center: number; missing_area: number; missing_position: number };
}

export interface CopasstPublicBallot {
  valid: boolean;
  election?: Pick<CopasstElection, 'id' | 'title' | 'description' | 'term_label' | 'seats' | 'allow_blank_vote' | 'starts_at' | 'ends_at'> & { status: CopasstEffectiveStatus };
  company?: { name: string; logo_url: string | null };
  candidates?: CopasstCandidate[];
  results?: CopasstResults | null;
}
