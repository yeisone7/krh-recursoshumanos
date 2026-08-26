import { describe, expect, it } from 'vitest';

import {
  buildIncapacityEmployerCostSummary,
  buildIncapacityDurationBuckets,
  buildMonthlyEpsRecovery,
  getActualRecoveryPayment,
} from './incapacityAnalytics';

describe('incapacity analytics', () => {
  it('groups cases, percentages and amounts into two duration bands', () => {
    const result = buildIncapacityDurationBuckets([
      { total_days: 1, total_amount: 100_000, employee: { employee_social_security: [{ risk_level: 'I', is_current: true }] } },
      { total_days: 2, total_amount: 200_000, employee: { employee_social_security: [{ risk_level: 'I', is_current: true }] } },
      { total_days: 3, total_amount: 400_000, employee: { employee_social_security: [{ risk_level: 'V', is_current: true }] } },
    ], {
      pension_employer_rate: 0.12,
      arl_rate_i: 0.00522,
      arl_rate_v: 0.0696,
      ccf_rate: 0.04,
    });

    expect(result).toEqual([
      expect.objectContaining({
        key: 'one_two_days',
        cases: 2,
        casePercentage: 66.7,
        amount: 300_000,
        amountPercentage: 42.9,
        employerCost: expect.objectContaining({ paymentBase: 300_000, additionalCost: 115_076, totalCost: 415_076 }),
      }),
      expect.objectContaining({
        key: 'three_plus_days',
        cases: 1,
        casePercentage: 33.3,
        amount: 400_000,
        amountPercentage: 57.1,
        employerCost: expect.objectContaining({ paymentBase: 400_000, additionalCost: 179_186, totalCost: 579_186 }),
      }),
    ]);
  });

  it('totals employer costs using each affected employee ARL risk level', () => {
    const result = buildIncapacityEmployerCostSummary([
      {
        total_amount: 100_000,
        employee: { employee_social_security: [{ risk_level: 'I', is_current: true }] },
      },
      {
        total_amount: 100_000,
        employee: { employee_social_security: [{ risk_level: 'V', is_current: true }] },
      },
    ], {
      pension_employer_rate: 0.12,
      arl_rate_i: 0.00522,
      arl_rate_v: 0.0696,
      ccf_rate: 0.04,
    });

    expect(result.paymentBase).toBe(200_000);
    expect(result.benefits.map((item) => item.amount)).toEqual([16_666, 2_000, 16_666, 8_340]);
    expect(result.contributions.map((item) => item.amount)).toEqual([0, 24_000, 7_482, 8_000]);
    expect(result.benefits.find((item) => item.key === 'vacation')?.rate).toBe(0.0417);
    expect(result.contributions.find((item) => item.key === 'health')?.rate).toBe(0);
    expect(result.contributions.find((item) => item.key === 'arl')?.rate).toBe(0.03741);
    expect(result.additionalCost).toBe(83_154);
    expect(result.totalCost).toBe(283_154);
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

  it('assigns the recovered amount to the month of the actual payment date', () => {
    expect(getActualRecoveryPayment({
      start_date: '2026-07-09',
      actual_payment_date: '2026-08-28',
      recovered_amount: 2_160_667,
      recovery_status: 'pagado',
    })).toEqual({ monthKey: '2026-08', amount: 2_160_667 });
  });

  it('does not infer a recovered value without an actual payment date', () => {
    expect(getActualRecoveryPayment({
      actual_payment_date: null,
      recovered_amount: 2_160_667,
      recovery_status: 'pagado',
    })).toBeNull();
  });

  it('does not replace a recorded zero with the estimated amount', () => {
    expect(getActualRecoveryPayment({
      actual_payment_date: '2026-08-28',
      recovered_amount: 0,
      eps_amount: 2_160_667,
      recovery_status: 'pagado',
    })).toEqual({ monthKey: '2026-08', amount: 0 });
  });
});
