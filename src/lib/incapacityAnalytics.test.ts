import { describe, expect, it } from 'vitest';

import { buildIncapacityDurationBuckets, buildMonthlyEpsRecovery } from './incapacityAnalytics';

describe('incapacity analytics', () => {
  it('groups cases, percentages and amounts into two duration bands', () => {
    const result = buildIncapacityDurationBuckets([
      { total_days: 1, total_amount: 100 },
      { total_days: 1, total_amount: 300 },
      { total_days: 2, total_amount: 200 },
      { total_days: 3, total_amount: 400 },
      { total_days: 12, total_amount: 1000 },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ key: 'one_two_days', cases: 3, casePercentage: 60, amount: 600, amountPercentage: 30 }),
      expect.objectContaining({ key: 'three_plus_days', cases: 2, casePercentage: 40, amount: 1400, amountPercentage: 70 }),
    ]);
  });

  it('groups EPS recovery by month and entity and calculates pending values', () => {
    const result = buildMonthlyEpsRecovery([
      { start_date: '2026-08-02', eps_name: 'EPS Salud', eps_amount: 1000, recovered_amount: 250, recovery_status: 'en_tramite' },
      { start_date: '2026-08-18', eps_name: 'EPS Salud', eps_amount: 500, recovered_amount: 0, recovery_status: 'pagado' },
      { start_date: '2026-07-10', eps_name: 'Otra EPS', eps_amount: 800, recovered_amount: 0, recovery_status: 'pendiente' },
      { start_date: '2026-08-20', eps_name: 'Sin recobro', eps_amount: 0, recovered_amount: 0, recovery_status: 'pendiente' },
    ]);

    expect(result).toEqual([
      expect.objectContaining({ monthKey: '2026-08', epsName: 'EPS Salud', cases: 2, expected: 1500, recovered: 750, pending: 750, recoveryPercentage: 50 }),
      expect.objectContaining({ monthKey: '2026-07', epsName: 'Otra EPS', cases: 1, expected: 800, recovered: 0, pending: 800, recoveryPercentage: 0 }),
    ]);
  });
});
