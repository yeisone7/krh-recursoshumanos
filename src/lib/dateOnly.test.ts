import { describe, expect, it } from 'vitest';
import { formatDateOnly, parseDateOnly, toDateOnlyString } from './dateOnly';

describe('date-only values', () => {
  it('preserves the calendar day when a persisted date is opened and saved again', () => {
    const persistedDate = '2026-08-20';
    const formDate = parseDateOnly(persistedDate);

    expect(formDate).toBeDefined();
    expect(toDateOnlyString(formDate)).toBe(persistedDate);
    expect(formatDateOnly(persistedDate, 'dd/MM/yyyy')).toBe('20/08/2026');
  });
});
