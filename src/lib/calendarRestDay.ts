import { parseDateOnlyOr } from '@/lib/dateOnly';
import { getPayrollRestDay } from '@/lib/payrollRestDay';
import { isNonWorkingShift, type ShiftClassificationSource } from '@/lib/shiftClassification';

export interface CalendarRestSchedule {
  id: string;
  employee_id: string;
  employment_cycle_id: string | null;
  rest_day: string | null;
  valid_from: string;
  valid_to: string | null;
}

interface EmploymentPeriod { id: string; start_date: string; end_date: string | null }

/** Resolve history by date, never borrow the current rest day from another employment cycle. */
export function calendarRestWeekday(
  schedules: CalendarRestSchedule[], cycles: EmploymentPeriod[], date: string,
): number | null {
  const matchingCycles = cycles.filter(c => c.start_date <= date && (!c.end_date || c.end_date >= date));
  if (cycles.length && matchingCycles.length !== 1) return null;
  const cycleId = matchingCycles[0]?.id ?? null;
  const schedule = schedules.filter(s => s.employment_cycle_id === cycleId && s.valid_from <= date && (!s.valid_to || s.valid_to >= date))
    .sort((a, b) => b.valid_from.localeCompare(a.valid_from) || a.id.localeCompare(b.id))[0];
  return getPayrollRestDay(schedule?.rest_day);
}

export function hasWorkOnMandatoryRestDay({ date, restWeekday, hasAssignment, shift, adminIsWorkDay, hasAbsence }: {
  date: string;
  restWeekday: number | null;
  hasAssignment: boolean;
  shift?: ShiftClassificationSource | null;
  adminIsWorkDay: boolean;
  hasAbsence: boolean;
}): boolean {
  if (restWeekday === null || parseDateOnlyOr(date, new Date(NaN)).getDay() !== restWeekday) return false;
  if (hasAssignment) return !!shift && !isNonWorkingShift(shift);
  return adminIsWorkDay && !hasAbsence;
}
