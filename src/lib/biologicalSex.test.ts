import { describe, expect, it } from 'vitest';

import { normalizeBiologicalSex } from './biologicalSex';

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
