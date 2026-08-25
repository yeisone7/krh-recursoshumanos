import { describe, expect, it } from 'vitest';

import { indexCurrentOrLatestByEmployee, resolveEmployeePosition } from './employeeAnalyticsMetrics';

// Regression: ISSUE-005 — the position chart showed historical employees as "Sin cargo".
// Found by /qa on 2026-08-25.
// Report: .gstack/qa-reports/qa-report-analitica-empleados-centros-2026-08-25.md
describe('employee analytics position resolution', () => {
  it('recovers the position from the latest historical work record', () => {
    const indexed = indexCurrentOrLatestByEmployee([
      {
        id: 'old-work-info',
        employee_id: 'retired-employee',
        is_current: false,
        created_at: '2024-01-01T10:00:00Z',
        position_name: 'Auxiliar General',
      },
      {
        id: 'latest-work-info',
        employee_id: 'retired-employee',
        is_current: false,
        created_at: '2025-01-01T10:00:00Z',
        position_name: 'Cocinero',
      },
    ]);

    expect(resolveEmployeePosition(indexed['retired-employee'])).toBe('Cocinero');
  });

  it('uses the position catalog when the duplicated name is empty', () => {
    expect(resolveEmployeePosition({
      position_name: '   ',
      positions: { name: 'Conductor' },
    })).toBe('Conductor');
  });

  it('only reports a missing position when neither source has a name', () => {
    expect(resolveEmployeePosition({ position_name: null, positions: null })).toBeNull();
  });
});
