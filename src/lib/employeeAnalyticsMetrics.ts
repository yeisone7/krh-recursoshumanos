import { differenceInCalendarDays } from 'date-fns';

import { parseDateOnly } from './dateOnly';

interface EmployeeRelatedRow {
  employee_id: string;
  created_at?: string | null;
  id?: string;
}

interface CurrentEmployeeRelatedRow extends EmployeeRelatedRow {
  is_current?: boolean | null;
}

interface EmployeeCenterSource {
  operation_center_id?: string | null;
  operation_centers?: { id?: string; name?: string } | null;
}

function rowVersion(row: EmployeeRelatedRow) {
  return `${row.created_at || ''}|${row.id || ''}`;
}

export function indexLatestByEmployee<T extends EmployeeRelatedRow>(rows: T[]) {
  return rows.reduce<Record<string, T>>((acc, row) => {
    const existing = acc[row.employee_id];
    if (!existing || rowVersion(row) > rowVersion(existing)) acc[row.employee_id] = row;
    return acc;
  }, {});
}

export function indexCurrentOrLatestByEmployee<T extends CurrentEmployeeRelatedRow>(rows: T[]) {
  return rows.reduce<Record<string, T>>((acc, row) => {
    const existing = acc[row.employee_id];
    if (!existing) {
      acc[row.employee_id] = row;
      return acc;
    }

    const currentPriority = Number(row.is_current === true) - Number(existing.is_current === true);
    if (currentPriority > 0 || (currentPriority === 0 && rowVersion(row) > rowVersion(existing))) {
      acc[row.employee_id] = row;
    }

    return acc;
  }, {});
}

export function resolveEmployeeCenter(
  workInfo: EmployeeCenterSource | null | undefined,
  assignment: EmployeeCenterSource | null | undefined,
) {
  if (workInfo?.operation_center_id) {
    return {
      id: workInfo.operation_center_id,
      name: workInfo.operation_centers?.name,
    };
  }

  if (assignment?.operation_center_id) {
    return {
      id: assignment.operation_center_id,
      name: assignment.operation_centers?.name,
    };
  }

  return null;
}

export function isHireWithinLastDays(
  hireDateValue: string | null | undefined,
  days: number,
  today = new Date(),
) {
  const hireDate = parseDateOnly(hireDateValue);
  if (!hireDate) return false;

  const daysSinceHire = differenceInCalendarDays(today, hireDate);
  return daysSinceHire >= 0 && daysSinceHire <= days;
}

export function countTerminationsForMonth(
  terminations: Array<{ employee_id: string; effective_date: string | null }>,
  allowedEmployeeIds: Set<string>,
  monthKey: string,
) {
  return terminations.filter((termination) => {
    const effectiveDate = parseDateOnly(termination.effective_date);
    if (!effectiveDate || !allowedEmployeeIds.has(termination.employee_id)) return false;

    const effectiveMonth = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}`;
    return effectiveMonth === monthKey;
  }).length;
}

interface AnalyticsContract {
  employee_id?: string | null;
  end_date: string | null;
  is_terminated: boolean;
  contract_extensions?: Array<{
    id?: string;
    end_date: string | null;
    extension_number: number;
  }> | null;
}

export function getEffectiveContractEndDate(contract: AnalyticsContract) {
  const latestExtension = [...(contract.contract_extensions || [])]
    .sort((a, b) => b.extension_number - a.extension_number || (b.id || '').localeCompare(a.id || ''))[0];

  return latestExtension?.end_date || contract.end_date;
}

export function isContractCurrent(contract: AnalyticsContract, today = new Date()) {
  if (!contract.employee_id || contract.is_terminated) return false;

  const effectiveEndDate = parseDateOnly(getEffectiveContractEndDate(contract));
  return !effectiveEndDate || differenceInCalendarDays(effectiveEndDate, today) >= 0;
}
