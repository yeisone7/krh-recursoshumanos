import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ from: vi.fn(), auth: { currentCompanyId: 'company', assignedCenterIds: [] as string[], isAdmin: true, isSuperAdmin: false } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
import { useTrainingCompletions } from './useTraining';

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let requests: { table: string; select: string }[];
let courseError: Error | null;
let client: QueryClient;
beforeEach(() => {
  mocks.auth = { currentCompanyId: 'company', assignedCenterIds: [], isAdmin: true, isSuperAdmin: false };
  courseError = null;
  requests = [];
  tables = {
    training_completions: Array.from({ length: 1001 }, (_, i) => ({
      id: `row-${String(1001 - i).padStart(4, '0')}`, company_id: 'company', course_id: 'course',
      completed_at: '2026-09-01T12:00:00Z', operator_name: 'Persona', employee_id: 'employee',
      employee: { id: 'employee' }, signature_data: 'signature',
    })),
    training_courses: [{ id: 'course', company_id: 'company', name: 'Curso', content: { objetivos: ['Objetivo para el PDF'] } }],
    employee_work_info: [{ id: 'work', employee_id: 'employee', is_current: true, operation_center_id: 'north' }],
  };
  mocks.from.mockReset().mockImplementation((table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let limit = Infinity;
    const query = {
      select: (select: string) => { requests.push({ table, select }); return query; },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query; },
      order: () => query,
      limit: (value: number) => { limit = value; return query; },
      or: (cursor: string) => {
        const id = cursor.match(/id\.lt\.([^)]*)/)?.[1];
        filters.push(row => String(row.id) < id!);
        return query;
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: (tables[table] || []).filter(row => filters.every(filter => filter(row))).slice(0, limit),
        error: table === 'training_courses' ? courseError : null,
      }).then(resolve),
    };
    return query;
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });
function wrapper({ children }: PropsWithChildren) { return createElement(QueryClientProvider, { client }, children); }

describe('evidence loading', () => {
  it('loads every page and shares course content without repeating it in each completion request', async () => {
    const { result } = renderHook(() => useTrainingCompletions(undefined, { includeSignatures: false }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1001);
    expect(requests.filter(r => r.table === 'training_completions')).toHaveLength(2);
    expect(requests.filter(r => r.table === 'training_completions').every(r => !r.select.includes('training_courses'))).toBe(true);
    expect(requests.filter(r => r.table === 'training_courses')).toHaveLength(1);
    expect(result.current.data![0].course?.content).toEqual({ objetivos: ['Objetivo para el PDF'] });
    expect(result.current.data![0].course).toBe(result.current.data![1000].course);
    expect(result.current.data![0].signature_data).toBe('');
    expect(result.current.data![0].employee?.employee_work_info).toHaveLength(1);
  });

  it('retains the center restriction after hydrating courses and employee work data', async () => {
    mocks.auth.isAdmin = false;
    mocks.auth.assignedCenterIds = ['south'];
    const { result } = renderHook(() => useTrainingCompletions(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('reports course query errors instead of exporting silently incomplete reports', async () => {
    courseError = new Error('Connection failed');
    const { result } = renderHook(() => useTrainingCompletions(), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(courseError);
  });
});
