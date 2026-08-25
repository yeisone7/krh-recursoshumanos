import { describe, expect, it } from 'vitest';

import { buildActiveDiversityAnalytics, type ActiveDiversityEmployee } from './activeDiversityAnalytics';

const goals = {
  min_female_pct: 40,
  min_disability_pct: 2,
  min_ethnic_pct: 5,
  min_first_job_pct: 10,
  min_head_household_pct: 5,
};

const employees: ActiveDiversityEmployee[] = [
  {
    id: '1', gender: 'F', birth_date: '1995-01-10', disability_type: 'Ninguna', ethnic_group: 'ninguno',
    is_first_job: true, is_head_of_household: true, is_conflict_victim: false, is_demobilized: false,
    centerId: 'north', centerName: 'Centro Norte',
  },
  {
    id: '2', gender: 'M', birth_date: '1984-01-10', disability_type: 'visual', ethnic_group: 'indigena',
    is_first_job: false, is_head_of_household: false, is_conflict_victim: true, is_demobilized: false,
    centerId: 'south', centerName: 'Centro Sur',
  },
  {
    id: '3', gender: null, birth_date: null, disability_type: null, ethnic_group: null,
    is_first_job: false, is_head_of_household: false, is_conflict_victim: false, is_demobilized: false,
    centerId: null, centerName: 'Sin centro',
  },
];

describe('active employee diversity analytics', () => {
  it('uses every active employee as the denominator and excludes negative sentinels', () => {
    const result = buildActiveDiversityAnalytics(employees, goals);

    expect(result.total).toBe(3);
    expect(result.female).toBe(1);
    expect(result.disability).toBe(1);
    expect(result.ethnic).toBe(1);
    expect(result.genderDistribution.reduce((sum, item) => sum + item.value, 0)).toBe(3);
    expect(result.ethnicDistribution.reduce((sum, item) => sum + item.value, 0)).toBe(3);
    expect(result.disabilityDistribution.reduce((sum, item) => sum + item.value, 0)).toBe(3);
  });

  it('builds center comparisons and goal gaps from the filtered population', () => {
    const result = buildActiveDiversityAnalytics(employees, goals);

    expect(result.centers).toHaveLength(3);
    expect(result.centers.find((center) => center.id === 'north')?.femalePct).toBe(100);
    expect(result.metrics.find((metric) => metric.key === 'min_female_pct')?.gap).toBe(-6.7);
    expect(result.demographicCoverage).toBe(66.7);
  });
});
