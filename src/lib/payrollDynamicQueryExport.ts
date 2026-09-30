import type { CellValue, QueryColumn } from './payrollDynamicQuery';
export interface PayrollQueryExport {
  name: string;
  columns: Pick<QueryColumn, 'key' | 'label' | 'description'>[];
  rows: Record<string, CellValue>[];
  metadata: Record<string, string>;
}
export function payrollExportMatrix(data: PayrollQueryExport): CellValue[][] {
  return [
    data.columns.map((column) => column.label),
    ...data.rows.map((row) =>
      data.columns.map((column) => row[column.key] ?? ''),
    ),
  ];
}
export function payrollQueryCsv(data: PayrollQueryExport): string {
  const escape = (value: CellValue) => {
    // Excel can interpret a CSV string as a formula even when it is quoted.
    const safe =
      typeof value === 'string' && /^[\s]*[=+@-]/.test(value)
        ? `'${value}`
        : String(value);
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return (
    '\uFEFF' +
    payrollExportMatrix(data)
      .map((row) => row.map(escape).join(','))
      .join('\r\n')
  );
}
export async function payrollQueryWorkbook(data: PayrollQueryExport) {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(payrollExportMatrix(data));
  sheet['!cols'] = data.columns.map((column) => ({
    wch: Math.min(45, Math.max(16, column.label.length)),
  }));
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: data.rows.length, c: Math.max(0, data.columns.length - 1) },
    }),
  };
  XLSX.utils.book_append_sheet(workbook, sheet, 'Consulta');
  const metadata = [
    ['Parámetro', 'Valor'],
    ...Object.entries(data.metadata),
    ['Filas exportadas', data.rows.length],
    [
      'Definición',
      'Una fila de detalle por empleado, vinculación y fecha. Programación y cantidades para nómina no acreditan asistencia.',
    ],
    [
      'Aprobaciones',
      'Pendientes y rechazadas se muestran por separado; no integran los días y horas efectivos.',
    ],
    [
      'Recargos',
      'No son horas adicionales trabajadas; no sumar a extras como tiempo trabajado.',
    ],
    [
      'Histórico',
      'Datos vigentes en la fecha cuando hay evidencia. Estado del empleado corresponde al estado actual.',
    ],
    [
      'Horas registradas',
      'Suma de horas declaradas por concepto; puede contener registros superpuestos, no equivale a asistencia ni a liquidación.',
    ],
    ...data.columns
      .filter((column) => column.description)
      .map((column) => [column.label, column.description!]),
  ];
  const info = XLSX.utils.aoa_to_sheet(metadata);
  info['!cols'] = [{ wch: 42 }, { wch: 100 }];
  XLSX.utils.book_append_sheet(workbook, info, 'Filtros y definiciones');
  return workbook;
}
export async function downloadPayrollQuery(
  data: PayrollQueryExport,
  format: 'xlsx' | 'csv',
) {
  if (format === 'xlsx') {
    const [XLSX, workbook] = await Promise.all([
      import('xlsx'),
      payrollQueryWorkbook(data),
    ]);
    XLSX.writeFile(workbook, `${data.name}.xlsx`);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([payrollQueryCsv(data)], { type: 'text/csv;charset=utf-8;' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${data.name}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
