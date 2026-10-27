import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmployeeIncapacity } from '@/types/incapacity';
import { IncapacityLegalFollowUpFields } from './IncapacityLegalFollowUpFields';

const mocks = vi.hoisted(() => ({
  save: vi.fn(), success: vi.fn(), error: vi.fn(), canEdit: true,
}));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ canUpdate: () => mocks.canEdit }) }));
vi.mock('@/hooks/useIncapacityLegalFollowUp', () => ({
  useUpdateIncapacityLegalFollowUp: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock('@/hooks/useCie10Lookup', () => ({ useCie10Lookup: () => ({
  isLoaded: true,
  lookup: (code: string) => ({ A010: 'Fiebre tifoidea', M545: 'Lumbago' })[code] ?? null,
}) }));
vi.mock('./Cie10SearchInput', () => ({ Cie10SearchInput: ({ id, value, onChange }: {
  id: string; value: string; onChange: (value: string) => void;
}) => <input id={id} value={value} onChange={(event) => onChange(event.target.value)} /> }));

const incapacity = {
  id: 'root-case', rehabilitation_origin: 'comun', rehabilitation_outcome: 'favorable',
  pcl_origin: 'laboral', pcl_percentage: 0, pcl_diagnosis_codes: ['A010'],
} as EmployeeIncapacity;

describe('legal follow-up fields', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.canEdit = true; mocks.save.mockResolvedValue({ id: 'root-case' }); });

  it('saves multiple catalog diagnoses and PCL on the root case, including a zero percentage', async () => {
    render(<IncapacityLegalFollowUpFields incapacity={incapacity} kind="pcl" />);
    fireEvent.change(screen.getByLabelText(/Diagnósticos calificados/), { target: { value: 'M54.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ id: 'root-case', values: {
      pcl_origin: 'laboral', pcl_percentage: 0, pcl_diagnosis_codes: ['A010', 'M545'],
    } }));
  });

  it('rejects percentages above 100 and keeps the draft after a failed save', async () => {
    render(<IncapacityLegalFollowUpFields incapacity={incapacity} kind="pcl" />);
    const input = screen.getByLabelText(/Pérdida de capacidad laboral/);
    fireEvent.change(input, { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('El porcentaje PCL debe estar entre 0 y 100.');
    mocks.save.mockRejectedValueOnce(new Error('network'));
    fireEvent.change(input, { target: { value: '35.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('No se pudo guardar el seguimiento. Intenta nuevamente.'));
    expect(input).toHaveValue(35.5);
    expect(screen.getByRole('button', { name: 'Guardar seguimiento' })).toBeEnabled();
  });

  it('rejects unknown codes and prevents silently losing a diagnosis that was not added', () => {
    render(<IncapacityLegalFollowUpFields incapacity={incapacity} kind="pcl" />);
    fireEvent.change(screen.getByLabelText(/Diagnósticos calificados/), { target: { value: 'INVALID' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(mocks.error).toHaveBeenCalledWith('Selecciona un diagnóstico válido del catálogo CIE-10.');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar seguimiento' }));
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('allows removing a diagnosis and resets the draft when changing cases', () => {
    const view = render(<IncapacityLegalFollowUpFields incapacity={incapacity} kind="pcl" />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar diagnóstico A010' }));
    expect(screen.queryByText('A010')).not.toBeInTheDocument();
    view.rerender(<IncapacityLegalFollowUpFields incapacity={{ ...incapacity, id: 'another-case', pcl_percentage: 50 }} kind="pcl" />);
    expect(screen.getByLabelText(/Pérdida de capacidad laboral/)).toHaveValue(50);
    expect(screen.getByRole('button', { name: 'Quitar diagnóstico A010' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar seguimiento' })).toBeDisabled();
  });

  it('shows saved concept values and restricts users without update permission', () => {
    mocks.canEdit = false;
    render(<IncapacityLegalFollowUpFields incapacity={incapacity} kind="rehabilitation" />);
    expect(screen.getByLabelText('Origen')).toHaveTextContent('Común');
    expect(screen.getByLabelText('Resultado del concepto')).toHaveTextContent('Favorable');
    expect(screen.getByLabelText('Origen')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar seguimiento' })).not.toBeInTheDocument();
  });
});
