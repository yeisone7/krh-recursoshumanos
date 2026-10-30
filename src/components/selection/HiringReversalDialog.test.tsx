import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HiringReversalDialog } from './HiringReversalDialog';

const mocks = vi.hoisted(() => ({ preview: vi.fn(), mutateAsync: vi.fn(), pending: false }));
vi.mock('@/hooks/useHiringReversal', () => ({
  useHiringReversalPreview: (...args: unknown[]) => mocks.preview(...args),
  useRevertCandidateHiring: () => ({ mutateAsync: mocks.mutateAsync, isPending: mocks.pending }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
const review = {
  employee_id: 'employee', candidate_name: 'Ana Prueba', document_number: '12345',
  position_title: 'Cocinera', review_token: 'review', documents_to_preserve: 25,
  contract_numbers: ['CT-123'], vacancy_status_after: 'in_process',
};

function confirm() {
  fireEvent.change(screen.getByLabelText('Motivo del no ingreso *'), { target: { value: 'No se presentó al ingreso' } });
  fireEvent.change(screen.getByLabelText('Escribe el documento del candidato para confirmar *'), { target: { value: '12345' } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('No ingresó / Revertir contratación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pending = false;
    mocks.preview.mockReturnValue({ data: review, isFetching: false, error: null });
    mocks.mutateAsync.mockResolvedValue({});
  });

  it('requires a reason, matching identity and explicit confirmation', async () => {
    const close = vi.fn();
    render(<HiringReversalDialog candidateId="candidate" open onOpenChange={close} />);
    const button = screen.getByRole('button', { name: 'Confirmar reversión' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo del no ingreso *'), { target: { value: 'No se presentó al ingreso' } });
    fireEvent.change(screen.getByLabelText('Escribe el documento del candidato para confirmar *'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Escribe el documento del candidato para confirmar *'), { target: { value: '12345' } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    expect(mocks.mutateAsync).toHaveBeenCalledWith({ candidateId: 'candidate', preview: review, reason: 'No se presentó al ingreso', documentNumber: '12345' });
  });

  it('shows server blockers and cannot confirm', () => {
    mocks.preview.mockReturnValue({ error: new Error('Hay un contrato aprobado'), isFetching: false });
    render(<HiringReversalDialog candidateId="candidate" open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Hay un contrato aprobado');
    expect(screen.getByRole('button', { name: 'Confirmar reversión' })).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('requires a new review after a stale preview is rejected', async () => {
    mocks.mutateAsync.mockRejectedValue(new Error('La información cambió'));
    render(<HiringReversalDialog candidateId="candidate" open onOpenChange={vi.fn()} />);
    confirm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reversión' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('La información cambió'));
    expect(screen.getByRole('button', { name: 'Confirmar reversión' })).toBeDisabled();
  });

  it('resets confirmation when closed or switched to another candidate', () => {
    const { rerender } = render(<HiringReversalDialog candidateId="candidate" open onOpenChange={vi.fn()} />);
    confirm();
    rerender(<HiringReversalDialog candidateId="other" open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByLabelText('Motivo del no ingreso *')).toHaveValue('');
    confirm();
    rerender(<HiringReversalDialog candidateId="other" open={false} onOpenChange={vi.fn()} />);
    rerender(<HiringReversalDialog candidateId="other" open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('blocks duplicate submission and dismissal while the request is pending', () => {
    mocks.pending = true;
    render(<HiringReversalDialog candidateId="candidate" open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Revirtiendo…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
