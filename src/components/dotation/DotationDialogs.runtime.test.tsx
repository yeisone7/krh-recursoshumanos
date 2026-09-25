import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DotationDetailDialog } from './DotationDetailDialog';
import { DotationFormDialog } from './DotationFormDialog';
import { InventoryAdjustDialog } from './InventoryAdjustDialog';
import { ProfesiogramaDetailDialog } from './ProfesiogramaDetailDialog';

const createDeliveryBatch = vi.hoisted(() =>
  vi.fn(() => new Promise(() => undefined)),
);
const generateActaEntregaPdf = vi.hoisted(() => vi.fn());
const stockConfig = vi.hoisted(() => ({ block: false, autoDeduct: true, enabled: true }));
const toastError = vi.hoisted(() => vi.fn());
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));
const dotationInventory = vi.hoisted(() => ({
  data: [] as Array<{
    id: string;
    company_id: string;
    operation_center_id: string | null;
    item_type: string;
    item_name: string;
    size: string | null;
    quantity_available: number;
    minimum_stock: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentCompanyId: 'company-1', assignedCenterIds: [], isAdmin: true }),
}));

vi.mock('@/hooks/useCompanies', () => ({
  useOperationCenters: () => ({ data: [
    { id: 'center-1', name: 'Principal', is_active: true },
    { id: 'center-2', name: 'Bodega Norte', is_active: true },
  ] }),
  useCompany: () => ({
    data: {
      id: 'company-1',
      name: 'Empresa QA',
      nit: '900123456-7',
      logo_url: 'https://cdn.example.com/empresa-qa.png',
      horizontal_logo_url: 'https://cdn.example.com/empresa-qa-horizontal.png',
    },
  }),
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
  useDotationInventory: () => ({ data: dotationInventory.data }),
  useAdjustInventoryQuantity: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useSystemConfig', () => ({
  useDotationItemTypes: () => ({
    data: [
      { id: 'item-1', name: 'BATA BLANCA', item_type: 'otros', requires_size: false, is_active: true },
      {
        id: 'item-2',
        name: 'PANTALON DRILL',
        item_type: 'otros',
        category: 'uniforme',
        requires_size: true,
        sizes_available: ['XS', 'S', 'M', 'L', 'XL'],
        is_active: true,
      },
    ],
  }),
  useSystemConfig: () => ({
    data: {
      dotation_inventory_enabled: { enabled: stockConfig.enabled },
      dotation_auto_deduct: { enabled: stockConfig.autoDeduct },
      dotation_block_no_stock: { enabled: stockConfig.block },
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
  generateActaEntregaPdf,
}));

describe('Dotation dialogs runtime regressions', () => {
  beforeEach(() => {
    generateActaEntregaPdf.mockClear();
    createDeliveryBatch.mockClear();
    dotationInventory.data = [];
    stockConfig.block = false;
    stockConfig.autoDeduct = true;
    stockConfig.enabled = true;
    toastError.mockClear();
  });

  const renderWithQueryClient = (ui: ReactElement) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        {ui}
      </QueryClientProvider>,
    );
  };

  it('renders a profesiograma detail with assigned items', () => {
    render(
      <ProfesiogramaDetailDialog
        open
        onOpenChange={vi.fn()}
        data={{
          id: 'profesiograma-1',
          company_id: 'company-1',
          operation_center_id: 'center-1',
          position_id: 'position-1',
          created_at: '2026-09-08T12:00:00Z',
          updated_at: '2026-09-08T12:00:00Z',
          operation_centers: { id: 'center-1', name: 'Centro principal' },
          positions: { id: 'position-1', name: 'Operario' },
          items: [{
            id: 'profesiograma-item-1',
            dotation_item_type_id: 'item-1',
            quantity: 2,
            notes: null,
            is_required: true,
            dotation_item_types: {
              id: 'item-1',
              name: 'BOTA DE SEGURIDAD',
              code: 'BOT-001',
              category: 'EPP',
              requires_size: true,
              sizes_available: ['38', '39'],
              default_validity_months: 12,
            },
          }],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Profesiograma' })).toBeInTheDocument();
    expect(screen.getByText('BOTA DE SEGURIDAD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar' })).toBeInTheDocument();
  });

  it('exports the registered delivery using the current company branding', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Acta' }));

    await waitFor(() => expect(generateActaEntregaPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Empresa QA',
        companyNit: '900123456-7',
        logoUrl: 'https://cdn.example.com/empresa-qa-horizontal.png',
      }),
    ));
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
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro o bodega' }), {
      target: { value: 'general' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));

    await waitFor(() => expect(screen.getByText('Registrando...')).toBeInTheDocument());
    expect(createDeliveryBatch).toHaveBeenCalledOnce();
  });

  it('widens Nueva Entrega by 40% and prioritizes numeric inventory sizes', () => {
    dotationInventory.data = ['10', '6', '8'].map((size, index) => ({
      id: `inventory-${index}`,
      company_id: 'company-1',
      operation_center_id: index === 2 ? null : 'center-1',
      item_type: 'item-2',
      item_name: 'PANTALON DRILL',
      size,
      quantity_available: 5,
      minimum_stock: 1,
      created_by: null,
      created_at: '2026-09-08T12:00:00Z',
      updated_at: '2026-09-08T12:00:00Z',
    }));

    renderWithQueryClient(<DotationFormDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-[58.8rem]');

    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar colaborador' }), {
      target: { value: 'employee-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Ítem' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar artículo...' }), {
      target: { value: 'item-2' },
    });

    const sizeInput = screen.getByRole('combobox', { name: 'Talla de PANTALON DRILL' });
    const listId = sizeInput.getAttribute('list');
    const sizeOptions = Array.from(document.querySelectorAll(`#${listId} option`))
      .map((option) => option.getAttribute('value'));

    expect(sizeOptions).toEqual(['6', '8', '10']);
    expect(sizeOptions).not.toContain('XS');
  });

  const prepareDelivery = () => {
    renderWithQueryClient(<DotationFormDialog open onOpenChange={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar colaborador' }), {
      target: { value: 'employee-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Ítem' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Buscar artículo...' }), {
      target: { value: 'item-1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Nombre del responsable de almacén'), {
      target: { value: 'Almacén' },
    });
  };

  const stockIn = (center: string | null, quantity: number) => ({
    id: `inventory-${center}`, company_id: 'company-1', operation_center_id: center,
    item_type: 'item-1', item_name: 'BATA BLANCA', size: null,
    quantity_available: quantity, minimum_stock: 0, created_by: null,
    created_at: '2026-09-25', updated_at: '2026-09-25',
  });

  it('requires an explicit inventory source before registering a delivery', () => {
    prepareDelivery();
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));
    expect(createDeliveryBatch).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Selecciona el centro o bodega de origen');
  });

  it.each(['center-2', 'general'])('uses selected source %s instead of the employee center', (source) => {
    stockConfig.block = true;
    dotationInventory.data = [stockIn('center-1', 0), stockIn('center-2', 5), stockIn(null, 3)];
    prepareDelivery();
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro o bodega' }), {
      target: { value: 'center-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));
    expect(createDeliveryBatch).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Stock insuficiente', expect.anything());
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro o bodega' }), {
      target: { value: source },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));
    expect(createDeliveryBatch).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ source_operation_center_id: source === 'general' ? null : source })],
    }));
  });

  it('accumulates repeated articles when checking available stock', () => {
    stockConfig.block = true;
    dotationInventory.data = [stockIn('center-2', 1)];
    prepareDelivery();
    fireEvent.change(screen.getByRole('combobox', { name: 'Seleccionar centro o bodega' }), {
      target: { value: 'center-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Ítem' }));
    fireEvent.change(screen.getAllByRole('combobox', { name: 'Buscar artículo...' })[1], {
      target: { value: 'item-1' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));
    expect(createDeliveryBatch).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith('Stock insuficiente', expect.objectContaining({
      description: expect.stringContaining('disponible 1, solicitado 2'),
    }));
  });

  it('updates size suggestions and availability when the source changes', () => {
    dotationInventory.data = [
      { ...stockIn('center-1', 4), size: 'M' },
      { ...stockIn('center-2', 7), size: 'L' },
      { ...stockIn(null, 9), size: 'S' },
    ];
    prepareDelivery();
    const source = screen.getByRole('combobox', { name: 'Seleccionar centro o bodega' });
    fireEvent.change(source, { target: { value: 'center-2' } });
    const sizeInput = screen.getByRole('combobox', { name: 'Talla de BATA BLANCA' });
    const sizeOptions = () => Array.from(document.querySelectorAll(`#${sizeInput.getAttribute('list')} option`))
      .map(option => option.getAttribute('value'));
    expect(sizeOptions()).toEqual(['L']);
    fireEvent.change(sizeInput, { target: { value: ' L ' } });
    expect(screen.getByText('Disponible en Bodega Norte: 7')).toBeInTheDocument();
    fireEvent.change(source, { target: { value: 'general' } });
    expect(sizeOptions()).toEqual(['S']);
    expect(screen.getByText('Disponible en Inventario General: 0')).toBeInTheDocument();
  });

  it.each(['enabled', 'autoDeduct'] as const)('does not require a source when %s is disabled', (setting) => {
    stockConfig[setting] = false;
    stockConfig.block = true;
    prepareDelivery();
    expect(screen.queryByRole('combobox', { name: 'Seleccionar centro o bodega' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Entrega/ }));
    expect(createDeliveryBatch).toHaveBeenCalledOnce();
    expect(createDeliveryBatch).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ dotation_item_type_id: 'item-1', item_type: 'otros', item_name: 'BATA BLANCA', quantity: 1, size: null }],
    }));
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
          created_by: null,
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
