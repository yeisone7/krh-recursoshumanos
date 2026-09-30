import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPayrollQuerySources,
  usePayrollDynamicQuery,
} from './usePayrollDynamicQuery';
import {
  payrollQueryFixture,
  payrollQueryOptions,
} from '@/test/payrollQueryFixtures';

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  fail: '',
  calls: [] as { table: string; method: string; args: unknown[] }[],
  auth: {
    currentCompanyId: 'company-1',
    companies: [{ id: 'company-1', name: 'Prueba' }],
    user: { id: 'user-1' },
    assignedCenterIds: ['center-1'],
    isAdmin: false,
    isSuperAdmin: false,
    permissionsLoaded: true,
    canView: (): boolean => true,
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      let from = 0,
        to = 999;
      const filters: ((row: Record<string, unknown>) => boolean)[] = [];
      const query = {
        select: (...args: unknown[]) => {
          state.calls.push({ table, method: 'select', args });
          return query;
        },
        eq: (column: string, value: unknown) => {
          state.calls.push({ table, method: 'eq', args: [column, value] });
          filters.push((row) => row[column] === value);
          return query;
        },
        in: (column: string, values: unknown[]) => {
          state.calls.push({ table, method: 'in', args: [column, values] });
          filters.push((row) => values.includes(row[column]));
          return query;
        },
        gte: (column: string, value: string) => {
          filters.push((row) => String(row[column]) >= value);
          return query;
        },
        lte: (column: string, value: string) => {
          filters.push((row) => String(row[column]) <= value);
          return query;
        },
        or: () => query,
        order: (...args: unknown[]) => {
          state.calls.push({ table, method: 'order', args });
          return query;
        },
        range: (start: number, end: number) => {
          state.calls.push({ table, method: 'range', args: [start, end] });
          from = start;
          to = end;
          return query;
        },
        abortSignal: () => query,
        then: (
          resolve: (result: {
            data: unknown[] | null;
            error: { message: string } | null;
          }) => unknown,
        ) =>
          Promise.resolve(
            table === state.fail
              ? { data: null, error: { message: 'No autorizado' } }
              : {
                  data: (state.tables[table] || [])
                    .filter((row) => filters.every((filter) => filter(row)))
                    .slice(from, to + 1),
                  error: null,
                },
          ).then(resolve),
      };
      return query;
    },
  },
}));
beforeEach(() => {
  state.calls = [];
  state.fail = '';
  state.auth.currentCompanyId = 'company-1';
  state.auth.user = { id: 'user-1' };
  state.auth.canView = () => true;
  const fixture = payrollQueryFixture();
  state.tables = {
    employees_v2: fixture.employees,
    operation_centers: fixture.centers.map((center) => ({
      ...center,
      company_id: 'company-1',
    })),
    employee_employment_cycles: fixture.cycles,
    employee_work_info: fixture.workInfos,
    contracts: fixture.contracts,
    employee_schedule: fixture.schedules,
    employee_social_security: fixture.socialSecurities,
    employee_time_config: fixture.timeConfigs,
    employee_shift_assignments: fixture.assignments,
    payroll_novelties: fixture.novelties,
    overtime_records: [],
    employee_incapacities: [],
    vacation_requests: [],
    leave_requests: [],
    company_holidays: [],
    payroll_labor_config: [fixture.config],
  };
});
afterEach(cleanup);
const access = {
  companyId: 'company-1',
  companyName: 'Prueba',
  restricted: true,
  centerIds: ['center-1'],
};
describe('Carga de fuentes de consulta dinámica', () => {
  it('pagina más de 1.000 filas y acota todas las tablas por empresa y empleados en lotes', async () => {
    state.tables.payroll_novelties = Array.from(
      { length: 1501 },
      (_, index) => ({
        id: `nov-${index}`,
        company_id: 'company-1',
        employee_id: 'emp-1',
        novelty_date: '2026-09-14',
      }),
    );
    const sources = await fetchPayrollQuerySources(access, payrollQueryOptions);
    expect(sources.novelties).toHaveLength(1501);
    expect(sources.centers.map((center) => center.id)).toEqual(['center-1']);
    expect(state.calls).toContainEqual({
      table: 'payroll_novelties',
      method: 'range',
      args: [1000, 1999],
    });
    for (const table of Object.keys(state.tables))
      expect(state.calls).toContainEqual({
        table,
        method: 'eq',
        args: ['company_id', 'company-1'],
      });
    expect(
      state.calls
        .filter((call) => call.method === 'in')
        .every((call) => (call.args[1] as unknown[]).length <= 100),
    ).toBe(true);
    expect(
      state.calls
        .filter((call) => call.method === 'order')
        .every((call) => call.args[0] === 'id'),
    ).toBe(true);
  });
  it('pagina el catálogo de empleados y conserva retirados para consultar históricos', async () => {
    const template = state.tables.employees_v2[0];
    state.tables.employees_v2 = Array.from({ length: 1001 }, (_, index) => ({
      ...template,
      id: `emp-${index}`,
      status: 'retired',
      is_active: false,
    }));
    const sources = await fetchPayrollQuerySources(access, payrollQueryOptions);
    expect(sources.employees).toHaveLength(1001);
    expect(state.calls).toContainEqual({
      table: 'employees_v2',
      method: 'range',
      args: [1000, 1999],
    });
    expect(
      state.calls.some(
        (call) =>
          call.method === 'eq' &&
          ['is_active', 'is_current'].includes(String(call.args[0])),
      ),
    ).toBe(false);
  });
  it('rechaza la consulta completa si falla una fuente', async () => {
    state.fail = 'employee_schedule';
    await expect(
      fetchPayrollQuerySources(access, payrollQueryOptions),
    ).rejects.toThrow('employee_schedule: No autorizado');
  });
  it('no carga sin permiso y aísla la caché por usuario, empresa y alcance', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    state.auth.canView = () => false;
    const hook = renderHook(() => usePayrollDynamicQuery(payrollQueryOptions), {
      wrapper,
    });
    expect(state.calls).toHaveLength(0);
    state.auth.canView = () => true;
    hook.rerender();
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toHaveLength(3);
    expect(
      client
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.queryKey[1] === 'user-1' && query.queryKey[2] === 'company-1',
        ),
    ).toBe(true);
    state.auth.user = { id: 'user-2' };
    state.auth.currentCompanyId = 'company-2';
    hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toEqual([]);
    hook.unmount();
    client.clear();
  });
});
