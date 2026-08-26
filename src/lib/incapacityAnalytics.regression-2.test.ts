import { describe, expect, it } from 'vitest';

import { getEarliestIncapacityStartDate } from './incapacityAnalytics';

// Regression: ISSUE-003 — el histórico comenzaba en la prórroga final del caso más antiguo
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity analytics historical range', () => {
  it('uses the earliest start date regardless of row order or later extensions', () => {
    const fallback = new Date('2025-09-01T00:00:00');
    const result = getEarliestIncapacityStartDate([
      { start_date: '2026-08-20' },
      { start_date: '2024-04-15' },
      { start_date: '2023-10-29' },
      { start_date: '2026-08-19' },
    ], fallback);

    expect(result.getFullYear()).toBe(2023);
    expect(result.getMonth()).toBe(9);
    expect(result.getDate()).toBe(29);
  });

  it('uses the fallback when no row has a valid start date', () => {
    const fallback = new Date('2025-09-01T00:00:00');

    expect(getEarliestIncapacityStartDate([
      { start_date: null },
      { start_date: 'invalid' },
    ], fallback)).toBe(fallback);
  });
});
