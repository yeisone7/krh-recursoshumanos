import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftFormDialog } from './ShiftFormDialog';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/hooks/useSchedules', () => ({
  useCreateShift: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateShift: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('ShiftFormDialog save failures', () => {
  it('explains denied creation and preserves the form so it can be retried', async () => {
    mocks.create.mockRejectedValueOnce({ code: '42501', message: 'new row violates row-level security policy for table "shifts"' }).mockResolvedValueOnce({ id: 'created' });
    const close = vi.fn();
    render(<ShiftFormDialog open onOpenChange={close} kind="day" />);
    fireEvent.change(screen.getByLabelText(/Nombre del Turno/), { target: { value: 'Turno Banadia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Turno' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Permisos insuficientes', {
      description: 'No tienes autorización para crear turnos en esta empresa. Solicita a un administrador que revise tu rol y los permisos de Jornadas.',
    }));
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Nombre del Turno/)).toHaveValue('Turno Banadia');
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Turno' }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(mocks.success).toHaveBeenCalledWith('Turno creado');
  });

  it('shows the server explanation for other plain-object failures', async () => {
    mocks.create.mockRejectedValueOnce({ code: 'P0001', message: 'Uno o más centros no pertenecen a la empresa del turno' });
    render(<ShiftFormDialog open onOpenChange={() => {}} kind="day" />);
    fireEvent.change(screen.getByLabelText(/Nombre del Turno/), { target: { value: 'Turno Banadia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Turno' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No se pudo crear el turno', {
      description: 'Uno o más centros no pertenecen a la empresa del turno',
    }));
  });
});
