import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type PayrollCut = {
  id: string; company_id: string; operation_center_id: string; level: 1 | 2;
  cutoff_date: string; active: boolean; reason: string;
  created_by: string; created_by_name: string; created_at: string;
}
export type PayrollCutEvent = {
  id: string; cut_id: string; company_id: string; operation_center_id: string; level: 1 | 2;
  action: 'create' | 'update' | 'reopen'; old_date: string | null; new_date: string | null;
  reason: string; actor_id: string; actor_name: string; occurred_at: string;
}
export type CutStatus = {
  operation_center_id: string; center_name: string; level: 1 | 2; cutoff_date: string; reason: string;
}
type Table<T> = { Row: T; Insert: never; Update: never; Relationships: [] };
type PayrollDatabase = { public: {
  Tables: { payroll_control_cuts: Table<PayrollCut>; payroll_control_cut_events: Table<PayrollCutEvent> };
  Views: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
  Functions: {
    payroll_cut_centers: { Args: { p_company_id: string }; Returns: { id: string; name: string }[] };
    payroll_cut_resolve_centers: { Args: { p_company_id: string }; Returns: { source_table: string; unresolved_count: number }[] };
    payroll_cut_status: { Args: { p_company_id: string }; Returns: CutStatus[] };
    payroll_cut_change: { Args: { p_company_id: string; p_center_id: string; p_level: number; p_action: string; p_date: string | null; p_reason: string; p_cut_id?: string | null }; Returns: string };
    payroll_register_loan_payment: { Args: { p_loan_id: string; p_date: string; p_amount: number; p_period?: string | null; p_notes?: string | null; p_id: string }; Returns: string };
    payroll_refinance_loan: { Args: { p_loan_id: string; p_installments: number; p_rate: number; p_start: string; p_expected_balance: number; p_reason: string; p_document?: string | null }; Returns: string };
    payroll_version_deduction: { Args: { p_id: string; p_effective_date: string; p_changes: Json }; Returns: string };
    payroll_set_time_config: { Args: { p_company_id: string; p_config: Json }; Returns: string };
  };
} };
// Local extension preserves unrelated edits in the generated database types.
export const payrollClient = supabase as unknown as SupabaseClient<PayrollDatabase>;
export const cutModule = (level: number) => level === 1 ? 'cortes_control_nivel_uno' : 'cortes_control_nivel_dos';
export const cutActionLabels = { create: 'Aplicar', update: 'Modificar fecha', approve: 'Reabrir' };
export function colombiaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function effectiveCut<T extends { cutoff_date: string; level: number }>(cuts: T[]): T | undefined {
  return [...cuts].sort((a, b) => b.cutoff_date.localeCompare(a.cutoff_date) || b.level - a.level)[0];
}
export function cutFormError(action: string, date: string, reason: string, level: number, superior?: string, originalDate?: string) {
  if (reason.trim().length < 5) return 'Escriba un motivo de al menos cinco caracteres.';
  if (action !== 'reopen' && (!date || date > colombiaToday())) return 'Seleccione una fecha hasta hoy.';
  if (level === 1 && superior && (action === 'reopen' ? originalDate || '' : date) < superior) return `El nivel 1 debe estar desde ${superior} inclusive.`;
  return null;
}
