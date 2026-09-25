import { addDays, differenceInCalendarDays, format, isValid, parseISO, startOfDay } from 'date-fns';
import { applyRecoveryStatusToPaymentDistribution, calculatePaymentDistribution, getLegalMinimumMonthlyWage, type IncapacityOrigin } from '@/types/incapacity';
import type { IncapacityAnalyticsRow } from './incapacityAnalytics';

export type AllocationSource = IncapacityAnalyticsRow & {
  end_date?: string | null;
  origin?: IncapacityOrigin;
  daily_base_salary?: number | null;
  accumulatedDays?: number;
};

export interface AllocationMetadata {
  original: AllocationSource;
  originalDays: number;
  effectiveStart: string;
  effectiveEnd: string;
  cutoff: Date;
}

export function parseIncapacityDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : null;
}

export function hasValidIncapacityInterval(row: AllocationSource) {
  const start = parseIncapacityDate(row.start_date);
  const end = parseIncapacityDate(row.end_date);
  return !!start && !!end && start <= end;
}

// Cumulative cent rounding makes adjacent slices add back to the recorded amount.
function portion(amount: number | null | undefined, before: number, through: number, total: number) {
  if (!total) return 0;
  const cents = Math.round(Math.max(0, Number(amount || 0)) * 100);
  return (Math.round(cents * through / total) - Math.round(cents * before / total)) / 100;
}

/** An immutable view of a certificate over a calendar interval, inclusive of today. */
export function allocateIncapacity<T extends AllocationSource>(
  row: T,
  range: { start: Date; end: Date } | null,
  cutoff = new Date(),
): (T & { allocation: AllocationMetadata }) | null {
  const prior = (row as T & { allocation?: AllocationMetadata }).allocation;
  const source = prior?.original || row;
  const start = parseIncapacityDate(source.start_date);
  const end = parseIncapacityDate(source.end_date);
  if (!start || !end || start > end) return null;
  const cutoffDay = startOfDay(cutoff);
  const effectiveStart = new Date(Math.max(start.getTime(), range ? startOfDay(range.start).getTime() : start.getTime(), prior ? parseISO(prior.effectiveStart).getTime() : start.getTime()));
  const effectiveEnd = new Date(Math.min(end.getTime(), cutoffDay.getTime(), range ? startOfDay(range.end).getTime() : end.getTime(), prior ? parseISO(prior.effectiveEnd).getTime() : end.getTime()));
  if (effectiveStart > effectiveEnd) return null;
  const originalDays = differenceInCalendarDays(end, start) + 1;
  const before = differenceInCalendarDays(effectiveStart, start);
  const through = differenceInCalendarDays(effectiveEnd, start) + 1;
  const offset = source.accumulatedDays || 0;
  const distribution = calculatePaymentDistribution(source.origin || 'comun', originalDays,
    source.daily_base_salary || 0, offset, getLegalMinimumMonthlyWage(start));
  const segments = (source.recovery_status === 'asumido_empresa'
    ? applyRecoveryStatusToPaymentDistribution(distribution, 'asumido_empresa', originalDays, offset)
    : distribution).segments;
  const result = {
    ...row,
    total_days: through - before,
    total_amount: portion(source.total_amount, before, through, originalDays),
    employer_days: 0, eps_days: 0, arl_days: 0, afp_days: 0,
    eps_amount: 0, arl_amount: 0, afp_amount: 0,
    recovered_amount: 0,
    allocation: { original: source, originalDays, effectiveStart: format(effectiveStart, 'yyyy-MM-dd'), effectiveEnd: format(effectiveEnd, 'yyyy-MM-dd'), cutoff: cutoffDay },
  };
  for (const payer of ['employer', 'eps', 'arl', 'afp'] as const) {
    const payerSegments = segments.filter(segment => {
      const responsible = segment.responsible === 'empleador' ? 'employer' : segment.responsible === 'eps_541_plus' ? 'eps' : segment.responsible;
      return responsible === payer;
    });
    let days = 0;
    let weightBefore = 0;
    let weightThrough = 0;
    let weightTotal = 0;
    for (const segment of payerSegments) {
      const segmentStart = segment.fromDay - offset - 1;
      const covered = (boundary: number) => Math.max(0, Math.min(segment.days, boundary - segmentStart));
      days += covered(through) - covered(before);
      const dailyWeight = segment.amount / segment.days;
      weightBefore += covered(before) * dailyWeight;
      weightThrough += covered(through) * dailyWeight;
      weightTotal += segment.amount;
    }
    result[`${payer}_days`] = days;
    if (payer !== 'employer') result[`${payer}_amount`] = portion(source[`${payer}_amount`], weightBefore, weightThrough, weightTotal);
  }
  const expected = source.recovery_status === 'asumido_empresa' ? 0 :
    Number(source.eps_amount || 0) + Number(source.arl_amount || 0) + Number(source.afp_amount || 0);
  const allocatedExpected = result.eps_amount + result.arl_amount + result.afp_amount;
  const paidDate = parseIncapacityDate(source.actual_payment_date);
  // This is a recovery allocation for the cohort, not a cash-flow payment.
  result.recovered_amount = paidDate && paidDate <= cutoffDay && expected > 0
    ? Math.min(expected, Math.max(0, Number(source.recovered_amount || 0))) * allocatedExpected / expected : 0;
  return result;
}

export function allocationWeekdays(row: { allocation: AllocationMetadata }) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const end = parseISO(row.allocation.effectiveEnd);
  for (let date = parseISO(row.allocation.effectiveStart); date <= end; date = addDays(date, 1)) {
    counts[(date.getDay() + 6) % 7]++;
  }
  return counts;
}
