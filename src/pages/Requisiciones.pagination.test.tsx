import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Requisiciones from './Requisiciones';

function makeRequisitions() {
  return Array.from({ length: 26 }, (_, index) => ({
    id: `r${index + 1}`, requisition_code: `RQ-${index + 1}`,
    cargo_solicitado: `Cargo ${String(index + 1).padStart(2, '0')}`,
    solicitante_nombre: 'Solicitante', cantidad_vacantes_requeridas: 1,
    fecha_requisicion: '2026-01-01', motivo_solicitud: 'nuevo_cargo',
    estado_requisicion: index === 25 ? 'aprobada' : 'en_rrhh',
    operation_center_id: index === 25 ? 'center-b' : 'center-a',
    lider_proceso: index === 25 ? 'Líder B' : 'Líder A',
    vacancies: index === 25 ? [{ id: 'v26', status: 'closed', position_title: 'Cargo 26' }] : [],
  }));
}

const mocks = vi.hoisted(() => ({
  requisitions: [] as ReturnType<typeof makeRequisitions>,
  companyId: 'company-a', isLoading: false, exportPDF: vi.fn(),
}));
vi.mock('@/hooks/useRequisitions', () => ({
  useRequisitions: () => ({ data: mocks.requisitions, isLoading: mocks.isLoading }),
  useDeleteRequisition: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [
  { id: 'center-a', name: 'Centro A' }, { id: 'center-b', name: 'Centro B' },
] }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({
  companies: [], currentCompanyId: mocks.companyId, hasPermission: () => false,
}) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/requisitionPdfGenerator', () => ({ exportRequisitionToPDF: mocks.exportPDF }));
vi.mock('@/components/requisitions', () => ({
  RequisitionFormDialog: () => null,
  RequisitionApprovalDialog: () => null,
  RequisitionDetailDialog: ({ open, requisitionId }: { open: boolean; requisitionId: string | null }) =>
    open ? <div data-testid="requisition-detail">{requisitionId}</div> : null,
}));
// Exercise each page filter through its public value/onValueChange contract.
vi.mock('@/components/ui/searchable-select', () => ({
  SearchableSelect: ({ options, value, onValueChange, placeholder }: {
    options: { value: string; label: string }[]; value: string;
    onValueChange: (value: string) => void; placeholder: string;
  }) => <select aria-label={placeholder} value={value} onChange={event => onValueChange(event.target.value)}>
    {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>,
}));

beforeEach(() => {
  mocks.requisitions = makeRequisitions();
  mocks.companyId = 'company-a';
  mocks.isLoading = false;
  mocks.exportPDF.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

const navigation = () => within(screen.getByRole('navigation', { name: 'Paginación de requisiciones' }));
const next = () => fireEvent.click(navigation().getByRole('button', { name: 'Siguiente' }));

describe('Requisiciones pagination', () => {
  it('limits desktop and mobile lists to 10 while keeping the full total', () => {
    render(<Requisiciones />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByText('Cargo 01')).toHaveLength(2);
    expect(screen.queryByText('Cargo 11')).not.toBeInTheDocument();
    expect(navigation().getByText('Mostrando 1–10 de 26 requisiciones')).toBeInTheDocument();
    expect(navigation().getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getAllByText('26')).toHaveLength(2); // KPI and filtered total, not the page size.
  });

  it('navigates both directions, opens the correct detail, and bounds the final page', () => {
    render(<Requisiciones />);
    next();
    expect(screen.queryByText('Cargo 01')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('table')).getByText('Cargo 11'));
    expect(screen.getByTestId('requisition-detail')).toHaveTextContent('r11');
    next();
    expect(navigation().getByText('Mostrando 21–26 de 26 requisiciones')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
    expect(navigation().getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(navigation().getByRole('button', { name: 'Anterior' }));
    expect(navigation().getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('searches all requisitions and returns to page one when cleared', () => {
    render(<Requisiciones />);
    next();
    const search = screen.getByPlaceholderText('Buscar por codigo, cargo, solicitante...');
    fireEvent.change(search, { target: { value: 'Cargo 26' } });
    expect(navigation().getByText('Mostrando 1–1 de 1 requisiciones')).toBeInTheDocument();
    expect(screen.getAllByText('Cargo 26')).toHaveLength(2);
    fireEvent.change(search, { target: { value: '' } });
    expect(navigation().getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it.each([
    { label: 'Filtrar por estado', value: 'aprobada' },
    { label: 'Centro de operacion', value: 'center-b' },
    { label: 'Lider de proceso', value: 'Líder B' },
    { label: 'Cierre de vacante', value: 'closed' },
  ])('resets pagination and filters the full list by $label', ({ label, value }) => {
    render(<Requisiciones />);
    next();
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } });
    expect(navigation().getByText('Mostrando 1–1 de 1 requisiciones')).toBeInTheDocument();
    expect(screen.getAllByText('Cargo 26')).toHaveLength(2);
  });

  it('supports 25 and 50 per page, resetting even when the last page disappears', () => {
    render(<Requisiciones />);
    next();
    next();
    const size = screen.getByRole('combobox', { name: 'Requisiciones por página' });
    fireEvent.change(size, { target: { value: '25' } });
    expect(navigation().getByText('Mostrando 1–25 de 26 requisiciones')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    fireEvent.change(size, { target: { value: '50' } });
    expect(navigation().getByText('Página 1 de 1')).toBeInTheDocument();
    expect(navigation().getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('clamps the page after deletion or refresh and handles zero records', () => {
    const view = render(<Requisiciones />);
    next();
    next();
    mocks.requisitions = mocks.requisitions.slice(0, 11);
    view.rerender(<Requisiciones />);
    expect(navigation().getByText('Mostrando 11–11 de 11 requisiciones')).toBeInTheDocument();
    mocks.requisitions = [];
    view.rerender(<Requisiciones />);
    expect(screen.getByText('Sin requisiciones registradas')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación de requisiciones' })).not.toBeInTheDocument();
  });

  it('returns to page one when the company changes', () => {
    const view = render(<Requisiciones />);
    next();
    mocks.companyId = 'company-b';
    view.rerender(<Requisiciones />);
    expect(navigation().getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('does not show pagination while loading', () => {
    mocks.isLoading = true;
    render(<Requisiciones />);
    expect(screen.queryByRole('navigation', { name: 'Paginación de requisiciones' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
