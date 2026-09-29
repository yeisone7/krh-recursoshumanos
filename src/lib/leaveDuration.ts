import { differenceInCalendarDays } from 'date-fns';
import { parseDateOnly } from '@/lib/dateOnly';

/** Full-day leave includes both endpoints, Sundays and holidays. */
export function calculateLeaveCalendarDays(
  startDate: Date | string | undefined,
  endDate: Date | string | undefined,
): number {
  const start = typeof startDate === 'string' ? parseDateOnly(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseDateOnly(endDate) : endDate;
  if (!start || !end) return 0;

  const days = differenceInCalendarDays(end, start) + 1;
  return Number.isFinite(days) ? Math.max(0, days) : 0;
}
