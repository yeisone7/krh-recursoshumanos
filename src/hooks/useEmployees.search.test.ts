import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useEmployeesInfinite, useEmployeesPaginated } from './useEmployees';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentCompanyId: 'petrocasinos', assignedCenterIds: [], isAdmin: true, isSuperAdmin: false }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery: (options: unknown) => options,
  useInfiniteQuery: (options: unknown) => options,
}));

const carlos = {
  id: 'carlos', company_id: 'petrocasinos', first_name: 'Carlos', middle_name: '',
  last_name: 'Villamizar', document_number: '13872933', is_active: false, status: 'active',
};
type EmployeeRow = typeof carlos;
const employees: EmployeeRow[] = [
  ...Array.from({ length: 1100 }, (_, index) => ({
    ...carlos, id: `employee-${index}`, first_name: 'Otro', last_name: 'Alvarez',
    document_number: `other-${index}`, is_active: true,
  })),
  carlos,
];

// Emulate the API response cap, including requests without an explicit range.
function createQuery() {
  let start = 0;
  let end = 999;
  const predicates: Array<(employee: EmployeeRow) => boolean> = [];
  const query = {
    select: () => query,
    eq: (column: keyof EmployeeRow, value: unknown) => {
      predicates.push(employee => employee[column] === value);
      return query;
    },
    not: (column: keyof EmployeeRow, _operator: string, value: unknown) => {
      predicates.push(employee => employee[column] !== value);
      return query;
    },
    or: (expression: string) => {
      if (expression === 'status.eq.retired,and(is_active.eq.false,status.eq.active)') {
        predicates.push(employee => employee.status === 'retired' || (!employee.is_active && employee.status === 'active'));
      } else if (expression === 'is_active.eq.true,status.neq.active') {
        predicates.push(employee => employee.is_active || employee.status !== 'active');
      } else {
        throw new Error(`Unexpected filter: ${expression}`);
      }
      return query;
    },
    order: () => query,
    range: (from: number, to: number) => {
      start = from;
      end = to;
      return query;
    },
    then: (resolve: (value: { data: EmployeeRow[]; error: null; count: number }) => unknown) => {
      const filtered = employees.filter(employee => predicates.every(predicate => predicate(employee)));
      return Promise.resolve({ data: filtered.slice(start, Math.min(end + 1, start + 1000)), error: null, count: filtered.length }).then(resolve);
    },
  };
  return query;
}

interface QueryConfiguration {
  queryFn: (context: { pageParam: number }) => Promise<{
    data: Array<{ id: string }>; count?: number; totalCount?: number; nextCursor?: number | null;
  }>;
}

describe.each([
  ['paginated', useEmployeesPaginated],
  ['infinite', useEmployeesInfinite],
] as const)('%s employee search', (_name, useEmployeeList) => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockImplementation(() => createQuery() as never);
  });

  async function search(status: string, includeRetired: boolean, term = '13872933') {
    const configuration = useEmployeeList({ search: term, status, includeRetired, pageSize: 12 }) as unknown as QueryConfiguration;
    return configuration.queryFn({ pageParam: 0 });
  }

  it.each(['13872933', 'Carlos Villamizar'])('finds a retiree beyond the first 1000 rows using %s with either retired control', async (term) => {
    const withToggle = await search('all', true, term);
    const withDropdown = await search('retired', false, term);

    expect(withToggle.data.map(employee => employee.id)).toEqual(['carlos']);
    expect(withDropdown.data).toEqual(withToggle.data);
    expect(withToggle.totalCount ?? withToggle.count).toBe(1);
    expect(withDropdown.totalCount ?? withDropdown.count).toBe(1);
  });

  it('hides the same retiree when Mostrar retirados is off', async () => {
    const result = await search('all', false);
    expect(result.data).toEqual([]);
    expect(result.totalCount ?? result.count).toBe(0);
  });
});
