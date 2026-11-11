import { createElement, type PropsWithChildren } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', user: { id: 'user' } }) }));
import { useSaveTrainingCoursePeriods } from './useTraining';

let client: QueryClient;
const key = ['training_course_periods_by_course', 'company', 'course'];
const original = [{ year: 2026, month: 10 }];
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  client.setQueryData(key, original);
  mocks.rpc.mockReset();
});
afterEach(() => { cleanup(); client.clear(); });
function wrapper({ children }: PropsWithChildren) { return createElement(QueryClientProvider, { client }, children); }

it('saves all periods in one call and updates the editor cache from the saved response', async () => {
  const periods = [{ year: 2026, month: 11 }];
  mocks.rpc.mockResolvedValue({ data: periods, error: null });
  const { result } = renderHook(() => useSaveTrainingCoursePeriods(), { wrapper });
  await result.current.mutateAsync({ courseId: 'course', periods: [...periods, ...periods] });
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('save_training_course_periods', {
    p_company_id: 'company', p_course_id: 'course', p_periods: periods,
  });
  expect(client.getQueryData(key)).toEqual(periods);
});

it('retains cached periods and propagates a failed save so the user can retry', async () => {
  const error = new Error('Insert rejected');
  mocks.rpc.mockResolvedValue({ data: null, error });
  const { result } = renderHook(() => useSaveTrainingCoursePeriods(), { wrapper });
  await expect(result.current.mutateAsync({ courseId: 'course', periods: [{ year: 2026, month: 11 }] })).rejects.toBe(error);
  expect(client.getQueryData(key)).toEqual(original);
});

it('persists an intentional removal of every period', async () => {
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  const { result } = renderHook(() => useSaveTrainingCoursePeriods(), { wrapper });
  await result.current.mutateAsync({ courseId: 'course', periods: [] });
  expect(mocks.rpc).toHaveBeenCalledWith('save_training_course_periods', {
    p_company_id: 'company', p_course_id: 'course', p_periods: [],
  });
  expect(client.getQueryData(key)).toEqual([]);
});
