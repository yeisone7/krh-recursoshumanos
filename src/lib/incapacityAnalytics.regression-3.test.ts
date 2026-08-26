import { describe, expect, it } from 'vitest';

import { buildLegalResponsibilityDays } from './incapacityAnalytics';

// Regression: ISSUE-004 — todos los días de una cadena se asignaban a su responsable final
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity legal responsibility distribution', () => {
  it('adds the persisted day allocation instead of reclassifying complete chains', () => {
    const result = buildLegalResponsibilityDays([
      { total_days: 120, employer_days: 2, eps_days: 118, afp_days: 0, arl_days: 0 },
      { total_days: 100, employer_days: 0, eps_days: 60, afp_days: 40, arl_days: 0 },
      { total_days: 15, employer_days: 1, eps_days: 0, afp_days: 0, arl_days: 14 },
    ]);

    expect(result).toEqual([
      { name: 'EPS', value: 178 },
      { name: 'Empleador', value: 3 },
      { name: 'AFP', value: 40 },
      { name: 'ARL', value: 14 },
    ]);
    expect(result.reduce((total, item) => total + item.value, 0)).toBe(235);
  });
});
