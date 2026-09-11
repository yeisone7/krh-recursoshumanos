import { describe, expect, it } from 'vitest';
import { formatWorkflowAnswer, getConfiguredCurrentStep, validateWorkflowAnswers, validateWorkflowSteps } from './requisitionWorkflow';
import type { WorkflowStep, WorkflowField } from '@/types/requisitionWorkflow';

const field = (type: WorkflowField['type']): WorkflowField => ({ id: 'field', label: 'Dato', type, required: true, options: ['A', 'B'] });
const step: WorkflowStep = { id: 'finance', name: 'Finanzas', kind: 'custom', role_ids: ['finance-role'], fields: [field('number')] };
describe('configured requisition workflow', () => {
  it('requires steps, approver roles and valid labels', () => {
    expect(validateWorkflowSteps([])).toBeTruthy();
    expect(validateWorkflowSteps([{ ...step, role_ids: [] }])).toBeTruthy();
    expect(validateWorkflowSteps([{ ...step, fields: [{ ...field('text'), label: ' ' }] }])).toBeTruthy();
    expect(validateWorkflowSteps([step])).toBeNull();
  });
  it('keeps selection last and standard steps unique', () => {
    const selection: WorkflowStep = { ...step, id: 'selection', kind: 'seleccion', fields: [], role_ids: [] };
    expect(validateWorkflowSteps([selection, step])).toBeTruthy();
    expect(validateWorkflowSteps([step, selection])).toBeNull();
    expect(validateWorkflowSteps([selection, selection])).toBeTruthy();
  });
  it('preserves zero and false and formats their values', () => {
    expect(validateWorkflowAnswers([field('number')], { field: 0 }, true)).toBeNull();
    expect(validateWorkflowAnswers([field('boolean')], { field: false }, true)).toBeNull();
    expect(formatWorkflowAnswer(0)).toBe('0');
    expect(formatWorkflowAnswer(false)).toBe('No');
  });
  it('requires fields only on approval but rejects malformed supplied values on either decision', () => {
    expect(validateWorkflowAnswers([field('number')], {}, true)).toBeTruthy();
    expect(validateWorkflowAnswers([field('number')], {}, false)).toBeNull();
    expect(validateWorkflowAnswers([field('number')], { field: '12' }, false)).toBeTruthy();
    expect(validateWorkflowAnswers([field('number')], { field: Infinity }, true)).toBeTruthy();
    expect(validateWorkflowAnswers([field('boolean')], { field: 'false' }, true)).toBeTruthy();
  });
  it('validates date-only values and configured options', () => {
    expect(validateWorkflowAnswers([field('date')], { field: '2026-02-30' }, true)).toBeTruthy();
    expect(validateWorkflowAnswers([field('date')], { field: '2026-09-11' }, true)).toBeNull();
    expect(validateWorkflowAnswers([field('select')], { field: 'C' }, true)).toBeTruthy();
    expect(validateWorkflowAnswers([field('select')], { field: 'B' }, true)).toBeNull();
    expect(validateWorkflowSteps([{ ...step, fields: [{ ...field('select'), options: ['A', 'A'] }] }])).toBeTruthy();
  });
  it('gets the active stage from the assigned version', () => {
    expect(getConfiguredCurrentStep({ current_approval_step_id: 'finance', workflow_version: { id: 'v1', version: 1, company_id: 'A', created_at: '', created_by: '', steps: [step] } })?.name).toBe('Finanzas');
    expect(getConfiguredCurrentStep({ current_approval_step_id: null })).toBeNull();
  });
});
