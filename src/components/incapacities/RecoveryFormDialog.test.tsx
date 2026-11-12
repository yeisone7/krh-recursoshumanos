import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecoveryUpdateConflict } from '@/hooks/useIncapacities';
import { formatRecoveryCurrency } from '@/lib/incapacityRecovery';
import { recoveryStatusLabels, type EmployeeIncapacity } from '@/types/incapacity';
import { RecoveryFormDialog } from './RecoveryFormDialog';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/hooks/useIncapacities', () => ({
  RecoveryUpdateConflict: class extends Error {},
  useUpdateRecoveryStatus: () => ({ mutateAsync }),
}));

const incapacity = {
  id: 'extension',
  is_extension: true,
  updated_at: '2026-08-01T12:00:00Z',
  recovery_status: 'aprobado',
} as EmployeeIncapacity;

function fillPayment(index: number, date: string, amount: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar abono' }));
  const dateInput = screen.getByLabelText(`Fecha de pago del abono ${index}`);
  expect(dateInput).toHaveFocus();
  fireEvent.change(dateInput, { target: { value: date } });
  fireEvent.change(screen.getByLabelText(`Valor recibido (COP) del abono ${index}`), { target: { value: amount } });
}

function expectBalance(amount: number) {
  expect(screen.getByRole('status').textContent).toContain(formatRecoveryCurrency(amount));
}

describe('Gestionar recobro', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
  });

  it('registers three payments on an extension and keeps the workflow status manual', async () => {
    const onOpenChange = vi.fn();
    render(<RecoveryFormDialog open onOpenChange={onOpenChange} incapacity={incapacity} expectedAmount={1_000_000} />);

    fillPayment(1, '2026-08-05', '300000');
    expectBalance(700_000);
    expect(screen.getByText('Pago parcial')).toBeInTheDocument();
    fillPayment(2, '2026-09-05', '400000');
    expectBalance(300_000);
    fillPayment(3, '2026-10-05', '300000');
    expectBalance(0);
    expect(screen.queryByText('Pago parcial')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Estado del recobro' })).toHaveTextContent(recoveryStatusLabels.aprobado);

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: 'extension',
      updatedAt: incapacity.updated_at,
      data: expect.objectContaining({
        recovery_status: 'aprobado',
        payments: [
          { date: '2026-08-05', amount: '300000' },
          { date: '2026-09-05', amount: '400000' },
          { date: '2026-10-05', amount: '300000' },
        ],
      }),
    }));
  });

  it('preserves an undated legacy payment, accepts an excess and supports correcting and removing payments', async () => {
    render(<RecoveryFormDialog open onOpenChange={vi.fn()} incapacity={{ ...incapacity, recovered_amount: 80 }} expectedAmount={100} />);
    expect(screen.getByText('Sin fecha registrada')).toBeInTheDocument();
    expectBalance(20);
    fillPayment(2, '2026-09-05', '20,50');
    fillPayment(3, '2026-09-05', '10');
    expect(screen.getByText(/Excedente recibido/).textContent).toContain(formatRecoveryCurrency(10.50));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar abono 3' }));
    expect(screen.getByRole('button', { name: 'Agregar abono' })).toHaveFocus();
    const legacyDate = screen.getByLabelText('Fecha de pago del abono 1');
    fireEvent.change(legacyDate, { target: { value: '2026-09-01' } });
    expect(screen.queryByText('Sin fecha registrada')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        payments: [{ date: '2026-09-01', amount: '80' }, { date: '2026-09-05', amount: '20,50' }],
      }),
    })));
  });

  it('requires dates for new or corrected payments and retains the draft after a concurrent save', async () => {
    mutateAsync.mockRejectedValueOnce(new RecoveryUpdateConflict());
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <RecoveryFormDialog open onOpenChange={onOpenChange} incapacity={{ ...incapacity, recovered_amount: 80 }} expectedAmount={100} />,
    );
    fireEvent.change(screen.getByLabelText('Valor recibido (COP) del abono 1'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Ingresa la fecha de este abono.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    fillPayment(2, '', '10.111');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText('Ingresa un valor positivo con hasta dos decimales.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Fecha de pago del abono 1'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de pago del abono 2'), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText('Valor recibido (COP) del abono 2'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText(/Otra persona actualizó este recobro/)).toHaveAttribute('role', 'alert');
    rerender(<RecoveryFormDialog open onOpenChange={onOpenChange} incapacity={{ ...incapacity, recovered_amount: 50, updated_at: 'new' }} expectedAmount={100} />);
    expect(within(screen.getByRole('dialog')).getByLabelText('Valor recibido (COP) del abono 1')).toHaveValue('90');
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
