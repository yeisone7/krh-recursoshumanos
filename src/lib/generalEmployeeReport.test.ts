import { describe, expect, it } from 'vitest';
import {
  EMPTY_GENERAL_EMPLOYEE_FILTERS,
  GENERAL_EMPLOYEE_COLUMNS,
  filterGeneralEmployeeRows,
  getGeneralEmployeeFilterOptions,
  selectedGeneralEmployeeColumns,
  type GeneralEmployeeReportRow,
} from '@/lib/generalEmployeeReport';
import { GENERAL_EMPLOYEE_REPORT_SELECTS } from '@/lib/generalEmployeeReportQuery';

const rows: GeneralEmployeeReportRow[] = [
  {
    employee_id: '1',
    documento: '10001',
    nombre_completo: 'Ana Pérez',
    estado: 'Activo',
    centro: 'Centro Norte',
    centros_adicionales: 'Centro Sur',
    area: 'Operaciones',
    cargo: 'Supervisora',
    correo_corporativo: 'ana@empresa.com',
    correo_personal: '-',
    sexo_biologico: 'Femenino',
    tipo_discapacidad: '-',
    tipo_contrato: 'Indefinido',
  },
  {
    employee_id: '2',
    documento: '10002',
    nombre_completo: 'Luis Gómez',
    estado: 'Retirado',
    centro: 'Centro Sur',
    centros_adicionales: '-',
    area: 'Administración',
    cargo: 'Analista',
    correo_corporativo: '-',
    correo_personal: 'luis@example.com',
    sexo_biologico: 'Masculino',
    tipo_discapacidad: 'Visual',
    tipo_contrato: 'Término fijo',
  },
];

describe('generalEmployeeReport', () => {
  it('solicita únicamente las columnas necesarias y resuelve catálogos en las mismas consultas', () => {
    const selections = Object.values(GENERAL_EMPLOYEE_REPORT_SELECTS);

    expect(selections).toHaveLength(15);
    expect(selections.every((selection) => !selection.includes('*'))).toBe(true);
    expect(GENERAL_EMPLOYEE_REPORT_SELECTS.employees).toContain('identification_types(name, code)');
    expect(GENERAL_EMPLOYEE_REPORT_SELECTS.workInfos).toContain('operation_centers(name)');
    expect(GENERAL_EMPLOYEE_REPORT_SELECTS.timeConfigs).toContain('work_schedules(name)');
  });

  it('mantiene claves de columna únicas en todas las categorías', () => {
    const keys = GENERAL_EMPLOYEE_COLUMNS.map((column) => column.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.length).toBeGreaterThan(90);
  });

  it('combina búsqueda y filtros dinámicos', () => {
    const result = filterGeneralEmployeeRows(rows, {
      ...EMPTY_GENERAL_EMPLOYEE_FILTERS,
      search: 'ana@empresa',
      center: 'Centro Sur',
      gender: 'Femenino',
      disability: 'no',
    });

    expect(result.map((row) => row.employee_id)).toEqual(['1']);
  });

  it('crea opciones de centro incluyendo asignaciones adicionales', () => {
    expect(getGeneralEmployeeFilterOptions(rows, 'centro')).toEqual(['Centro Norte', 'Centro Sur']);
  });

  it('respeta el conjunto y orden de campos seleccionados', () => {
    const selected = selectedGeneralEmployeeColumns(new Set(['documento', 'cargo', 'eps']));
    expect(selected.map((column) => column.key)).toEqual(['documento', 'cargo', 'eps']);
  });
});
