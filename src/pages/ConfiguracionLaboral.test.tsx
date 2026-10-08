import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfiguracionLaboral from './ConfiguracionLaboral';
import { PayrollConfigDialog } from '@/components/payroll/PayrollConfigDialog';

const mocks = vi.hoisted(() => ({
  config: {} as Record<string, unknown>,
  save: vi.fn(),
  savePolicy: vi.fn(),
  markSaved: vi.fn(),
}));
vi.mock('@/hooks/usePayrollConfig', () => ({
  usePayrollConfig: () => ({ data: mocks.config, isLoading: false }),
  useUpsertPayrollConfig: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
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
  mocks.config = {
    max_weekly_hours: 46, daily_hours: 8, display_unit: 'hours',
    night_start: '21:00', night_end: '06:00',
    surcharge_hedo: 25, surcharge_heno: 75, surcharge_rn: 35,
    surcharge_hedf: 215, surcharge_henf: 265, surcharge_rnf: 125,
    surcharge_dominical: 90, surcharge_festivo: 100,
  };
  mocks.save.mockImplementation(async values => {
    mocks.config = { ...mocks.config, ...values };
    return mocks.config;
  });
  mocks.savePolicy.mockResolvedValue({});
});
afterEach(cleanup);

describe.each(['page', 'dialog'] as const)('independent surcharge configuration in %s', surface => {
  const open = () => render(surface === 'page'
    ? <ConfiguracionLaboral />
    : <PayrollConfigDialog open onOpenChange={vi.fn()} />);

  it('saves different rates and restores each value when reopened', async () => {
    const view = open();
    const dominical = screen.getByLabelText('Dominical Trabajado (%)');
    const festivo = screen.getByLabelText('Festivo Trabajado (%)');
    expect(dominical).toHaveValue(90);
    expect(festivo).toHaveValue(100);
    fireEvent.change(festivo, { target: { value: '110' } });
    expect(dominical).toHaveValue(90);
    fireEvent.change(dominical, { target: { value: '95' } });
    expect(festivo).toHaveValue(110);
    fireEvent.click(screen.getByRole('button', { name: surface === 'page' ? /Guardar Cambios/i : 'Guardar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      surcharge_dominical: 95, surcharge_festivo: 110, surcharge_hedf: 215,
    })));
    view.unmount();
    open();
    expect(screen.getByLabelText('Dominical Trabajado (%)')).toHaveValue(95);
    expect(screen.getByLabelText('Festivo Trabajado (%)')).toHaveValue(110);
  });

  it('preserves the shared rate for an older configuration and accepts zero for festivo', async () => {
    delete mocks.config.surcharge_festivo;
    open();
    expect(screen.getByLabelText('Festivo Trabajado (%)')).toHaveValue(90);
    fireEvent.change(screen.getByLabelText('Festivo Trabajado (%)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: surface === 'page' ? /Guardar Cambios/i : 'Guardar' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      surcharge_dominical: 90, surcharge_festivo: 0,
    })));
  });
});
