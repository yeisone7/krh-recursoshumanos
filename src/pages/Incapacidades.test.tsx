import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Incapacidades from './Incapacidades';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
vi.mock('@/hooks/useIncapacities', () => ({
  useIncapacities: () => ({ data: [initial, standalone], isLoading: false }),
  useIncapacityAlerts: () => ({ data: alerts, isLoading: false }),
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
  is_extension: true,
  extension_number: 1,
  origin: 'comun',
  start_date: '2026-10-04',
  end_date: '2026-10-08',
  total_days: 5,
  total_amount: 400,
  eps_amount: 400,
  recovered_amount: 100,
  recovery_status: 'pendiente',
};
const paid = {
  id: 'extension-paid',
  is_extension: true,
  extension_number: 2,
  origin: 'comun',
  start_date: '2026-10-10',
  end_date: '2026-10-16',
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
  origin: 'laboral',
  start_date: '2026-11-01',
  end_date: '2026-11-03',
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 10, 8));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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
  it.each([
    { title: 'Activas', value: '1', count: 1, text: 'Prórroga #2' },
    { title: 'Este mes', value: '3', count: 3, text: '01/10/2026' },
    { title: 'Recobros pendientes', value: '1', count: 1, text: 'Valor liquidado $ 400' },
    { title: 'Cartera pendiente', value: '$ 1.200', count: 3, text: 'Saldo pendiente $ 300' },
    { title: 'Origen común', value: '3', count: 3, text: 'Prórroga #1' },
  ])('opens the records behind $title', ({ title, value, count, text }) => {
    openPage();
    const card = screen.getByRole('button', { name: new RegExp(title) });
    expect(within(card).getByText(value)).toBeVisible();
    fireEvent.click(card);

    const dialog = within(screen.getByRole('dialog', { name: title }));
    expect(dialog.getAllByRole('listitem')).toHaveLength(count);
    expect(dialog.getByRole('list', { name: 'Registros del indicador' })).toHaveTextContent(text);
  });

  it('searches within the indicator and opens the exact extension', () => {
    openPage();
    fireEvent.click(screen.getByRole('button', { name: /Cartera pendiente/ }));
    const indicator = screen.getByRole('dialog', { name: 'Cartera pendiente' });
    const dialog = within(indicator);
    const search = dialog.getByRole('textbox', { name: 'Buscar en el indicador' });
    fireEvent.change(search, { target: { value: '999' } });
    expect(dialog.getByText('No hay coincidencias para esta búsqueda.')).toBeVisible();
    fireEvent.change(search, { target: { value: '123' } });
    expect(dialog.getAllByRole('listitem')).toHaveLength(2);
    const extension = dialog.getAllByRole('listitem').find((row) => row.textContent?.includes('Prórroga #1'))!;
    fireEvent.click(within(extension).getByRole('button', { name: /Ver detalle/ }));

    expect(indicator).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', {
      name: 'Detalle de la incapacidad',
      description: 'extension-partially-paid',
    })).toBeVisible();
  });

  it('shows an empty indicator and returns focus to its card on close', async () => {
    vi.setSystemTime(new Date(2026, 11, 1, 8));
    openPage();
    const card = screen.getByRole('button', { name: /Activas/ });
    fireEvent.click(card);
    const dialog = within(screen.getByRole('dialog', { name: 'Activas' }));
    expect(dialog.getByText('No hay registros para este indicador.')).toBeVisible();
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(card).toHaveFocus());
  });

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
