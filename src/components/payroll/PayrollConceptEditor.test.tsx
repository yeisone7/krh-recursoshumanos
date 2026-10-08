import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PayrollConceptEditor } from './PayrollConceptEditor';
import type { PayrollConceptDraft } from '@/types/payroll';
const concept: PayrollConceptDraft = { id: 'a', company_id: 'company-a', name: 'Bono', identifier: 'BONO', unit: 'days', percentage: '0', is_active: true, system_type: null, sort_order: 8 };
afterEach(cleanup);
describe('concept lifecycle controls', () => {
  it('allows deactivation, reactivation and removing an unused custom concept', () => {
    const change = vi.fn();
    const view = render(<PayrollConceptEditor value={[concept]} onChange={change} errors={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Bono' }));
    expect(change).toHaveBeenCalledWith([{ ...concept, is_active: false }]);
    view.rerender(<PayrollConceptEditor value={[{ ...concept, is_active: false }]} onChange={change} errors={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar Bono' }));
    expect(change).toHaveBeenLastCalledWith([concept]);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Bono' }));
    expect(change).toHaveBeenLastCalledWith([]);
  });
  it('locks the unit and deletion for a concept with novelties', () => {
    render(<PayrollConceptEditor value={[{ ...concept, has_novelties: true }]} onChange={vi.fn()} errors={{}} />);
    expect(screen.getByLabelText('Unidad')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar Bono' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desactivar Bono' })).toBeEnabled();
  });
});
