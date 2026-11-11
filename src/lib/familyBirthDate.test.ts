import { describe, expect, it } from 'vitest';
import { familyAgeLabel, familyAgeOn, familyCalendarDate, isFamilyBirthDate } from './familyBirthDate';

describe('family birth dates', () => {
  it('uses the Colombian calendar at the UTC day boundary', () => {
    expect(familyCalendarDate(new Date('2026-11-11T04:59:59Z'))).toBe('2026-11-10');
    expect(familyCalendarDate(new Date('2026-11-11T05:00:00Z'))).toBe('2026-11-11');
  });

  it('accepts real calendar days up to and including today', () => {
    const today = '2026-11-11';
    expect(isFamilyBirthDate(today, today)).toBe(true);
    expect(isFamilyBirthDate('2026-11-12', today)).toBe(false);
    expect(isFamilyBirthDate('2025-02-29', today)).toBe(false);
    expect(isFamilyBirthDate('2024-02-29', today)).toBe(true);
    expect(isFamilyBirthDate('2024-04-31', today)).toBe(false);
    expect(isFamilyBirthDate('2024-02-9', today)).toBe(false);
  });

  it('counts years at the birthday and counts leap-day anniversaries from March 1 in other years', () => {
    expect(familyAgeOn('2026-11-11', '2026-11-11')).toBe(0);
    expect(familyAgeOn('2020-11-11', '2026-11-10')).toBe(5);
    expect(familyAgeOn('2020-11-11', '2026-11-11')).toBe(6);
    expect(familyAgeOn('2024-02-29', '2025-02-28')).toBe(0);
    expect(familyAgeOn('2024-02-29', '2025-03-01')).toBe(1);
  });

  it('preserves recorded age zero and prefers a real birth date', () => {
    expect(familyAgeLabel(null, 0)).toBe('Edad registrada: 0 años');
    expect(familyAgeLabel(undefined, undefined)).toBe('Sin fecha registrada');
    expect(familyAgeLabel(familyCalendarDate(), 5)).toBe('0 años');
  });
});
