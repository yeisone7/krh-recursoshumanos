import { describe, expect, it } from 'vitest';
import { amendmentTemplateData } from './amendmentDocumentGenerator';
describe('amendment document snapshots', () => {
  it('renders the frozen values rather than a renamed catalog or current salary', () => {
    const data = { identity: { employee_name: 'Ana Pérez', employee_document: '123', company_name: 'Empresa', company_nit: '900' }, contract: { id: 'c1', number: 'C-1', start_date: '2020-01-01' }, snapshot: { salary: { amount: 3000000 } } };
    const record = { contract_id: 'c1', number: 2, effective_on: '2026-11-12', reason: 'Ascenso', changes: { position: { id: 'p1', label: 'Supervisora' }, salary: { amount: 2000000 } }, before_values: { position: { label: 'Auxiliar' }, salary: { amount: 1500000 } } };
    const result = amendmentTemplateData(data, record, 'Representante', 'Ana Pérez');
    expect(result.cambios[0]).toEqual({ campo: 'Cargo', anterior: 'Auxiliar', nuevo: 'Supervisora' });
    expect(result.cambios[1].nuevo).toContain('2.000.000');
    expect(result.fecha_inicio_contrato).toBe('2020-01-01');
  });
});
