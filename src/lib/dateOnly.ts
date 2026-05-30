import { format } from 'date-fns';
import type { Locale } from 'date-fns';

export function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;

  const datePart = value.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day, 12);
}

export function parseDateOnlyOr(value: string | null | undefined, fallback: Date): Date {
  return parseDateOnly(value) ?? fallback;
}

export function toDateOnlyString(date: Date | string | null | undefined): string {
  if (!date) return '';

  if (typeof date === 'string') {
    const parsed = parseDateOnly(date);
    return parsed ? format(parsed, 'yyyy-MM-dd') : date.split('T')[0] || '';
  }

  return format(date, 'yyyy-MM-dd');
}

export function todayDateOnlyString(): string {
  return toDateOnlyString(new Date());
}

export function formatDateOnly(
  value: Date | string | null | undefined,
  dateFormat: string,
  options?: { locale?: Locale }
): string {
  if (!value) return '';

  const date = typeof value === 'string' ? parseDateOnly(value) : value;
  if (!date || isNaN(date.getTime())) return '';

  return format(date, dateFormat, options);
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function calculateInclusiveMonthSpan(startDate: Date, endDate: Date): number {
  const exclusiveEndDate = new Date(endDate);
  exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

  let months =
    (exclusiveEndDate.getFullYear() - startDate.getFullYear()) * 12 +
    (exclusiveEndDate.getMonth() - startDate.getMonth());

  if (exclusiveEndDate.getDate() < startDate.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}
