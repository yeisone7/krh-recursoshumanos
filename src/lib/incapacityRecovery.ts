export { getExpectedIncapacityRecovery, getIncapacityRecoveryAmounts } from '../../supabase/functions/_shared/incapacityRecovery';

export type IncapacityRecoveryPayment = {
  date: string | null;
  amount: number;
};

interface RecoveryPaymentSource {
  recovery_payments?: IncapacityRecoveryPayment[] | null;
  recovered_amount?: number | null;
  actual_payment_date?: string | null;
}

export const MAX_RECOVERY_AMOUNT = 9_999_999_999.99;

export function getRecoveryPayments(source: RecoveryPaymentSource): IncapacityRecoveryPayment[] {
  if (source.recovery_payments != null) return source.recovery_payments;
  const amount = Number(source.recovered_amount || 0);
  return amount > 0 ? [{ date: source.actual_payment_date || null, amount }] : [];
}

export function sumRecoveryPayments(payments: { amount: number }[]) {
  return payments.reduce((cents, payment) => cents + Math.round(payment.amount * 100), 0) / 100;
}

const recoveryCurrency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatRecoveryCurrency(amount: number) {
  return recoveryCurrency.format(amount);
}
