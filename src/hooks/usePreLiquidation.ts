import { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, getDay, subDays } from 'date-fns';
import type { PreLiquidationRow, PreLiquidationFilters, PayrollLaborConfig, PayrollConcept, PayrollDayConcept } from '@/types/payroll';
import type { EmployeeShiftAssignment } from '@/types/schedule';
import { calculateShiftHours, clockSeconds, scheduleHours, emptyHourTotals, HOUR_CONCEPTS, type HourTotals, type HourConcept } from '@/lib/payrollShiftHours';
import { getPayrollRestDay } from '@/lib/payrollRestDay';
import { crossingDeductionVersions } from '@/lib/deductionVersions';
import { getShiftClassification } from '@/lib/shiftClassification';
import { payrollDayKind, payrollHourConcept, payrollHistoryAt, type PayrollDatedRecord } from '@/lib/payrollDayClassification';

export interface PreLiquidationData {
  schedules?: Array<PayrollDatedRecord & { rest_day: string | null; shift_types?: { name: string; start_time?: string; end_time?: string; break_duration_minutes?: number | null } | null }>;
  employmentCycles?: Array<{ id: string; employee_id: string; start_date: string; end_date: string | null }>;
  timeConfigs?: Array<PayrollDatedRecord & { mode: string; work_schedules?: { name: string; days_of_week: number[] } | null }>;
  assignments: EmployeeShiftAssignment[];
  holidays: Set<string>;
  novelties: Array<{
    employee_id: string;
    novelty_date: string;
    novelty_type: string;
    hours: number;
    concept_id?: string | null;
    quantity?: number | null;
    quantity_unit?: 'hours' | 'days' | null;
    payroll_concepts?: PayrollConcept | null;
    status: string;
  }>;
  overtimeRecords: Array<{
    employee_id: string;
    work_date: string;
    overtime_type: string;
    total_hours: number;
    status: string;
  }>;
  incapacities: Array<{
    employee_id: string;
    start_date: string;
    end_date: string;
  }>;
  vacations: Array<{
    employee_id: string;
    start_date: string;
    end_date: string;
    status: string;
    request_type?: string;
    interruption_date?: string | null;
    resume_start_date?: string | null;
    resume_end_date?: string | null;
  }>;
  leaves: Array<{
    employee_id: string;
    start_date: string;
    end_date: string;
    status: string;
    duration_type?: string;
    total_hours?: number | null;
  }>;
  loans: Array<{
    id: string;
    employee_id: string;
    loan_type: string;
    description: string | null;
    installment_amount: number;
    status: string;
    start_date?: string;
    remaining_balance?: number;
  }>;
  deductions: Array<{
    previous_version_id?: string | null;
    id: string;
    employee_id: string;
    deduction_type: string;
    description: string;
    amount: number;
    is_percentage: boolean;
    percentage_value: number | null;
    status: string;
    start_date?: string;
    end_date?: string | null;
  }>;
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
    operationCenterIds: string[];
    operationCenterName: string;
    restDay: string;
    shiftName: string;
  }>;
  config: PayrollLaborConfig | null;
  filters: PreLiquidationFilters;
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

function getOvertimeMapping(overtimeType: string): string | null {
  const map: Record<string, string> = {
    extra_diurna: 'hedo',
    extra_nocturna: 'heno',
    recargo_nocturno: 'rn',
    dominical_diurna: 'hedf',
    dominical_nocturna: 'henf',
    festivo_diurna: 'hedf',
    festivo_nocturna: 'henf',
  };
  return map[overtimeType] || null;
}

export function usePreLiquidation(data: PreLiquidationData | null): PreLiquidationRow[] {
  return useMemo(() => calculatePreLiquidation(data), [data]);
}

