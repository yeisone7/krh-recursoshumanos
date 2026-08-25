const DEFAULT_PAGE_SIZE = 1000;

interface EmployeeStatusRecord {
  is_active: boolean | null;
  status: string | null;
}

interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export function isOperationallyActiveEmployee(employee: EmployeeStatusRecord) {
  return employee.is_active === true && employee.status === 'active';
}

export async function fetchAllAnalyticsRows<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;

    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export function keepFirstRowPerEmployee<T extends { employee_id: string }>(rows: T[]) {
  const uniqueRows = new Map<string, T>();

  for (const row of rows) {
    if (!uniqueRows.has(row.employee_id)) uniqueRows.set(row.employee_id, row);
  }

  return Array.from(uniqueRows.values());
}
