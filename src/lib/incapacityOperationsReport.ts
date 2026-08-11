export interface IncapacityOperationsRow {
  id: string;
  employeeId: string;
  employeeName: string;
  operationCenterId: string;
  operationCenterName: string;
  positionName: string;
  concept: string;
  startDate: string;
  totalDays: number;
  diagnosisKey: string;
  diagnosisLabel: string;
}

export interface IncapacityOperationsFilters {
  month: string;
  operationCenterId: string;
  positionName: string;
  employeeId: string;
}

export interface IncapacityOperationsSummaryRow {
  key: string;
  employeeName: string;
  operationCenterName: string;
  positionName: string;
  concept: string;
  cases: number;
  totalDays: number;
}

export interface IncapacityOperationCenterSummaryRow {
  key: string;
  operationCenterName: string;
  cases: number;
  totalDays: number;
}

export function filterIncapacityOperationsRows(
  rows: IncapacityOperationsRow[],
  filters: IncapacityOperationsFilters
) {
  return rows.filter((row) => (
    (filters.month === 'all' || row.startDate.startsWith(filters.month)) &&
    (filters.operationCenterId === 'all' || row.operationCenterId === filters.operationCenterId) &&
    (filters.positionName === 'all' || row.positionName === filters.positionName) &&
    (filters.employeeId === 'all' || row.employeeId === filters.employeeId)
  ));
}

export function countBy(
  rows: IncapacityOperationsRow[],
  keyGetter: (row: IncapacityOperationsRow) => string
) {
  const counts = rows.reduce<Record<string, number>>((result, row) => {
    const key = keyGetter(row) || 'Sin clasificar';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value || left.name.localeCompare(right.name, 'es'));
}

export function summarizeIncapacityOperationsRows(rows: IncapacityOperationsRow[]) {
  const summaries = new Map<string, IncapacityOperationsSummaryRow>();

  rows.forEach((row) => {
    const key = [row.employeeId, row.operationCenterId, row.positionName, row.concept].join('|');
    const current = summaries.get(key);

    if (current) {
      current.cases += 1;
      current.totalDays += row.totalDays;
      return;
    }

    summaries.set(key, {
      key,
      employeeName: row.employeeName,
      operationCenterName: row.operationCenterName,
      positionName: row.positionName,
      concept: row.concept,
      cases: 1,
      totalDays: row.totalDays,
    });
  });

  return [...summaries.values()].sort((left, right) => (
    right.totalDays - left.totalDays || left.employeeName.localeCompare(right.employeeName, 'es')
  ));
}

export function summarizeByOperationCenter(rows: IncapacityOperationsRow[]) {
  const summaries = new Map<string, IncapacityOperationCenterSummaryRow>();

  rows.forEach((row) => {
    const key = row.operationCenterId || row.operationCenterName;
    const current = summaries.get(key);

    if (current) {
      current.cases += 1;
      current.totalDays += row.totalDays;
      return;
    }

    summaries.set(key, {
      key,
      operationCenterName: row.operationCenterName,
      cases: 1,
      totalDays: row.totalDays,
    });
  });

  return [...summaries.values()].sort((left, right) => (
    right.totalDays - left.totalDays || left.operationCenterName.localeCompare(right.operationCenterName, 'es')
  ));
}

export function getUniqueDiagnosisCount(rows: IncapacityOperationsRow[]) {
  return new Set(rows.map((row) => row.diagnosisKey).filter(Boolean)).size;
}
