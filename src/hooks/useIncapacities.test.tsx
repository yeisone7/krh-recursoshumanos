import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIncapacities, useIncapacityAlerts } from './useIncapacities';

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company-1' }) }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabase: createClient('https://incapacities.test', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: api.fetch },
    }),
  };
});

afterEach(() => {
  cleanup();
  api.fetch.mockReset();
});

function renderIncapacityHook<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return renderHook(hook, { wrapper });
}

function mockApi(rowCount: number, serverLimit: number, failAfterFirstPage = false) {
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    id: String(index + 1).padStart(4, '0'),
    is_extension: index === 0,
    parent_incapacity_id: index === 0 ? String(rowCount).padStart(4, '0') : null,
    start_date: index === rowCount - 1 ? '2026-10-02' : '2026-10-01',
  }));

  api.fetch.mockImplementation(async (input: string) => {
    const { searchParams } = new URL(input);
    const cursor = searchParams.get('id')?.slice(3) ?? '';
    if (cursor && failAfterFirstPage) {
      return Response.json({ code: 'XX000', message: 'Page failed' }, { status: 500 });
    }
    const limit = Math.min(Number(searchParams.get('limit') ?? serverLimit), serverLimit);
    return Response.json(rows.filter((row) => row.id > cursor).slice(0, limit));
  });
}

describe('useIncapacities pagination', () => {
  it.each([1000, 600])('loads and groups records across pages when the API returns at most %s rows', async (serverLimit) => {
    mockApi(1001, serverLimit);
    const { result } = renderIncapacityHook(useIncapacities);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1000);
    expect(result.current.data?.[0]).toMatchObject({ id: '1001', extensions: [{ id: '0001' }] });
    expect(result.current.data?.[1].id).toBe('0002');
    const requests = api.fetch.mock.calls.map(([input]) => new URL(input).searchParams);
    expect(requests.map((params) => params.get('id'))).toEqual([
      null, `gt.${String(serverLimit).padStart(4, '0')}`, 'gt.1001',
    ]);
    for (const request of requests) {
      expect(request.get('company_id')).toBe('eq.company-1');
      expect(request.get('employee.employee_work_info.is_current')).toBe('eq.true');
      expect(request.get('order')).toBe('id.asc');
    }
  });

  it('reports a failed later page without returning a partial list', async () => {
    mockApi(1001, 1000, true);
    const { result } = renderIncapacityHook(useIncapacities);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ message: 'Page failed' });
    expect(result.current.data).toBeUndefined();
  });
});

describe('useIncapacityAlerts', () => {
  it('only alerts for outstanding EPS or ARL amounts and keeps AFP extension filing reminders', async () => {
    const record = {
      origin: 'comun', end_date: '2024-08-10', recovery_status: 'pendiente', total_days: 5, afp_amount: 600,
    };
    api.fetch.mockResolvedValueOnce(Response.json([
      { ...record, id: 'afp' },
      { ...record, id: 'afp-extension', is_extension: true, parent_incapacity_id: 'afp' },
      { ...record, id: 'mixed', eps_amount: 400, recovered_amount: 100 },
      { ...record, id: 'settled', arl_amount: 400, recovered_amount: 400 },
    ]));

    const { result } = renderIncapacityHook(useIncapacityAlerts);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map(({ id, type }) => [id, type])).toEqual([
      ['extension-filing-afp-extension', 'extension_pending'],
      ['rec-mixed', 'recovery_pending'],
    ]);
  });
});
