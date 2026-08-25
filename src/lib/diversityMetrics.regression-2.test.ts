import { describe, expect, it } from 'vitest';

import { formatCandidateEthnicGroup, hasCandidateEthnicGroup } from './diversityMetrics';

// Regression: ISSUE-002 — "ninguno" was counted as ethnic-group membership
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-127-0-0-1-5174-2026-08-25.md
describe('candidate ethnic-group metrics', () => {
  it.each(['ninguno', 'Ninguno', ' NINGUNO ', 'ninguna', 'No registrado', null, '']) (
    'does not count %s as ethnic-group membership',
    (value) => {
      expect(hasCandidateEthnicGroup(value)).toBe(false);
    },
  );

  it.each(['indigena', 'negro_afrocolombiano', 'raizal', 'palenquero'])(
    'counts %s as ethnic-group membership',
    (value) => {
      expect(hasCandidateEthnicGroup(value)).toBe(true);
    },
  );

  it('merges case variants under one display category', () => {
    expect(formatCandidateEthnicGroup('ninguno')).toBe('Ninguno');
    expect(formatCandidateEthnicGroup('Ninguno')).toBe('Ninguno');
  });
});
