import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DotationDetailDialog } from './DotationDetailDialog';
import { DotationFormDialog } from './DotationFormDialog';
import { InventoryAdjustDialog } from './InventoryAdjustDialog';

const createDeliveryBatch = vi.hoisted(() =>
  vi.fn(() => new Promise(() => undefined)),
);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentCompanyId: 'company-1' }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useCompany: () => ({ data: { id: 'company-1', name: 'Empresa QA' } }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [{
      id: 'employee-1',
      first_name: 'Hector',
      middle_name: null,
      last_name: 'Acosta',
      second_last_name: null,
      document_number: '1062810978',
      is_active: true,
      work_info: { operation_center_id: 'center-1', position_name: 'Auxiliar' },
      operation_centers: { id: 'center-1', name: 'Principal' },
    }],
  }),
}));

vi.mock('@/hooks/useDotation', () => ({
  getDaysRemaining: () => 30,
  getDotationStatus: () => 'vigente',
  useCreateDotationDeliveryBatch: () => ({ mutateAsync: createDeliveryBatch }),
  useDotationDeliveries: () => ({ data: [] }),
}));

vi.mock('@/hooks/useDotationProfesiograma', () => ({
  useProfesiogramaByEmployee: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/hooks/useDotationInventory', () => ({
  useDotationInventory: () => ({ data: [] }),
  useAdjustInventoryQuantity: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useSystemConfig', () => ({
  useDotationItemTypes: () => ({
    data: [{ id: 'item-1', name: 'BATA BLANCA', item_type: 'otros', requires_size: false, is_active: true }],
  }),
  useSystemConfig: () => ({
    data: {
      dotation_inventory_enabled: { enabled: true },
      dotation_block_no_stock: { enabled: false },
    },
  }),
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

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  TabsContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/training/SignatureCanvas', () => ({
  SignatureCanvas: () => <div>Firma de prueba</div>,
}));

vi.mock('@/lib/dotationPdfGenerator', () => ({
  generateActaEntregaPdf: vi.fn(),
}));

describe('Dotation dialogs runtime regressions', () => {
  const renderWithQueryClient = (ui: ReactElement) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        {ui}
      </QueryClientProvider>,
    );
  };

  it('renders the registered delivery detail without missing component references', () => {
    renderWithQueryClient(
      <DotationDetailDialog
        open
        onOpenChange={vi.fn()}
        transaction={{
          id: 'transaction-1',
          employee_id: 'employee-1',
          delivery_date: '2026-09-08',
          delivered_by: 'QA E2E',
          received_by: null,
          signature_url: null,
          document_url: null,
          observations: 'Entrega temporal',
          created_by: null,
          created_at: '2026-09-08T12:00:00Z',
          updated_at: '2026-09-08T12:00:00Z',
          employees: {
            id: 'employee-1',
            first_name: 'Hector',
            last_name: 'Acosta',
            document_number: '1062810978',
            company_id: 'company-1',
            operation_centers: { id: 'center-1', name: 'Principal' },
          },
          items: [{
            id: 'delivery-1',
            item_type: 'otros',
            item_name: 'BATA BLANCA',
            quantity: 1,
            size: null,
            delivery_date: '2026-09-08',
            expiration_date: '2027-01-08',
          }],
        }}
      />,
    );

    expect(screen.getByText('Detalle de Entrega')).toBeInTheDocument();
    expect(screen.getByText('BATA BLANCA')).toBeInTheDocument();
    expect(screen.getByText('Firma de prueba')).toBeInTheDocument();
  });

  it('renders the submitting state while a delivery is being registered', async () => {
    renderWithQueryClient(<DotationFormDialog open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar colaborador' }), {
      target: { value: 'employee-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Ítem' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar artículo...' }), {
      target: { value: 'item-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre del responsable de almacén'), {
      target: { value: 'QA E2E' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));

    await waitFor(() => expect(screen.getByText('Registrando...')).toBeInTheDocument());
    expect(createDeliveryBatch).toHaveBeenCalledOnce();
  });

  it('uses an outbound reason when switching an adjustment to Salida', () => {
    renderWithQueryClient(
      <InventoryAdjustDialog
        open
        onOpenChange={vi.fn()}
        item={{
          id: 'inventory-1',
          company_id: 'company-1',
          operation_center_id: 'center-1',
          item_type: 'item-1',
          item_name: 'BATA BLANCA',
          size: null,
          quantity_available: 5,
          minimum_stock: 1,
          unit_cost: null,
          supplier: null,
          last_restock_date: null,
          created_at: '2026-09-08T12:00:00Z',
          updated_at: '2026-09-08T12:00:00Z',
          operation_centers: { id: 'center-1', name: 'Principal' },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salida' }));

    expect(screen.getByRole('combobox')).toHaveTextContent('Ajuste manual');
  });
});
