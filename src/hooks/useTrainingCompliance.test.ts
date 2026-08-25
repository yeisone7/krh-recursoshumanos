import { describe, expect, it } from 'vitest';
import { isTrainingTokenInPeriod } from './useTrainingCompliance';

describe('isTrainingTokenInPeriod', () => {
  it('includes a training link in the month when it was generated', () => {
    const token = { created_at: '2026-08-21T16:37:00.552Z' };

    expect(isTrainingTokenInPeriod(token, { year: 2026, month: 8 })).toBe(true);
    expect(isTrainingTokenInPeriod(token, { year: 2026, month: 6 })).toBe(false);
  });
});
