import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company' }) }));
import { useTrainingCoursesByPeriod } from './useTraining';

let client: QueryClient;
let assignmentError: Error | null;
let assignmentReads: number;
const courses = ['Gestión de Residuos', 'Riesgos de salud pública', 'Investigación de accidentes', 'Factores de riesgo vial']
  .map((name, id) => ({ id: String(id), name, company_id: 'company', is_active: true }));

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  assignmentError = null;
  assignmentReads = 0;
  mocks.from.mockImplementation((table: string) => {
    const filters: Array<(row: Record<string, unknown>) => boolean> = [];
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query; },
      order: () => query,
      then: (resolve: (value: unknown) => unknown) => {
        const assignments = table === 'training_course_periods';
        if (assignments) assignmentReads++;
        const rows = assignments
          ? courses.map(course => ({ company_id: 'company', course_id: course.id, year: 2026, month: 11 }))
          : courses;
        return Promise.resolve({ data: rows.filter(row => filters.every(filter => filter(row))), error: assignments ? assignmentError : null }).then(resolve);
      },
    };
    return query;
  });
});
afterEach(() => { cleanup(); client.clear(); });
function wrapper({ children }: PropsWithChildren) { return createElement(QueryClientProvider, { client }, children); }

it('returns the assigned November courses and excludes them in another period', async () => {
  const { result, rerender } = renderHook(({ month }) => useTrainingCoursesByPeriod({ year: 2026, month }), { wrapper, initialProps: { month: 11 } });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.map(course => course.name)).toEqual(courses.map(course => course.name));
  rerender({ month: 10 });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual([]);
});

it('exposes assignment errors and retries the selected period', async () => {
  assignmentError = new Error('Period query failed');
  const { result } = renderHook(() => useTrainingCoursesByPeriod({ year: 2026, month: 11 }), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toBe(assignmentError);
  assignmentError = null;
  await result.current.refetch();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(assignmentReads).toBe(2);
  expect(result.current.data).toHaveLength(4);
});
