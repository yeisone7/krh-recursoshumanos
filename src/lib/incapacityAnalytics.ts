export interface IncapacityAnalyticsRow {
  total_days?: number | null;
  total_amount?: number | null;
  start_date?: string | null;
  eps_name?: string | null;
  eps_amount?: number | null;
  arl_amount?: number | null;
  afp_amount?: number | null;
  recovered_amount?: number | null;
  recovery_status?: string | null;
}

export interface IncapacityRecoveryAmounts {
  expected: number;
  recovered: number;
  pending: number;
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

const roundPercentage = (value: number, total: number) => {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
};

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
