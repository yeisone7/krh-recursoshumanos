import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), level2: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', hasPermission: (module: string) => mocks.level2 || !module.endsWith('nivel_dos') }) }));
import CortesControl from './CortesControl';
let client: QueryClient;
beforeEach(() => {
  mocks.level2 = false;
  mocks.rpc.mockReset().mockImplementation((name: string) => Promise.resolve(name === 'payroll_cut_centers' ? { data: [{ id: 'center', name: 'Centro Norte' }], error: null } : { data: null, error: { message: 'Corte cambió: vuelva a intentar' } }));
  const builder = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve) };
  for (const method of ['select', 'eq', 'order', 'range'] as const) builder[method].mockReturnValue(builder);
  mocks.from.mockReturnValue(builder);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });
function mount() { render(<QueryClientProvider client={client}><CortesControl /></QueryClientProvider>); }
describe('CortesControl', () => {
  it('only shows actions for assigned levels and filters centers', async () => {
    mount(); await screen.findByText('Centro Norte');
    expect(screen.getByRole('columnheader', { name: 'Centro de operación' })).toBeInTheDocument();
    expect(screen.getByText('Crear nivel 1')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial de Centro Norte' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Aplicar' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Buscar centro'), { target: { value: 'Sur' } });
    expect(screen.queryByText('Centro Norte')).toBeNull();
  });
  it('preserves the date and reason after a server rejection', async () => {
    mount(); fireEvent.click(await screen.findByRole('button', { name: 'Aplicar' }));
    fireEvent.change(screen.getByLabelText('Fecha de corte (inclusive)'), { target: { value: '2026-01-10' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Cierre de prueba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar corte' }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Motivo')).toHaveValue('Cierre de prueba');
    expect(screen.getByLabelText('Fecha de corte (inclusive)')).toHaveValue('2026-01-10');
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('payroll_cut_change', expect.objectContaining({ p_level: 1, p_reason: 'Cierre de prueba' })));
  });
});
