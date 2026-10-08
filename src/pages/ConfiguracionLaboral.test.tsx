import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ConfiguracionLaboral from './ConfiguracionLaboral';
import { PayrollConfigDialog } from '@/components/payroll/PayrollConfigDialog';

const mocks = vi.hoisted(() => ({ config: {} as Record<string, unknown>, concepts: [] as Record<string, unknown>[], rpc: vi.fn(), savePolicy: vi.fn(), markSaved: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company-a' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/hooks/usePayrollConfig', () => ({ usePayrollConfig: () => ({ data: mocks.config, isLoading: false }) }));
vi.mock('@/hooks/useLaborDisconnectionPolicy', () => ({
  useLaborDisconnectionPolicy: () => ({ data: null, isLoading: false }),
  useCompanyPolicyUsers: () => ({ data: [] }),
  useUpsertLaborDisconnectionPolicy: () => ({ mutateAsync: mocks.savePolicy, isPending: false }),
}));
vi.mock('@/components/workspace/WorkspacePaneContext', async importOriginal => ({
  ...await importOriginal<typeof import('@/components/workspace/WorkspacePaneContext')>(),
  useWorkspaceActive: () => true,
  useWorkspaceEditor: () => ({ captureProps: {}, markSaved: mocks.markSaved }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.config = { daily_hours: 8, max_weekly_hours: 46, display_unit: 'hours', night_start: '21:00', night_end: '06:00', updated_at: '2026-10-08T00:00:00Z' };
  mocks.concepts = [
    { id: 'dom', company_id: 'company-a', name: 'Dominical Trabajado', identifier: 'DOMINICAL', unit: 'days', percentage: 90, is_active: true, system_type: 'dominical_trabajado', sort_order: 0 },
    { id: 'fest', company_id: 'company-a', name: 'Festivo Trabajado', identifier: 'FESTIVO', unit: 'days', percentage: 100, is_active: true, system_type: 'festivo_trabajado', sort_order: 1 },
  ];
  mocks.rpc.mockImplementation(async (name, args) => {
    if (name === 'list_payroll_concepts') return { data: mocks.concepts, error: null };
    mocks.concepts = args.p_concepts;
    return { data: { ...mocks.config, ...args.p_config }, error: null };
  });
  mocks.savePolicy.mockResolvedValue({});
});
afterEach(cleanup);
const open = (surface: string) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{surface === 'page' ? <ConfiguracionLaboral /> : <PayrollConfigDialog open onOpenChange={vi.fn()} />}</QueryClientProvider>);

describe.each(['page', 'dialog'])('managed concepts in %s', surface => {
  it('saves independent rates, accepts decimals and zero, and restores the catalog', async () => {
    const view = open(surface);
    const group = await screen.findByRole('group', { name: 'Concepto 1' });
    fireEvent.change(within(group).getByLabelText('Porcentaje (%)'), { target: { value: '95.5' } });
    const fest = screen.getByRole('group', { name: 'Concepto 2' });
    expect(within(fest).getByLabelText('Porcentaje (%)')).toHaveValue(100);
    fireEvent.change(within(fest).getByLabelText('Porcentaje (%)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: surface === 'page' ? /Guardar Cambios/i : 'Guardar' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('save_payroll_settings', expect.objectContaining({ p_concepts: expect.arrayContaining([expect.objectContaining({ id: 'dom', percentage: 95.5 }), expect.objectContaining({ id: 'fest', percentage: 0 })]) })));
    view.unmount(); open(surface);
    expect(within(await screen.findByRole('group', { name: 'Concepto 1' })).getByLabelText('Porcentaje (%)')).toHaveValue(95.5);
  });
  it('adds a concept, validates duplicate identifiers and keeps edits after errors', async () => {
    open(surface); await screen.findByRole('group', { name: 'Concepto 1' });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar concepto' }));
    const group = screen.getByRole('group', { name: 'Concepto 3' });
    fireEvent.change(within(group).getByLabelText('Nombre'), { target: { value: 'Bono especial' } });
    fireEvent.change(within(group).getByLabelText('Identificador'), { target: { value: ' dominical ' } });
    fireEvent.click(screen.getByRole('button', { name: surface === 'page' ? /Guardar Cambios/i : 'Guardar' }));
    expect(within(group.parentElement!).getByRole('alert')).toHaveTextContent('identificador ya está en uso');
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'save_payroll_settings')).toHaveLength(0);
    fireEvent.change(within(group).getByLabelText('Identificador'), { target: { value: 'BONO' } });
    mocks.rpc.mockImplementation(async name => name === 'list_payroll_concepts' ? { data: mocks.concepts, error: null } : { data: null, error: new Error('Error de guardado') });
    fireEvent.click(screen.getByRole('button', { name: surface === 'page' ? /Guardar Cambios/i : 'Guardar' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('save_payroll_settings', expect.anything()));
    expect(within(group).getByLabelText('Nombre')).toHaveValue('Bono especial');
    expect(within(group).getByLabelText('Identificador')).toHaveValue('BONO');
  });
});
