import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: { data: undefined as Array<{ year: number; month: number }> | undefined, isSuccess: false, isError: false, refetch: vi.fn() } }));
vi.mock('./useTraining', () => ({ useTrainingCoursePeriodAssignments: () => mocks.query }));
import { useTrainingPeriodDraft } from './useTrainingPeriodDraft';

beforeEach(() => { mocks.query.data = undefined; mocks.query.isSuccess = false; mocks.query.isError = false; });

it('blocks editing existing periods until loaded, including read failures', () => {
  const { result, rerender } = renderHook(() => useTrainingPeriodDraft('course'));
  expect(result.current.isReady).toBe(false);
  act(() => result.current.setPeriods([]));
  expect(result.current.isReady).toBe(false);
  mocks.query.isError = true;
  rerender();
  expect(result.current.isError).toBe(true);
  mocks.query.data = [{ year: 2026, month: 11 }];
  mocks.query.isSuccess = true;
  mocks.query.isError = false;
  rerender();
  expect(result.current.isReady).toBe(true);
  expect(result.current.periods).toEqual([{ year: 2026, month: 11 }]);
});

it('does not overwrite edited periods on a background refetch', () => {
  mocks.query.data = [{ year: 2026, month: 10 }];
  mocks.query.isSuccess = true;
  const { result, rerender } = renderHook(() => useTrainingPeriodDraft('course'));
  act(() => result.current.setPeriods([{ year: 2026, month: 11 }]));
  mocks.query.data = [{ year: 2026, month: 10 }];
  rerender();
  expect(result.current.periods).toEqual([{ year: 2026, month: 11 }]);
  act(() => result.current.setPeriods([]));
  rerender();
  expect(result.current.periods).toEqual([]);
});

it('preserves the new course draft while its first read is empty or fails', () => {
  const { result, rerender } = renderHook(({ id }: { id: string | null }) => useTrainingPeriodDraft(id), { initialProps: { id: null } });
  act(() => result.current.setPeriods([{ year: 2026, month: 11 }]));
  act(() => result.current.adoptCreatedCourse('created'));
  rerender({ id: 'created' });
  mocks.query.data = [];
  mocks.query.isError = true;
  rerender({ id: 'created' });
  expect(result.current.isReady).toBe(true);
  expect(result.current.periods).toEqual([{ year: 2026, month: 11 }]);
});

it('never carries one course draft into another course', () => {
  mocks.query.data = [{ year: 2026, month: 10 }];
  mocks.query.isSuccess = true;
  const { result, rerender } = renderHook(({ id }) => useTrainingPeriodDraft(id), { initialProps: { id: 'first' } });
  act(() => result.current.setPeriods([{ year: 2026, month: 11 }]));
  mocks.query.data = undefined;
  mocks.query.isSuccess = false;
  rerender({ id: 'second' });
  expect(result.current.isReady).toBe(false);
  expect(result.current.periods).toEqual([]);
});
