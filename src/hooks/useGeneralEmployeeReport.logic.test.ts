import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  classifyAttachedDocuments,
  fetchReportRowsInEmployeeBatches,
  getEffectiveContractEnd,
  selectReportContract,
} from '@/hooks/useGeneralEmployeeReport';

describe('useGeneralEmployeeReport business rules', () => {
  it('limita cada consulta relacionada a los empleados autorizados', () => {
    const source = readFileSync(resolve(__dirname, 'useGeneralEmployeeReport.ts'), 'utf8');
    const scopedQueries = source.match(/\.in\('employee_id', employeeIdBatch\)/g) || [];

    expect(scopedQueries).toHaveLength(14);
    expect(source).toContain(".not('file_url', 'is', null).neq('file_url', '')");
  });

  it('divide listas grandes de empleados para mantener acotado cada filtro IN', async () => {
    const employeeIds = Array.from({ length: 205 }, (_, index) => `employee-${index}`);
    const receivedBatches: string[][] = [];

    const rows = await fetchReportRowsInEmployeeBatches(
      employeeIds,
      async (employeeIdBatch) => {
        receivedBatches.push(employeeIdBatch);
        return {
          data: employeeIdBatch.map((employee_id) => ({ employee_id })),
          error: null,
        };
      },
    );

    expect(receivedBatches.map((batch) => batch.length)).toEqual([100, 100, 5]);
    expect(rows).toHaveLength(205);
    expect(rows[204]).toEqual({ employee_id: 'employee-204' });
  });

  it('usa la prórroga con mayor número y no la fecha más lejana', () => {
    const contract = {
      start_date: '2026-01-01',
      end_date: '2026-06-30',
      is_terminated: false,
      contract_extensions: [
        { extension_number: 1, end_date: '2027-12-31', document_url: null },
        { extension_number: 2, end_date: '2027-06-30', document_url: 'extension.pdf' },
      ],
    };

    expect(getEffectiveContractEnd(contract)).toBe('2027-06-30');
  });

  it('prefiere el contrato vigente sobre uno futuro más reciente', () => {
    const current = {
      id: 'current',
      start_date: '2026-01-01',
      end_date: null,
      is_terminated: false,
      contract_extensions: [],
    };
    const future = {
      id: 'future',
      start_date: '2027-01-01',
      end_date: null,
      is_terminated: false,
      contract_extensions: [],
    };

    const result = selectReportContract([future, current], '2026-09-10');
    expect(result.contract?.id).toBe('current');
    expect(result.isCurrent).toBe(true);
  });

  it.each([
    ['terminado', { start_date: '2026-01-01', end_date: null, is_terminated: true }],
    ['vencido', { start_date: '2026-01-01', end_date: '2026-08-31', is_terminated: false }],
    ['futuro', { start_date: '2026-10-01', end_date: null, is_terminated: false }],
  ])('marca como no vigente un contrato %s', (_, contract) => {
    expect(selectReportContract([contract], '2026-09-10').isCurrent).toBe(false);
  });

  it('clasifica adjuntos vigentes, vencidos e inválidos sin perder el total', () => {
    const documents = [
      { document_type: 'hoja_vida' as const, expiry_date: null, is_valid: true },
      { document_type: 'contrato' as const, expiry_date: '2026-12-31', is_valid: true },
      { document_type: 'cedula' as const, expiry_date: '2026-01-01', is_valid: true },
      { document_type: 'otro' as const, expiry_date: null, is_valid: false },
    ];

    const result = classifyAttachedDocuments(documents, '2026-09-10');
    expect(documents).toHaveLength(4);
    expect(result.current).toHaveLength(2);
    expect(result.expired).toHaveLength(1);
    expect(result.hasContractFolder).toBe(true);
  });
});
