import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import PreLiquidacion from './PreLiquidacion';

const mocks = vi.hoisted(() => ({
  company: 'company-1', from: vi.fn(), toast: vi.fn(),
  employees: [{ id: 'employee-1', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST-1', work_info: { operation_center_id: 'center-1' }, active_employment_cycle: { id: 'cycle-1' } }],
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: mocks.company, user: { id: 'user-1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
const success = (data: unknown) => ({ data, isSuccess: true, isFetching: false, isError: false });
vi.mock('@/hooks/usePayrollConfig', () => ({ usePayrollConfig: () => success(null) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => success(mocks.employees) }));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => success([{ id: 'center-1', name: 'Centro de prueba' }]) }));
vi.mock('@/hooks/useHolidays', () => ({ useHolidaysSet: () => success(new Set()) }));
vi.mock('xlsx', async importOriginal => {
  const actual = await importOriginal<typeof import('xlsx') & { default: typeof import('xlsx') }>();
  return { ...actual.default, ...actual, utils: actual.utils || actual.default.utils, writeFile: vi.fn() };
});

type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let failTable: string | undefined;
let scheduleGate: Promise<void> | undefined;
let requests: { table: string; from: number; to: number; filters: [string, unknown][] }[];
let clients: QueryClient[];

beforeEach(() => {
  mocks.company = 'company-1';
  tables = {
    employee_schedule: [
      { employee_id: 'employee-1', employment_cycle_id: 'cycle-1', rest_day: 'martes', shift_types: { name: 'Diurno' } },
      // Older current rows must not overwrite the newest row in the same cycle.
      { employee_id: 'employee-1', employment_cycle_id: 'cycle-1', rest_day: 'domingo', shift_types: { name: 'Anterior' } },
    ],
    employee_shift_assignments: ['2026-09-22', '2026-09-27'].map(assignment_date => ({
      id: assignment_date, employee_id: 'employee-1', assignment_date, shifts: { is_rest_day: false },
    })),
  };
  failTable = undefined;
  scheduleGate = undefined;
  requests = [];
  clients = [];
  vi.mocked(XLSX.writeFile).mockClear();
  mocks.toast.mockClear();
  mocks.from.mockImplementation((table: string) => {
    let start = 0, end = 999;
    const filters: [string, unknown][] = [];
    const builder = {
      select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
      eq: vi.fn((column: string, value: unknown) => { filters.push([column, value]); return builder; }),
      gte: vi.fn().mockReturnThis(), lte: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis(),
      range: vi.fn((from: number, to: number) => { start = from; end = to; return builder; }),
      then: async (resolve: (result: { data: Row[] | null; error: Error | null }) => unknown) => {
        requests.push({ table, from: start, to: end, filters });
        if (table === 'employee_schedule') await scheduleGate;
        return resolve(table === failTable ? { data: null, error: new Error('Fallo de consulta de prueba') } : { data: (tables[table] || []).slice(start, end + 1), error: null });
      },
    };
    return builder;
  });
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); });

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(client);
  const view = render(<QueryClientProvider client={client}><PreLiquidacion /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-09-21' } });
  fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2026-09-27' } });
  return { ...view, client };
}
function calculate() { fireEvent.click(screen.getByRole('button', { name: 'Calcular' })); }
async function resultCells() {
  await screen.findByText('Ana Prueba');
  return within(screen.getByText('Ana Prueba').closest('tr')!).getAllByRole('cell');
}

describe('vista de preliquidación: consultas → cálculo → tabla → Excel', () => {
  it('espera el descanso del empleado antes de mostrar o exportar resultados', async () => {
    let release!: () => void;
    scheduleGate = new Promise(resolve => { release = resolve; });
    mount(); calculate();
    await screen.findByRole('status');
    expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    release();
    const cells = await resultCells();
    expect(cells[2]).toHaveTextContent('Martes');
    expect(cells[4]).toHaveTextContent('1.0');
    expect(cells[5]).toHaveTextContent('1.0');
    expect(cells[17]).toHaveTextContent('2');
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    const workbook = vi.mocked(XLSX.writeFile).mock.calls[0][0];
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Pre-Liquidación'])).toEqual([
      expect.objectContaining({ 'Día de Descanso Obligatorio': 'Martes', 'Jornada (días)': 1, 'Dominical Trabajado': 1, 'Total Días': 2 }),
    ]);
    expect(requests.every(request => request.filters.some(([key, value]) => ['company_id', 'employees_v2.company_id'].includes(key) && value === 'company-1'))).toBe(true);
  });
  it('oculta resultados y bloquea exportación si una consulta falla; permite reintentar', async () => {
    failTable = 'employee_schedule';
    mount(); calculate();
    expect(await screen.findByRole('alert')).toHaveTextContent('Fallo de consulta de prueba');
    expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    failTable = undefined;
    calculate();
    await resultCells();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('lee la segunda página de turnos, novedades y descansos', async () => {
    for (const table of ['employee_shift_assignments', 'employee_schedule', 'payroll_novelties']) {
      tables[table] = [...Array.from({ length: 1000 }, (_, i) => ({ id: `other-${i}`, employee_id: `other-${i}`, status: 'aprobada', novelty_date: '2026-09-21', novelty_type: 'hedo', hours: 1 })), ...(tables[table] || [{ employee_id: 'employee-1', status: 'aprobada', novelty_date: '2026-09-23', novelty_type: 'hedo', hours: 2 }])];
    }
    mount(); calculate();
    const cells = await resultCells();
    expect(cells[5]).toHaveTextContent('1.0');
    expect(cells[8]).toHaveTextContent('2.0');
    for (const table of ['employee_shift_assignments', 'employee_schedule', 'payroll_novelties']) {
      expect(requests).toContainEqual(expect.objectContaining({ table, from: 1000, to: 1999 }));
    }
  });
  it('rechaza períodos invertidos', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Fecha inicio'), { target: { value: '2026-10-01' } });
    calculate();
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });
  it('invalida los resultados al cambiar de período', async () => {
    mount(); calculate(); await resultCells();
    fireEvent.change(screen.getByLabelText('Fecha fin'), { target: { value: '2026-09-28' } });
    expect(screen.queryByText('Ana Prueba')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
  });
  it('no habilita cierre con descuentos porcentuales sin base monetaria', async () => {
    tables.employee_loans = [{ id: 'loan-1', employee_id: 'employee-1', status: 'activo', installment_amount: 10000, remaining_balance: 10000 }];
    tables.employee_deductions = [{ id: 'ded-1', employee_id: 'employee-1', status: 'activo', is_percentage: true, percentage_value: 10, description: 'Porcentaje pendiente' }];
    mount(); calculate(); await resultCells();
    expect(screen.getByRole('button', { name: 'Cerrar Período' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    const workbook = vi.mocked(XLSX.writeFile).mock.calls[0][0];
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Pre-Liquidación'])).toEqual([
      expect.objectContaining({ 'Total Deducciones ($)': 10000, Alerta: expect.stringContaining('Falta definir la base monetaria') }),
    ]);
  });
});
