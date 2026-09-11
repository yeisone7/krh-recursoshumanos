import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { CustomRequisitionApprovalDialog } from './CustomRequisitionApprovalDialog';
import { RequisitionTimeline } from './RequisitionTimeline';
import type { WorkflowStep } from '@/types/requisitionWorkflow';
import type { PersonnelRequisition } from '@/hooks/useRequisitions';
const { approve } = vi.hoisted(() => ({ approve: vi.fn() }));
vi.mock('@/hooks/useRequisitionWorkflow', () => ({ useApproveConfiguredRequisition: () => ({ mutateAsync: approve, isPending: false }) }));
const step: WorkflowStep = { id: 'finance', name: 'Finanzas', kind: 'custom', role_ids: ['finance'], fields: [
  { id: 'budget', label: 'Presupuesto', type: 'number', required: true },
  { id: 'advance', label: 'Anticipo', type: 'boolean', required: true },
] };
beforeEach(() => { approve.mockReset(); approve.mockResolvedValue({}); });
it('submits zero and false with expected stage and refuses missing fields', async () => {
  const close = vi.fn();
  render(<CustomRequisitionApprovalDialog requisitionId="req" step={step} open onOpenChange={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'Registrar aprobación' }));
  expect(approve).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Presupuesto');
  fireEvent.change(screen.getByLabelText('Presupuesto *'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Anticipo *'), { target: { value: 'false' } });
  fireEvent.click(screen.getByRole('button', { name: 'Registrar aprobación' }));
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(approve).toHaveBeenCalledWith({ requisitionId: 'req', stepId: 'finance', approved: true, observations: '', answers: { budget: 0, advance: false } });
});
it('rejects without requiring approval fields', async () => {
  render(<CustomRequisitionApprovalDialog requisitionId="req" step={step} open onOpenChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Decisión'), { target: { value: 'reject' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rechazar requisición' }));
  await waitFor(() => expect(approve).toHaveBeenCalledWith(expect.objectContaining({ approved: false, answers: {} })));
});
it('renders only snapshot stages and their recorded answers', () => {
  const req = { fecha_requisicion: '2026-09-11', estado_requisicion: 'aprobada', current_approval_step_id: null,
    workflow_version: { steps: [step] }, step_executions: [{ step_id: 'finance', approved: true, answers: { budget: 0, advance: false }, approver_name: 'Ana', decided_at: '2026-09-11T15:00:00Z' }],
  } as unknown as PersonnelRequisition;
  render(<RequisitionTimeline requisition={req} />);
  expect(screen.getByText('Finanzas')).toBeInTheDocument();
  expect(screen.getByText('0')).toBeInTheDocument();
  expect(screen.getByText('No')).toBeInTheDocument();
  expect(screen.queryByText('Coordinadores')).not.toBeInTheDocument();
  expect(screen.queryByText('Selección')).not.toBeInTheDocument();
});
