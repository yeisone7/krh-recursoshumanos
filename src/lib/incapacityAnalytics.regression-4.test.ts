import { describe, expect, it } from 'vitest';

import { getLongCaseShare } from './incapacityAnalytics';

// Regression: ISSUE-006 — la infografía mostraba un índice sintético como si fuera una métrica real
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity analytics long-case share', () => {
  it('reports the auditable percentage of cases longer than 30 days', () => {
    expect(getLongCaseShare(17, 565)).toBe(3);
  });

  it('returns zero when there are no filtered cases', () => {
    expect(getLongCaseShare(0, 0)).toBe(0);
  });
});
