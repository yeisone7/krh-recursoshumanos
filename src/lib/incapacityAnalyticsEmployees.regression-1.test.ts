import { describe, expect, it, vi } from 'vitest';

import {
  fetchAllAnalyticsRows,
  isOperationallyActiveEmployee,
} from './employeeAnalyticsData';

// Regression: ISSUE-002 — el límite de 1.000 filas ocultaba empleados activos del denominador
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity analytics employee denominator', () => {
  it('counts operationally active employees across every Supabase page', async () => {
    const firstPageActive = Array.from({ length: 760 }, (_, index) => ({
      id: `active-first-${index}`,
      is_active: true,
      status: 'active',
    }));
    const firstPageInactive = Array.from({ length: 240 }, (_, index) => ({
      id: `retired-first-${index}`,
      is_active: false,
      status: 'retired',
    }));
    const secondPageActive = Array.from({ length: 32 }, (_, index) => ({
      id: `active-second-${index}`,
      is_active: true,
      status: 'active',
    }));
    const secondPageInactive = [
      { id: 'retired-second-1', is_active: false, status: 'retired' },
      { id: 'retired-second-2', is_active: false, status: 'retired' },
      { id: 'retired-second-3', is_active: false, status: 'retired' },
      { id: 'inactive-active-status', is_active: false, status: 'active' },
      { id: 'retirement-in-progress', is_active: true, status: 'en_retiro' },
    ];
    const source = [
      ...firstPageActive,
      ...firstPageInactive,
      ...secondPageActive,
      ...secondPageInactive,
    ];
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const employees = await fetchAllAnalyticsRows(fetchPage);

    expect(source.slice(0, 1000).filter(isOperationallyActiveEmployee)).toHaveLength(760);
    expect(employees).toHaveLength(1037);
    expect(employees.filter(isOperationallyActiveEmployee)).toHaveLength(792);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
