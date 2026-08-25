function normalizeDiversityValue(value: string | null | undefined): string {
  return value?.trim().toLocaleLowerCase('es-CO') ?? '';
}

const NO_DISABILITY_VALUES = new Set([
  '',
  'ninguna',
  'ninguno',
  'no aplica',
  'n/a',
  'no registrado',
  'sin discapacidad',
]);

export function hasCandidateDisability(value: string | null | undefined): boolean {
  return !NO_DISABILITY_VALUES.has(normalizeDiversityValue(value));
}

export function formatCandidateDisability(value: string | null | undefined): string {
  const normalized = normalizeDiversityValue(value);
  if (!normalized || normalized === 'no registrado') return 'No registrado';
  if (!hasCandidateDisability(value)) return 'Ninguna';
  return value!.trim();
}
