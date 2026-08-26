import { describe, expect, it } from 'vitest';

import {
  getLatestCandidateBiologicalSex,
  normalizeBiologicalSex,
  shouldDisplayBiologicalSex,
} from './biologicalSex';

describe('normalizeBiologicalSex', () => {
  it.each([
    ['F', 'F'],
    ['femenino', 'F'],
    ['M', 'M'],
    ['Masculino', 'M'],
    ['O', 'O'],
    ['otro', 'O'],
    ['no binario', 'O'],
  ])('classifies %s as %s', (value, expected) => {
    expect(normalizeBiologicalSex(value)).toBe(expected);
  });

  it.each([null, undefined, '', 'desconocido'])('reserves sin_dato for an absent or unrecognized value', (value) => {
    expect(normalizeBiologicalSex(value)).toBe('sin_dato');
  });
});

describe('shouldDisplayBiologicalSex', () => {
  it('hides sin_dato when it has no cases', () => {
    expect(shouldDisplayBiologicalSex('sin_dato', 0)).toBe(false);
  });

  it('shows sin_dato when there are cases with missing information', () => {
    expect(shouldDisplayBiologicalSex('sin_dato', 2)).toBe(true);
  });
});

describe('getLatestCandidateBiologicalSex', () => {
  it('uses the latest linked candidate with a known biological sex', () => {
    expect(getLatestCandidateBiologicalSex(
      [{ gender: 'M', updated_at: '2025-01-01T00:00:00Z' }],
      [{ gender: 'femenino', updated_at: '2026-08-01T00:00:00Z' }],
    )).toBe('F');
  });

  it('ignores a newer candidate whose biological sex is empty', () => {
    expect(getLatestCandidateBiologicalSex([
      { gender: null, updated_at: '2026-08-01T00:00:00Z' },
      { gender: 'masculino', updated_at: '2026-07-01T00:00:00Z' },
    ])).toBe('M');
  });

  it('returns null when linked candidates do not contain the value', () => {
    expect(getLatestCandidateBiologicalSex([{ gender: null }])).toBeNull();
  });
});
