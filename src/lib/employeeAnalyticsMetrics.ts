import { differenceInCalendarDays } from 'date-fns';

import { parseDateOnly } from './dateOnly';

interface EmployeeRelatedRow {
  employee_id: string;
  created_at?: string | null;
  id?: string;
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