export function calculatePreLiquidation(data: PreLiquidationData | null): PreLiquidationRow[] {
  if (!data) return [];

  const { assignments, holidays, novelties, overtimeRecords, incapacities, vacations, leaves, loans, deductions, employees, config, filters } = data;
  const { startDate, endDate } = filters;
  if (!startDate || !endDate || startDate > endDate
    || !Number.isFinite(parseISO(startDate).getTime()) || !Number.isFinite(parseISO(endDate).getTime())) return [];

  const previousDate = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  const periodDays = days.length;
  const dailyHours = config && Number.isFinite(config.daily_hours) && config.daily_hours > 0 ? config.daily_hours : 8;

  // Detect contradictory assignments rather than silently choosing the last row.
  const assignmentIndex: Record<string, EmployeeShiftAssignment> = {};
  const duplicateAssignments = new Set<string>();
  assignments.forEach(a => {
    if (assignmentIndex[`${a.employee_id}_${a.assignment_date}`]) duplicateAssignments.add(`${a.employee_id}_${a.assignment_date}`);
    assignmentIndex[`${a.employee_id}_${a.assignment_date}`] = a;
  });

  // Index incapacities, vacations, leaves by employee
  const incapacityDays: Record<string, Set<string>> = {};
  incapacities.forEach(inc => {
    if (!incapacityDays[inc.employee_id]) incapacityDays[inc.employee_id] = new Set();
    const incDays = eachDayOfInterval({
      start: parseISO(inc.start_date),
      end: parseISO(inc.end_date)
    });
    incDays.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      if (isDateInRange(ds, previousDate, endDate)) {
        incapacityDays[inc.employee_id].add(ds);
      }
    });
  });

  const vacationDays: Record<string, Set<string>> = {};
  vacations.filter(v => ['aprobada', 'aprobado', 'en_curso', 'completado', 'interrumpido'].includes(v.status)
    && v.request_type !== 'compensacion' && v.request_type !== 'acumulacion').forEach(vac => {
    if (!vacationDays[vac.employee_id]) vacationDays[vac.employee_id] = new Set();
    const originalEnd = vac.interruption_date
      ? [vac.end_date, format(subDays(parseISO(vac.interruption_date), 1), 'yyyy-MM-dd')].sort()[0]
      : vac.end_date;
    const ranges = [{ start: vac.start_date, end: originalEnd }];
    if (vac.resume_start_date && vac.resume_end_date) ranges.push({ start: vac.resume_start_date, end: vac.resume_end_date });
    const vacDays = ranges.filter(range => range.start <= range.end).flatMap(range =>
      eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) }));
    vacDays.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      if (isDateInRange(ds, previousDate, endDate)) {
        vacationDays[vac.employee_id].add(ds);
      }
    });
  });

  const leaveDays: Record<string, Map<string, number>> = {};
  const leaveHours: Record<string, Map<string, number>> = {};
  leaves.filter(l => l.status === 'aprobado' || l.status === 'aprobada').forEach(lv => {
    if (!leaveDays[lv.employee_id]) leaveDays[lv.employee_id] = new Map();
    if (!leaveHours[lv.employee_id]) leaveHours[lv.employee_id] = new Map();
    const lvDays = eachDayOfInterval({
      start: parseISO(lv.start_date),
      end: parseISO(lv.end_date)
    });
    lvDays.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      if (isDateInRange(ds, previousDate, endDate)) {
        const fraction = lv.duration_type === 'medio_dia' ? 0.5 : lv.duration_type === 'horas' ? 0 : 1;
        if (lv.duration_type === 'horas') leaveHours[lv.employee_id].set(ds, (leaveHours[lv.employee_id].get(ds) || 0) + Math.max(0, Number(lv.total_hours || 0)));
        leaveDays[lv.employee_id].set(ds, (leaveDays[lv.employee_id].get(ds) || 0) + fraction);
      }
    });
  });

  // Index overtime by employee
  const overtimeByEmployee: Record<string, Array<typeof overtimeRecords[0]>> = {};
  overtimeRecords.filter(o => o.status === 'aprobado' || o.status === 'pagado').forEach(o => {
    if (!overtimeByEmployee[o.employee_id]) overtimeByEmployee[o.employee_id] = [];
    if (isDateInRange(o.work_date, startDate, endDate)) {
      overtimeByEmployee[o.employee_id].push(o);
    }
  });

  // Index manual novelties by employee - Only approved ones
  const noveltyByEmployee: Record<string, Array<typeof novelties[0]>> = {};
  novelties.filter(n => n.status === 'aprobada' && isDateInRange(n.novelty_date, previousDate, endDate)).forEach(n => {
    if (!noveltyByEmployee[n.employee_id]) noveltyByEmployee[n.employee_id] = [];
    noveltyByEmployee[n.employee_id].push(n);
  });

  // Index active loans by employee
  const loansByEmployee: Record<string, typeof loans> = {};
  loans.filter(l => l.status === 'activo' && (!l.start_date || l.start_date <= endDate)).forEach(l => {
    if (!loansByEmployee[l.employee_id]) loansByEmployee[l.employee_id] = [];
    loansByEmployee[l.employee_id].push(l);
  });

  // Index active deductions by employee
  const deductionsByEmployee: Record<string, typeof deductions> = {};
  const crossingVersions = crossingDeductionVersions(deductions, startDate, endDate);
  deductions.filter(d => d.status === 'activo' && (!d.start_date || d.start_date <= endDate)
    && (!d.end_date || d.end_date >= startDate)).forEach(d => {
    if (!deductionsByEmployee[d.employee_id]) deductionsByEmployee[d.employee_id] = [];
    deductionsByEmployee[d.employee_id].push(d);
  });

  return employees.map(emp => {
    const warnings = new Set<string>();
    const schedules = data.schedules?.filter(s => s.employee_id === emp.id);
    const cycles = data.employmentCycles?.filter(c => c.employee_id === emp.id);
    const timeConfigs = data.timeConfigs?.filter(c => c.employee_id === emp.id) || [];
    const cycleAt = (date: string) => cycles?.filter(c => c.start_date <= date && (!c.end_date || c.end_date >= date)) || [];
    const employedAt = (date: string) => !cycles?.length || cycleAt(date).length > 0;
    const restLabels = new Set<string>();
    const shiftLabels = new Set<string>();
    const scheduleAt = (date: string) => schedules === undefined ? undefined : payrollHistoryAt(schedules, date, cycles?.length ? cycleAt(date)[0]?.id ?? null : undefined);
    const hoursAt = (date: string) => {
      const schedule = scheduleAt(date);
      if (!schedule?.shift_types) return dailyHours;
      const hours = scheduleHours(schedule.shift_types);
      if (hours === null) warnings.add(`La Jornada del ${date} no tiene un horario ordinario válido; se usa la configuración laboral para días y se dejan las horas automáticas pendientes.`);
      return hours ?? dailyHours;
    };
    const restAt = (date: string) => {
      const matchingCycles = cycleAt(date);
      if (matchingCycles.length > 1) warnings.add(`Vinculaciones superpuestas el ${date}; revise el histórico.`);
      const schedule = scheduleAt(date);
      if (schedules !== undefined && !schedule) warnings.add('No existe configuración de descanso vigente en parte del período.');
      const rest = schedules === undefined ? emp.restDay : schedule ? schedule.rest_day : 'Histórico pendiente';
      if (getPayrollRestDay(rest) === null) warnings.add('El descanso asignado no identifica un día semanal; revise las fechas de descanso obligatorio.');
      restLabels.add(rest || 'Domingo');
      if (schedule?.shift_types?.name) shiftLabels.add(schedule.shift_types.name);
      return rest;
    };
    let jornada = 0;
    let dominicalTrabajado = 0;
    let festivoTrabajado = 0;
    let descansoRemunerado = 0;
    let noTrabajado = 0;
    let suspension = 0;
    let incapDays = 0, vacDays = 0, permDays = 0;
    const dailyNoveltyTypes = new Set(['jornada', 'dominical_trabajado', 'festivo_trabajado', 'descanso_remunerado', 'incapacidad', 'vacaciones', 'permiso']);
    const dailyNovelties = new Map<string, PreLiquidationData['novelties']>();
    (noveltyByEmployee[emp.id] || []).filter(n => dailyNoveltyTypes.has(n.novelty_type)).forEach(n => {
      dailyNovelties.set(n.novelty_date, [...(dailyNovelties.get(n.novelty_date) || []), n]);
    });

    const automaticHours = new Map<string, HourTotals>();
    const ordinaryFractions = new Map<string, number>();
    const partialLeaveAt = (date: string) => (leaveDays[emp.id]?.get(date) || 0) + (leaveHours[emp.id]?.get(date) || 0) / hoursAt(date);
    const employeeAssignments = assignments.filter(a => a.employee_id === emp.id && a.assignment_date >= previousDate && a.assignment_date <= endDate
      && (a.assignment_date >= startDate || a.shifts?.crosses_midnight));
    const overlappingDates = new Set<string>();
    const intervals = employeeAssignments.flatMap(a => {
      if (!a.shifts || getShiftClassification(a.shifts) !== 'work') return [];
      if (!employedAt(a.assignment_date) || dailyNovelties.has(a.assignment_date)
        || incapacityDays[emp.id]?.has(a.assignment_date) || vacationDays[emp.id]?.has(a.assignment_date)
        || partialLeaveAt(a.assignment_date) > 0) return [];
      const start = clockSeconds(a.shifts.start_time), end = clockSeconds(a.shifts.end_time);
      if (start === null || end === null) return [];
      const midnight = Date.parse(`${a.assignment_date}T00:00:00Z`) / 1000;
      return [{ date: a.assignment_date, start: midnight + start, end: midnight + end + (end <= start ? 86400 : 0) }];
    }).sort((a, b) => a.start - b.start);
    for (let i = 1; i < intervals.length; i++) {
      if (intervals[i].start < intervals[i - 1].end) {
        overlappingDates.add(intervals[i - 1].date); overlappingDates.add(intervals[i].date);
        warnings.add(`Turnos superpuestos el ${intervals[i - 1].date} y ${intervals[i].date}; jornadas y horas pendientes hasta corregirlos.`);
      }
    }
    employeeAssignments.forEach(a => {
      const date = a.assignment_date;
      if (overlappingDates.has(date) || !employedAt(date) || duplicateAssignments.has(`${emp.id}_${date}`) || !a.shifts || getShiftClassification(a.shifts) !== 'work') return;
      if (dailyNovelties.has(date) || incapacityDays[emp.id]?.has(date) || vacationDays[emp.id]?.has(date) || partialLeaveAt(date) >= 1) return;
      if (partialLeaveAt(date) > 0) {
        warnings.add(`Permiso parcial el ${date} sin horario de ausencia; revise extras y recargos, no se generan automáticamente.`);
        return;
      }
      const scheduled = scheduleAt(date)?.shift_types;
      // Legacy/incomplete records can contribute a day, but cannot produce invented hours.
      if (!a.shifts.start_time || !a.shifts.end_time) {
        warnings.add(`Falta el horario del Turno Día del ${date}; extras y recargos pendientes.`);
        return;
      }
      if (schedules !== undefined && (!scheduled || scheduleHours(scheduled) === null)) {
        warnings.add(`Falta un horario de Jornada válido el ${date}; extras y recargos pendientes.`);
        return;
      }
      try {
        const calculated = calculateShiftHours({ date, shift: a.shifts, ordinaryHours: hoursAt(date),
          nightStart: config?.night_start || (date >= '2025-12-25' ? '19:00' : '21:00'), nightEnd: config?.night_end || '06:00',
          specialAt: d => payrollDayKind(d, restAt(d), holidays) !== 'ordinary' });
        ordinaryFractions.set(date, calculated.ordinaryHours / hoursAt(date));
        if (calculated.proportionalBreak) warnings.add(`Descanso del ${date} distribuido proporcionalmente entre franjas; revise su horario real.`);
        for (const [d, hours] of Object.entries(calculated.byDate)) {
          if (!isDateInRange(d, startDate, endDate) || !employedAt(d)) continue;
          if (d !== date && (dailyNovelties.has(d) || incapacityDays[emp.id]?.has(d) || vacationDays[emp.id]?.has(d) || partialLeaveAt(d) > 0)) {
            warnings.add(`El turno del ${date} cruza una ausencia o corrección el ${d}; horas de ese tramo pendientes.`);
            continue;
          }
          const accumulated = automaticHours.get(d) || emptyHourTotals();
          HOUR_CONCEPTS.forEach(key => { accumulated[key] += hours[key]; });
          automaticHours.set(d, accumulated);
        }
      } catch (error) {
        warnings.add(`Turno Día del ${date}: ${error instanceof Error ? error.message : 'horario inválido'}; extras y recargos pendientes.`);
      }
    });

    const dayConceptHours = Object.fromEntries(['jornada', 'dominicalTrabajado', 'festivoTrabajado', 'descansoRemunerado', 'noTrabajado', 'suspension', 'incapacidad', 'vacaciones', 'permiso'].map(key => [key, 0])) as Record<PayrollDayConcept, number>;
    const dayCounters = () => ({ jornada, dominicalTrabajado, festivoTrabajado, descansoRemunerado, noTrabajado, suspension, incapacidad: incapDays, vacaciones: vacDays, permiso: permDays });
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      if (!employedAt(dateStr)) return;
      const dayOfWeek = getDay(day);
      const dayKind = payrollDayKind(dateStr, restAt(dateStr), holidays);
      const isHoliday = dayKind === 'holiday';
      const isMandatoryRest = dayKind === 'rest';

      const before = dayCounters();
      try {
        // An approved daily novelty replaces the programmed day (including absences).
        const corrections = dailyNovelties.get(dateStr);
        if (corrections?.length) {
          const validCorrections = corrections.map(n => ({ n, fraction: n.quantity_unit === 'days' && n.quantity != null ? Number(n.quantity) : Number(n.hours) / hoursAt(dateStr) }));
          if (validCorrections.some(({ fraction }) => !Number.isFinite(fraction) || fraction <= 0)) {
            warnings.add(`Novedad con cantidad inválida el ${dateStr}; corrija el registro para incluir el día.`);
            return;
          }
          if (validCorrections.reduce((sum, { fraction }) => sum + fraction, 0) > 1 + 1e-9) {
            warnings.add(`Las novedades superan una jornada el ${dateStr}; revise posibles duplicados. El día no se incluye hasta corregirlos.`);
            return;
          }
          let correctedDays = 0;
          corrections.forEach(n => {
            const fraction = n.quantity_unit === 'days' && n.quantity != null ? Number(n.quantity) : Number(n.hours) / hoursAt(dateStr);
            if (!Number.isFinite(fraction) || fraction <= 0) {
              warnings.add(`Novedad con horas inválidas el ${dateStr}.`);
              return;
            }
            correctedDays += fraction;
            switch (n.novelty_type) {
              case 'incapacidad': incapDays += fraction; break;
              case 'vacaciones': vacDays += fraction; break;
              case 'permiso': permDays += fraction; break;
              case 'descanso_remunerado': descansoRemunerado += fraction; break;
              default:
                if (isHoliday) festivoTrabajado += fraction;
                else if (isMandatoryRest) dominicalTrabajado += fraction;
                else jornada += fraction;
            }
          });
          if (correctedDays > 1) warnings.add(`Las novedades superan una jornada el ${dateStr}; revise posibles duplicados.`);
          return;
        }

        // Check absences first
        const incapacity = incapacityDays[emp.id]?.has(dateStr);
        const vacation = vacationDays[emp.id]?.has(dateStr);
        const leave = partialLeaveAt(dateStr);
        if (Number(Boolean(incapacity)) + Number(Boolean(vacation)) + Number(leave > 0) > 1) {
          warnings.add(`Ausencias superpuestas el ${dateStr}; se contabiliza una sola vez (incapacidad, vacaciones, permiso).`);
        }
        if (incapacity) { incapDays += 1; return; }
        if (vacation) { vacDays += 1; return; }
        if (leave > 1) warnings.add(`Los permisos superan una jornada el ${dateStr}.`);
        permDays += Math.min(1, leave);
        const workedFraction = 1 - Math.min(1, leave);
        if (workedFraction === 0) return;

        const assignment = assignmentIndex[`${emp.id}_${dateStr}`];
        if (duplicateAssignments.has(`${emp.id}_${dateStr}`)) {
          warnings.add(`Asignaciones duplicadas el ${dateStr}; revise la programación.`);
          return;
        }
        if (!assignment) {
          const timeConfig = payrollHistoryAt(timeConfigs, dateStr, cycles?.length ? cycleAt(dateStr)[0]?.id ?? null : undefined);
          if (timeConfig?.mode === 'administrative' && timeConfig.work_schedules) {
            // Holidays in an office schedule are paid rest unless work is explicitly recorded.
            if (isHoliday || !timeConfig.work_schedules.days_of_week.includes(dayOfWeek)) descansoRemunerado += workedFraction;
            else if (isMandatoryRest) dominicalTrabajado += workedFraction;
            else jornada += workedFraction;
            shiftLabels.add(timeConfig.work_schedules.name);
          } else if (data.timeConfigs !== undefined) {
            warnings.add(timeConfig?.mode === 'shift'
              ? 'Hay días sin jornada registrada en el período; no se asumen como trabajados ni como descanso.'
              : 'Falta una configuración horaria vigente en parte del período.');
          }
          return;
        }
        if (!assignment.shifts) {
          warnings.add(`Falta la información del turno del ${dateStr}.`);
          return;
        }

        if (overlappingDates.has(dateStr)) return;
        const classification = getShiftClassification(assignment.shifts);
        if (classification === 'rest') {
          descansoRemunerado += workedFraction;
          return;
        }
        if (classification === 'not_worked') {
          noTrabajado += workedFraction;
          return;
        }
        if (classification === 'suspension') {
          suspension += workedFraction;
          return;
        }

        const paidFraction = Math.min(workedFraction, ordinaryFractions.get(dateStr) ?? workedFraction);
        // Worked day, capped at one ordinary Jornada; excess hours are separate.
        if (isHoliday) {
          festivoTrabajado += paidFraction;
        } else if (isMandatoryRest) {
          dominicalTrabajado += paidFraction;
        } else {
          jornada += paidFraction;
        }
      } finally {
        const after = dayCounters();
        (Object.keys(dayConceptHours) as PayrollDayConcept[]).forEach(key => {
          dayConceptHours[key] += (after[key] - before[key]) * hoursAt(dateStr);
        });
      }
    });

    // Approved hourly entries replace the derived concept on that civil date.
    // Distinct manual entries retain their additive behavior. Never pay both sources.
    const explicitHours = new Map<string, HourTotals>();
    const addExplicit = (date: string, concept: string | null, hours: number) => {
      if (!HOUR_CONCEPTS.includes(concept as HourConcept)) return;
      const totals = explicitHours.get(date) || emptyHourTotals();
      totals[concept as HourConcept] += hours;
      explicitHours.set(date, totals);
    };
    let hedo = 0, heno = 0, hedf = 0, henf = 0, rn = 0, rnf = 0;

    (overtimeByEmployee[emp.id] || []).forEach(o => {
      if (!employedAt(o.work_date)) { warnings.add(`Horas fuera de la vinculación el ${o.work_date}.`); return; }
      const specialDay = payrollDayKind(o.work_date, restAt(o.work_date), holidays) !== 'ordinary';
      let mapped = getOvertimeMapping(o.overtime_type);
      if (o.overtime_type === 'extra_diurna') mapped = specialDay ? 'hedf' : 'hedo';
      if (o.overtime_type === 'extra_nocturna') mapped = specialDay ? 'henf' : 'heno';
      if (o.overtime_type === 'recargo_nocturno') mapped = specialDay ? 'rnf' : 'rn';
      if (['dominical_diurna', 'dominical_nocturna', 'festivo_diurna', 'festivo_nocturna'].includes(o.overtime_type)) {
        warnings.add(`Horas pendientes del ${o.work_date}: el registro dominical/festivo no distingue jornada ordinaria de horas extra; no se incluye hasta aclarar el concepto.`);
        return;
      }
      const hrs = Number(o.total_hours);
      if (!Number.isFinite(hrs) || hrs <= 0) { warnings.add(`Horas inválidas el ${o.work_date}; no se incluyen.`); return; }
      addExplicit(o.work_date, mapped, hrs);
    });

    // Manual novelties
    (noveltyByEmployee[emp.id] || []).forEach(n => {
      if (!isDateInRange(n.novelty_date, startDate, endDate)) return;
      if (!employedAt(n.novelty_date)) { warnings.add(`Novedad fuera de la vinculación el ${n.novelty_date}.`); return; }
      const hrs = Number(n.hours);
      if (!['hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf'].includes(n.novelty_type)) return;
      if (!Number.isFinite(hrs) || hrs <= 0) { warnings.add(`Horas inválidas el ${n.novelty_date}; no se incluyen.`); return; }
      addExplicit(n.novelty_date, payrollHourConcept(n.novelty_type, payrollDayKind(n.novelty_date, restAt(n.novelty_date), holidays) !== 'ordinary'), hrs);
    });

    const hourTotals = emptyHourTotals();
    for (const date of new Set([...automaticHours.keys(), ...explicitHours.keys()])) {
      HOUR_CONCEPTS.forEach(key => {
        const automatic = automaticHours.get(date)?.[key] || 0;
        const explicit = explicitHours.get(date)?.[key] || 0;
        if (automatic > 0 && explicit > 0) warnings.add(`Coinciden horas calculadas y registradas de ${key.toUpperCase()} el ${date}; se usa el registro aprobado sin duplicar. Revise la conciliación.`);
        hourTotals[key] += explicit > 0 ? explicit : automatic;
      });
    }
    [hedo, heno, hedf, henf, rn, rnf] = HOUR_CONCEPTS.map(key => Math.round(hourTotals[key] * 1e8) / 1e8);

    const customConcepts: NonNullable<PreLiquidationRow['customConcepts']> = {};
    (noveltyByEmployee[emp.id] || []).filter(n => n.novelty_type === 'custom').forEach(n => {
      if (!isDateInRange(n.novelty_date, startDate, endDate) || !employedAt(n.novelty_date)) return;
      const concept = n.payroll_concepts;
      if (!concept || !n.concept_id || n.quantity == null || !Number.isFinite(Number(n.quantity)) || Number(n.quantity) <= 0) {
        warnings.add('Concepto personalizado sin cantidad o referencia válida.');
        return;
      }
      const accumulated = customConcepts[concept.id]?.quantity || 0;
      customConcepts[concept.id] = { id: concept.id, identifier: concept.identifier, name: concept.name, unit: n.quantity_unit || concept.unit, quantity: accumulated + Number(n.quantity) };
    });

    const totalDias = jornada + dominicalTrabajado + festivoTrabajado + descansoRemunerado + incapDays + vacDays + permDays;

    // Loans deduction
    const empLoans = loansByEmployee[emp.id] || [];
    const loanDetail = empLoans.filter(l => {
      const valid = Number.isFinite(Number(l.installment_amount)) && Number(l.installment_amount) >= 0
        && (l.remaining_balance == null || Number.isFinite(Number(l.remaining_balance)) && Number(l.remaining_balance) >= 0);
      if (!valid) warnings.add(`Cuota o saldo inválido en el préstamo ${l.description || l.loan_type}.`);
      return valid;
    }).map(l => ({
      loanId: l.id,
      description: l.description || l.loan_type,
      installmentAmount: Math.max(0, Math.min(Number(l.installment_amount), l.remaining_balance ?? Infinity)),
    })).filter(loan => loan.installmentAmount > 0);
    const loanDeduction = loanDetail.reduce((s, d) => s + d.installmentAmount, 0);

    // Deductions
    const empDeductions = deductionsByEmployee[emp.id] || [];
    if (empDeductions.some(d => crossingVersions.has(d.id))) warnings.add('El período cruza un cambio de vigencia de descuentos. Calcule los tramos por separado; las versiones que se cruzan no se incluyen en el total.');
    empDeductions.filter(d => d.is_percentage).forEach(d => {
      warnings.add(`Descuento pendiente: ${d.description} (${d.percentage_value || 0}%). Falta definir la base monetaria; no se incluye en el total.`);
    });
    const deductionDetail = empDeductions.filter(d => !d.is_percentage && !crossingVersions.has(d.id)).filter(d => {
      const valid = Number.isFinite(Number(d.amount)) && Number(d.amount) >= 0;
      if (!valid) warnings.add(`Valor inválido en el descuento ${d.description}.`);
      return valid;
    }).map(d => ({
      deductionId: d.id,
      description: d.description,
      amount: Number(d.amount),
    }));
    const deductionTotal = deductionDetail.reduce((s, d) => s + d.amount, 0);

    const totalDeducciones = loanDeduction + deductionTotal;

    if (totalDias > periodDays) warnings.add(`Total días (${totalDias}) supera los días del período (${periodDays})`);
    const hasWarning = warnings.size > 0;
    const warningMessage = hasWarning ? [...warnings].join(' ') : undefined;

    return {
      customConcepts,
      dayConceptHours,
      employeeId: emp.id,
      employeeName: `${emp.first_name} ${emp.last_name}`,
      documentNumber: emp.document_number,
      operationCenterIds: emp.operationCenterIds,
      operationCenterName: emp.operationCenterName,
      restDay: schedules === undefined ? emp.restDay : [...restLabels].join(' / ') || 'Sin asignar',
      shiftName: [...shiftLabels].join(' / ') || emp.shiftName,
      jornada,
      dominicalTrabajado,
      festivoTrabajado,
      descansoRemunerado,
      noTrabajado,
      suspension,
      hedo,
      heno,
      hedf,
      henf,
      rn,
      rnf,
      incapacidad: incapDays,
      vacaciones: vacDays,
      permiso: permDays,
      totalDias,
      loanDeduction,
      loanDetail,
      deductionTotal,
      deductionDetail,
      totalDeducciones,
      hasWarning,
      warningMessage,
    };
  });
}
