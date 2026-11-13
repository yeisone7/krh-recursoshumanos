export const amendmentFields = {
  position: 'Cargo', salary: 'Salario', center: 'Centro de operación',
  contract_type: 'Tipo de contrato', rest_day: 'Día de descanso', schedule: 'Horario habitual',
} as const;
export type AmendmentField = keyof typeof amendmentFields;
export type ConditionValue = Record<string, string | number | null>;
export type EmploymentConditions = Partial<Record<AmendmentField, ConditionValue>>;
export const amendmentStatuses = {
  draft: 'Borrador', awaiting_signature: 'Pendiente de firma', scheduled: 'Programado',
  applied: 'Aplicado', cancelled: 'Cancelado', needs_review: 'Requiere revisión',
} as const;
export interface EmployeeAmendment {
  id: string; number: number; company_id: string; employee_id: string; cycle_id: string; contract_id: string;
  kind: 'amendment' | 'correction'; related_id: string | null;
  status: keyof typeof amendmentStatuses; effective_on: string; reason: string;
  changes: EmploymentConditions; before_values: EmploymentConditions; revision: number;
  declared_before: boolean; has_salary: boolean; generated_path: string | null; signed_path: string | null;
  created_at: string; actor_name: string; applied_at: string | null; confirmed_at: string | null;
  cancellation_reason: string | null; review_reason: string | null;
  affected_cuts: { id: string; center_id: string; level: number; cutoff_date: string }[];
  events: { id: number; action: string; occurred_at: string }[];
}
export interface AmendmentData {
  records: EmployeeAmendment[]; snapshot: EmploymentConditions | null; cycle_id: string | null;
  observed_on: string | null; contract: { id: string; number: string; start_date: string } | null;
  can_manage: boolean; can_correct: boolean; can_salary: boolean;
  template: { id: string; path: string; file_name: string } | null;
  identity: { employee_name: string; employee_document: string; company_name: string; company_nit: string };
}

export function conditionLabel(field: AmendmentField, value?: ConditionValue): string {
  if (!value) return 'Sin evidencia histórica';
  if (field === 'salary') return value.amount == null ? 'Sin registrar' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value.amount));
  if (field === 'rest_day') return String(value.value || 'Sin registrar');
  if (field === 'contract_type') return [value.label || value.code, value.end_date ? `hasta ${value.end_date}` : '', value.work_labor_description].filter(Boolean).join(' · ') || 'Sin registrar';
  if (field === 'schedule') return [value.label, value.mode === 'shift' ? 'Turnos' : value.mode === 'administrative' ? 'Administrativo' : '', value.cycle_start_date ? `Inicio del ciclo: ${value.cycle_start_date}` : ''].filter(Boolean).join(' · ') || 'Sin registrar';
  return String(value.label || value.id || 'Sin registrar');
}

export function filterAmendments(records: EmployeeAmendment[], filters: { field: string; status: string; from: string; to: string; cycle: string }) {
  return records.filter(r => (!filters.field || filters.field in r.changes || (filters.field === 'salary' && r.has_salary))
    && (!filters.status || r.status === filters.status) && (!filters.cycle || r.cycle_id === filters.cycle)
    && (!filters.from || r.effective_on >= filters.from) && (!filters.to || r.effective_on <= filters.to));
}
