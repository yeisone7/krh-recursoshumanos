import {
  formatCandidateDisability,
  formatCandidateEthnicGroup,
  hasCandidateDisability,
  hasCandidateEthnicGroup,
} from './diversityMetrics';

export interface ActiveDiversityEmployee {
  id: string;
  gender: string | null;
  birth_date: string | null;
  disability_type: string | null;
  ethnic_group: string | null;
  is_first_job: boolean | null;
  is_head_of_household: boolean | null;
  is_conflict_victim: boolean | null;
  is_demobilized: boolean | null;
  centerId: string | null;
  centerName: string;
}

export interface ActiveDiversityGoals {
  min_female_pct: number;
  min_disability_pct: number;
  min_ethnic_pct: number;
  min_first_job_pct: number;
  min_head_household_pct: number;
}

export interface DistributionItem {
  name: string;
  value: number;
  percentage: number;
}

export interface DiversityMetric {
  key: keyof ActiveDiversityGoals;
  label: string;
  value: number;
  percentage: number;
  goal: number;
  gap: number;
  meetsGoal: boolean;
}

export interface CenterDiversityMetric {
  id: string;
  name: string;
  total: number;
  femalePct: number;
  disabilityPct: number;
  ethnicPct: number;
  firstJobPct: number;
  headHouseholdPct: number;
  inclusionIndex: number;
}

export interface ActiveDiversityAnalytics {
  total: number;
  female: number;
  disability: number;
  ethnic: number;
  firstJob: number;
  headHousehold: number;
  conflictVictim: number;
  demobilized: number;
  demographicCoverage: number;
  goalsMet: number;
  metrics: DiversityMetric[];
  genderDistribution: DistributionItem[];
  ageDistribution: DistributionItem[];
  ethnicDistribution: DistributionItem[];
  disabilityDistribution: DistributionItem[];
  specialConditions: DistributionItem[];
  centers: CenterDiversityMetric[];
}

const roundOne = (value: number) => Math.round(value * 10) / 10;

function percentage(value: number, total: number) {
  return total ? roundOne((value / total) * 100) : 0;
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLocaleLowerCase('es-CO')
    .replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('es-CO'));
}

function distribution(values: string[], total: number): DistributionItem[] {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value, percentage: percentage(value, total) }))
    .sort((a, b) => b.value - a.value);
}

function ageBand(birthDate: string | null) {
  if (!birthDate) return 'Sin dato';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Sin dato';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayPending = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (birthdayPending) age -= 1;
  if (age < 25) return 'Menor de 25';
  if (age < 35) return '25–34';
  if (age < 45) return '35–44';
  if (age < 55) return '45–54';
  return '55 o más';
}

function countWhere(employees: ActiveDiversityEmployee[], predicate: (employee: ActiveDiversityEmployee) => boolean) {
  return employees.reduce((total, employee) => total + (predicate(employee) ? 1 : 0), 0);
}

function centerMetric(employees: ActiveDiversityEmployee[], id: string, name: string): CenterDiversityMetric {
  const total = employees.length;
  const femalePct = percentage(countWhere(employees, (employee) => employee.gender?.toUpperCase() === 'F'), total);
  const disabilityPct = percentage(countWhere(employees, (employee) => hasCandidateDisability(employee.disability_type)), total);
  const ethnicPct = percentage(countWhere(employees, (employee) => hasCandidateEthnicGroup(employee.ethnic_group)), total);
  const firstJobPct = percentage(countWhere(employees, (employee) => employee.is_first_job === true), total);
  const headHouseholdPct = percentage(countWhere(employees, (employee) => employee.is_head_of_household === true), total);

  return {
    id,
    name,
    total,
    femalePct,
    disabilityPct,
    ethnicPct,
    firstJobPct,
    headHouseholdPct,
    inclusionIndex: roundOne((femalePct + disabilityPct + ethnicPct + firstJobPct + headHouseholdPct) / 5),
  };
}

