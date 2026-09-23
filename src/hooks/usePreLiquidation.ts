import { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, getDay, subDays } from 'date-fns';
import type { PreLiquidationRow, PreLiquidationFilters, PayrollLaborConfig } from '@/types/payroll';
import type { EmployeeShiftAssignment } from '@/types/schedule';
import { getPayrollRestDay } from '@/lib/payrollRestDay';
import { crossingDeductionVersions } from '@/lib/deductionVersions';

export interface PreLiquidationData {
  assignments: EmployeeShiftAssignment[];
  holidays: Set<string>;
  novelties: Array<{
    employee_id: string;
    novelty_date: string;
    novelty_type: string;
    hours: number;
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

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
  const periodDays = days.length;
  const dailyHours = config && Number.isFinite(config.daily_hours) && config.daily_hours > 0 ? config.daily_hours : 8;

  // Index assignments by employee+date
  const assignmentIndex: Record<string, EmployeeShiftAssignment> = {};
  assignments.forEach(a => {
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
      if (isDateInRange(ds, startDate, endDate)) {
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
      if (isDateInRange(ds, startDate, endDate)) {
        vacationDays[vac.employee_id].add(ds);
      }
    });
  });

  const leaveDays: Record<string, Map<string, number>> = {};
  leaves.filter(l => l.status === 'aprobado' || l.status === 'aprobada').forEach(lv => {
    if (!leaveDays[lv.employee_id]) leaveDays[lv.employee_id] = new Map();
    const lvDays = eachDayOfInterval({
      start: parseISO(lv.start_date),
      end: parseISO(lv.end_date)
    });
    lvDays.forEach(d => {
      const ds = format(d, 'yyyy-MM-dd');
      if (isDateInRange(ds, startDate, endDate)) {
        const fraction = lv.duration_type === 'medio_dia' ? 0.5
          : lv.duration_type === 'horas' ? Math.max(0, Number(lv.total_hours || 0)) / dailyHours : 1;
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
  novelties.filter(n => n.status === 'aprobada' && isDateInRange(n.novelty_date, startDate, endDate)).forEach(n => {
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
    const restWeekday = getPayrollRestDay(emp.restDay);
    if (restWeekday === null) warnings.add('El descanso asignado no identifica un día semanal; revise las fechas de descanso obligatorio.');
    let jornada = 0;
    let dominicalTrabajado = 0;
    let festivoTrabajado = 0;
    let descansoRemunerado = 0;
    let incapDays = 0, vacDays = 0, permDays = 0;
    const dailyNoveltyTypes = new Set(['jornada', 'dominical_trabajado', 'festivo_trabajado', 'descanso_remunerado', 'incapacidad', 'vacaciones', 'permiso']);
    const dailyNovelties = new Map<string, PreLiquidationData['novelties']>();
    (noveltyByEmployee[emp.id] || []).filter(n => dailyNoveltyTypes.has(n.novelty_type)).forEach(n => {
      dailyNovelties.set(n.novelty_date, [...(dailyNovelties.get(n.novelty_date) || []), n]);
    });

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayOfWeek = getDay(day);
      const isHoliday = holidays.has(dateStr);
      const isMandatoryRest = dayOfWeek === restWeekday;

      // An approved daily novelty replaces the programmed day (including absences).
      const corrections = dailyNovelties.get(dateStr);
      if (corrections?.length) {
        let correctedDays = 0;
        corrections.forEach(n => {
          const fraction = Number(n.hours) / dailyHours;
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
      const leave = leaveDays[emp.id]?.get(dateStr) || 0;
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
      if (!assignment) return;
      if (!assignment.shifts) {
        warnings.add(`Falta la información del turno del ${dateStr}.`);
        return;
      }

      const isRestDay = assignment.shifts?.is_rest_day ?? false;

      if (isRestDay) {
        descansoRemunerado += workedFraction;
        return;
      }

      // Worked day
      if (isHoliday) {
        festivoTrabajado += workedFraction;
      } else if (isMandatoryRest) {
        dominicalTrabajado += workedFraction;
      } else {
        jornada += workedFraction;
      }
    });

    // Overtime from overtime_records
    let hedo = 0, heno = 0, hedf = 0, henf = 0, rn = 0, rnf = 0;

    (overtimeByEmployee[emp.id] || []).forEach(o => {
      const specialDay = holidays.has(o.work_date) || getDay(parseISO(o.work_date)) === restWeekday;
      let mapped = getOvertimeMapping(o.overtime_type);
      if (o.overtime_type === 'extra_diurna') mapped = specialDay ? 'hedf' : 'hedo';
      if (o.overtime_type === 'extra_nocturna') mapped = specialDay ? 'henf' : 'heno';
      if (o.overtime_type === 'recargo_nocturno') mapped = specialDay ? 'rnf' : 'rn';
      if (['dominical_diurna', 'dominical_nocturna', 'festivo_diurna', 'festivo_nocturna'].includes(o.overtime_type)) {
        warnings.add(`Horas pendientes del ${o.work_date}: el registro dominical/festivo no distingue jornada ordinaria de horas extra; no se incluye hasta aclarar el concepto.`);
        return;
      }
      const hrs = Number(o.total_hours);
      if (mapped === 'hedo') hedo += hrs;
      else if (mapped === 'heno') heno += hrs;
      else if (mapped === 'hedf') hedf += hrs;
      else if (mapped === 'henf') henf += hrs;
      else if (mapped === 'rn') rn += hrs;
      else if (mapped === 'rnf') rnf += hrs;
    });

    // Manual novelties
    (noveltyByEmployee[emp.id] || []).forEach(n => {
      const hrs = Number(n.hours);
      switch (n.novelty_type) {
        case 'hedo': hedo += hrs; break;
        case 'heno': heno += hrs; break;
        case 'hedf': hedf += hrs; break;
        case 'henf': henf += hrs; break;
        case 'rn': rn += hrs; break;
        case 'rnf': rnf += hrs; break;
      }
    });

    const totalDias = jornada + dominicalTrabajado + festivoTrabajado + descansoRemunerado + incapDays + vacDays + permDays;

    // Loans deduction
    const empLoans = loansByEmployee[emp.id] || [];
    const loanDetail = empLoans.map(l => ({
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
    const deductionDetail = empDeductions.filter(d => !d.is_percentage && !crossingVersions.has(d.id)).map(d => ({
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
      employeeId: emp.id,
      employeeName: `${emp.first_name} ${emp.last_name}`,
      documentNumber: emp.document_number,
      operationCenterIds: emp.operationCenterIds,
      operationCenterName: emp.operationCenterName,
      restDay: emp.restDay,
      shiftName: emp.shiftName,
      jornada,
      dominicalTrabajado,
      festivoTrabajado,
      descansoRemunerado,
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
