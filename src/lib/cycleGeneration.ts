import { differenceInCalendarDays, eachDayOfInterval, format, isValid, parseISO } from 'date-fns';
import { scheduleForDate } from './effectiveSchedule';
import { isNonWorkingShift } from './shiftClassification';
import type { EmployeeTimeConfig, ShiftCycle } from '@/types/schedule';

export type CycleAssignment = { employee_id: string; shift_id: string; assignment_date: string };
export type CycleAbsence = { employee_id: string; start_date: string; end_date: string };
export type CycleGenerationRequest = { companyId: string; employeeIds: string[]; start: string; end: string; cycleId?: string };
export type CycleGenerationData = {
  configs: EmployeeTimeConfig[]; cycles: ShiftCycle[]; absences: CycleAbsence[];
  existing: Pick<CycleAssignment, 'employee_id' | 'assignment_date'>[];
  activeEmployeeIds: string[];
};
export type CyclePreview = { assignments: CycleAssignment[]; preserved: number; absent: number; outsideConfig: number };

export function buildCyclePreview(request: CycleGenerationRequest, data: CycleGenerationData): CyclePreview {
  const start = parseISO(request.start), end = parseISO(request.end);
  if (!isValid(start) || !isValid(end) || end < start) throw new Error('Selecciona un período válido: la fecha final debe ser igual o posterior a la inicial.');
  if (!request.employeeIds.length) throw new Error('Selecciona al menos un empleado.');
  const cycles = new Map(data.cycles.map(cycle => [cycle.id, cycle]));
  if (request.cycleId && !cycles.get(request.cycleId)?.is_active) throw new Error('El ciclo seleccionado no está activo. Actualiza la selección.');
  const active = new Set(data.activeEmployeeIds);
  const occupied = new Set(data.existing.map(row => `${row.employee_id}:${row.assignment_date}`));
  const result: CyclePreview = { assignments: [], preserved: 0, absent: 0, outsideConfig: 0 };
  const validated = new Set<string>();
  for (const employeeId of new Set(request.employeeIds)) {
    if (!active.has(employeeId)) throw new Error('Uno de los empleados seleccionados ya no está activo. Actualiza la selección.');
    for (const day of eachDayOfInterval({ start, end })) {
      const date = format(day, 'yyyy-MM-dd');
      const config = scheduleForDate(data.configs, employeeId, date);
      if (!config || config.mode !== 'shift' || !config.shift_cycle_id) { result.outsideConfig++; continue; }
      const cycle = cycles.get(request.cycleId || config.shift_cycle_id);
      if (!cycle?.is_active) { result.outsideConfig++; continue; }
      const cycleDays = [...(cycle.cycle_days || [])].sort((a, b) => a.day_number - b.day_number);
      if (!validated.has(cycle.id)) {
        if (!cycleDays.length || cycle.total_days !== cycleDays.length || cycleDays.some((item, index) => item.day_number !== index + 1 || !item.shifts?.is_active)) {
          throw new Error(`El ciclo ${cycle.name} tiene una secuencia incompleta o turnos inactivos. Revisa su configuración.`);
        }
        validated.add(cycle.id);
      }
      const anchor = parseISO(config.cycle_start_date || config.start_date);
      if (!isValid(anchor)) throw new Error('La fecha de inicio del ciclo no es válida. Revisa la configuración del empleado.');
      const offset = differenceInCalendarDays(day, anchor);
      const cycleDay = cycleDays[((offset % cycleDays.length) + cycleDays.length) % cycleDays.length];
      if (occupied.has(`${employeeId}:${date}`)) { result.preserved++; continue; }
      if (!isNonWorkingShift(cycleDay.shifts) && data.absences.some(a => a.employee_id === employeeId && a.start_date <= date && a.end_date >= date)) {
        result.absent++; continue;
      }
      result.assignments.push({ employee_id: employeeId, shift_id: cycleDay.shift_id, assignment_date: date });
    }
  }
  return result;
}
