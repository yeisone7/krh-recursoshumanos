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
    numero_adjuntos: 0,
    ...overrides,
  };
}

function completeEmployee(overrides: Partial<GeneralEmployeeReportRow> = {}): GeneralEmployeeReportRow {
  return employee({
    tipo_identificacion: 'Cédula', primer_nombre: 'Ana', primer_apellido: 'Pérez',
    fecha_nacimiento: '01/01/1990', estado_civil: 'Soltera',
    departamento_residencia: 'Meta', ciudad_residencia: 'Villavicencio',
    direccion_residencia: 'Calle 1', celular: '3000000000', contacto_emergencia: 'Luis',
    telefono_emergencia: '3100000000', parentesco_emergencia: 'Hermano',
    centro_costos: 'CC-01', ciudad_trabajo: 'Villavicencio', fecha_ingreso: '01/01/2026',
    tipo_vinculacion: 'Directa', nivel_riesgo: 'I', eps: 'EPS', afp: 'AFP', arl: 'ARL', ccf: 'CCF',
    banco: 'Banco', tipo_cuenta: 'Ahorros', numero_cuenta: '123', cuenta_registrada: 'Sí',
    tipo_nomina: 'Mensual', dia_descanso: 'Domingo', modalidad_tiempo: 'Administrativa',
    horario_o_ciclo: 'Oficina', contrato_vigente: 'Sí', contrato_aprobado: 'Sí', salario: 1,
    soporte_contrato: 'Sí', numero_adjuntos: 1, numero_documentos: 1,
    ...overrides,
  });
}

describe('employeeManagementReport', () => {
  it('calcula cantidades y porcentajes de empleados sin documentos', () => {
    const analysis = analyzeEmployeeManagementReport([
      employee(),
      employee({
        employee_id: 'employee-2',
        documento: '10002',
        nombre_completo: 'Luis Gómez',
        numero_adjuntos: 3,
        numero_documentos: 3,
        documentos_vencidos: 2,
      }),
    ]);

    expect(analysis.kpis.totalEmployees).toBe(2);
    expect(analysis.kpis.employeesWithoutDocuments).toBe(1);
    expect(analysis.kpis.activeWithoutDocuments).toBe(1);
    expect(analysis.kpis.percentWithoutDocuments).toBe(50);
    expect(analysis.kpis.expiredDocuments).toBe(2);
    expect(analysis.kpis.percentExpiredAttachments).toBe(66.7);
    expect(analysis.employees[0].prioridad).toBe('Alta');
    expect(analysis.missing.some((item) => item.campo_faltante === 'Al menos un documento vigente')).toBe(true);
  });

  it('distingue adjuntos existentes de documentos vigentes', () => {
    const analysis = analyzeEmployeeManagementReport([
      employee({ numero_adjuntos: 2, numero_documentos: 0, documentos_vencidos: 2 }),
    ]);

    expect(analysis.kpis.employeesWithoutDocuments).toBe(0);
    expect(analysis.kpis.employeesWithoutCurrentDocuments).toBe(1);
    expect(analysis.employees[0].sin_documentos).toBe('No');
    expect(analysis.employees[0].sin_documentos_vigentes).toBe('Sí');
  });

  it('usa la bandera activa de forma consistente en los KPI', () => {
    const analysis = analyzeEmployeeManagementReport([
      employee({ estado: 'Suspendido', activo: 'Sí' }),
      employee({ employee_id: 'employee-2', documento: '10002', estado: 'Activo', activo: 'No' }),
    ]);

    expect(analysis.kpis.activeEmployees).toBe(1);
    expect(analysis.kpis.activeWithoutDocuments).toBe(1);
  });

  it('clasifica las prioridades alta, media, baja y sin acción', () => {
    const analysis = analyzeEmployeeManagementReport([
      employee({ employee_id: 'high' }),
      completeEmployee({ employee_id: 'medium', documento: '2', eps: '-' }),
      employee({ employee_id: 'low', documento: '3', activo: 'No', estado: 'Retirado' }),
      completeEmployee({ employee_id: 'complete', documento: '4' }),
    ]);

    expect(Object.fromEntries(analysis.employees.map((item) => [item.employee_id, item.prioridad]))).toEqual({
      high: 'Alta', medium: 'Media', low: 'Baja', complete: 'Sin acción',
    });
    expect(analysis.missing[0].prioridad).toBe('Alta');
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
