import { describe, expect, it } from 'vitest';

import { getIncapacityRecoveryAmounts } from './incapacityAnalytics';

// Regression: ISSUE-001 — los excedentes recuperados reducían el saldo pendiente de otros casos
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-analitica-incapacidades-2026-08-25.md
describe('incapacity recovery amounts', () => {
  it('caps recovered money at the recoverable base for each case', () => {
    expect(getIncapacityRecoveryAmounts({
      eps_amount: 100,
      arl_amount: 50,
      afp_amount: 25,
      recovered_amount: 220,
      recovery_status: 'pagado',
    })).toEqual({ expected: 175, recovered: 175, pending: 0 });
  });

  it('uses the full recoverable base when a paid case has no recorded amount', () => {
    expect(getIncapacityRecoveryAmounts({
      eps_amount: 300,
      recovered_amount: 0,
      recovery_status: 'pagado',
    })).toEqual({ expected: 300, recovered: 300, pending: 0 });
  });

  it('does not report recovery for cases assumed by the company', () => {
    expect(getIncapacityRecoveryAmounts({
      eps_amount: 500,
      recovered_amount: 500,
      recovery_status: 'asumido_empresa',
    })).toEqual({ expected: 0, recovered: 0, pending: 0 });
  });
});
