import type { Shift } from '@/types/schedule';

export interface DayShiftExportOptions {
  centerFilterLabel: string;
  searchQuery?: string;
  exportedAt?: Date;
}

export interface DayShiftExportRow {
  name: string;
  code: string;
  description: string;
  startTime: string;
  endTime: string;
  crossesMidnight: string;
  centers: string;
  scope: string;
  breakMinutes: number;
  type: string;
  status: string;
}

const formatTime = (time?: string) => time?.slice(0, 5) || '—';

export function buildDayShiftExportRows(shifts: Shift[]): DayShiftExportRow[] {
  return shifts.map((shift) => {
    const centerNames = (shift.shift_operation_centers ?? [])
      .map((scope) => scope.operation_centers?.name?.trim())
      .filter((name): name is string => Boolean(name))
      .sort((left, right) => left.localeCompare(right, 'es'));
    const isGlobal = (shift.shift_operation_centers?.length ?? 0) === 0;

    return {
      name: shift.name,
      code: shift.code?.trim() || 'Sin código',
      description: shift.description?.trim() || 'Sin descripción',
      startTime: formatTime(shift.start_time),
      endTime: formatTime(shift.end_time),
      crossesMidnight: shift.crosses_midnight ? 'Sí' : 'No',
      centers: isGlobal ? 'Todos los centros' : centerNames.join(', ') || 'Centro no disponible',
      scope: isGlobal ? 'Global' : 'Específico',
      breakMinutes: shift.break_minutes,
      type: shift.is_rest_day ? 'Descanso' : 'Laboral',
      status: shift.is_active ? 'Vigente' : 'Inactivo',
    };
  });
}

export async function exportDayShiftsToExcel(
  shifts: Shift[],
  options: DayShiftExportOptions,
): Promise<string> {
  const XLSX = await import('xlsx');
  const exportedAt = options.exportedAt ?? new Date();
  const rows = buildDayShiftExportRows(shifts);
  const headers = [
    'Turno',
    'Código',
    'Descripción',
    'Hora inicio',
    'Hora fin',
    'Cruza medianoche',
    'Centros de operación',
    'Alcance',
    'Receso (min)',
    'Tipo',
    'Estado',
  ];
  const sheetData = [
    ['CATÁLOGO DE TURNOS DÍA'],
    ['Fecha de exportación', exportedAt.toLocaleString('es-CO')],
    ['Filtro de centro', options.centerFilterLabel],
    ['Búsqueda', options.searchQuery?.trim() || 'Sin búsqueda'],
    ['Registros exportados', rows.length],
    [],
    headers,
    ...rows.map((row) => [
      row.name,
      row.code,
      row.description,
      row.startTime,
      row.endTime,
      row.crossesMidnight,
      row.centers,
      row.scope,
      row.breakMinutes,
      row.type,
      row.status,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  worksheet['!cols'] = [
    { wch: 26 },
    { wch: 16 },
    { wch: 38 },
    { wch: 13 },
    { wch: 13 },
    { wch: 18 },
    { wch: 38 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];
  worksheet['!autofilter'] = { ref: `A7:K${Math.max(7, sheetData.length)}` };

  const titleStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 16 },
    fill: { fgColor: { rgb: '0F3443' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const metadataLabelStyle = {
    font: { bold: true, color: { rgb: '0F3443' } },
    fill: { fgColor: { rgb: 'E8F4F6' } },
  };
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '087F9C' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'D6E2E8' } },
      bottom: { style: 'thin', color: { rgb: 'D6E2E8' } },
      left: { style: 'thin', color: { rgb: 'D6E2E8' } },
      right: { style: 'thin', color: { rgb: 'D6E2E8' } },
    },
  };
  const dataCellStyle = {
    alignment: { vertical: 'top', wrapText: true },
    border: {
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  };

  type StyledCell = { s?: Record<string, unknown> };
  (worksheet.A1 as StyledCell).s = titleStyle;
  worksheet['!rows'] = [{ hpt: 28 }];
  for (let row = 2; row <= 5; row += 1) {
    const labelCell = worksheet[`A${row}`] as StyledCell | undefined;
    if (labelCell) labelCell.s = metadataLabelStyle;
  }
  headers.forEach((_, columnIndex) => {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 6, c: columnIndex })] as StyledCell | undefined;
    if (cell) cell.s = headerStyle;
  });
  for (let rowIndex = 7; rowIndex < sheetData.length; rowIndex += 1) {
    headers.forEach((_, columnIndex) => {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] as StyledCell | undefined;
      if (cell) cell.s = dataCellStyle;
    });
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnos Día');

  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    exportedAt.getFullYear(),
    pad(exportedAt.getMonth() + 1),
    pad(exportedAt.getDate()),
    '_',
    pad(exportedAt.getHours()),
    pad(exportedAt.getMinutes()),
  ].join('');
  const filename = `turnos_dia_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return filename;
}
