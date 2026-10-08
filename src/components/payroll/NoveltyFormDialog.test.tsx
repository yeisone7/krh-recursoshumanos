import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NoveltyFormDialog } from './NoveltyFormDialog';
import type { PayrollConcept, PayrollNovelty } from '@/types/payroll';
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), existing: [] as PayrollNovelty[] }));
const concept: PayrollConcept = { id: 'day-concept', company_id: 'company-a', name: 'Bono días', identifier: 'BONO_D', unit: 'days', percentage: 0, is_active: true, system_type: null, sort_order: 8 };
vi.mock('@/hooks/usePayrollConcepts', () => ({ usePayrollConcepts: () => ({ data: [concept], isSuccess: true }) }));
vi.mock('@/hooks/usePayrollConfig', () => ({ usePayrollConfig: () => ({ data: { daily_hours: 8 } }) }));
vi.mock('@/hooks/usePayrollNovelties', () => ({
  useCreatePayrollNovelty: () => ({ mutateAsync: mocks.create }),
  useUpdatePayrollNovelty: () => ({ mutateAsync: mocks.update }),
  usePayrollNovelties: () => ({ data: mocks.existing }),
}));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: [{ id: 'employee-a', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST' }] }) }));
vi.mock('@/hooks/useNoveltyReasons', () => ({ useNoveltyReasons: () => ({ data: [] }) }));
vi.mock('@/components/payroll/CorrectionTicketRequest', () => ({ CorrectionTicketRequest: () => null }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.existing = []; });
const novelty = { company_id: 'company-a', employee_id: 'employee-a', novelty_date: '2026-10-08', novelty_type: 'custom', concept_id: 'day-concept', quantity: 2, quantity_unit: 'days', hours: 16 } as PayrollNovelty;
describe('custom novelty quantities', () => {
  it('creates days with original quantity and equivalent hours and keeps two concepts distinct', async () => {
    mocks.existing = [{ ...novelty, concept_id: 'different-concept', start_time: null, reason_id: null } as unknown as PayrollNovelty];
    render(<NoveltyFormDialog open onOpenChange={vi.fn()} novelty={novelty} />);
    expect(screen.getByText('Cantidad Días')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear Novedad' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ novelty_type: 'custom', concept_id: 'day-concept', quantity: 2, quantity_unit: 'days', hours: 16 })));
  });
  it('loads the stored day quantity when correcting an existing novelty', async () => {
    render(<NoveltyFormDialog open onOpenChange={vi.fn()} novelty={{ ...novelty, id: 'novelty-a' }} />);
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Novedad' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'novelty-a', quantity: 1.5, hours: 12 })));
  });
});
