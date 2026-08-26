export type BiologicalSexKey = 'F' | 'M' | 'O' | 'sin_dato';

export function normalizeBiologicalSex(value: unknown): BiologicalSexKey {
  const normalized = String(value ?? '').trim().toUpperCase();

  if (normalized === 'F' || normalized.startsWith('FEM') || normalized === 'MUJER' || normalized === 'FEMALE') {
    return 'F';
  }
  if (normalized === 'M' || normalized.startsWith('MAS') || normalized === 'HOMBRE' || normalized === 'MALE') {
    return 'M';
  }
  if (
    normalized === 'O' ||
    normalized.startsWith('OTR') ||
    normalized === 'OTHER' ||
    normalized.includes('BINARIO')
  ) {
    return 'O';
  }

  return 'sin_dato';
}

export function shouldDisplayBiologicalSex(key: BiologicalSexKey, cases: number) {
  return key === 'F' || key === 'M' || cases > 0;
}
