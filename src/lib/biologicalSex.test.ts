import { describe, expect, it } from 'vitest';

import { normalizeBiologicalSex, shouldDisplayBiologicalSex } from './biologicalSex';

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
