import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { Shift, WorkSchedule } from '@/types/schedule';
import { buildShiftCalendarWorkbook, getCalendarCellContent, type ShiftCalendarExportData } from './shiftCalendarExport';

const shift = { name: 'Mañana', code: 'TD', color: '#087F9C', kind: 'day', is_rest_day: false, is_not_worked_day: false, is_suspension_day: false } as Shift;
const base = { isAdminMode: false, adminIsWorkDay: false };

describe('calendar cell content shared by screen and export', () => {
  it('uses day shift codes, colors and the same two-letter fallback', () => {
    expect(getCalendarCellContent({ ...base, shift })).toMatchObject({ label: 'TD', background: '087F9C' });
    expect(getCalendarCellContent({ ...base, shift: { ...shift, code: undefined } }).label).toBe('MA');
  });

  it.each([['is_rest_day', 'D'], ['is_not_worked_day', 'NT'], ['is_suspension_day', 'S']] as const)('exports %s using its calendar classification', (flag, label) => {
    expect(getCalendarCellContent({ ...base, shift: { ...shift, [flag]: true } }).label).toBe(label);
  });

  it.each([['vacation', 'VAC'], ['leave', 'PER'], ['incapacity', 'INC']] as const)('exports %s over rest but keeps a conflicting work shift visible', (type, label) => {
    const absence = { type, start_date: '2026-10-01', end_date: '2026-10-02', description: type };
    expect(getCalendarCellContent({ ...base, absence }).label).toBe(label);
    expect(getCalendarCellContent({ ...base, absence, shift: { ...shift, is_rest_day: true } }).label).toBe(label);
    expect(getCalendarCellContent({ ...base, absence, shift }).label).toBe('TD');
  });

  it('derives administrative work and rest days and leaves unassigned cells empty', () => {
    expect(getCalendarCellContent({ ...base }).label).toBe('');
    expect(getCalendarCellContent({ ...base, isAdminMode: true }).label).toBe('D');
    expect(getCalendarCellContent({ isAdminMode: true, adminIsWorkDay: true, adminSchedule: { name: 'Oficina' } as WorkSchedule }).label).toBe('OFI');
  });
});

describe('calendar workbook', () => {
  it('exports only the visible labels without indicators or comments, preserving dates and colors', () => {
    const data: ShiftCalendarExportData = {
      startDate: '2026-10-31', endDate: '2026-11-01', centerLabel: 'Todos los centros', modeLabel: 'Todas',
      days: [
        { dateStr: '2026-10-31', dayName: 'sáb', sunday: false, holiday: null },
        { dateStr: '2026-11-01', dayName: 'dom', sunday: true, holiday: 'Festivo de prueba' },
      ],
      rows: [{ employeeId: 'employee', name: 'Ana Prueba', document: '00123', center: 'Centro A', area: 'Campos', cells: [
        { ...getCalendarCellContent({ ...base, shift }), markers: ['!', 'DO', 'P'], notes: ['Conflicto con vacaciones'], conflict: true },
        { ...getCalendarCellContent(base), markers: [], notes: [], conflict: false },
      ] }],
    };
    data.rows.push({ ...data.rows[0], center: 'Centro B' });
    const workbook = buildShiftCalendarWorkbook(XLSX, data);
    expect(workbook.Sheets['Planilla de Turnos'].E5.s.fill.fgColor.rgb).toBe('087F9C');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const actual = XLSX.read(bytes, { type: 'array', cellStyles: true });
    const sheet = actual.Sheets['Planilla de Turnos'];
    expect(sheet.E4.v).toBe('31/10/2026');
    expect(sheet.F4.v).toBe('01/11/2026');
    expect(sheet.B5).toMatchObject({ t: 's', v: '00123' });
    expect(sheet.E5.v).toBe('TD');
    expect(sheet.E5.s.fgColor.rgb).toBe('087F9C');
    expect(sheet.E5.c).toBeUndefined();
    expect(sheet.F5.s.fgColor.rgb).toBe('FEF3C7');
    expect(sheet.F5.v).toBe('');
    expect(Object.values(sheet).some(cell => cell?.c?.length)).toBe(false);
    expect(sheet.C6.v).toBe('Centro B');
    const summary = XLSX.utils.sheet_to_json(actual.Sheets.Resumen, { header: 1 });
    expect(summary).toContainEqual(['Empleados', 1]);
    expect(summary).toContainEqual(['TD · Mañana', 1]);
    expect(summary).not.toContainEqual(['P', 'Pendiente']);
  });
});
