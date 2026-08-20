import { describe, expect, it } from 'vitest';

import { buildVacationBalanceSummaries } from './vacationBalances';
import type { VacationBalance } from '@/types/vacation';

const balance = (overrides: Partial<VacationBalance>): VacationBalance => ({
  id: crypto.randomUUID(),
  employee_id: 'employee-1',
  company_id: 'company-1',
  employment_cycle_id: 'cycle-1',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  days_accrued: 10,
  days_adjusted: 0,
  days_taken: 2,
  days_compensated: 1,
  days_reserved: 1,
  days_pending: 7,
  days_available: 6,
  is_accumulated: false,
  accumulation_expires: null,
  accrual_source: 'automatic',
  last_accrual_date: '2026-08-20',
  period_status: 'open',
  automatic_period_key: 'cycle-1:2026-01-01',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-08-20T00:00:00Z',
  employee: { id: 'employee-1', first_name: 'Ana', last_name: 'Pérez', document_number: '123' },
  ...overrides,
});

describe('buildVacationBalanceSummaries', () => {
  it('consolida períodos y separa el saldo reservado del disponible', () => {
    const result = buildVacationBalanceSummaries([
      balance({}),
      balance({ id: 'balance-2', period_start: '2025-01-01', period_end: '2025-12-31', days_accrued: 15, days_taken: 5, days_compensated: 0, days_reserved: 0, days_available: 10 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      days_accrued: 25,
      days_taken: 7,
      days_compensated: 1,
      days_reserved: 1,
      days_available: 16,
    });
    expect(result[0].periods.map((period) => period.period_start)).toEqual(['2026-01-01', '2025-01-01']);
  });
});
