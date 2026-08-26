import { describe, expect, it } from 'vitest';

import { countOperationallyActiveAffectedEmployees } from './employeeAnalyticsData';

// Regression: ISSUE-005 — el indicador mezclaba afectados históricos con la planta activa
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity analytics affected active employees', () => {
  it('counts only affected employees who are still operationally active', () => {
    const employees = [
      { id: 'active-affected', is_active: true, status: 'active' },
      { id: 'active-unaffected', is_active: true, status: 'active' },
      { id: 'retired-affected', is_active: false, status: 'retired' },
      { id: 'leaving-affected', is_active: true, status: 'en_retiro' },
    ];

    expect(
      countOperationallyActiveAffectedEmployees(
        employees,
        ['active-affected', 'retired-affected', 'leaving-affected'],
      ),
    ).toBe(1);
  });
});
