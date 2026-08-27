import { describe, expect, it } from 'vitest';
import { buildDateOnlyFromParts, formatDateOnly, parseDateOnly, toDateOnlyString } from './dateOnly';

describe('date-only values', () => {
  it('preserves the calendar day when a persisted date is opened and saved again', () => {
    const persistedDate = '2026-08-20';
    const formDate = parseDateOnly(persistedDate);

    expect(formDate).toBeDefined();
    expect(toDateOnlyString(formDate)).toBe(persistedDate);
    expect(formatDateOnly(persistedDate, 'dd/MM/yyyy')).toBe('20/08/2026');
  });

  it('builds distant birth dates without requiring calendar navigation', () => {
    expect(buildDateOnlyFromParts('1970', '8', '27')).toBe('1970-08-27');
    expect(buildDateOnlyFromParts('2000', '2', '29')).toBe('2000-02-29');
  });

  it('rejects impossible or incomplete dates', () => {
    expect(buildDateOnlyFromParts('1970', '2', '30')).toBe('');
    expect(buildDateOnlyFromParts('70', '8', '27')).toBe('');
    expect(buildDateOnlyFromParts('1970', '', '27')).toBe('');
  });
});
