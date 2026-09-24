import { useState, type ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContractFormDialog } from './ContractFormDialog';
import { WorkspacePaneContext } from '@/components/workspace/WorkspacePaneContext';

const mocks = vi.hoisted(() => ({
  update: vi.fn().mockResolvedValue({}), create: vi.fn(),
  employees: [{ id: 'employee', first_name: 'Empleado', last_name: 'Prueba', document_number: 'TEST-1', is_active: true }],
  types: [
    { id: 'fixed', is_active: true, contract_type: 'fijo', display_name: 'Término fijo', requires_end_date: true },
    { id: 'work', is_active: true, contract_type: 'obra_labor', display_name: 'Obra o labor', requires_end_date: true },
  ],
}));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: mocks.employees }) }));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));
vi.mock('@/hooks/useContractTypes', () => ({ useContractTypes: () => ({ data: mocks.types }) }));
vi.mock('@/hooks/useContracts', () => ({
  useContracts: () => ({ data: [] }),
  useCreateContract: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateContract: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', canView: () => true, canUpdate: () => true }) }));
vi.mock('@/components/ui/city-department-select', () => ({ CitySelect: () => null }));

const fixedContract = {
  id: 'contract', employee_id: 'employee', contract_type: 'fijo',
  start_date: '2026-09-24', end_date: '2027-01-23', salary: 4000000,
  salary_type: 'mensual', trial_period_days: 60,
} as NonNullable<ComponentProps<typeof ContractFormDialog>['contractToEdit']>;
const pane = { id: '/contratos', active: true, desktop: true, registerDirty: vi.fn(), registerResume: vi.fn() };
function Editor({ contract = fixedContract }: { contract?: typeof fixedContract }) {
  const [open, setOpen] = useState(true);
  return <WorkspacePaneContext.Provider value={pane}>
    <ContractFormDialog open={open} onOpenChange={setOpen} contractToEdit={contract} />
  </WorkspacePaneContext.Provider>;
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('contract date editing', () => {
  it('retains the selected start date and recalculated end date until Save', async () => {
    render(<Editor />);
    fireEvent.click(screen.getByLabelText(/Fecha de Inicio/));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const day = screen.getByRole('gridcell', { name: '25' });
    fireEvent.pointerDown(day, { pointerType: 'mouse' });
    fireEvent.click(day);
    expect(screen.getByRole('dialog', { name: 'Editar Contrato' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de Inicio/)).toHaveTextContent('25 septiembre 2026');
    expect(screen.getByLabelText(/Fecha de Finalización/)).toHaveTextContent('24 enero 2027');
    expect(screen.getByLabelText(/Fecha de Finalización/)).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.keyDown(day, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'contract', start_date: '2026-09-25', end_date: '2027-01-24',
    })));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Editar Contrato' })).toBeNull());
  });

  it('retains a manually selected end date for an obra/labor contract', async () => {
    render(<Editor contract={{ ...fixedContract, contract_type: 'obra_labor', end_date: '2026-09-26' }} />);
    fireEvent.click(screen.getByLabelText(/Fecha de Finalización/));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    const day = screen.getByRole('gridcell', { name: '28' });
    fireEvent.pointerDown(day, { pointerType: 'mouse' });
    fireEvent.click(day);
    expect(screen.getByRole('dialog', { name: 'Editar Contrato' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Fecha de Finalización/)).toHaveTextContent('28 septiembre 2026');
    expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.keyDown(day, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      start_date: '2026-09-24', end_date: '2026-09-28',
    })));
  });
});
