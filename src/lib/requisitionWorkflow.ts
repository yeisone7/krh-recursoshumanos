import type { PersonnelRequisition } from '@/hooks/useRequisitions';
import type { WorkflowAnswers, WorkflowField, WorkflowStep } from '@/types/requisitionWorkflow';

export function getConfiguredCurrentStep(req: Pick<PersonnelRequisition, 'workflow_version' | 'current_approval_step_id'>) {
  return req.workflow_version?.steps.find(s => s.id === req.current_approval_step_id) ?? null;
}

export function validateWorkflowSteps(steps: WorkflowStep[]): string | null {
  if (!steps.length) return 'Agregue al menos una etapa.';
  const kinds = new Set<string>();
  for (const [index, step] of steps.entries()) {
    if (!step.name.trim()) return 'Todas las etapas deben tener nombre.';
    if (step.kind !== 'custom') {
      if (kinds.has(step.kind)) return 'No puede repetir una etapa estándar.';
      kinds.add(step.kind);
    }
    if (step.kind === 'seleccion' && index !== steps.length - 1) return 'Selección debe estar al final.';
    if (step.kind === 'custom' && !step.role_ids.length) return `Asigne un rol a ${step.name}.`;
    for (const field of step.fields) {
      if (!field.label.trim()) return `Hay un campo sin nombre en ${step.name}.`;
      if (field.type === 'select' && (!field.options?.length || field.options.some(o => !o.trim())
        || new Set(field.options).size !== field.options.length)) return `Defina opciones únicas y no vacías para ${field.label}.`;
    }
  }
  return null;
}

export function validateWorkflowAnswers(fields: WorkflowField[], answers: WorkflowAnswers, approved: boolean): string | null {
  for (const field of fields) {
    const value = answers[field.id];
    const empty = value == null || (typeof value === 'string' && !value.trim());
    if (empty) {
      if (approved && field.required) return `Complete el campo: ${field.label}.`;
      continue;
    }
    if (field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return `Número inválido: ${field.label}.`;
    if (field.type === 'boolean' && typeof value !== 'boolean') return `Seleccione Sí o No: ${field.label}.`;
    if (['text', 'textarea', 'date', 'select'].includes(field.type) && typeof value !== 'string') return `Valor inválido: ${field.label}.`;
    if (field.type === 'select' && !field.options?.includes(String(value))) return `Opción inválida: ${field.label}.`;
    if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))
      || Number.isNaN(Date.parse(`${value}T00:00:00Z`))
      || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) return `Fecha inválida: ${field.label}.`;
  }
  return null;
}

export function formatWorkflowAnswer(value: WorkflowAnswers[string] | undefined) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}
