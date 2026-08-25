import { describe, expect, it } from 'vitest';

import { formatCandidateDisability, hasCandidateDisability } from './diversityMetrics';

// Regression: ISSUE-001 — "ninguna" was counted as a candidate disability
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-127-0-0-1-5174-2026-08-25.md
describe('candidate disability metrics', () => {
  it.each(['ninguna', 'Ninguna', ' NINGUNA ', 'ninguno', 'No registrado', null, '']) (
    'does not count %s as a disability',
    (value) => {
      expect(hasCandidateDisability(value)).toBe(false);
    },
  );

  it.each(['visual', 'fisica', 'auditiva', 'multiple', 'cognitiva'])(
    'counts %s as a disability',
    (value) => {
      expect(hasCandidateDisability(value)).toBe(true);
    },
  );

  it('merges case variants under one display category', () => {
    expect(formatCandidateDisability('ninguna')).toBe('Ninguna');
    expect(formatCandidateDisability('Ninguna')).toBe('Ninguna');
  });
});
