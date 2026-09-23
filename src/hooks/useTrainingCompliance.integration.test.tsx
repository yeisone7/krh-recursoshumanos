import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  auth: { currentCompanyId: 'company', user: { id: 'viewer' }, assignedCenterIds: ['north'], isAdmin: false, isSuperAdmin: false },
  periods: [] as { course_id: string }[],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useTraining', () => ({ useTrainingCoursePeriods: () => ({ data: mocks.periods, isLoading: false }) }));
import { useTrainingCompliance } from './useTrainingCompliance';

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let client: QueryClient;
function employee(id: string, center = 'north', company = 'company') {
  return { id, company_id: company, first_name: 'Persona', last_name: id, document_number: `100${id}`, is_active: true,
    employee_work_info: [{ operation_center_id: center, is_current: true }] };
}
function completion(id: string, employeeId: string | null, document: string | null = null) {
  return { id, company_id: 'company', course_id: 'course', employee_id: employeeId, operator_cedula: document,
    completed_at: '2026-09-01T12:00:00Z', operator_name: 'Persona', course: { id: 'course', name: 'Buenas prácticas', code: 'BPM' },
    training_access_tokens: null };
}
beforeEach(() => {
  mocks.auth = { currentCompanyId: 'company', user: { id: 'viewer' }, assignedCenterIds: ['north'], isAdmin: false, isSuperAdmin: false };
  mocks.periods = [];
  tables = {
    employees_v2: [employee('1'), employee('2'), employee('3', 'south'), employee('4', 'other', 'other-company')],
    operation_centers: [{ id: 'north', name: 'Norte', company_id: 'company' }, { id: 'south', name: 'Sur', company_id: 'company' }, { id: 'other', name: 'Otra empresa', company_id: 'other-company' }],
    training_courses: [{ id: 'course', name: 'Buenas prácticas', code: 'BPM', company_id: 'company', status: 'publicado', is_active: true }],
    training_completions: [completion('c1', '1'), completion('c3', '3')],
    training_access_tokens: [],
  };
  mocks.from.mockReset().mockImplementation((table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    let start = 0;
    let end = Infinity;
    const query = {
      select: () => query,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return query; },
      not: (key: string, _operator: string, value: unknown) => { filters.push(row => row[key] !== value); return query; },
      order: () => query,
      range: (from: number, to: number) => { start = from; end = to; return query; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        data: (tables[table] || []).filter(row => filters.every(filter => filter(row))).slice(start, end + 1), error: null,
      }).then(resolve),
    };
    return query;
  });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
});
afterEach(() => { cleanup(); client.clear(); });
function wrapper({ children }: PropsWithChildren) {
  return createElement(QueryClientProvider, { client }, children);
}
async function mount(period?: { year: number; month: number }) {
  const hook = renderHook(() => useTrainingCompliance(period), { wrapper });
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook;
}

describe('training compliance with restricted center access', () => {
  it('recognizes completion when the viewer cannot read its access link (Juan)', async () => {
    const { result } = await mount();
    expect(result.current.complianceData).toHaveLength(1);
    expect(result.current.complianceData[0].center_id).toBe('north');
    expect(result.current.complianceData[0].courses[0]).toMatchObject({ total: 2, completedCount: 1, percentage: 50 });
    expect(result.current.complianceData[0].courses[0].pending.map(e => e.id)).toEqual(['2']);
  });

  it('counts 54 of 180 active employees when links have no center (Calidad)', async () => {
    tables.employees_v2 = Array.from({ length: 180 }, (_, i) => employee(String(i + 1)));
    tables.employees_v2.push({ ...employee('181'), is_active: false });
    tables.training_completions = Array.from({ length: 54 }, (_, i) => ({ ...completion(`c${i}`, String(i + 1)), training_access_tokens: { operation_center_id: null } }));
    tables.training_completions.push(completion('inactive', '181'));
    const { result } = await mount();
    expect(result.current.complianceData[0].courses[0]).toMatchObject({ total: 180, completedCount: 54, percentage: 30 });
    expect(result.current.complianceData[0].courses[0].pending).toHaveLength(126);
  });

  it('uses the authorized employee center even when the link belongs to another center', async () => {
    tables.training_completions[0].training_access_tokens = { operation_center_id: 'south' };
    const { result } = await mount();
    const [center] = result.current.complianceData;
    expect(center.courses[0].completed.map(c => c.employee.id)).toEqual(['1']);
    expect(result.current.centers.map(c => c.id)).toEqual(['north']);
  });

  it('matches legacy document-only completions and counts duplicate evidence once', async () => {
    tables.training_completions = [completion('first', null, '1.001'), completion('duplicate', '1'), completion('blank', null, '')];
    const { result } = await mount();
    expect(result.current.complianceData[0].courses[0].completedCount).toBe(1);
  });

  it('does not match completions from another company even with the same employee document', async () => {
    tables.training_completions = [{ ...completion('foreign', null, '1001'), company_id: 'other-company' }];
    const { result } = await mount();
    expect(result.current.complianceData[0].courses[0].completedCount).toBe(0);
  });

  it('preserves administrator access to all company centers', async () => {
    mocks.auth.isAdmin = true;
    const { result } = await mount();
    expect(result.current.complianceData.map(c => c.center_id)).toEqual(['north', 'south']);
    expect(result.current.complianceData.map(c => c.courses[0].completedCount)).toEqual([1, 1]);
  });

  it('loads configured period courses without visible links, including while queries are loading', async () => {
    mocks.periods = [{ course_id: 'course' }];
    const { result } = await mount({ year: 2026, month: 9 });
    expect(result.current.courses.map(c => c.id)).toEqual(['course']);
    expect(result.current.complianceData[0].courses[0].completedCount).toBe(1);
  });

  it('keeps period link associations scoped to the selected company', async () => {
    mocks.auth.isAdmin = true;
    tables.training_access_tokens = [{ company_id: 'other-company', course_id: 'course', operation_center_id: 'north', created_at: '2026-09-02T12:00:00Z' }];
    const { result } = await mount({ year: 2026, month: 9 });
    expect(result.current.courses).toEqual([]);
    expect(result.current.complianceData).toEqual([]);
  });

  it('does not reuse the previous user completion cache after switching accounts', async () => {
    const { result, rerender } = await mount();
    expect(result.current.complianceData[0].courses[0].completedCount).toBe(1);
    tables.training_completions = [];
    mocks.auth.user = { id: 'another-viewer' };
    rerender();
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.complianceData[0].courses[0].completedCount).toBe(0);
  });
});
