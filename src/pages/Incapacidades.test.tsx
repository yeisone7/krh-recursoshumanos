import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Incapacidades from './Incapacidades';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useIncapacities', () => ({
  useIncapacities: () => ({ data: [initial, standalone], isLoading: false }),
  useIncapacityAlerts: () => ({ data: alerts, isLoading: false }),
  useIncapacityStats: () => ({ data: undefined }),
}));
vi.mock('@/components/incapacities', async () => {
  const { Dialog, DialogContent, DialogDescription, DialogTitle } = await import('@/components/ui/dialog');
  const { IncapacityAlertsPanel } = await import('@/components/incapacities/IncapacityAlertsPanel');

  return {
    IncapacityAlertsPanel,
    IncapacityFormDialog: () => null,
    IncapacityExportDialog: () => null,
    IncapacityDetailDialog: ({ open, incapacityId }: { open: boolean; incapacityId: string | null }) => (
      <Dialog open={open}>
        <DialogContent>
          <DialogTitle>Detalle de la incapacidad</DialogTitle>
          <DialogDescription>{incapacityId}</DialogDescription>
        </DialogContent>
      </Dialog>
    ),
  };
});

const partiallyPaid = {
  id: 'extension-partially-paid',
  extension_number: 1,
  total_days: 5,
  eps_amount: 400,
  recovered_amount: 100,
  recovery_status: 'pendiente',
};
const paid = {
  id: 'extension-paid',
  extension_number: 2,
  total_days: 7,
  eps_amount: 600,
  recovered_amount: 600,
  recovery_status: 'pagado',
};
const initial = {
  id: 'initial',
  employee: { first_name: 'Ana', last_name: 'Pérez', document_number: '123' },
  diagnosis: 'Diagnóstico inicial',
  origin: 'comun',
  total_days: 3,
  start_date: '2026-10-01',
  end_date: '2026-10-03',
  eps_amount: 800,
  recovered_amount: 100,
  recovery_status: 'radicado',
  extensions: [partiallyPaid, paid],
};
const standalone = {
  ...initial,
  id: 'standalone',
  employee: { first_name: 'Luis', last_name: 'García', document_number: '456' },
  eps_amount: 200,
  recovered_amount: 0,
  extensions: [],
};
const alerts = [
  { id: 'initial-alert', title: 'Recobro pendiente de Ana', incapacity: initial },
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `alert-${index}`, title: `Alerta ${index + 1}`, incapacity: standalone,
  })),
  { id: 'extension-alert', title: 'Prórroga pendiente de Ana', incapacity: partiallyPaid },
].map(alert => ({ ...alert, type: 'recovery_pending', level: 'warning', description: alert.title }));

afterEach(cleanup);

function openPage() {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Incapacidades /></MemoryRouter>);
}

function gridCell(employee: string, column: string) {
  const columnIndex = (screen.getByRole('columnheader', { name: column }) as HTMLTableCellElement).cellIndex;
  const row = screen.getByRole('row', { name: new RegExp(employee) });
  return within(row).getAllByRole('cell')[columnIndex];
}

function filterToLuisAndOpenAlerts() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Buscar incapacidades' }), { target: { value: 'Luis' } });
  expect(screen.queryByRole('row', { name: /Ana Pérez/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Alertas/ }));
}

describe('Incapacidades', () => {
  it('shows the pending balance and extension count for each complete case', () => {
    openPage();

    expect(gridCell('Ana Pérez', 'Saldo pendiente')).toHaveTextContent('$ 1.000');
    expect(gridCell('Ana Pérez', 'Prórrogas')).toHaveTextContent(/^2$/);
    expect(gridCell('Luis García', 'Saldo pendiente')).toHaveTextContent('$ 200');
    expect(gridCell('Luis García', 'Prórrogas')).toHaveTextContent(/^0$/);

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar incapacidades' }), { target: { value: 'Ana' } });
    expect(gridCell('Ana Pérez', 'Saldo pendiente')).toHaveTextContent('$ 1.000');
    expect(gridCell('Ana Pérez', 'Prórrogas')).toHaveTextContent(/^2$/);
  });

  it('opens the original incapacity from an alert even when the grid filters it out', () => {
    openPage();
    filterToLuisAndOpenAlerts();

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalle' })[0]);

    expect(screen.getByRole('dialog', { name: 'Detalle de la incapacidad', description: 'initial' })).toBeVisible();
  });

  it('closes Ver todas and opens the exact extension from its alert', () => {
    openPage();
    filterToLuisAndOpenAlerts();
    fireEvent.click(screen.getByRole('button', { name: /Ver todas/ }));
    const alertsDialog = screen.getByRole('dialog', { name: 'Alertas de Incapacidades' });

    fireEvent.click(within(alertsDialog).getAllByRole('button', { name: 'Ver detalle' })[10]);

    expect(alertsDialog).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', {
      name: 'Detalle de la incapacidad',
      description: 'extension-partially-paid',
    })).toBeVisible();
  });
});
