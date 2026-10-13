import type * as XLSX from 'xlsx';
import type { EmployeeAbsence, Shift, WorkSchedule } from '@/types/schedule';
import { getShiftClassification, getShiftClassificationCode, isNonWorkingShift } from './shiftClassification';

export interface CalendarCellContent {
  label: string;
  description: string;
  background: string;
  foreground: string;
}

// Shared by the calendar and its export: an absence replaces a rest shift,
// but a working shift remains visible when it conflicts with an absence.
export function getCalendarCellContent({ shift, absence, isAdminMode, adminIsWorkDay, adminSchedule }: {
  shift?: Shift | null;
  absence?: EmployeeAbsence;
  isAdminMode: boolean;
  adminIsWorkDay: boolean;
  adminSchedule?: WorkSchedule;
}): CalendarCellContent {
  if (absence && (!shift || isNonWorkingShift(shift))) {
    const colors = {
      vacation: ['VAC', 'DCFCE7', '15803D'],
      leave: ['PER', 'DBEAFE', '1D4ED8'],
      incapacity: ['INC', 'FFEDD5', 'C2410C'],
    };
    const [label, background, foreground] = colors[absence.type];
    return { label, background, foreground, description: absence.description };
  }
  if (shift) {
    if (isNonWorkingShift(shift)) {
      const colors = {
        rest: ['D1FAE5', '047857'], not_worked: ['F1F5F9', '334155'], suspension: ['FFE4E6', 'BE123C'],
      };
      const [background, foreground] = colors[getShiftClassification(shift) as keyof typeof colors];
      return { label: getShiftClassificationCode(shift)!, description: shift.name, background, foreground };
    }
    const hex = shift.color?.match(/^#([\da-f]{6}|[\da-f]{3})$/i)?.[1];
    const background = hex?.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    return { label: shift.code || shift.name.slice(0, 2).toUpperCase(), description: shift.name,
      background: background || 'FFFFFF', foreground: background ? 'FFFFFF' : '0F172A' };
  }
  if (isAdminMode) {
    return adminIsWorkDay
      ? { label: adminSchedule?.name?.slice(0, 3).toUpperCase() || 'ADM', description: adminSchedule?.name || 'Administrativo', background: 'E0E7FF', foreground: '4338CA' }
      : { label: 'D', description: 'Descanso administrativo', background: 'D1FAE5', foreground: '047857' };
  }
  return { label: '', description: 'Sin asignación', background: 'FFFFFF', foreground: '0F172A' };
}

export interface CalendarExportDay {
  dateStr: string;
  dayName: string;
  sunday: boolean;
  holiday: string | null;
}

export interface CalendarExportCell extends CalendarCellContent {
  notes: string[];
  markers: string[];
  conflict: boolean;
}

export interface ShiftCalendarExportData {
  startDate: string;
  endDate: string;
  centerLabel: string;
  modeLabel: string;
  days: CalendarExportDay[];
  rows: {
    employeeId: string;
    name: string;
    document: string;
    center: string;
    area: string;
    cells: CalendarExportCell[];
  }[];
}

export function buildShiftCalendarWorkbook(xlsx: typeof XLSX, data: ShiftCalendarExportData) {
  const workbook = xlsx.utils.book_new();
  const sheetData = [
    [`Calendario de Jornadas · ${data.startDate} al ${data.endDate}`],
    [`Centro: ${data.centerLabel} · Modalidad: ${data.modeLabel}`],
    ['', '', '', '', ...data.days.map(d => d.dayName.toUpperCase())],
    ['Empleado', 'Documento', 'Centro', 'Área', ...data.days.map(d => d.dateStr.split('-').reverse().join('/'))],
    ...data.rows.map(row => [row.name, row.document, row.center, row.area,
      ...row.cells.map(cell => [cell.label, ...cell.markers].filter(Boolean).join(' '))]),
  ];
  const sheet = xlsx.utils.aoa_to_sheet(sheetData);
  const columnCount = 4 + data.days.length;
  sheet['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, ...data.days.map(() => ({ wch: 13 }))];
  sheet['!rows'] = sheetData.map((_, r) => ({ hpt: r < 2 ? 26 : 30 }));
  sheet['!merges'] = [0, 1].map(r => ({ s: { r, c: 0 }, e: { r, c: columnCount - 1 } }));
  sheet['!autofilter'] = { ref: `A4:${xlsx.utils.encode_cell({ r: sheetData.length - 1, c: columnCount - 1 })}` };
  for (let r = 0; r < sheetData.length; r++) {
    for (let c = 0; c < columnCount; c++) {
      const address = xlsx.utils.encode_cell({ r, c });
      const cell = sheet[address];
      if (!cell) continue;
      const day = data.days[c - 4];
      const content = r >= 4 && c >= 4 ? data.rows[r - 4].cells[c - 4] : undefined;
      const background = content?.label ? content.background
        : day?.holiday ? 'FEF3C7' : day?.sunday ? 'FEE2E2' : 'FFFFFF';
      const border = { style: content?.conflict ? 'medium' : 'thin', color: { rgb: content?.conflict ? 'DC2626' : 'E2E8F0' } };
      cell.s = {
        font: { name: 'Calibri', sz: 11, bold: r < 4 || c >= 4, color: { rgb: r < 2 ? 'FFFFFF' : content?.foreground || '0F172A' } },
        fill: { fgColor: { rgb: r < 2 ? '0F3443' : r < 4 && !day ? 'E2E8F0' : background } },
        alignment: { vertical: 'center', horizontal: c >= 4 ? 'center' : 'left', wrapText: true },
        border: { top: border, bottom: border, left: border, right: border },
      };
      const notes = content ? [content.description, ...content.notes, day?.holiday].filter(Boolean) : day?.holiday ? [day.holiday] : [];
      if (notes.length) cell.c = [{ a: 'Jornadas', t: notes.join('\n') }];
    }
  }
  xlsx.utils.book_append_sheet(workbook, sheet, 'Planilla de Turnos');

  // Count unique employee/date cells even when an employee belongs to several centers.
  const seen = new Set<string>();
  const summary = new Map<string, number>();
  data.rows.forEach(row => row.cells.forEach((cell, index) => {
    const key = `${row.employeeId}:${data.days[index].dateStr}`;
    if (seen.has(key) || !cell.label) return;
    seen.add(key);
    const label = `${cell.label} · ${cell.description}`;
    summary.set(label, (summary.get(label) ?? 0) + 1);
  }));
  const summarySheet = xlsx.utils.aoa_to_sheet([
    ['Resumen del calendario', `${data.startDate} al ${data.endDate}`],
    ['Centro', data.centerLabel], ['Modalidad', data.modeLabel],
    ['Empleados', new Set(data.rows.map(row => row.employeeId)).size],
    ['Días del período', data.days.length], [], ['Turno / novedad', 'Total días'],
    ...summary.entries(), [], ['Indicadores', 'Significado'],
    ['DO', 'Trabajo en descanso obligatorio'], ['!', 'Conflicto de turno con novedad o centro'],
    ['✓', 'Aprobada'], ['×', 'Rechazada'], ['P', 'Pendiente'],
    ['Detalle', 'Las notas de cada celda incluyen novedades, festivos y estado de aprobación.'],
  ]);
  summarySheet['!cols'] = [{ wch: 45 }, { wch: 80 }];
  xlsx.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
  return workbook;
}

export async function exportShiftCalendar(data: ShiftCalendarExportData) {
  const xlsx = await import('xlsx');
  const workbook = buildShiftCalendarWorkbook(xlsx, data);
  xlsx.writeFile(workbook, `Jornadas_${data.startDate}_${data.endDate}.xlsx`);
}
