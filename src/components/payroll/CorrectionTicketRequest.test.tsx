import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CorrectionTicketRequest, TicketActions } from './CorrectionTicketRequest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  employees: [
    { id: 'employee-a', first_name: 'Marina', last_name: 'Babilonia', document_number: '123', work_info: { operation_center_id: 'center-a' }, operation_centers: { id: 'center-a', name: 'Centro Norte' } },
    { id: 'employee-b', first_name: 'Carlos', last_name: 'Pérez', document_number: '456', work_info: { operation_center_id: 'center-b' }, operation_centers: { id: 'center-b', name: 'Centro Sur' } },
    { id: 'employee-c', first_name: 'Ana', last_name: 'López', document_number: '789' },
  ],
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', hasPermission: () => true }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: mocks.employees, isLoading: false }) }));
vi.mock('@/lib/payrollCorrections', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/payrollCorrections')>(), correctionClient: { rpc: mocks.rpc } }));
vi.mock('@/components/ui/searchable-select', () => ({ SearchableSelect: ({ value, onValueChange, options }: { value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[] }) => <select aria-label="Empleado" value={value} onChange={event => onValueChange(event.target.value)}><option value="">Seleccione empleado</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> }));

let client: QueryClient;
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  mocks.rpc.mockReset().mockResolvedValue({ data: 'ticket', error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.unstubAllGlobals(); });
function openRequest(employeeId = 'employee-a') {
  render(<QueryClientProvider client={client}><CorrectionTicketRequest defaults={{ employeeId, centerId: 'stale-center', module: 'novedades' }} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar permiso de corrección' }));
}
describe('correction request employee center', () => {
  it('uses the selected employee center and replaces it when changing employees', async () => {
    openRequest();
    expect(screen.queryByText('Centro histórico')).not.toBeInTheDocument();
    expect(screen.getByText('Centro de operación: Centro Norte')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Empleado'), { target: { value: 'employee-b' } });
    expect(screen.getByText('Centro de operación: Centro Sur')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Motivo de la corrección'), { target: { value: 'Corregir horas de la jornada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar autorización' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('payroll_ticket_request', expect.objectContaining({ p_employee_id: 'employee-b', p_center_id: 'center-b', p_actions: ['novedades:update', 'novedades:approve'] })));
  });
  it('prevents submission for an employee with no assigned center', () => {
    openRequest('employee-c');
    fireEvent.change(screen.getByLabelText('Motivo de la corrección'), { target: { value: 'Corregir horas de la jornada' } });
    expect(screen.getByRole('alert')).toHaveTextContent('no tiene un centro de operación definido');
    expect(screen.getByRole('button', { name: 'Solicitar autorización' })).toBeDisabled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('prevents requesting an inverted correction range', () => {
    openRequest();
    fireEvent.change(screen.getByLabelText('Corregir desde'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Hasta (inclusive)'), { target: { value: '2026-10-09' } });
    expect(screen.getByRole('alert')).toHaveTextContent('fecha final debe ser igual o posterior');
    expect(screen.getByRole('button', { name: 'Solicitar autorización' })).toBeDisabled();
  });
});
describe('correction action controls', () => {
  it('keeps module actions separate and prevents granting actions outside the allowed scope', () => {
    const onChange = vi.fn();
    render(<TicketActions value={['novedades:update']} allowed={['novedades:update', 'novedades:approve']} onChange={onChange} />);
    const novelties = within(screen.getByRole('group', { name: 'novedades' }));
    expect(novelties.getByRole('checkbox', { name: 'Modificar' })).toBeChecked();
    fireEvent.click(novelties.getByText('Aprobar / rechazar'));
    expect(onChange).toHaveBeenCalledWith(['novedades:update', 'novedades:approve']);
    expect(within(screen.getByRole('group', { name: 'jornadas' })).getByRole('checkbox', { name: 'Modificar' })).toBeDisabled();
    expect(novelties.getByRole('checkbox', { name: 'Crear' })).toBeDisabled();
  });
});
