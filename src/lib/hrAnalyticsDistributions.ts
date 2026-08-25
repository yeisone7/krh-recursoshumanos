export interface AnalyticsEmployeeSource {
  id: string;
  gender: string | null;
}

export interface AnalyticsWorkInfoSource {
  employee_id: string;
  link_type: string | null;
}

export interface AnalyticsDistributionBucket {
  name: string;
  value: number;
}

export function buildEmployeeDistributions(
  activeEmployees: AnalyticsEmployeeSource[],
  workInfos: AnalyticsWorkInfoSource[],
): { byContractType: AnalyticsDistributionBucket[]; byGender: AnalyticsDistributionBucket[] } {
  const workInfoByEmployee = new Map<string, AnalyticsWorkInfoSource>();
  workInfos.forEach((workInfo) => {
    if (!workInfoByEmployee.has(workInfo.employee_id)) {
      workInfoByEmployee.set(workInfo.employee_id, workInfo);
    }
  });

  const contractCounts = new Map<string, number>([
    ['Indefinido', 0],
    ['Fijo', 0],
    ['Obra/Labor', 0],
    ['Otro', 0],
    ['Sin dato', 0],
  ]);
  const genderCounts = new Map<string, number>([
    ['Masculino', 0],
    ['Femenino', 0],
    ['Otro', 0],
    ['Sin dato', 0],
  ]);

  activeEmployees.forEach((employee) => {
    const linkType = workInfoByEmployee.get(employee.id)?.link_type?.trim().toLocaleLowerCase('es-CO');
    const contractLabel = linkType === 'indefinido'
      ? 'Indefinido'
      : linkType === 'fijo'
        ? 'Fijo'
        : linkType === 'obra_labor'
          ? 'Obra/Labor'
          : linkType
            ? 'Otro'
            : 'Sin dato';
    contractCounts.set(contractLabel, contractCounts.get(contractLabel)! + 1);

    const gender = employee.gender?.trim().toUpperCase();
    const genderLabel = gender === 'M'
      ? 'Masculino'
      : gender === 'F'
        ? 'Femenino'
        : gender === 'O'
          ? 'Otro'
          : 'Sin dato';
    genderCounts.set(genderLabel, genderCounts.get(genderLabel)! + 1);
  });

  const toBuckets = (counts: Map<string, number>) => Array.from(counts, ([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0);

  return {
    byContractType: toBuckets(contractCounts),
    byGender: toBuckets(genderCounts),
  };
}
