import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AmendmentData, EmployeeAmendment } from '@/types/amendment';
const mocks = vi.hoisted(() => ({ mutate: vi.fn(), upload: vi.fn(), data: {} as AmendmentData }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ canView: () => true, currentCompanyId: 'company' }) }));
vi.mock('@/hooks/useEmployeeAmendments', () => ({
  useEmployeeAmendments: () => ({ data: mocks.data, refetch: async () => ({ data: mocks.data }) }),
  useAmendmentCommand: () => ({ mutateAsync: mocks.mutate, isPending: false }),
  uploadAmendmentFile: mocks.upload, openAmendmentFile: vi.fn(),
}));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));
vi.mock('@/hooks/useSystemConfig', () => ({ usePositions: () => ({ data: [] }) }));
vi.mock('@/hooks/useContractTypes', () => ({ useContractTypes: () => ({ data: [] }) }));
vi.mock('@/hooks/useSchedules', () => ({ useWorkSchedules: () => ({ data: [] }), useShiftCycles: () => ({ data: [] }) }));
import { EmployeeAmendments } from './EmployeeAmendments';
describe('employee amendment workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const record: EmployeeAmendment = { related_id: null, declared_before: false, has_salary: false, generated_path: null, signed_path: null, applied_at: null, confirmed_at: null, cancellation_reason: null, review_reason: null, id: 'record', number: 1, company_id: 'company', employee_id: 'employee', cycle_id: 'cycle', contract_id: 'contract', kind: 'amendment', status: 'draft', effective_on: '2026-01-01', reason: 'Cambio de descanso', changes: { rest_day: { value: 'sabado' } }, before_values: { rest_day: { value: 'domingo' } }, revision: 1, actor_name: 'RRHH', created_at: '2026-01-01T12:00:00Z', affected_cuts: [], events: [] };
    mocks.data = { records: [record], snapshot: record.before_values, observed_on: '2020-01-01', cycle_id: 'cycle', contract: { id: 'contract', number: 'C-1', start_date: '2020-01-01' }, can_manage: true, can_correct: true, can_salary: false, template: null, identity: { employee_name: 'Ana', employee_document: '123', company_name: 'Empresa', company_nit: '900' } };
    mocks.mutate.mockResolvedValue('record'); mocks.upload.mockResolvedValue('company/record/1/signed.pdf');
  });
  afterEach(cleanup);
  it('requires a signed PDF before confirming and passes the saved revision', async () => {
    render(<EmployeeAmendments employeeId="employee" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar registro' }));
    const confirm = screen.getByRole('button', { name: 'Confirmar y aplicar Otrosí' });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/PDF firmado/), { target: { files: [new File(['pdf'], 'signed.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.mutate).toHaveBeenCalledWith({ action: 'confirm', payload: { id: 'record', revision: 1, signed_path: 'company/record/1/signed.pdf' } }));
  });
  it('invalidates document actions when the draft changes', () => {
    render(<EmployeeAmendments employeeId="employee" />);
    fireEvent.click(screen.getByRole('button', { name: 'Continuar registro' }));
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Nuevo acuerdo' } });
    expect(screen.getByLabelText(/PDF firmado/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmar y aplicar Otrosí' })).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: 'Salario' })).not.toBeInTheDocument();
  });
  it('does not present a correction as a contractual agreement', () => {
    render(<EmployeeAmendments employeeId="employee" />);
    fireEvent.click(screen.getByRole('button', { name: 'Corregir error de captura' }));
    expect(screen.getByText(/no representa un acuerdo contractual/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/PDF firmado/)).not.toBeInTheDocument();
  });
  it('shows direct edits with frozen values and no document actions', () => {
    const [draft] = mocks.data.records;
    mocks.data.records = [{
      ...draft, kind: 'direct', status: 'applied', reason: null, contract_id: null,
      changes: { position: { label: 'Supervisora' } }, before_values: { position: { label: 'Auxiliar' } },
    }];
    render(<EmployeeAmendments employeeId="employee" />);
    expect(screen.getByRole('heading', { name: /Edición directa/ })).toBeInTheDocument();
    expect(screen.getByText('Auxiliar')).toBeInTheDocument();
    expect(screen.getByText('Supervisora')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subsanar con nuevo registro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver soporte firmado' })).not.toBeInTheDocument();
  });
});
