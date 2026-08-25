import { describe, expect, it } from 'vitest';

import { countTerminationsForMonth } from './employeeAnalyticsMetrics';

// Regression: ISSUE-002 — the retirement trend used sparse work-info dates instead of termination events.
// Found by /qa on 2026-08-25.
// Report: .gstack/qa-reports/qa-report-analitica-empleados-2026-08-25.md
describe('employee retirement trend', () => {
  it('counts official termination events for the selected employees and month', () => {
    const terminations = [
      { employee_id: 'employee-1', effective_date: '2026-08-10' },
      { employee_id: 'employee-1', effective_date: '2026-08-20' },
      { employee_id: 'employee-2', effective_date: '2026-08-15' },
      { employee_id: 'employee-1', effective_date: '2026-07-31' },
    ];

    expect(countTerminationsForMonth(terminations, new Set(['employee-1']), '2026-08')).toBe(2);
  });
});
