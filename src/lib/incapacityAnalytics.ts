import {
  calculateIncapacityEmployerCost,
  type IncapacityEmployerCostBreakdown,
  type IncapacityEmployerCostRates,
} from '@/types/incapacity';

export interface IncapacityAnalyticsRow {
  total_days?: number | null;
  total_amount?: number | null;
  employer_days?: number | null;
  eps_days?: number | null;
  arl_days?: number | null;
  afp_days?: number | null;
  start_date?: string | null;
  eps_name?: string | null;
  eps_amount?: number | null;
  arl_amount?: number | null;
  afp_amount?: number | null;
  recovered_amount?: number | null;
  actual_payment_date?: string | null;
  recovery_status?: string | null;
  employee?: {
    employee_social_security?: Array<{
      risk_level?: string | null;
      is_current?: boolean | null;
    }>;
  } | null;
}

export interface IncapacityRecoveryAmounts {
  expected: number;
  recovered: number;
  pending: number;
}

export interface ActualRecoveryPayment {
  monthKey: string;
  amount: number;
}

export interface LegalResponsibilityDays {
  name: 'EPS' | 'Empleador' | 'AFP' | 'ARL';
  value: number;
}

export interface IncapacityDurationBucket {
  key: 'one_two_days' | 'three_plus_days';
  label: string;
  description: string;
  cases: number;
  casePercentage: number;
  amount: number;
  amountPercentage: number;
}

export interface MonthlyEpsRecoveryRow {
  key: string;
  monthKey: string;
  epsName: string;
  cases: number;
  expected: number;
  recovered: number;
  pending: number;
  recoveryPercentage: number;
}

export function buildIncapacityEmployerCostSummary(
  rows: IncapacityAnalyticsRow[],
  rates?: IncapacityEmployerCostRates | null,
): IncapacityEmployerCostBreakdown {
  const initial = calculateIncapacityEmployerCost(0, 'I', rates);
  const summary = rows.reduce<IncapacityEmployerCostBreakdown>((total, row) => {
    const socialSecurity = row.employee?.employee_social_security
      ?.find((record) => record.is_current)
      || row.employee?.employee_social_security?.[0];
    const breakdown = calculateIncapacityEmployerCost(
      row.total_amount,
      socialSecurity?.risk_level,
      rates,
    );

    total.paymentBase += breakdown.paymentBase;
    total.additionalCost += breakdown.additionalCost;
    total.totalCost += breakdown.totalCost;
    total.benefits.forEach((item, index) => {
      item.amount += breakdown.benefits[index]?.amount || 0;
    });
    total.contributions.forEach((item, index) => {
      item.amount += breakdown.contributions[index]?.amount || 0;
    });
    return total;
  }, initial);

  const withEffectiveRates = (item: IncapacityEmployerCostBreakdown['benefits'][number]) => ({
    ...item,
    rate: summary.paymentBase > 0 ? item.amount / summary.paymentBase : item.rate,
  });

  return {
    ...summary,
    benefits: summary.benefits.map(withEffectiveRates),
    contributions: summary.contributions.map(withEffectiveRates),
  };
}

export function getEarliestIncapacityStartDate(
  rows: IncapacityAnalyticsRow[],
  fallback: Date,
) {
  const earliestValue = rows.reduce<string | null>((earliest, row) => {
    const value = row.start_date;
    if (!value || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) return earliest;
    return earliest === null || value < earliest ? value : earliest;
  }, null);

  return earliestValue ? new Date(`${earliestValue}T00:00:00`) : fallback;
}

export function hasIncapacityStartedBy(row: IncapacityAnalyticsRow, cutoff: Date) {
  if (!row.start_date) return false;
  const startDate = new Date(`${row.start_date}T00:00:00`);
  return !Number.isNaN(startDate.getTime()) && startDate.getTime() <= cutoff.getTime();
}

const roundPercentage = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
};

export function getLongCaseShare(longCases: number, totalCases: number) {
  return roundPercentage(Math.max(0, longCases), Math.max(0, totalCases));
}

