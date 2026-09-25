import { createElement, type ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarAbsences, useCalendarAssignments, useCalendarTimeConfigs } from './useShiftCalendarData';
import { useEmployees } from './useEmployees';

const mocks = vi.hoisted(() => ({
  auth: { currentCompanyId: 'company-a' as string | null, assignedCenterIds: [] as string[], isAdmin: true, isSuperAdmin: false },
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

type Row = Record<string, unknown>;
type Result = { data: Row[] | null; error: unknown };
const requests: ReturnType<typeof builder>[] = [];
let respond: (request: ReturnType<typeof builder>) => Promise<Result>;
function builder(table: string) {
  const request = {
    table, first: 0, last: 999,
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn((first: number, last: number) => { request.first = first; request.last = last; return request; }),
    then: (resolve: (result: Result) => unknown, reject: (error: unknown) => unknown) => respond(request).then(resolve, reject),
  };
  return request;
}
const clients: QueryClient[] = [];
function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { ...renderHook(hook, { wrapper }), client };
}
beforeEach(() => {
  requests.length = 0;
  mocks.auth = { currentCompanyId: 'company-a', assignedCenterIds: [], isAdmin: true, isSuperAdmin: false };
  respond = async () => ({ data: [], error: null });
  mocks.from.mockImplementation((table: string) => { const request = builder(table); requests.push(request); return request; });
});
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); vi.clearAllMocks(); });
const period = { startDate: '2026-09-16', endDate: '2026-09-30' };

describe('calendar queries', () => {
  it('starts all three absence sources together and scopes them to company and overlapping dates', async () => {
    const pending: Array<(result: Result) => void> = [];
    respond = () => new Promise(resolve => pending.push(resolve));
    const { result } = setup(() => useCalendarAbsences(period));
    await waitFor(() => expect(pending).toHaveLength(3));
    expect(result.current.isLoading).toBe(true);
    for (const request of requests) {
      expect(request.eq).toHaveBeenCalledWith('company_id', 'company-a');
      expect(request.gte).toHaveBeenCalledWith('end_date', period.startDate);
      expect(request.lte).toHaveBeenCalledWith('start_date', period.endDate);
    }
    await act(async () => pending.forEach(resolve => resolve({ data: [{ employee_id: 'e1', start_date: '2026-09-01', end_date: '2026-10-01' }], error: null })));
    await waitFor(() => expect(result.current.data).toHaveLength(3));
    expect(result.current.data.map(row => row.type)).toEqual(['vacation', 'leave', 'incapacity']);
    expect(requests[0].in).toHaveBeenCalledWith('status', ['aprobado', 'en_curso', 'completado']);
    expect(requests[1].eq).toHaveBeenCalledWith('status', 'aprobado');
  });

  it('paginates assignments beyond 1000 without repeating employee and shift details', async () => {
    respond = async request => ({ data: Array.from({ length: request.first === 0 ? 1000 : 1 }, (_, i) => ({ id: `a${request.first + i}` })), error: null });
    const { result } = setup(() => useCalendarAssignments(period));
    await waitFor(() => expect(result.current.data).toHaveLength(1001));
    expect(requests.map(request => request.first)).toEqual([0, 1000]);
    for (const request of requests) {
      expect(request.select.mock.calls[0][0]).not.toContain('shifts(');
      expect(request.select.mock.calls[0][0]).not.toContain('first_name');
      expect(request.eq).toHaveBeenCalledWith('employees_v2.company_id', 'company-a');
      expect(request.eq).toHaveBeenCalledWith('employees_v2.is_active', true);
      expect(request.gte).toHaveBeenCalledWith('assignment_date', period.startDate);
      expect(request.lte).toHaveBeenCalledWith('assignment_date', period.endDate);
    }
  });

  it('loads only schedule versions overlapping the period, including versions that ended', async () => {
    const { result } = setup(() => useCalendarTimeConfigs(period));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[0].lte).toHaveBeenCalledWith('start_date', period.endDate);
    expect(requests[0].or).toHaveBeenCalledWith('end_date.is.null,end_date.gte.2026-09-16');
    expect(requests[0].eq).not.toHaveBeenCalledWith('is_active', true);
    expect(requests[0].select.mock.calls[0][0]).not.toContain('shift_cycles');
  });

  it('reports absence failures instead of displaying an empty, assignable calendar', async () => {
    respond = async request => ({ data: [], error: request.table === 'leave_requests' ? new Error('offline') : null });
    const { result } = setup(() => useCalendarAbsences(period));
    await waitFor(() => expect(result.current.error?.message).toBe('offline'));
  });

  it('reuses module invalidations and separates date ranges and companies in the cache', async () => {
    let dates = period;
    const { result, client, rerender } = setup(() => useCalendarAssignments(dates));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => { await client.invalidateQueries({ queryKey: ['shift_assignments'] }); });
    expect(requests).toHaveLength(2);
    dates = { startDate: '2026-10-01', endDate: '2026-10-15' };
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requests[2].gte).toHaveBeenCalledWith('assignment_date', dates.startDate);
    mocks.auth.currentCompanyId = 'company-b'; rerender();
    await waitFor(() => expect(requests).toHaveLength(4));
    expect(requests[3].eq).toHaveBeenCalledWith('employees_v2.company_id', 'company-b');
  });

  it('does not request data without a company, even during a manual retry', async () => {
    mocks.auth.currentCompanyId = null;
    const { result } = setup(() => ({ assignments: useCalendarAssignments(period), configs: useCalendarTimeConfigs(period), absences: useCalendarAbsences(period) }));
    await act(async () => { await Promise.all([result.current.assignments.refetch(), result.current.configs.refetch(), result.current.absences.refetch()]); });
    expect(requests).toHaveLength(0);
  });

  it('omits inactive employees and contact data without poisoning the full employee cache', async () => {
    const { result, client } = setup(() => ({ calendar: useEmployees({ calendar: true }), full: useEmployees() }));
    await waitFor(() => expect(result.current.calendar.isSuccess && result.current.full.isSuccess).toBe(true));
    const calendar = requests.find(request => !request.select.mock.calls[0][0].includes('employee_contact'))!;
    expect(calendar.eq).toHaveBeenCalledWith('is_active', true);
    expect(calendar.eq).toHaveBeenCalledWith('company_id', 'company-a');
    expect(calendar.eq).not.toHaveBeenCalledWith('employee_contact.is_current', true);
    expect(client.getQueryCache().findAll({ queryKey: ['employees_v2'] })).toHaveLength(2);
  });

  it('preserves assigned-center restrictions, including additional centers', async () => {
    mocks.auth.isAdmin = false;
    mocks.auth.assignedCenterIds = ['center-a'];
    respond = async request => ({ data: request.table === 'employee_work_info' ? [{ employee_id: 'e1' }] : request.table === 'employee_operation_center_assignments' ? [{ employee_id: 'e2' }] : [], error: null });
    const { result } = setup(() => useEmployees({ calendar: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const employees = requests.find(request => request.table === 'employees_v2')!;
    expect(employees.in).toHaveBeenCalledWith('id', ['e1', 'e2']);
    expect(requests.filter(request => request.table !== 'employees_v2')).toHaveLength(2);
  });
});
