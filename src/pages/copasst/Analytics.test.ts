import { describe, expect, it } from 'vitest';

import { buildGenderVoteDistribution } from '@/lib/copasstAnalytics';

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
