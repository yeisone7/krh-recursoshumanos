export type BiologicalSexKey = 'F' | 'M' | 'O' | 'sin_dato';

interface CandidateBiologicalSexRecord {
  gender?: unknown;
  updated_at?: string | null;
}

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

export function getLatestCandidateBiologicalSex(
  ...candidateGroups: Array<CandidateBiologicalSexRecord[] | null | undefined>
): Exclude<BiologicalSexKey, 'sin_dato'> | null {
  const candidates = candidateGroups
    .flatMap((group) => group || [])
    .sort((left, right) => String(right.updated_at || '').localeCompare(String(left.updated_at || '')));

  for (const candidate of candidates) {
    const gender = normalizeBiologicalSex(candidate.gender);
    if (gender !== 'sin_dato') return gender;
  }

  return null;
}
