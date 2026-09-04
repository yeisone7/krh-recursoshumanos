import { describe, expect, it } from 'vitest';

import { buildCenterParticipationExportRows, buildGenderVoteDistribution } from '@/lib/copasstAnalytics';

describe('COPASST gender vote distribution', () => {
  it('calculates each sex as a percentage of all voters', () => {
    expect(buildGenderVoteDistribution([
      { label: 'F', eligible: 80, voted: 30 },
      { label: 'M', eligible: 60, voted: 15 },
      { label: 'Sin dato', eligible: 10, voted: 5 },
      { label: 'O', eligible: 4, voted: 0 },
    ])).toEqual([
      expect.objectContaining({ label: 'Femenino', voted: 30, percentage: 60 }),
      expect.objectContaining({ label: 'Masculino', voted: 15, percentage: 30 }),
      expect.objectContaining({ label: 'Sin dato', voted: 5, percentage: 10 }),
    ]);
  });

  it('returns no slices when nobody has voted', () => {
    expect(buildGenderVoteDistribution([{ label: 'F', eligible: 10, voted: 0 }])).toEqual([]);
  });
});

describe('COPASST operation center participation export', () => {
  it('exports the same totals and percentages shown in the table', () => {
    expect(buildCenterParticipationExportRows([
      { label: 'Centro Norte', eligible: 40, voted: 31 },
      { label: 'Sin dato', eligible: 0, voted: 0 },
      { label: 'Centro Sur', eligible: 5, voted: 8 },
    ])).toEqual([
      { 'Centro de operación': 'Centro Norte', Participación: 0.775, Habilitados: 40, Votaron: 31, Pendientes: 9 },
      { 'Centro de operación': 'Sin dato', Participación: 0, Habilitados: 0, Votaron: 0, Pendientes: 0 },
      { 'Centro de operación': 'Centro Sur', Participación: 1.6, Habilitados: 5, Votaron: 8, Pendientes: 0 },
    ]);
  });
});
