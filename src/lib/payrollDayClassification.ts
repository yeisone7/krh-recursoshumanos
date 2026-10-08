import { getDay, parseISO } from 'date-fns';
import { getPayrollRestDay } from './payrollRestDay';

/** A holiday that coincides with mandatory rest is counted once. */
export function payrollDayKind(date: string, restDay: string | null | undefined, holidays: { has(date: string): boolean }) {
  if (holidays.has(date)) return 'holiday';
  return getDay(parseISO(date)) === getPayrollRestDay(restDay) ? 'rest' : 'ordinary';
}

export function payrollHourConcept(type: string, special: boolean): string {
  if (['hedo', 'hedf', 'extra_diurna'].includes(type)) return special ? 'hedf' : 'hedo';
  if (['heno', 'henf', 'extra_nocturna'].includes(type)) return special ? 'henf' : 'heno';
  if (['rn', 'rnf', 'recargo_nocturno'].includes(type)) return special ? 'rnf' : 'rn';
  return type;
}

export interface PayrollDatedRecord {
  id: string;
  employee_id: string;
  employment_cycle_id?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export function payrollHistoryAt<T extends PayrollDatedRecord>(records: T[], date: string, cycleId?: string | null): T | undefined {
  return records.filter(record =>
    (cycleId === undefined || (record.employment_cycle_id ?? null) === cycleId)
    && !!(record.valid_from || record.start_date)
    && (record.valid_from || record.start_date)! <= date
    && (!(record.valid_to || record.end_date) || (record.valid_to || record.end_date)! >= date)
  ).sort((a, b) => (b.valid_from || b.start_date || '').localeCompare(a.valid_from || a.start_date || '') || a.id.localeCompare(b.id))[0];
}
