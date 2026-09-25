import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CorrectionChoiceDialog } from './CorrectionChoiceDialog';
import type { CorrectionTicket } from '@/lib/payrollCorrections';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
afterEach(cleanup);
const ticket = (id: string, number: number): CorrectionTicket => ({ id, number, employee_name: 'Yeison Escobar', center_name: 'Centro Norte', expires_at: '2099-09-25T20:00:00Z', start_date: '2026-09-05', end_date: '2026-09-10', status: 'active', reason: 'Corregir programación' } as CorrectionTicket);
describe('ticket selection', () => {
  it('does not choose automatically among multiple matching tickets', () => {
    const finish = vi.fn(); render(<CorrectionChoiceDialog tickets={[ticket('a', 1), ticket('b', 2)]} finish={finish} />);
    expect(screen.getByRole('button', { name: /Guardar con ticket/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Ticket para guardar'), { target: { value: 'b' } });
    expect(screen.getByText(/Vence:/)).toHaveTextContent('3:00');
    fireEvent.click(screen.getByRole('button', { name: /Guardar con ticket #2/ }));
    expect(finish).toHaveBeenCalledWith('b');
  });
  it('shows no-ticket guidance and offers cancellation', () => {
    const finish = vi.fn(); render(<CorrectionChoiceDialog tickets={[]} finish={finish} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No hay un ticket vigente');
    expect(screen.getByRole('button', { name: /Guardar con ticket/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(finish).toHaveBeenCalledWith(null);
  });
  it('requires confirmation even for one ticket', () => {
    const finish = vi.fn(); render(<CorrectionChoiceDialog tickets={[ticket('a', 1)]} finish={finish} />);
    expect(finish).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Guardar con ticket #1/ })); expect(finish).toHaveBeenCalledWith('a');
  });
});
