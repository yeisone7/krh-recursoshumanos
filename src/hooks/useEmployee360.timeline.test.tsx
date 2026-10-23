import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Tab360Timeline } from '@/components/employee360/Tab360Timeline';
import { useEmployee360 } from './useEmployee360';

const api = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock('./useEmployees', () => ({
  useEmployee: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    supabase: createClient('https://timeline.test', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: api.fetch },
    }),
  };
});

// Actual column names from the database schema. Invalid projections return the
// same API error that previously caused a populated timeline to appear empty.
const records: Record<string, Record<string, unknown>> = {
  contracts: {
    id: 'c1', contract_number: 'CT-001', contract_type: 'indefinido',
    start_date: '2026-01-01', end_date: null, is_terminated: false,
    termination_date: null, termination_reason: null, created_at: '2026-01-01',
  },
  employee_terminations: {
    id: 'r1', contract_id: 'c1', termination_type: 'renuncia',
    termination_date: '2026-02-01', effective_date: '2026-02-01',
    reason: 'Retiro voluntario', is_completed: true, created_at: '2026-02-01',
    contracts: { contract_number: 'CT-001' },
  },
  vacation_requests: {
    id: 'v1', start_date: '2026-03-01', end_date: '2026-03-05',
    status: 'aprobada', total_requested_days: 5, created_at: '2026-02-15',
  },
  leave_requests: {
    id: 'l1', start_date: '2026-04-01', end_date: '2026-04-01',
    status: 'aprobado', leave_type: 'personal', reason: 'Diligencia', created_at: '2026-03-15',
  },
  employee_incapacities: {
    id: 'i1', start_date: '2026-05-01', end_date: '2026-05-03',
    diagnosis: 'Diagnóstico de prueba', recovery_status: 'pendiente', created_at: '2026-05-01',
  },
  disciplinary_processes: {
    id: 'p1', opening_date: '2026-06-01', created_at: '2026-06-01',
    facts_description: 'Hechos registrados', status: 'abierto', case_number: 'DISC-001',
  },
  employee_documents: {
    id: 'd1', document_type: 'cedula', document_name: 'Documento de identidad',
    upload_date: '2026-07-01', expiry_date: null, is_valid: true, created_at: '2026-07-01',
  },
  training_completions: {
    id: 't1', completed_at: '2026-08-01', quiz_score: 0, course: { name: 'Inducción' },
  },
};

let failingTable: string | undefined;
let empty = false;

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  failingTable = undefined;
  empty = false;
  api.fetch.mockReset();
  api.fetch.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const table = url.pathname.split('/').pop()!;
    const row = records[table];
    const columns = (url.searchParams.get('select') || '*').split(',');
    const invalidColumn = columns.find(column => {
      const name = column.split(/[(:]/)[0];
      return name !== '*' && !(name in row);
    });
    if (invalidColumn || failingTable === table) {
      return new Response(JSON.stringify({
        code: invalidColumn ? '42703' : '42501',
        message: invalidColumn ? `column ${table}.${invalidColumn} does not exist` : 'permission denied',
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify(empty ? [] : [row]), {
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

describe('employee 360 timeline', () => {
  it('loads all eight event sources using valid columns and newest-first order', async () => {
    const { result } = renderHook(() => useEmployee360('employee-1', 'timeline'), { wrapper });
    await waitFor(() => expect(result.current.timeline).toHaveLength(8));

    expect(result.current.isErrorTimeline).toBe(false);
    expect(result.current.timeline.map(event => event.id)).toEqual([
      'training-t1', 'document-d1', 'disciplinary-p1', 'incapacity-i1',
      'leave-l1', 'vacation-v1', 'termination-r1', 'contract-c1',
    ]);
    expect(result.current.timeline[0]).toMatchObject({ description: 'Puntaje 0', status: 'Completada' });
    expect(result.current.timeline[2]).toMatchObject({ description: 'Hechos registrados', meta: 'DISC-001' });
    expect(result.current.timeline[3].status).toBe('pendiente');
    expect(result.current.timeline[5].description).toBe('5 dia(s) solicitados');
    for (const [request] of api.fetch.mock.calls) {
      expect(new URL(String(request)).searchParams.get('employee_id')).toBe('eq.employee-1');
    }
  });

  it('does not fetch timeline sources until the tab is selected', async () => {
    const { result, rerender } = renderHook(({ tab }) => useEmployee360('employee-1', tab), {
      wrapper, initialProps: { tab: 'profile' },
    });
    await waitFor(() => expect(api.fetch).toHaveBeenCalled());
    expect(api.fetch.mock.calls.some(([url]) => String(url).includes('/training_completions'))).toBe(false);
    rerender({ tab: 'timeline' });
    await waitFor(() => expect(result.current.timeline).toHaveLength(8));
  });

  it('distinguishes failed requests from an empty history and recovers on retry', async () => {
    failingTable = 'training_completions';
    function Timeline() {
      const data = useEmployee360('employee-1', 'timeline');
      return <Tab360Timeline
        events={data.timeline} isLoading={data.isLoadingTimeline}
        isError={data.isErrorTimeline} isFetching={data.isFetchingTimeline}
        onRetry={() => void data.refetchTimeline()}
      />;
    }
    render(<Timeline />, { wrapper });
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la línea de tiempo');
    expect(screen.queryByText('Sin eventos en la linea de tiempo')).not.toBeInTheDocument();
    failingTable = undefined;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Mostrando 8 de 8 eventos.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports a genuinely empty history without an error', async () => {
    empty = true;
    const { result } = renderHook(() => useEmployee360('employee-1', 'timeline'), { wrapper });
    await waitFor(() => expect(result.current.isLoadingTimeline).toBe(false));
    expect(result.current.timeline).toEqual([]);
    expect(result.current.isErrorTimeline).toBe(false);
  });
});
