import { describe, expect, it, vi } from 'vitest';

import {
  fetchAllAnalyticsRows,
  isOperationallyActiveEmployee,
} from './employeeAnalyticsData';

// Regression: employee analytics stopped at the first 1,000 rows and disagreed on active status
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-dashboard-2026-08-25.md
describe('employee analytics data', () => {
  it('loads every page after the first 1,000 rows', async () => {
    const source = Array.from({ length: 1037 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const rows = await fetchAllAnalyticsRows(fetchPage);

    expect(rows).toHaveLength(1037);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('does not count an employee in retirement as operationally active', () => {
    expect(isOperationallyActiveEmployee({ is_active: true, status: 'active' })).toBe(true);
    expect(isOperationallyActiveEmployee({ is_active: true, status: 'en_retiro' })).toBe(false);
    expect(isOperationallyActiveEmployee({ is_active: false, status: 'active' })).toBe(false);
  });
});
