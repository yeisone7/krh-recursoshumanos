import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  payrollExportMatrix,
  payrollQueryCsv,
  payrollQueryWorkbook,
  type PayrollQueryExport,
} from './payrollDynamicQueryExport';

const fixture = (): PayrollQueryExport => ({
  name: 'consulta',
  columns: [
    { key: 'document', label: 'Documento' },
    { key: 'employee', label: 'Empleado' },
    { key: 'hours', label: 'Horas', description: 'Horas programadas' },
  ],
  rows: Array.from({ length: 1501 }, (_, index) => ({
    document: `00${index}`,
    employee: 'María Muñoz',
    hours: 7.5,
  })),
  metadata: {
    Empresa: 'Empresa prueba',
    Desde: '2026-09-01',
    Hasta: '2026-09-30',
  },
});
describe('Exportación de consulta dinámica', () => {
  it('exporta todas las filas y conserva orden de columnas, ceros iniciales y números', async () => {
    const data = fixture();
    const matrix = payrollExportMatrix(data);
    expect(matrix).toHaveLength(1502);
    expect(matrix[1]).toEqual(['000', 'María Muñoz', 7.5]);
    const workbook = await payrollQueryWorkbook(data);
    expect(workbook.SheetNames).toEqual(['Consulta', 'Filtros y definiciones']);
    const sheet = workbook.Sheets.Consulta;
    expect(sheet.A2).toMatchObject({ t: 's', v: '000' });
    expect(sheet.C2).toMatchObject({ t: 'n', v: 7.5 });
    expect(XLSX.utils.sheet_to_json(sheet)).toHaveLength(1501);
    const roundTrip = XLSX.read(
      XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }),
      { type: 'array' },
    );
    expect(roundTrip.Sheets.Consulta.A1502.v).toBe('001500');
    expect(roundTrip.Sheets['Filtros y definiciones']).toBeDefined();
  });
  it('produce CSV UTF-8 con encabezado único, comillas y saltos de línea escapados', () => {
    const data = fixture();
    data.rows = [
      { document: '00123', employee: 'Muñoz, "María"\nAuxiliar', hours: 2.5 },
    ];
    const csv = payrollQueryCsv(data);
    expect(csv).toContain('\uFEFF"Documento","Empleado","Horas"\r\n');
    expect(csv).toContain('"00123","Muñoz, ""María""\nAuxiliar","2.5"');
  });
  it('protege las celdas textuales CSV de ejecución como fórmulas', () => {
    const data = fixture();
    data.rows = [
      { document: '0001', employee: '=HYPERLINK("external")', hours: -1 },
    ];
    expect(payrollQueryCsv(data)).toContain('"\'=HYPERLINK');
    expect(payrollExportMatrix(data)[1][0]).toBe('0001');
    expect(payrollExportMatrix(data)[1][2]).toBe(-1);
  });
});