export function getIncapacityRecoveryAmounts(row: IncapacityAnalyticsRow): IncapacityRecoveryAmounts {
  const expected = row.recovery_status === 'asumido_empresa'
    ? 0
    : Math.max(0, Number(row.eps_amount || 0))
      + Math.max(0, Number(row.arl_amount || 0))
      + Math.max(0, Number(row.afp_amount || 0));
  const recordedRecovered = Math.max(0, Number(row.recovered_amount || 0));
  const uncappedRecovered = row.recovery_status === 'pagado' && recordedRecovered === 0
    ? expected
    : recordedRecovered;
  const recovered = Math.min(expected, uncappedRecovered);

  return {
    expected,
    recovered,
    pending: Math.max(0, expected - recovered),
  };
}

export function getActualRecoveryPayment(row: IncapacityAnalyticsRow): ActualRecoveryPayment | null {
  const paymentDate = row.actual_payment_date?.trim();
  if (!paymentDate || !/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) return null;

  const parsedDate = new Date(`${paymentDate}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return {
    monthKey: paymentDate.slice(0, 7),
    amount: Math.max(0, Number(row.recovered_amount || 0)),
  };
}

export function buildLegalResponsibilityDays(rows: IncapacityAnalyticsRow[]): LegalResponsibilityDays[] {
  const definitions: Array<{ name: LegalResponsibilityDays['name']; field: keyof IncapacityAnalyticsRow }> = [
    { name: 'EPS', field: 'eps_days' },
    { name: 'Empleador', field: 'employer_days' },
    { name: 'AFP', field: 'afp_days' },
    { name: 'ARL', field: 'arl_days' },
  ];

  return definitions
    .map(({ name, field }) => ({
      name,
      value: rows.reduce((total, row) => total + Math.max(0, Number(row[field] || 0)), 0),
    }))
    .filter((item) => item.value > 0);
}

export function buildIncapacityDurationBuckets(rows: IncapacityAnalyticsRow[]): IncapacityDurationBucket[] {
  const definitions: Array<Pick<IncapacityDurationBucket, 'key' | 'label' | 'description'>> = [
    { key: 'one_two_days', label: '1 y 2 días', description: 'Incapacidades de corta duración' },
    { key: 'three_plus_days', label: '3 o más días', description: 'Incapacidades de mayor duración' },
  ];
  const validRows = rows.filter((row) => Number(row.total_days || 0) >= 1);
  const totalAmount = validRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

  return definitions.map((definition) => {
    const bucketRows = validRows.filter((row) => {
      const days = Number(row.total_days || 0);
      if (definition.key === 'one_two_days') return days === 1 || days === 2;
      return days >= 3;
    });
    const amount = bucketRows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

    return {
      ...definition,
      cases: bucketRows.length,
      casePercentage: roundPercentage(bucketRows.length, validRows.length),
      amount,
      amountPercentage: roundPercentage(amount, totalAmount),
    };
  });
}

export function buildMonthlyEpsRecovery(rows: IncapacityAnalyticsRow[]): MonthlyEpsRecoveryRow[] {
  const grouped = new Map<string, MonthlyEpsRecoveryRow>();

  rows.forEach((row) => {
    const expected = Math.max(0, Number(row.eps_amount || 0));
    if (!row.start_date || expected <= 0) return;

    const monthKey = row.start_date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return;

    const epsName = row.eps_name?.trim() || 'EPS no registrada';
    const key = `${monthKey}::${epsName.toLocaleLowerCase('es')}`;
    const recordedRecovered = Math.max(0, Number(row.recovered_amount || 0));
    const recovered = Math.min(
      expected,
      row.recovery_status === 'pagado' && recordedRecovered === 0 ? expected : recordedRecovered,
    );
    const current = grouped.get(key) || {
      key,
      monthKey,
      epsName,
      cases: 0,
      expected: 0,
      recovered: 0,
      pending: 0,
      recoveryPercentage: 0,
    };

    current.cases += 1;
    current.expected += expected;
    current.recovered += recovered;
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((row) => ({
      ...row,
      expected: Math.round(row.expected),
      recovered: Math.round(row.recovered),
      pending: Math.max(0, Math.round(row.expected - row.recovered)),
      recoveryPercentage: roundPercentage(row.recovered, row.expected),
    }))
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || b.expected - a.expected || a.epsName.localeCompare(b.epsName, 'es'));
}
