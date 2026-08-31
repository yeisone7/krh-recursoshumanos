import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import { useProfessions } from '@/hooks/useProfessions';
import { useHolidays, useHolidaysMap, useHolidaysSet } from '@/hooks/useHolidays';
import { useNotificationCenter } from '@/hooks/useNotificationCenter';
import { useCreateOvertimeRecord } from '@/hooks/useOvertime';

const mocks = vi.hoisted(() => ({
  auth: { currentCompanyId: null as string | null, user: { id: 'user-1' } as { id: string } | null, isAdmin: false, isRRHH: false },
  from: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function queryBuilder() {
  return {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
}

let requests: { table: string; builder: ReturnType<typeof queryBuilder> }[];
let clients: QueryClient[];
beforeEach(() => {
  mocks.auth = { currentCompanyId: null, user: { id: 'user-1' }, isAdmin: false, isRRHH: false };
  requests = [];
  clients = [];
  mocks.from.mockReset().mockImplementation((table: string) => {
    const builder = queryBuilder();
    requests.push({ table, builder });
    return builder;
  });
});
afterEach(() => {
  cleanup();
  clients.forEach(client => client.clear());
});

function setup<T>(useHook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
  return { ...renderHook(useHook, { wrapper }), client };
}

describe.each([
  { table: 'education_levels', useCatalog: useEducationLevels },
  { table: 'professions', useCatalog: useProfessions },
])('$table effective-company queries', ({ table, useCatalog }) => {
  it('does not request data without either an explicit or authenticated company', () => {
    const { client } = setup(() => useCatalog());
    expect(client.getQueryState([table, null])?.fetchStatus).toBe('idle');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([
    { authCompany: 'company-a', explicitCompany: undefined, expected: 'company-a' },
    { authCompany: null, explicitCompany: 'company-b', expected: 'company-b' },
    { authCompany: 'company-a', explicitCompany: 'company-b', expected: 'company-b' },
  ])('filters and caches by $expected when explicit=$explicitCompany', async ({ authCompany, explicitCompany, expected }) => {
    mocks.auth.currentCompanyId = authCompany;
    const { client } = setup(() => useCatalog(explicitCompany));
    await waitFor(() => expect(client.getQueryState([table, expected])?.status).toBe('success'));
    expect(requests).toHaveLength(1);
    expect(requests[0].table).toBe(table);
    expect(requests[0].builder.eq).toHaveBeenCalledWith('company_id', expected);
  });
  it('refetches into a separate cache when the authenticated company changes', async () => {
    mocks.auth.currentCompanyId = 'company-a';
    const { client, rerender } = setup(() => useCatalog());
    await waitFor(() => expect(client.getQueryState([table, 'company-a'])?.status).toBe('success'));
    mocks.auth.currentCompanyId = 'company-b';
    rerender();
    await waitFor(() => expect(client.getQueryState([table, 'company-b'])?.status).toBe('success'));
    expect(requests[1].builder.eq).toHaveBeenCalledWith('company_id', 'company-b');
  });
});

describe.each([
  { name: 'list', useHolidayQuery: () => useHolidays(2026), key: 'company_holidays', suffix: [2026] },
  { name: 'set', useHolidayQuery: () => useHolidaysSet(), key: 'company_holidays_set', suffix: [] },
  { name: 'map', useHolidayQuery: () => useHolidaysMap(), key: 'company_holidays_map', suffix: [] },
])('holiday $name company scope', ({ name, useHolidayQuery, key, suffix }) => {
  it('is disabled without an active company', () => {
    const { client } = setup(() => useHolidayQuery());
    expect(mocks.from).not.toHaveBeenCalled();
    expect(client.getQueryState([key, null, ...suffix])?.fetchStatus).toBe('idle');
  });
  it('filters by company and isolates the cache after switching companies', async () => {
    mocks.auth.currentCompanyId = 'company-a';
    const { client, rerender } = setup(() => useHolidayQuery());
    await waitFor(() => expect(client.getQueryState([key, 'company-a', ...suffix])?.status).toBe('success'));
    expect(requests[0].table).toBe('company_holidays');
    expect(requests[0].builder.eq).toHaveBeenCalledWith('company_id', 'company-a');
    if (name === 'list') {
      expect(requests[0].builder.gte).toHaveBeenCalledWith('holiday_date', '2026-01-01');
      expect(requests[0].builder.lte).toHaveBeenCalledWith('holiday_date', '2026-12-31');
    } else {
      expect(requests[0].builder.eq).toHaveBeenCalledWith('is_active', true);
    }
    mocks.auth.currentCompanyId = 'company-b';
    rerender();
    await waitFor(() => expect(client.getQueryState([key, 'company-b', ...suffix])?.status).toBe('success'));
    expect(requests[1].builder.eq).toHaveBeenCalledWith('company_id', 'company-b');
  });
  it('also guards manual refetch without an active company', async () => {
    const { result } = setup(() => useHolidayQuery());
    await result.current.refetch();
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe('overtime holiday integration', () => {
  it('initializes the create mutation and loads holidays for the active company', async () => {
    mocks.auth.currentCompanyId = 'company-a';
    const { result, client } = setup(useCreateOvertimeRecord);
    await waitFor(() => expect(client.getQueryState(['company_holidays_set', 'company-a'])?.status).toBe('success'));
    expect(result.current.status).toBe('idle');
    expect(requests[0].table).toBe('company_holidays');
    expect(requests[0].builder.eq).toHaveBeenCalledWith('company_id', 'company-a');
  });
});

describe('notification center company-or-recipient scope', () => {
  it('does not query without an authenticated user', () => {
    mocks.auth.user = null;
    mocks.auth.currentCompanyId = 'company-a';
    const { client } = setup(useNotificationCenter);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(client.isFetching()).toBe(0);
  });
  it.each([
    { isAdmin: true, isRRHH: false, company: 'company-a', companyHistory: true },
    { isAdmin: false, isRRHH: true, company: 'company-a', companyHistory: true },
    { isAdmin: false, isRRHH: false, company: 'company-a', companyHistory: false },
    { isAdmin: true, isRRHH: false, company: null, companyHistory: false },
    { isAdmin: false, isRRHH: false, company: null, companyHistory: false },
  ])('uses the appropriate owner filter for admin=$isAdmin rrhh=$isRRHH company=$company', async ({ isAdmin, isRRHH, company, companyHistory }) => {
    Object.assign(mocks.auth, { isAdmin, isRRHH, currentCompanyId: company });
    const { client } = setup(useNotificationCenter);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(requests.map(request => request.table)).toEqual(['notifications', 'notification_delivery_logs']);
    requests.forEach(({ table, builder }) => {
      const owner = table === 'notifications' ? 'user_id' : 'recipient_user_id';
      expect(builder.eq.mock.calls).toEqual([[companyHistory ? 'company_id' : owner, companyHistory ? company : 'user-1']]);
    });
    expect(client.getQueryCache().findAll({ queryKey: ['notification-center'] }).every(query => query.queryKey.includes(company) || query.queryKey[1] === 'users')).toBe(true);
  });
});
