export function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;

  const datePart = value.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day, 12);
}

export function parseDateOnlyOr(value: string | null | undefined, fallback: Date): Date {
  return parseDateOnly(value) ?? fallback;
}
