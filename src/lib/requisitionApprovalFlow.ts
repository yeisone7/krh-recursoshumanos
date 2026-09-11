import { AutorizaType, RequisitionStatus } from '@/types/requisition';
import type { RequisitionWorkflowVersion, RequisitionStepExecution } from '@/types/requisitionWorkflow';

export type RequisitionApprovalStep =
  | 'coordinadores'
  | 'operaciones'
  | 'rrhh'
  | 'juridico'
  | 'seleccion'
  | 'gerencia';

type RequisitionApprovalSnapshot = {
  workflow_version_id?: string | null;
  current_approval_step_id?: string | null;
  workflow_version?: RequisitionWorkflowVersion | null;
  step_executions?: RequisitionStepExecution[];
  autoriza?: string | null;
  estado_requisicion?: string | null;
} & Partial<Record<`${RequisitionApprovalStep}_aprobado`, boolean | null>>;

export const requisitionApprovalStepPermissions: Record<RequisitionApprovalStep, string> = {
  coordinadores: 'req_approve_coordinadores',
  rrhh: 'req_approve_rh',
  juridico: 'req_approve_juridica',
  operaciones: 'req_approve_ger_op',
  gerencia: 'req_approve_ger_adm',
  seleccion: 'req_approve_seleccion',
};

export const requisitionApprovalStepStatus: Record<RequisitionApprovalStep, RequisitionStatus> = {
  coordinadores: 'en_coordinadores',
  rrhh: 'en_rrhh',
  juridico: 'en_juridico',
  operaciones: 'en_operaciones',
  gerencia: 'en_gerencia',
  seleccion: 'en_seleccion',
};

const approvalRoutes: Record<AutorizaType | 'default', RequisitionApprovalStep[]> = {
  gerencia_administrativa: ['coordinadores', 'rrhh', 'juridico', 'gerencia', 'seleccion'],
  gerencia_operaciones: ['coordinadores', 'rrhh', 'juridico', 'operaciones', 'seleccion'],
  default: ['coordinadores', 'rrhh', 'juridico', 'operaciones', 'gerencia', 'seleccion'],
};

export const getRequisitionApprovalRoute = (autoriza?: string | null) => {
  if (autoriza === 'gerencia_administrativa' || autoriza === 'gerencia_operaciones') {
    return approvalRoutes[autoriza];
  }

  return approvalRoutes.default;
};

export const getExpectedStatusForApprovalStep = (step: RequisitionApprovalStep) =>
  requisitionApprovalStepStatus[step];

export const getNextStatusForApprovalStep = (
  autoriza: string | null | undefined,
  step: RequisitionApprovalStep,
  approved: boolean,
): RequisitionStatus => {
  if (!approved) return 'rechazada';

  const route = getRequisitionApprovalRoute(autoriza);
  const stepIndex = route.indexOf(step);
  const nextStep = route[stepIndex + 1];

  return nextStep ? requisitionApprovalStepStatus[nextStep] : 'aprobada';
};

export const hasApprovalStepPrerequisites = (
  requisition: RequisitionApprovalSnapshot,
  step: RequisitionApprovalStep,
) => {
  const route = getRequisitionApprovalRoute(requisition.autoriza);
  const stepIndex = route.indexOf(step);

  if (stepIndex < 0) return false;

  return route
    .slice(0, stepIndex)
    .every((previousStep) => requisition[`${previousStep}_aprobado`] === true);
};

export const isApprovalStepActiveForRequisition = (
  requisition: RequisitionApprovalSnapshot,
  step: RequisitionApprovalStep,
) => requisition.workflow_version_id
  ? requisition.workflow_version?.steps.some(s => s.id === requisition.current_approval_step_id && s.kind === step) === true
  :
  requisition.estado_requisicion === getExpectedStatusForApprovalStep(step) &&
  requisition[`${step}_aprobado`] == null &&
  hasApprovalStepPrerequisites(requisition, step);

export const getCurrentApprovalStepForRequisition = (
  requisition: RequisitionApprovalSnapshot,
): RequisitionApprovalStep | null => {
  if (requisition.workflow_version_id) {
    const step = requisition.workflow_version?.steps.find(s => s.id === requisition.current_approval_step_id);
    return step && step.kind !== 'custom' ? step.kind : null;
  }
  const route = getRequisitionApprovalRoute(requisition.autoriza);

  return route.find((step) => isApprovalStepActiveForRequisition(requisition, step)) ?? null;
};
