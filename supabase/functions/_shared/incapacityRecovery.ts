interface RecoveryAmountsSource {
  eps_amount?: number | null;
  arl_amount?: number | null;
  afp_amount?: number | null;
  recovery_status?: string | null;
  recovered_amount?: number | null;
  recovery_payments?: unknown;
  allocation?: unknown;
}

export function getExpectedIncapacityRecovery(row: RecoveryAmountsSource) {
  if (row.recovery_status === 'asumido_empresa') return 0;
  const eps = Math.max(0, Number(row.eps_amount || 0));
  const arl = Math.max(0, Number(row.arl_amount || 0));
  return (Math.round(eps * 100) + Math.round(arl * 100)) / 100;
}

export function getIncapacityRecoveryAmounts(row: RecoveryAmountsSource) {
  const expected = getExpectedIncapacityRecovery(row);
  const recordedRecovered = Math.max(0, Number(row.recovered_amount || 0));
  const legacyPaid = !row.allocation && row.recovery_payments == null &&
    row.recovery_status === 'pagado' && recordedRecovered === 0;
  const recovered = legacyPaid ? expected : Math.min(expected, recordedRecovered);

  return { expected, recovered, pending: Math.max(0, expected - recovered) };
}
