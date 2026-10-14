import { describe, expect, it } from 'vitest';
import { getApplicableComplianceCourses, isTrainingTokenInPeriod, isEmployeeApplicableToTrainingPeriod } from './useTrainingCompliance';

describe('hire month applicability', () => {
  it.each([
    ['2026-10-20', 2026, 9, false],
    ['2026-10-31', 2026, 10, true],
    ['2026-10-01', 2026, 10, true],
    ['2026-10-20', 2026, 11, true],
    ['2026-12-31', 2027, 1, true],
    ['2027-01-01', 2026, 12, false],
    [null, 2026, 9, true],
  ])('compares %s against %s-%s by calendar month', (hireDate, year, month, expected) => {
    expect(isEmployeeApplicableToTrainingPeriod(hireDate, { year, month })).toBe(expected);
  });
});

describe('isTrainingTokenInPeriod', () => {
  it('uses Colombia calendar months at UTC month boundaries', () => {
    expect(isTrainingTokenInPeriod({ created_at: '2026-10-01T02:00:00Z' }, { year: 2026, month: 9 })).toBe(true);
  });
  it('includes a training link in the month when it was generated', () => {
    const token = { created_at: '2026-08-21T16:37:00.552Z' };

    expect(isTrainingTokenInPeriod(token, { year: 2026, month: 8 })).toBe(true);
    expect(isTrainingTokenInPeriod(token, { year: 2026, month: 6 })).toBe(false);
  });
});

describe('getApplicableComplianceCourses', () => {
  const courses = [
    { id: 'bienestar', name: 'Bienestar financiero' },
    { id: 'plagas', name: 'CONTROL DE PLAGAS' },
  ];

  it('includes every active catalog course when no period is selected', () => {
    const result = getApplicableComplianceCourses(
      courses,
      null,
      null,
      new Set(['bienestar'])
    );

    expect(result).toEqual(courses);
  });

  it('includes courses configured for the period even without a center link', () => {
    const result = getApplicableComplianceCourses(
      courses,
      { year: 2026, month: 8 },
      new Set(['plagas']),
      new Set(['bienestar'])
    );

    expect(result.map((course) => course.id)).toEqual(['bienestar', 'plagas']);
  });
});
