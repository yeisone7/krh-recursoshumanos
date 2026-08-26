import { describe, expect, it } from 'vitest';

import { createExcelWorkbook, type ReportData } from './reportExporter';

const report: ReportData = {
  title: 'Reporte de Incapacidades con Recuperación',
  subtitle: 'Período: 01/01/2026 - 31/12/2026',
  generatedAt: new Date('2026-08-26T08:00:00'),
  organization: 'Petrocasinos S.A.',
  institutional: true,
  summary: [
    { label: 'Registros', value: 1 },
    { label: 'Valor total', value: 180000, format: 'currency' },
    { label: 'Recuperado', value: 60000, format: 'currency', tone: 'positive' },
    { label: 'Pendiente', value: 120000, format: 'currency', tone: 'warning' },
  ],
  currencyKeys: ['monto_total', 'monto_recuperado', 'pendiente'],
  dateKeys: ['fecha_inicio', 'fecha_fin'],
  integerKeys: ['dias_totales'],
  textKeys: ['documento'],
  statusKey: 'estado_recobro',
  sheetName: 'Recuperación',
  columns: [
    { header: 'Empleado', key: 'empleado', width: 25 },
    { header: 'Documento', key: 'documento', width: 15 },
    { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
    { header: 'Fecha Fin', key: 'fecha_fin', width: 12 },
    { header: 'Días', key: 'dias_totales', width: 8 },
    { header: 'Estado Recobro', key: 'estado_recobro', width: 15 },
    { header: 'Monto Total', key: 'monto_total', width: 15 },
    { header: 'Recuperado', key: 'monto_recuperado', width: 15 },
    { header: 'Pendiente', key: 'pendiente', width: 15 },
  ],
  data: [{
    empleado: 'María Rodríguez',
    documento: '0010000001',
    fecha_inicio: '01/08/2026',
    fecha_fin: '03/08/2026',
    dias_totales: 3,
    estado_recobro: 'Pendiente de Radicar',
    monto_total: 180000,
    monto_recuperado: 60000,
    pendiente: 120000,
  }],
};

describe('institutional Excel report', () => {
  it('preserves typed values and applies the recovery report presentation', () => {
    const workbook = createExcelWorkbook(report);
    const sheet = workbook.Sheets['Recuperación'];

    expect(workbook.SheetNames).toEqual(['Recuperación']);
    expect(sheet['!autofilter']?.ref).toBe('A9:I10');
    expect(sheet['!merges']).toHaveLength(12);
    expect(sheet.A1.s?.fill?.fgColor?.rgb).toBe('0B2D3A');
    expect(sheet.A2.s?.font?.color?.rgb).toBe('FFFFFF');
    expect(sheet.A9.s?.fill?.fgColor?.rgb).toBe('0B2D3A');
    expect(sheet.C10.v).toBe(46235);
    expect(sheet.C10.t).toBe('n');
    expect(sheet.C10.z).toBe('dd/mm/yyyy');
    expect(sheet.E10.z).toBe('#,##0');
    expect(sheet.G10.z).toBe('"$" #,##0.00');
    expect(sheet.F10.s?.fill?.fgColor?.rgb).toBe('FFF4E5');
    expect(sheet.B10.v).toBe('0010000001');
    expect(sheet.B10.z).toBe('@');
  });
});
