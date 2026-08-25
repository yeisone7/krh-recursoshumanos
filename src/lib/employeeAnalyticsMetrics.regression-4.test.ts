import { describe, expect, it } from 'vitest';

import { indexCurrentOrLatestByEmployee, resolveEmployeeCenter } from './employeeAnalyticsMetrics';

// Regression: ISSUE-004 — employee analytics discarded historical work information and showed false "Sin centro" rows.
// Found by /qa on 2026-08-25.
// Report: .gstack/qa-reports/qa-report-analitica-empleados-centros-2026-08-25.md
describe('employee analytics historical work information', () => {
  it('keeps the latest historical record when an employee has no current work record', () => {
    const indexed = indexCurrentOrLatestByEmployee([
      {
        id: 'older-history',
        employee_id: 'retired-employee',
        is_current: false,
        created_at: '2024-01-01T10:00:00Z',
        operation_center_id: 'center-1',
      },
      {
        id: 'latest-history',
        employee_id: 'retired-employee',
        is_current: false,
        created_at: '2025-01-01T10:00:00Z',
        operation_center_id: 'center-2',
      },
    ]);

    expect(indexed['retired-employee'].operation_center_id).toBe('center-2');
  });

  it('prefers a current record even when a historical row was created later', () => {
    const indexed = indexCurrentOrLatestByEmployee([
      {
        id: 'current',
        employee_id: 'active-employee',
        is_current: true,
        created_at: '2025-01-01T10:00:00Z',
        operation_center_id: 'current-center',
      },
      {
        id: 'historical',
        employee_id: 'active-employee',
        is_current: false,
        created_at: '2026-01-01T10:00:00Z',
        operation_center_id: 'historical-center',
      },
    ]);

    expect(indexed['active-employee'].operation_center_id).toBe('current-center');
  });

  it('uses the assignment table when work information has no center', () => {
    expect(resolveEmployeeCenter(
      { operation_center_id: null, operation_centers: null },
      { operation_center_id: 'assigned-center', operation_centers: { id: 'assigned-center', name: 'Hidroituango' } },
    )).toEqual({ id: 'assigned-center', name: 'Hidroituango' });
  });
});
