import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkDeliveryDialog } from './BulkDeliveryDialog';

const state = vi.hoisted(() => ({
  config: { dotation_block_no_stock: { enabled: true } },
  stock: 20,
}));
vi.mock('@/hooks/useDotationInventory', () => ({
  useDotationInventory: () => ({ data: [{ item_type: 'item-type-1', item_name: 'BATA BLANCA', size: 'M', operation_center_id: 'center-1', quantity_available: state.stock }], isLoading: false, isError: false }),
}));
vi.mock('@/hooks/useSystemConfig', () => ({
  useSystemConfig: () => ({ data: state.config, isLoading: false, isError: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ assignedCenterIds: [], isAdmin: true, isSuperAdmin: false }),
}));

const createDeliveryBatch = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'transaction-1' }));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [{
      id: 'employee-1',
      first_name: 'Mariana',
      middle_name: null,
      last_name: 'Agudelo',
      second_last_name: null,
      document_number: '1041631268',
      is_active: true,
      operation_centers: { id: 'center-1', name: 'General' },
      work_info: { position_name: 'Auxiliar', operation_center_id: 'center-1' },
    }, {
      id: 'employee-2', first_name: 'Carlos', last_name: 'Perez', document_number: '222', is_active: true,
      operation_centers: { id: 'center-1', name: 'General' }, work_info: { position_name: 'Conductor' },
    }],
  }),
}));

vi.mock('@/hooks/useDotationProfesiograma', () => ({
  useProfesiogramas: () => ({
    data: [{
      id: 'prof-1',
      operation_center_id: 'center-1',
      positions: { id: 'position-1', name: 'Auxiliar' },
      items: [{
        id: 'prof-item-1',
        dotation_item_type_id: 'item-type-1',
        quantity: 2,
        is_required: true,
        dotation_item_types: { id: 'item-type-1', name: 'BATA BLANCA', requires_size: true, sizes_available: ['S', 'M'] },
      }],
    }, {
      id: 'prof-2', operation_center_id: 'center-1', positions: { name: 'Conductor' },
      items: [{ dotation_item_type_id: 'item-type-1', quantity: 2, is_required: true, dotation_item_types: { name: 'BATA BLANCA', requires_size: true } }],
    }],
  }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useOperationCenters: () => ({ data: [{ id: 'center-1', name: 'General' }] }),
}));

vi.mock('@/hooks/useDotation', () => ({
  useCreateDotationDeliveryBatch: () => ({ mutateAsync: createDeliveryBatch }),
}));

vi.mock('@/components/ui/searchable-select', () => ({
  SearchableSelect: ({ options, value, onValueChange, placeholder }: {
    options: Array<{ value: string; label: string }>;
    value: string;
    onValueChange: (value: string) => void;
    placeholder: string;
  }) => (
    <select
      aria-label={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  ),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => null,
}));

function generatePreview() {
  render(<QueryClientProvider client={new QueryClient()}><BulkDeliveryDialog open onOpenChange={vi.fn()} /></QueryClientProvider>);
  fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro de trabajo' }), { target: { value: 'center-1' } });
  fireEvent.change(screen.getByPlaceholderText('Nombre de quien autoriza la entrega'), { target: { value: 'Responsable QA' } });
  fireEvent.click(screen.getByRole('button', { name: 'Analizar Personal y Generar Previa' }));
}

function assignSizes(size = 'M') {
  for (const input of screen.getAllByRole('combobox', { name: /Talla de/ })) {
    fireEvent.change(input, { target: { value: size } });
  }
}

describe('BulkDeliveryDialog', () => {
  beforeEach(() => {
    createDeliveryBatch.mockReset().mockResolvedValue({ id: 'transaction-1' });
    state.stock = 20;
  });

  it('sends the assigned size, quantities and explicit origin to the transactional delivery flow', async () => {
    generatePreview();
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar 2 Entregas' })).toBeDisabled();
    assignSizes();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 2 Entregas' }));
    await waitFor(() => expect(createDeliveryBatch).toHaveBeenCalledTimes(2));
    expect(createDeliveryBatch).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: 'employee-1', delivered_by: 'Responsable QA', observations: 'Entrega masiva por centro',
      items: [{ dotation_item_type_id: 'item-type-1', item_type: 'otros', item_name: 'BATA BLANCA', quantity: 2, size: 'M', source_operation_center_id: 'center-1' }],
    }));
  });

  it('filters by position and selects only visible employees without losing hidden choices or sizes', () => {
    generatePreview();
    assignSizes();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por cargo' }), { target: { value: 'Auxiliar' } });
    expect(screen.queryByText('Carlos Perez')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Seleccionar empleados visibles' }));
    expect(screen.getByText('1 seleccionados')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Filtrar por cargo' }), { target: { value: 'all' } });
    expect(screen.getAllByRole('combobox', { name: /Talla de.*Mariana/ })[0]).toHaveValue('M');
    expect(screen.getAllByRole('checkbox', { name: 'Seleccionar a Carlos Perez' })[0]).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Seleccionar empleados visibles' })).toBePartiallyChecked();
  });

  it('validates cumulative stock for employees sharing the same article and size', () => {
    state.stock = 3;
    generatePreview();
    assignSizes();
    expect(screen.getByRole('button', { name: 'Confirmar 2 Entregas' })).toBeDisabled();
    expect(screen.getByText(/combinaciones de artículo y talla con stock insuficiente/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Seleccionar a Carlos Perez' })[0]);
    expect(screen.getByRole('button', { name: 'Confirmar 1 Entregas' })).toBeEnabled();
  });

  it('does not deduct another origin and searches by document', () => {
    generatePreview();
    assignSizes();
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar bodega de origen' }), { target: { value: 'general' } });
    expect(screen.getByRole('button', { name: 'Confirmar 2 Entregas' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar empleado' }), { target: { value: '222' } });
    expect(screen.queryByText('Mariana Agudelo')).not.toBeInTheDocument();
    expect(screen.getByText('2 seleccionados')).toBeInTheDocument();
  });

  it('keeps failed employees for retry and removes completed employees to prevent duplicates', async () => {
    createDeliveryBatch.mockResolvedValueOnce({ id: 'transaction-1' }).mockRejectedValueOnce(new Error('Stock cambió'));
    generatePreview();
    assignSizes();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 2 Entregas' }));
    await waitFor(() => expect(screen.queryByText('Mariana Agudelo')).not.toBeInTheDocument());
    expect(screen.getByText('1 seleccionados')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 1 Entregas' }));
    await waitFor(() => expect(createDeliveryBatch).toHaveBeenCalledTimes(3));
    expect(createDeliveryBatch.mock.calls[2][0].employee_id).toBe('employee-2');
  });
});
