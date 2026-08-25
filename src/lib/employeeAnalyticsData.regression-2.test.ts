import { describe, expect, it } from 'vitest';

import { keepFirstRowPerEmployee } from './employeeAnalyticsData';

// Regression: ISSUE-002 — duplicate current work rows inflated Dashboard distributions and tenure
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-dashboard-2026-08-25.md
describe('Dashboard employee work data', () => {
  it('keeps only the newest pre-sorted work row for each employee', () => {
    const rows = [
      { employee_id: 'employee-1', created_at: '2026-08-25', link_type: 'indefinido' },
      { employee_id: 'employee-1', created_at: '2026-08-24', link_type: 'fijo' },
      { employee_id: 'employee-2', created_at: '2026-08-23', link_type: 'obra_labor' },
    ];

    expect(keepFirstRowPerEmployee(rows)).toEqual([rows[0], rows[2]]);
  });
});
