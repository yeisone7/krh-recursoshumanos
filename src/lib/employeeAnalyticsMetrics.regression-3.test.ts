import { describe, expect, it } from 'vitest';

import { getEffectiveContractEndDate, isContractCurrent } from './employeeAnalyticsMetrics';

// Regression: ISSUE-003 — employee analytics ignored contract extensions when determining validity.
// Found by /qa on 2026-08-25.
// Report: .gstack/qa-reports/qa-report-analitica-empleados-2026-08-25.md
describe('employee analytics contract validity', () => {
  const today = new Date(2026, 7, 25, 12);

  it('uses the latest extension instead of the expired original end date', () => {
    const contract = {
      employee_id: 'employee-1',
      end_date: '2025-12-31',
      is_terminated: false,
      contract_extensions: [
        { id: 'first', end_date: '2026-06-30', extension_number: 1 },
        { id: 'latest', end_date: '2026-12-31', extension_number: 2 },
      ],
    };

    expect(getEffectiveContractEndDate(contract)).toBe('2026-12-31');
    expect(isContractCurrent(contract, today)).toBe(true);
  });

  it('rejects terminated or effectively expired contracts', () => {
    expect(isContractCurrent({ employee_id: 'employee-1', end_date: '2026-08-24', is_terminated: false }, today)).toBe(false);
    expect(isContractCurrent({ employee_id: 'employee-1', end_date: null, is_terminated: true }, today)).toBe(false);
  });
});
