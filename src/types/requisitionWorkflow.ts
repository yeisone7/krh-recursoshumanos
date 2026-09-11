import type { RequisitionApprovalStep } from '@/lib/requisitionApprovalFlow';

export type WorkflowFieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select';
export interface WorkflowField {
  id: string;
  label: string;
  type: WorkflowFieldType;
  required: boolean;
  options?: string[];
}
export interface WorkflowStep {
  id: string;
  name: string;
  kind: RequisitionApprovalStep | 'custom';
  role_ids: string[];
  fields: WorkflowField[];
}
export interface RequisitionWorkflowVersion {
  id: string;
  company_id: string;
  version: number;
  steps: WorkflowStep[];
  created_by: string;
  created_at: string;
}
export type WorkflowAnswers = Record<string, string | number | boolean | null>;
export interface RequisitionStepExecution {
  requisition_id: string;
  step_id: string;
  position: number;
  approved: boolean | null;
  answers: WorkflowAnswers;
  observations: string | null;
  approver_id: string | null;
  approver_name: string | null;
  decided_at: string | null;
}
export const standardStepNames: Record<RequisitionApprovalStep, string> = {
  coordinadores: 'Coordinadores', rrhh: 'Recursos Humanos', juridico: 'Jurídico',
  gerencia: 'Gerencia', operaciones: 'Operaciones', seleccion: 'Selección',
};
export const workflowFieldTypeNames: Record<WorkflowFieldType, string> = {
  text: 'Texto corto', textarea: 'Texto largo', number: 'Número', date: 'Fecha',
  boolean: 'Sí / No', select: 'Selección única',
};
