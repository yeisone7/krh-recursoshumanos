import { describe, expect, it } from 'vitest';
import { generateRequisitionPDF } from './requisitionPdfGenerator';
import type { PersonnelRequisition } from '@/hooks/useRequisitions';
import { writeFileSync } from 'node:fs';

const req = {
  id: 'req', fecha_requisicion: '2026-09-11', cargo_solicitado: 'Analista', estado_requisicion: 'aprobada',
  solicitante_nombre: 'Solicitante', cantidad_vacantes_requeridas: 1, motivo_solicitud: 'nuevo_cargo',
  dia_descanso_obligatorio: 'domingo',
} as PersonnelRequisition;

describe('requisition PDF workflow', () => {
  it('paginates custom stages and keeps the final answer without truncation', async () => {
    const steps = Array.from({ length: 9 }, (_, n) => ({ id: `stage${n}`, name: `Finance review ${n + 1}`, kind: 'custom' as const, role_ids: [], fields: [
      { id: 'budget', label: 'Budget', type: 'number' as const, required: true },
      { id: 'advance', label: 'Advance', type: 'boolean' as const, required: true },
      { id: 'notes', label: 'Notes', type: 'textarea' as const, required: false },
    ] }));
    const data: PersonnelRequisition = { ...req, workflow_version_id: 'v1', workflow_version: { id: 'v1', version: 1, company_id: 'A', created_at: '', created_by: '', steps }, step_executions: steps.map((s, i) => ({
      requisition_id: 'req', step_id: s.id, position: i + 1, approved: true, approver_id: 'user', approver_name: 'Ana',
      decided_at: '2026-09-11T15:00:00Z', observations: 'Recorded decision', answers: { budget: 0, advance: false, notes: 'Complete answer. '.repeat(100) + 'FINAL_ANSWER_MARKER' },
    })) };
    const doc = await generateRequisitionPDF(data, 'Empresa de prueba');
    const pdf = doc.output();
    expect(doc.getNumberOfPages()).toBeGreaterThan(3);
    expect(pdf).toContain('Finance review 9');
    expect(pdf).toContain('FINAL_ANSWER_MARKER');
    expect(pdf).toContain('Budget: 0');
    expect(pdf).toContain('Advance: No');
    expect(pdf).not.toContain('Coordinadores');
    if (process.env.REQUISITION_PDF_REVIEW === '1') writeFileSync('tmp/requisition-workflow-review.pdf', Buffer.from(doc.output('arraybuffer')));
  });
  it('preserves the legacy approval layout', async () => {
    const pdf = (await generateRequisitionPDF(req, 'Empresa de prueba')).output();
    expect(pdf).toContain('Coordinadores');
    expect(pdf).not.toContain('Finance review');
  });
});
