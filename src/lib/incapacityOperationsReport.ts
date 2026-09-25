import { addDays, differenceInCalendarDays, eachMonthOfInterval, endOfMonth, format, isValid, parseISO, startOfMonth } from 'date-fns';
import { parseIncapacityDate } from './incapacityAllocation';

import type { BiologicalSexKey } from '@/lib/biologicalSex';

export interface IncapacityOperationsRow {
  id: string;
  employeeId: string;
  employeeName: string;
  operationCenterId: string;
  operationCenterName: string;
  positionName: string;
  concept: string;
  startDate: string;
  endDate: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  totalDays: number;
  diagnosisKey: string;
  diagnosisLabel: string;
  gender: BiologicalSexKey;
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
  const monthInterval = filters.month === 'all' ? null : getMonthInterval(filters.month);

  return rows.flatMap((row) => {
    if (
      (filters.operationCenterId !== 'all' && row.operationCenterId !== filters.operationCenterId) ||
      (filters.positionName !== 'all' && row.positionName !== filters.positionName) ||
      (filters.employeeId !== 'all' && row.employeeId !== filters.employeeId)
    ) {
      return [];
    }

    if (!monthInterval) return [row];

    const daysWithinMonth = getIncapacityDaysWithinMonth(row, filters.month);
    return daysWithinMonth > 0 ? [{ ...row, totalDays: daysWithinMonth,
      effectiveStart: [row.effectiveStart || row.startDate, format(monthInterval.start, 'yyyy-MM-dd')].sort()[1],
      effectiveEnd: [row.effectiveEnd || row.endDate, format(monthInterval.end, 'yyyy-MM-dd')].sort()[0],
    }] : [];
  });
}

function getMonthInterval(month: string) {
  const date = parseISO(`${month}-01T00:00:00`);
  if (!/^\d{4}-\d{2}$/.test(month) || !isValid(date)) return null;
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function getIncapacityDaysWithinMonth(row: IncapacityOperationsRow, month: string) {
  const monthInterval = getMonthInterval(month);
  const incapacityStart = parseISO(`${row.effectiveStart || row.startDate}T00:00:00`);
  const incapacityEnd = parseISO(`${row.effectiveEnd || row.endDate}T00:00:00`);

  if (!monthInterval || !isValid(incapacityStart) || !isValid(incapacityEnd)) return 0;

  const overlapStart = incapacityStart > monthInterval.start ? incapacityStart : monthInterval.start;
  const overlapEnd = incapacityEnd < monthInterval.end ? incapacityEnd : monthInterval.end;
  if (overlapStart > overlapEnd) return 0;

  return differenceInCalendarDays(overlapEnd, overlapStart) + 1;
}

export function getIncapacityOperationsMonths(rows: IncapacityOperationsRow[]) {
  const months = new Set<string>();

  rows.forEach((row) => {
    const start = parseISO(`${row.effectiveStart || row.startDate}T00:00:00`);
    const end = parseISO(`${row.effectiveEnd || row.endDate}T00:00:00`);
    if (!isValid(start) || !isValid(end) || start > end) return;

    eachMonthOfInterval({ start, end }).forEach((month) => months.add(format(month, 'yyyy-MM')));
  });

  return [...months].sort((left, right) => right.localeCompare(left));
}

export function buildIncapacityOperationsTimeline(rows: IncapacityOperationsRow[]) {
  const counts = new Map<string, number>();
  rows.forEach(row => {
    const start = parseIncapacityDate(row.effectiveStart || row.startDate);
    const end = parseIncapacityDate(row.effectiveEnd || row.endDate);
    if (!start || !end || start > end) return;
    for (let date = start; date <= end; date = addDays(date, 1)) {
      const key = format(date, 'yyyy-MM-dd');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  });
  const keys = [...counts.keys()].sort();
  if (!keys.length) return [];
  const result: Array<{ date: string; cases: number }> = [];
  const end = parseISO(keys[keys.length - 1]);
  for (let date = parseISO(keys[0]); date <= end; date = addDays(date, 1)) {
    const key = format(date, 'yyyy-MM-dd');
    result.push({ date: key, cases: counts.get(key) || 0 });
  }
  return result;
}

export interface IncapacityCasesDaysRow {
  name: string;
  value: number;
  cases: number;
  days: number;
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

export function summarizeCasesAndDays(
  rows: IncapacityOperationsRow[],
  keyGetter: (row: IncapacityOperationsRow) => string,
): IncapacityCasesDaysRow[] {
  const summaries = new Map<string, IncapacityCasesDaysRow>();
  rows.forEach((row) => {
    const name = keyGetter(row) || 'Sin clasificar';
    const current = summaries.get(name) || { name, value: 0, cases: 0, days: 0 };
    current.cases += 1;
    current.days += row.totalDays;
    current.value = current.cases;
    summaries.set(name, current);
  });
  return [...summaries.values()].sort((left, right) => right.cases - left.cases || left.name.localeCompare(right.name, 'es'));
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