export function buildActiveDiversityAnalytics(
  employees: ActiveDiversityEmployee[],
  goals: ActiveDiversityGoals,
): ActiveDiversityAnalytics {
  const total = employees.length;
  const female = countWhere(employees, (employee) => employee.gender?.toUpperCase() === 'F');
  const disability = countWhere(employees, (employee) => hasCandidateDisability(employee.disability_type));
  const ethnic = countWhere(employees, (employee) => hasCandidateEthnicGroup(employee.ethnic_group));
  const firstJob = countWhere(employees, (employee) => employee.is_first_job === true);
  const headHousehold = countWhere(employees, (employee) => employee.is_head_of_household === true);
  const conflictVictim = countWhere(employees, (employee) => employee.is_conflict_victim === true);
  const demobilized = countWhere(employees, (employee) => employee.is_demobilized === true);

  const metricDefinitions: Array<[keyof ActiveDiversityGoals, string, number]> = [
    ['min_female_pct', 'Mujeres', female],
    ['min_disability_pct', 'Personas con discapacidad', disability],
    ['min_ethnic_pct', 'Pertenencia étnica', ethnic],
    ['min_first_job_pct', 'Primer empleo', firstJob],
    ['min_head_household_pct', 'Cabeza de familia', headHousehold],
  ];
  const metrics = metricDefinitions.map(([key, label, value]) => {
    const currentPercentage = percentage(value, total);
    const goal = Number(goals[key]) || 0;
    return {
      key,
      label,
      value,
      percentage: currentPercentage,
      goal,
      gap: roundOne(currentPercentage - goal),
      meetsGoal: currentPercentage >= goal,
    };
  });

  const centerGroups = employees.reduce<Map<string, ActiveDiversityEmployee[]>>((acc, employee) => {
    const key = employee.centerId || '__without_center__';
    const group = acc.get(key) || [];
    group.push(employee);
    acc.set(key, group);
    return acc;
  }, new Map());

  const centers = Array.from(centerGroups.entries())
    .map(([id, rows]) => centerMetric(rows, id, rows[0]?.centerName || 'Sin centro'))
    .sort((a, b) => b.total - a.total);

  const completedFields = employees.reduce((sum, employee) => sum
    + (employee.gender ? 1 : 0)
    + (employee.birth_date ? 1 : 0)
    + (employee.centerId ? 1 : 0), 0);

  return {
    total,
    female,
    disability,
    ethnic,
    firstJob,
    headHousehold,
    conflictVictim,
    demobilized,
    demographicCoverage: percentage(completedFields, total * 3),
    goalsMet: metrics.filter((metric) => metric.meetsGoal).length,
    metrics,
    genderDistribution: distribution(employees.map((employee) => (
      employee.gender?.toUpperCase() === 'F' ? 'Femenino'
        : employee.gender?.toUpperCase() === 'M' ? 'Masculino'
          : employee.gender ? 'Otro' : 'Sin dato'
    )), total),
    ageDistribution: distribution(employees.map((employee) => ageBand(employee.birth_date)), total),
    ethnicDistribution: distribution(employees.map((employee) => {
      if (!hasCandidateEthnicGroup(employee.ethnic_group)) return 'Sin pertenencia';
      return titleCase(formatCandidateEthnicGroup(employee.ethnic_group));
    }), total),
    disabilityDistribution: distribution(employees.map((employee) => {
      if (!hasCandidateDisability(employee.disability_type)) return 'Sin discapacidad';
      return titleCase(formatCandidateDisability(employee.disability_type));
    }), total),
    specialConditions: [
      { name: 'Primer empleo', value: firstJob, percentage: percentage(firstJob, total) },
      { name: 'Cabeza de familia', value: headHousehold, percentage: percentage(headHousehold, total) },
      { name: 'Víctima del conflicto', value: conflictVictim, percentage: percentage(conflictVictim, total) },
      { name: 'Desmovilizado', value: demobilized, percentage: percentage(demobilized, total) },
    ],
    centers,
  };
}
