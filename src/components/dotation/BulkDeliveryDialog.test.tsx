import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BulkDeliveryDialog } from './BulkDeliveryDialog';

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
        dotation_item_types: { id: 'item-type-1', name: 'BATA BLANCA' },
      }],
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

describe('BulkDeliveryDialog', () => {
  it('uses the transactional delivery flow with catalog IDs so inventory is deducted', async () => {
    createDeliveryBatch.mockClear();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BulkDeliveryDialog open onOpenChange={vi.fn()} />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro de trabajo' }), {
      target: { value: 'center-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre de quien autoriza la entrega'), {
      target: { value: 'Responsable QA' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analizar Personal y Generar Previa' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar 1 Entregas' }));

    await waitFor(() => expect(createDeliveryBatch).toHaveBeenCalledWith(expect.objectContaining({
      employee_id: 'employee-1',
      delivered_by: 'Responsable QA',
      observations: 'Entrega masiva por centro',
      items: [{
        dotation_item_type_id: 'item-type-1',
        item_type: 'otros',
        item_name: 'BATA BLANCA',
        quantity: 2,
        size: null,
      }],
    })));
  });
});
