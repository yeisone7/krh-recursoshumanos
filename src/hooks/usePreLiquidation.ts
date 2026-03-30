import { useMemo } from 'react';
import { format, eachDayOfInterval, parseISO, getDay } from 'date-fns';
import type { PreLiquidationRow, PreLiquidationFilters, PayrollLaborConfig } from '@/types/payroll';
import type { EmployeeShiftAssignment } from '@/types/schedule';

interface PreLiquidationData {
  assignments: EmployeeShiftAssignment[];
  holidays: Set<string>;
  novelties: Array<{
    employee_id: string;
    novelty_date: string;
    novelty_type: string;
    hours: number;
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
  }>;
  leaves: Array<{
    employee_id: string;
    start_date: string;
    end_date: string;
    status: string;
  }>;
  loans: Array<{
    id: string;
    employee_id: string;
    loan_type: string;
    description: string | null;
    installment_amount: number;
    status: string;
  }>;
  deductions: Array<{
    id: string;
    employee_id: string;
    deduction_type: string;
    description: string;
    amount: number;
    is_percentage: boolean;
    percentage_value: number | null;
    status: string;
  }>;
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
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
  return useMemo(() => {
    if (!data) return [];

    const { assignments, holidays, novelties, overtimeRecords, incapacities, vacations, leaves, loans, deductions, employees, config, filters } = data;
    const { startDate, endDate } = filters;

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const periodDays = days.length;
    const dailyHours = config?.daily_hours || 8;

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
    vacations.filter(v => v.status === 'aprobada' || v.status === 'aprobado').forEach(vac => {
      if (!vacationDays[vac.employee_id]) vacationDays[vac.employee_id] = new Set();
      const vacDays = eachDayOfInterval({ 
        start: parseISO(vac.start_date), 
        end: parseISO(vac.end_date) 
      });
      vacDays.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        if (isDateInRange(ds, startDate, endDate)) {
          vacationDays[vac.employee_id].add(ds);
        }
      });
    });

    const leaveDays: Record<string, Set<string>> = {};
    leaves.filter(l => l.status === 'aprobado' || l.status === 'aprobada').forEach(lv => {
      if (!leaveDays[lv.employee_id]) leaveDays[lv.employee_id] = new Set();
      const lvDays = eachDayOfInterval({ 
        start: parseISO(lv.start_date), 
        end: parseISO(lv.end_date) 
      });
      lvDays.forEach(d => {
        const ds = format(d, 'yyyy-MM-dd');
        if (isDateInRange(ds, startDate, endDate)) {
          leaveDays[lv.employee_id].add(ds);
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

    // Index manual novelties by employee
    const noveltyByEmployee: Record<string, Array<typeof novelties[0]>> = {};
    novelties.forEach(n => {
      if (!noveltyByEmployee[n.employee_id]) noveltyByEmployee[n.employee_id] = [];
      noveltyByEmployee[n.employee_id].push(n);
    });

    // Index active loans by employee
    const loansByEmployee: Record<string, typeof loans> = {};
    loans.filter(l => l.status === 'activo').forEach(l => {
      if (!loansByEmployee[l.employee_id]) loansByEmployee[l.employee_id] = [];
      loansByEmployee[l.employee_id].push(l);
    });

    // Index active deductions by employee
    const deductionsByEmployee: Record<string, typeof deductions> = {};
    deductions.filter(d => d.status === 'activo').forEach(d => {
      if (!deductionsByEmployee[d.employee_id]) deductionsByEmployee[d.employee_id] = [];
      deductionsByEmployee[d.employee_id].push(d);
    });

    return employees.map(emp => {
      let jornada = 0;
      let dominicalTrabajado = 0;
      let festivoTrabajado = 0;
      let descansoRemunerado = 0;

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = getDay(day);
        const isHoliday = holidays.has(dateStr);
        const isSunday = dayOfWeek === 0;

        // Check absences first
        if (incapacityDays[emp.id]?.has(dateStr)) return;
        if (vacationDays[emp.id]?.has(dateStr)) return;
        if (leaveDays[emp.id]?.has(dateStr)) return;

        const assignment = assignmentIndex[`${emp.id}_${dateStr}`];
        if (!assignment) return;

        const isRestDay = assignment.shifts?.is_rest_day ?? false;

        if (isRestDay) {
          descansoRemunerado += 1;
          return;
        }

        // Worked day
        if (isHoliday) {
          festivoTrabajado += 1;
        } else if (isSunday) {
          dominicalTrabajado += 1;
        } else {
          jornada += 1;
        }
      });

      // Overtime from overtime_records
      let hedo = 0, heno = 0, hedf = 0, henf = 0, rn = 0, rnf = 0;
      
      (overtimeByEmployee[emp.id] || []).forEach(o => {
        const mapped = getOvertimeMapping(o.overtime_type);
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
          case 'dominical_trabajado': dominicalTrabajado += hrs / dailyHours; break;
          case 'festivo_trabajado': festivoTrabajado += hrs / dailyHours; break;
          case 'descanso_remunerado': descansoRemunerado += hrs / dailyHours; break;
        }
      });

      const incapDays = incapacityDays[emp.id]?.size || 0;
      const vacDays = vacationDays[emp.id]?.size || 0;
      const permDays = leaveDays[emp.id]?.size || 0;

      const totalDias = jornada + dominicalTrabajado + festivoTrabajado + descansoRemunerado + incapDays + vacDays + permDays;

      // Loans deduction
      const empLoans = loansByEmployee[emp.id] || [];
      const loanDetail = empLoans.map(l => ({
        loanId: l.id,
        description: l.description || l.loan_type,
        installmentAmount: Number(l.installment_amount),
      }));
      const loanDeduction = loanDetail.reduce((s, d) => s + d.installmentAmount, 0);

      // Deductions
      const empDeductions = deductionsByEmployee[emp.id] || [];
      const deductionDetail = empDeductions.map(d => ({
        deductionId: d.id,
        description: d.description,
        amount: d.is_percentage ? Number(d.percentage_value || 0) : Number(d.amount),
      }));
      const deductionTotal = deductionDetail.reduce((s, d) => s + d.amount, 0);

      const totalDeducciones = loanDeduction + deductionTotal;

      const hasWarning = totalDias > periodDays;
      const warningMessage = hasWarning
        ? `Total días (${totalDias}) supera los días del período (${periodDays})`
        : undefined;

      return {
        employeeId: emp.id,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        documentNumber: emp.document_number,
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
  }, [data]);
}
