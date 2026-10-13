import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateShift } from './useSchedules';
import type { Shift } from '@/types/schedule';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), company: 'company' as string | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: mocks.company }) }));
const values = {
  name: 'Turno Banadia', code: 'BAN005', start_time: '06:00', end_time: '14:00',
  break_minutes: 0, crosses_midnight: false, color: '#123456', is_rest_day: false,
  is_not_worked_day: false, is_suspension_day: false, is_active: true, kind: 'day',
} as const;

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks(); mocks.company = 'company';
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('atomic shift creation', () => {
  it('creates a day shift and its centers in one RPC and invalidates the catalog', async () => {
    const saved = { ...values, id: 'new-shift' } as Shift;
    mocks.rpc.mockResolvedValue({ data: saved, error: null });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreateShift(), { wrapper });
    await act(async () => {
      expect(await result.current.mutateAsync({ ...values, operation_center_ids: ['banadia'] })).toEqual(saved);
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('create_shift_with_centers', {
      p_company_id: 'company', p_values: values, p_operation_center_ids: ['banadia'],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['shifts'] });
  });

  it('preserves the database permission error for the dialog', async () => {
    const error = { code: '42501', message: 'No tienes autorización para crear turnos en esta empresa' };
    mocks.rpc.mockResolvedValue({ data: null, error });
    const { result } = renderHook(() => useCreateShift(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync(values)).rejects.toEqual(error); });
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });

  it('sends no centers for an operational shift', async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    const { result } = renderHook(() => useCreateShift(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ ...values, kind: 'operational', operation_center_ids: ['banadia'] }); });
    expect(mocks.rpc.mock.calls[0][1].p_operation_center_ids).toEqual([]);
  });

  it('requires a selected company before calling the server', async () => {
    mocks.company = null;
    const { result } = renderHook(() => useCreateShift(), { wrapper });
    await act(async () => { await expect(result.current.mutateAsync(values)).rejects.toThrow('Selecciona una empresa'); });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
