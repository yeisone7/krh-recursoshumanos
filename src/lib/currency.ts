export function parseCopCurrency(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;

  const isNegative = value.trim().startsWith('-');
  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  const amount = Number(digits);
  if (!Number.isFinite(amount)) return null;
  return isNegative ? -amount : amount;
}
