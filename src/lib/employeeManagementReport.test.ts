import { describe, expect, it } from 'vitest';
import {
  analyzeEmployeeManagementReport,
  createEmployeeManagementWorkbook,
} from '@/lib/employeeManagementReport';
import type { GeneralEmployeeReportRow } from '@/lib/generalEmployeeReport';

function employee(overrides: Partial<GeneralEmployeeReportRow> = {}): GeneralEmployeeReportRow {
  return {
    employee_id: 'employee-1',
    documento: '10001',
    nombre_completo: 'Ana Pérez',
    estado: 'Activo',
    activo: 'Sí',
    centro: 'Centro Norte',
    area: 'Operaciones',
    cargo: 'Supervisora',
    sexo_biologico: 'Femenino',
    tipo_discapacidad: '-',
    tipo_contrato: 'Indefinido',
    numero_documentos: 0,
    documentos_vencidos: 0,
    numero_certificaciones: 0,
    numero_vacunas: 0,
    contrato_vigente: 'No',
    contrato_aprobado: 'No',
    soporte_contrato: 'No',
    ...overrides,
  };
}

describe('employeeManagementReport', () => {
  it('calcula cantidades y porcentajes de empleados sin documentos', () => {
    const analysis = analyzeEmployeeManagementReport([
      employee(),
      employee({
        employee_id: 'employee-2',
        documento: '10002',
        nombre_completo: 'Luis Gómez',
        numero_documentos: 3,
        documentos_vencidos: 2,
      }),
    ]);

    expect(analysis.kpis.totalEmployees).toBe(2);
    expect(analysis.kpis.employeesWithoutDocuments).toBe(1);
    expect(analysis.kpis.activeWithoutDocuments).toBe(1);
    expect(analysis.kpis.percentWithoutDocuments).toBe(50);
    expect(analysis.kpis.expiredDocuments).toBe(2);
    expect(analysis.employees[0].prioridad).toBe('Alta');
    expect(analysis.missing.some((item) => item.campo_faltante === 'Al menos un documento vigente')).toBe(true);
  });

  it('genera un libro multihoja identificado con la empresa seleccionada', () => {
    const workbook = createEmployeeManagementWorkbook(
      [employee()],
      'Cosecharte',
      new Date('2026-09-10T15:00:00'),
    );

    expect(workbook.SheetNames).toEqual([
      'Resumen',
      'Empleados',
      'Faltantes',
      'Documentos',
      'Campos',
      'Uso plataforma',
      'Metodología',
    ]);
    expect(workbook.Sheets.Resumen.A1.v).toBe('COSECHARTE');
    expect(workbook.Sheets.Resumen.A3.v).toContain('Cosecharte');
  });
});
