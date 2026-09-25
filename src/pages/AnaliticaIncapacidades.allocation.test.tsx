import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnaliticaIncapacidades from './AnaliticaIncapacidades';
import type { ReactNode } from 'react';

const fixture = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock('@/hooks/useIncapacities', () => ({ useIncapacityAnalyticsData: () => ({ data: fixture.rows, isPending: false }) }));
vi.mock('@/hooks/useEmployees', () => ({ useIncapacityAnalyticsEmployees: () => ({ data: [{ id: 'e1', is_active: true, status: 'active' }], isPending: false }) }));
vi.mock('@/hooks/usePilaUgpp', () => ({ usePilaUgppSettings: () => ({ data: null }) }));
vi.mock('@/components/incapacities/IncapacityDetailDialog', () => ({ IncapacityDetailDialog: () => null }));
vi.mock('recharts', async importOriginal => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  ComposedChart: ({ data }: { data: unknown }) => <div data-testid="monthly-data">{JSON.stringify(data)}</div>,
  AreaChart: () => null,
  BarChart: () => null,
  PieChart: () => null,
  RadialBarChart: () => null,
}));

const certificate = (extra = {}) => ({
  id: 'case1', employee_id: 'e1', start_date: '2026-09-24', end_date: '2026-11-02', total_days: 40,
  origin: 'licencia_maternidad', diagnosis: 'Licencia', cie10_code: 'Z34', eps_name: 'EPS Prueba',
  total_amount: 4000, eps_amount: 4000, recovered_amount: 0, recovery_status: 'pendiente',
  employee: { first_name: 'Ana', last_name: 'Prueba', gender: 'F' }, extensions: [], ...extra,
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-24T12:00:00'));
  fixture.rows = [certificate()];
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const open = () => render(<MemoryRouter><AnaliticaIncapacidades /></MemoryRouter>);
const tab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });

describe('Analítica de Incapacidades calendar allocation', () => {
  it('shows elapsed days and prorated money across all three tabs', () => {
    open();
    expect(screen.getByText('Dias de incapacidad').parentElement).toHaveTextContent('1 dias promedio');
    expect(screen.getByText('Recobro pendiente').parentElement).toHaveTextContent('$ 100');
    tab('Infografias');
    expect(screen.getByText('Dias por mes')).toBeInTheDocument();
    tab('Centros de operación');
    const employeeRow = screen.getAllByText('Ana Prueba')[0].closest('tr');
    expect(employeeRow?.lastElementChild).toHaveTextContent('1');
    expect(screen.getByText('3 o más días')).toBeInTheDocument();
    expect(screen.getAllByText('$ 100').length).toBeGreaterThan(0);
  });

  it('includes a chain through its extension without prematurely reaching a milestone', () => {
    fixture.rows = [certificate({
      origin: 'comun', start_date: '2025-08-01', end_date: '2025-08-30', total_days: 30,
      extensions: [certificate({ id: 'extension', origin: 'comun', total_days: 40, extension_number: 1 })],
    })];
    open();
    expect(screen.getByText('Dias de incapacidad').parentElement).toHaveTextContent('1 dias promedio');
    expect(screen.getByRole('button', { name: /SEGUIMIENTO|Seguimiento/ })).toHaveTextContent('0 casos sensibles');
    expect(screen.getByRole('button', { name: /SEGUIMIENTO|Seguimiento/ })).toHaveTextContent('1 casos superan 30 dias');
  });

  it('flags invalid intervals and payments missing a valid date', () => {
    fixture.rows = [certificate({ recovered_amount: 200 }), certificate({ id: 'invalid', end_date: '2026-02-30' })];
    open();
    expect(screen.getByRole('alert')).toHaveTextContent('1 registros excluidos');
    expect(screen.getByRole('status')).toHaveTextContent('1 pagos');
    expect(screen.getByText('Recobro pendiente').parentElement).toHaveTextContent('$ 100');
  });

  it('keeps cash receipts from older certificates on their actual payment month', () => {
    fixture.rows = [certificate(), certificate({
      id: 'old', start_date: '2024-01-01', end_date: '2024-01-02', total_days: 2,
      recovered_amount: 250, actual_payment_date: '2026-09-20',
    }), certificate({
      id: 'future-payment', start_date: '2024-01-01', end_date: '2024-01-02', total_days: 2,
      recovered_amount: 500, actual_payment_date: '2026-09-30',
    })];
    open();
    const months = JSON.parse(screen.getByTestId('monthly-data').textContent!);
    expect(months.find((row: { key: string }) => row.key === '2026-09')).toMatchObject({ Dias: 1, Incapacidades: 1, Estimado: 100, Recuperado: 250 });
    expect(months.filter((row: { key: string }) => row.key !== '2026-09').every((row: { Dias: number }) => row.Dias === 0)).toBe(true);
  });

  it('counts a certificate once in the period while showing it in both affected months', () => {
    vi.setSystemTime(new Date('2026-10-05T12:00:00'));
    open();
    const months = JSON.parse(screen.getByTestId('monthly-data').textContent!);
    expect(months.find((row: { key: string }) => row.key === '2026-09')).toMatchObject({ Dias: 7, Incapacidades: 1, Estimado: 700 });
    expect(months.find((row: { key: string }) => row.key === '2026-10')).toMatchObject({ Dias: 5, Incapacidades: 1, Estimado: 500 });
    expect(screen.getByText('Dias de incapacidad').parentElement).toHaveTextContent('12 dias promedio');
    expect(screen.getByText('Casos filtrados').parentElement?.children[1]).toHaveTextContent(/^1$/);
  });
});
