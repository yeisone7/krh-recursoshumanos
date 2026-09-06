import { describe, expect, it } from 'vitest';
import { getApplicableComplianceCourses, isTrainingTokenInPeriod } from './useTrainingCompliance';

describe('isTrainingTokenInPeriod', () => {
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
