export type TimeClockAction = 'clock_in' | 'break_start' | 'break_end' | 'clock_out';
export type TimeClockSource = 'qr' | 'web' | 'supervised' | 'correction';
export type TimeClockDayStatus = 'open' | 'on_break' | 'complete' | 'needs_review';

export interface TimeClockPoint {
  id: string;
  company_id: string;
  operation_center_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  max_accuracy_meters: number;
  late_tolerance_minutes: number;
  require_break_punches: boolean;
  is_active: boolean;
  operation_centers?: { id: string; name: string } | null;
}

export interface TimeClockDay {
  id: string;
  company_id: string;
  employee_id: string;
  employment_cycle_id: string | null;
  operation_center_id: string | null;
  work_date: string;
  schedule_name: string | null;
  expected_start: string | null;
  expected_end: string | null;
  scheduled_break_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  first_clock_in: string | null;
  last_clock_out: string | null;
  worked_minutes: number;
  break_minutes: number;
  status: TimeClockDayStatus;
  incident_codes: string[];
  employees_v2?: { first_name: string; last_name: string; document_number: string } | null;
  operation_centers?: { name: string } | null;
}

export interface TimeClockEvent {
  id: string;
  day_id: string;
  employee_id: string;
  action: TimeClockAction;
  source: TimeClockSource;
  occurred_at: string;
  location_verified: boolean;
  qr_verified: boolean;
  supervisor_reason: string | null;
  employees_v2?: { first_name: string; last_name: string; document_number: string } | null;
  operation_centers?: { name: string } | null;
}

export interface TimeClockCorrection {
  id: string;
  employee_id: string;
  requested_action: TimeClockAction;
  requested_at: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  review_notes: string | null;
  created_at: string;
  employees_v2?: { first_name: string; last_name: string; document_number: string } | null;
}

export const TIME_CLOCK_ACTION_LABELS: Record<TimeClockAction, string> = {
  clock_in: 'Entrada',
  break_start: 'Iniciar pausa',
  break_end: 'Finalizar pausa',
  clock_out: 'Salida',
};

export function getNextTimeClockActions(lastAction?: TimeClockAction | null): TimeClockAction[] {
  if (!lastAction || lastAction === 'clock_out') return ['clock_in'];
  if (lastAction === 'clock_in' || lastAction === 'break_end') return ['break_start', 'clock_out'];
  return ['break_end'];
}
