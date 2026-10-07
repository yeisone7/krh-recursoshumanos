import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkCycleGeneratorDialog } from './BulkCycleGeneratorDialog';
import { CycleGeneratorDialog } from './CycleGeneratorDialog';
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), save: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company' }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: [1,2,3].map(i => ({ id: `e${i}`, first_name: 'E2E', last_name: `Prueba ${i}`, is_active: true })) }) }));
vi.mock('@/hooks/useSchedules', () => ({
  useShiftCycles: () => ({ data: [{ id: 'c1', name: 'E2E Ciclo', total_days: 1, is_active: true, cycle_days: [{ id: 'd1', day_number: 1, shift_id: 's1', shifts: { name: 'Diurno', is_active: true } }] }] }),
  useEmployeeTimeConfigs: () => ({ data: [1,2,3].map(i => ({ id: `cfg${i}`, employee_id: `e${i}`, mode: 'shift', shift_cycle_id: 'c1', start_date: '2020-01-01', is_active: true })) }),
}));
vi.mock('@/lib/cycleGenerationApi', () => ({ prepareCycleGeneration: mocks.prepare, saveCycleAssignments: mocks.save }));
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  mocks.prepare.mockReset(); mocks.save.mockReset(); mocks.save.mockResolvedValue([]);
  mocks.prepare.mockImplementation(async request => ({ assignments: request.employeeIds.map((id: string) => ({ employee_id: id, shift_id: 's1', assignment_date: request.start })), preserved: 2, absent: 0, outsideConfig: 0 }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const wrap = (child: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{child}</QueryClientProvider>);
describe('cycle generator dialogs', () => {
  it('starts bulk generation unselected and only saves the two selected employees', async () => {
    wrap(<BulkCycleGeneratorDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Vista Previa' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar empleados para generar ciclos' }), { target: { value: 'E2E' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'E2E Prueba 1' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'E2E Prueba 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vista Previa' }));
    await screen.findByText('Jornadas existentes conservadas:');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Generación' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
    expect(mocks.save.mock.calls[0][1].map((a: { employee_id: string }) => a.employee_id)).toEqual(['e1','e2']);
  });
  it('renders the individual generator with configured employees without crashing', () => {
    wrap(<CycleGeneratorDialog open onOpenChange={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Vista Previa' })).toBeDisabled();
  });
  it('blocks confirmation when consultation fails', async () => {
    mocks.prepare.mockRejectedValue(new Error('No fue posible consultar ausencias'));
    wrap(<BulkCycleGeneratorDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'E2E Prueba 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vista Previa' }));
    await waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce());
    expect(screen.queryByRole('button', { name: 'Confirmar Generación' })).toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects a changed preview without saving', async () => {
    wrap(<BulkCycleGeneratorDialog open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'E2E Prueba 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vista Previa' }));
    await screen.findByRole('button', { name: 'Confirmar Generación' });
    mocks.prepare.mockResolvedValueOnce({ assignments: [], preserved: 3, absent: 0, outsideConfig: 0 });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Generación' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirmar Generación' })).toBeNull());
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
