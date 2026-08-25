import { describe, expect, it } from 'vitest';

import { indexLatestByEmployee, isHireWithinLastDays } from './employeeAnalyticsMetrics';

// Regression: ISSUE-001 — employee analytics used arbitrary current rows and record creation dates.
// Found by /qa on 2026-08-25.
// Report: .gstack/qa-reports/qa-report-analitica-empleados-2026-08-25.md
describe('employee analytics metrics', () => {
  it('selects the newest current row for each employee', () => {
    const rows = [
      { id: 'older', employee_id: 'employee-1', created_at: '2026-08-01T10:00:00Z' },
      { id: 'newest', employee_id: 'employee-1', created_at: '2026-08-02T10:00:00Z' },
      { id: 'only', employee_id: 'employee-2', created_at: '2026-08-01T10:00:00Z' },
    ];

    const indexed = indexLatestByEmployee(rows);

    expect(indexed['employee-1'].id).toBe('newest');
    expect(indexed['employee-2'].id).toBe('only');
  });

  it('counts recent hires from the employment date and excludes future hires', () => {
    const today = new Date(2026, 7, 25, 12);

    expect(isHireWithinLastDays('2026-07-26', 30, today)).toBe(true);
    expect(isHireWithinLastDays('2026-07-25', 30, today)).toBe(false);
    expect(isHireWithinLastDays('2026-08-26', 30, today)).toBe(false);
    expect(isHireWithinLastDays(null, 30, today)).toBe(false);
  });
});
