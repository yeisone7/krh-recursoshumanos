import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type CorrectionModule = 'jornadas' | 'novedades';
export type CorrectionAction = 'create' | 'update' | 'delete' | 'approve';
export type CorrectionTicket = {
  id: string; number: number; company_id: string; employee_id: string; employee_name: string;
  operation_center_id: string; center_name: string; requested_by: string; requested_by_name: string;
  start_date: string; end_date: string; expires_at: string; actions: string[]; reason: string;
  status: 'requested' | 'active' | 'rejected' | 'revoked' | 'finished';
  authorized_by: string | null; authorized_at: string | null; created_at: string;
};
export type CorrectionEvent = {
  id: string; company_id: string; operation_center_id: string; employee_id: string; employee_name: string;
  ticket_id: string | null; module: string; action: string; record_id: string | null; work_date: string | null;
  actor_id: string | null; actor_name: string; occurred_at: string; old_values: Json; new_values: Json; cuts: Json; reason: string | null;
};
export type ScheduleDay = {
  employee_id: string; work_date: string; snapshot: Record<string, Json>;
  status: 'pending' | 'approved' | 'rejected' | 'historical';
  review: { reviewed_by_name: string | null; reviewed_at: string | null; reason: string | null; snapshot: Json; ticket_id: string | null } | null;
};
export type CorrectionOperation = { module: CorrectionModule; action: CorrectionAction | 'upsert'; id?: string; values?: Record<string, unknown>; expected?: Json };
export type CorrectionPreview = { requires_ticket: boolean; tickets: CorrectionTicket[]; operations: CorrectionOperation[] };
type Table<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
type CorrectionDatabase = { public: {
  Tables: { payroll_correction_tickets: Table<CorrectionTicket>; payroll_correction_events: Table<CorrectionEvent> };
  Views: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
  Functions: {
    payroll_correction_write: { Args: { p_company_id: string; p_operations: Json; p_ticket_id?: string | null; p_preview?: boolean }; Returns: Json };
    payroll_schedule_days: { Args: { p_company_id: string; p_employees: string[]; p_start: string; p_end: string }; Returns: Json };
    payroll_schedule_cut_summary: { Args: { p_company_id: string; p_center_id: string; p_end: string }; Returns: Json };
    payroll_ticket_request: { Args: { p_company_id: string; p_employee_id: string; p_center_id: string; p_start: string; p_end: string; p_expires: string; p_actions: string[]; p_reason: string }; Returns: string };
    payroll_ticket_transition: { Args: { p_id: string; p_action: string; p_reason: string; p_start?: string; p_end?: string; p_expires?: string; p_actions?: string[] }; Returns: undefined };
  };
} };
export const correctionClient = supabase as unknown as SupabaseClient<CorrectionDatabase>;
export const reviewLabels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', historical: 'Sin revisión histórica' };
export const ticketLabels = { requested: 'Solicitado', active: 'Activo', rejected: 'Rechazado', revoked: 'Revocado', finished: 'Finalizado', expired: 'Vencido' };
export const correctionActionLabels = { create: 'Crear', update: 'Modificar', delete: 'Eliminar', approve: 'Aprobar / rechazar' };
export function correctionActionLabel(value: string) {
  const [module, action] = value.split(':');
  return `${module === 'jornadas' ? 'Jornadas' : 'Novedades'} · ${correctionActionLabels[action as CorrectionAction] || action}`;
}
export function correctionEventLabel(action: string) {
  return ({ create: 'Creación', insert: 'Creación', update: 'Modificación', delete: 'Eliminación', approve: 'Decisión de aprobación', approved: 'Aprobada', rejected: 'Rechazada', invalidate: 'Pendiente de nueva revisión', request: 'Solicitud', authorize: 'Autorización', reject: 'Solicitud rechazada', revoke: 'Revocación', finish: 'Finalización', cancel: 'Solicitud cancelada' } as Record<string, string>)[action] || action;
}
export function ticketStatus(t: Pick<CorrectionTicket, 'status' | 'expires_at'>, now = Date.now()) {
  return ['active', 'requested'].includes(t.status) && new Date(t.expires_at).getTime() <= now ? 'expired' : t.status;
}
export function colombiaDateTime(value: string) {
  return new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}
export function colombiaInputToISO(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Seleccione fecha y hora de vencimiento.');
  return new Date(`${value}:00-05:00`).toISOString();
}
export function colombiaInput(value: string) {
  return new Date(new Date(value).getTime() - 5 * 3600000).toISOString().slice(0, 16);
}
export async function fetchScheduleDays(company: string, employees: string[], start: string, end: string): Promise<ScheduleDay[]> {
  if (!employees.length || !start || !end) return [];
  const result: ScheduleDay[] = [];
  for (let i = 0; i < employees.length; i += 100) {
    const r = await correctionClient.rpc('payroll_schedule_days', { p_company_id: company, p_employees: employees.slice(i, i + 100), p_start: start, p_end: end });
    if (r.error) throw r.error;
    result.push(...r.data as unknown as ScheduleDay[]);
  }
  return result;
}
export async function writePayrollRecords<T>(company: string | null, operations: CorrectionOperation[]): Promise<T[]> {
  if (!company) throw new Error('Seleccione una empresa.');
  if (!operations.length) return [];
  const preview = await correctionClient.rpc('payroll_correction_write', { p_company_id: company, p_operations: operations as unknown as Json, p_preview: true });
  if (preview.error) throw Object.assign(new Error(preview.error.message), preview.error);
  const data = preview.data as unknown as CorrectionPreview;
  let ticketId: string | null = null;
  if (data.requires_ticket) {
    const { chooseCorrectionTicket } = await import('@/lib/chooseCorrectionTicket');
    ticketId = await chooseCorrectionTicket(data.tickets);
  }
  const result = await correctionClient.rpc('payroll_correction_write', { p_company_id: company, p_operations: data.operations as unknown as Json, p_ticket_id: ticketId });
  if (result.error) throw Object.assign(new Error(result.error.message), result.error);
  return result.data as unknown as T[];
}
