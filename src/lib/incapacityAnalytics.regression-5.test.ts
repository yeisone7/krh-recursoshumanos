import { describe, expect, it } from 'vitest';

import { hasIncapacityStartedBy } from './incapacityAnalytics';

// Regression: ISSUE-007 — "Todo el histórico" incluía incapacidades con inicio futuro
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity analytics historical cutoff', () => {
  const cutoff = new Date('2026-08-25T23:59:59');

  it('includes records that have started by the cutoff date', () => {
    expect(hasIncapacityStartedBy({ start_date: '2026-08-25' }, cutoff)).toBe(true);
  });

  it('excludes future records from historical totals', () => {
    expect(hasIncapacityStartedBy({ start_date: '2026-09-09' }, cutoff)).toBe(false);
  });
});
