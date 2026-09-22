import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { calculatePreLiquidation, usePreLiquidation, type PreLiquidationData } from './usePreLiquidation';
import type { EmployeeShiftAssignment, Shift } from '@/types/schedule';
import { getPayrollRestDay } from '@/lib/payrollRestDay';

const employee = {
  id: 'employee-1', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST-1',
  operationCenterIds: ['center-1'], operationCenterName: 'Centro de prueba', restDay: 'Martes', shiftName: 'Diurno',
};
export function assignment(date: string, rest = false): EmployeeShiftAssignment {
  return {
    id: date, employee_id: employee.id, shift_id: 'shift-1', assignment_date: date,
    source: 'manual', created_at: '', updated_at: '',
    shifts: { id: 'shift-1', is_rest_day: rest } as Shift,
  };
}
function fixture(overrides: Partial<PreLiquidationData> = {}): PreLiquidationData {
  return {
    employees: [{ ...employee }], assignments: [], holidays: new Set(), novelties: [], overtimeRecords: [],
    incapacities: [], vacations: [], leaves: [], loans: [], deductions: [], config: null,
    filters: { startDate: '2026-09-21', endDate: '2026-09-27' }, ...overrides,
  };
}
const novelty = (type: string, date = '2026-09-22', hours = 8, status = 'aprobada') => ({
  employee_id: employee.id, novelty_date: date, novelty_type: type, hours, status,
});
const absence = { employee_id: employee.id, start_date: '2026-09-23', end_date: '2026-09-23', status: 'aprobado' };
const calculate = (overrides: Partial<PreLiquidationData> = {}) => calculatePreLiquidation(fixture(overrides))[0];

describe('usePreLiquidation', () => {
  it('includes the employee operation center, rest day, and shift in the result row', () => {
    const { result } = renderHook(() => usePreLiquidation(fixture()));
    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      operationCenterIds: ['center-1'], operationCenterName: 'Centro de prueba', restDay: 'Martes', shiftName: 'Diurno',
    });
  });
});

describe('descanso obligatorio', () => {
  it.each(['martes', 'Martes', ' MARTES '])('clasifica el martes asignado (%s), y el domingo es ordinario', restDay => {
    const row = calculate({ employees: [{ ...employee, restDay }], assignments: [assignment('2026-09-22'), assignment('2026-09-27')] });
    expect(row).toMatchObject({ dominicalTrabajado: 1, jornada: 1, totalDias: 2, hasWarning: false });
  });
  it.each([['domingo', 0], ['Lunes', 1], ['martes', 2], ['Miércoles', 3], ['miercoles', 3], ['jueves', 4], ['Viernes', 5], ['Sábado', 6], ['sabado', 6]])('normaliza %s', (value, expected) => {
    expect(getPayrollRestDay(value)).toBe(expected);
  });
  it.each(['', 'Sin asignar'])('usa domingo si falta asignación: %s', restDay => {
    expect(calculate({ employees: [{ ...employee, restDay }], assignments: [assignment('2026-09-27')] }).dominicalTrabajado).toBe(1);
  });
  it.each(['2_dias', '4_dias', '7_dias', 'no válido'])('advierte cuando %s no identifica una fecha semanal', restDay => {
    const row = calculate({ employees: [{ ...employee, restDay }], assignments: [assignment('2026-09-27')] });
    expect(row.dominicalTrabajado).toBe(0);
    expect(row.warningMessage).toContain('no identifica un día semanal');
  });
  it('no duplica el descanso obligatorio que coincide con festivo', () => {
    expect(calculate({ assignments: [assignment('2026-09-22')], holidays: new Set(['2026-09-22']) }))
      .toMatchObject({ festivoTrabajado: 1, dominicalTrabajado: 0, totalDias: 1 });
  });
  it('un turno de descanso no es trabajo dominical', () => {
    expect(calculate({ assignments: [assignment('2026-09-22', true)] }))
      .toMatchObject({ descansoRemunerado: 1, dominicalTrabajado: 0, totalDias: 1 });
  });
  it('concilia una semana completa: 4 ordinarios + 1 descanso trabajado + 1 festivo + 1 descanso', () => {
    const assignments = Array.from({ length: 7 }, (_, index) => assignment(`2026-09-${21 + index}`, index === 3));
    expect(calculate({ assignments, holidays: new Set(['2026-09-25']) }))
      .toMatchObject({ jornada: 4, dominicalTrabajado: 1, festivoTrabajado: 1, descansoRemunerado: 1, totalDias: 7, hasWarning: false });
  });
});

describe('novedades y ausencias', () => {
  it('la novedad aprobada sustituye el turno sin duplicar el día', () => {
    expect(calculate({ assignments: [assignment('2026-09-22')], novelties: [novelty('dominical_trabajado')] }))
      .toMatchObject({ dominicalTrabajado: 1, totalDias: 1, hasWarning: false });
  });
  it('una jornada manual en el descanso se clasifica como dominical', () => {
    expect(calculate({ novelties: [novelty('jornada')] }).dominicalTrabajado).toBe(1);
  });
  it('un dominical manual en domingo es ordinario si el descanso es martes', () => {
    expect(calculate({ novelties: [novelty('dominical_trabajado', '2026-09-27')] }))
      .toMatchObject({ jornada: 1, dominicalTrabajado: 0 });
  });
  it('permite sustituir un día trabajado por descanso y registra novedades sin turno', () => {
    expect(calculate({ assignments: [assignment('2026-09-22')], novelties: [novelty('descanso_remunerado'), novelty('jornada', '2026-09-23')] }))
      .toMatchObject({ descansoRemunerado: 1, jornada: 1, dominicalTrabajado: 0, totalDias: 2 });
  });
  it('ignora pendientes, rechazadas y novedades fuera del período', () => {
    expect(calculate({ novelties: [novelty('jornada', '2026-09-22', 8, 'pendiente'), novelty('hedo', '2026-09-22', 2, 'rechazada'), novelty('hedo', '2026-09-20', 2)] }))
      .toMatchObject({ totalDias: 0, hedo: 0 });
  });
  it('advierte duplicados por fecha aunque el total no exceda el período', () => {
    const row = calculate({ novelties: [novelty('jornada'), novelty('jornada')] });
    expect(row.totalDias).toBe(2);
    expect(row.warningMessage).toContain('posibles duplicados');
  });
  it('no suma dos veces ausencias superpuestas', () => {
    expect(calculate({ assignments: [assignment('2026-09-23')], incapacities: [absence, absence], vacations: [absence], leaves: [absence] }))
      .toMatchObject({ incapacidad: 1, vacaciones: 0, permiso: 0, jornada: 0, totalDias: 1, hasWarning: true });
  });
  it.each([['medio_dia', undefined, 0.5], ['horas', 2, 0.25]])('respeta permiso parcial %s', (duration_type, total_hours, fraction) => {
    expect(calculate({ assignments: [assignment('2026-09-23')], leaves: [{ ...absence, duration_type, total_hours }] }))
      .toMatchObject({ permiso: fraction, jornada: 1 - fraction, totalDias: 1 });
  });
  it.each(['aprobado', 'en_curso', 'completado'])('incluye vacaciones %s y las recorta al período', status => {
    expect(calculate({ vacations: [{ ...absence, status, start_date: '2026-09-19', end_date: '2026-09-22' }] }).vacaciones).toBe(2);
  });
  it.each(['compensacion', 'acumulacion'])('no trata %s como ausencia', request_type => {
    expect(calculate({ vacations: [{ ...absence, request_type }] }).vacaciones).toBe(0);
  });
  it('cuenta solo el disfrute antes de la interrupción y después de reanudar', () => {
    expect(calculate({ vacations: [{ ...absence, status: 'interrumpido', start_date: '2026-09-21', end_date: '2026-09-27', interruption_date: '2026-09-23', resume_start_date: '2026-09-26', resume_end_date: '2026-09-29' }] }).vacaciones).toBe(4);
  });
  it('novedades de ausencia reemplazan ausencias de otros módulos', () => {
    expect(calculate({ incapacities: [absence], novelties: [novelty('permiso', '2026-09-23')] }))
      .toMatchObject({ incapacidad: 0, permiso: 1, totalDias: 1 });
  });
});

describe('horas y deducciones', () => {
  it('clasifica extras y recargo nocturno según descanso y festivos', () => {
    const overtimeRecords = [
      ['2026-09-22', 'extra_diurna', 2], ['2026-09-22', 'extra_nocturna', 1],
      ['2026-09-22', 'recargo_nocturno', 3], ['2026-09-27', 'extra_diurna', 4],
      ['2026-09-25', 'extra_nocturna', 2], ['2026-09-23', 'recargo_nocturno', 5],
    ].map(([work_date, overtime_type, total_hours]) => ({ employee_id: employee.id, work_date: String(work_date), overtime_type: String(overtime_type), total_hours: Number(total_hours), status: 'aprobado' }));
    expect(calculate({ overtimeRecords, holidays: new Set(['2026-09-25']) }))
      .toMatchObject({ hedo: 4, heno: 0, hedf: 2, henf: 3, rnf: 3, rn: 5, totalDias: 0 });
  });
  it('excluye extras pendientes y fuera del período, conserva pagadas', () => {
    const overtimeRecords = ['aprobado', 'pagado', 'pendiente', 'rechazado'].map(status => ({ employee_id: employee.id, work_date: '2026-09-23', overtime_type: 'extra_diurna', total_hours: 2, status }));
    overtimeRecords.push({ ...overtimeRecords[0], work_date: '2026-09-20' });
    expect(calculate({ overtimeRecords }).hedo).toBe(4);
  });
  it('no inventa horas extra a partir de un recargo dominical ambiguo', () => {
    const row = calculate({ overtimeRecords: [{ employee_id: employee.id, work_date: '2026-09-22', overtime_type: 'dominical_diurna', total_hours: 8, status: 'aprobado' }] });
    expect(row.hedf).toBe(0);
    expect(row.warningMessage).toContain('no se incluye hasta aclarar el concepto');
  });
  it('no interpreta porcentajes como pesos y respeta vigencia', () => {
    const base = { id: 'd1', employee_id: employee.id, deduction_type: 'otro', description: 'Descuento', amount: 10000, is_percentage: false, percentage_value: null, status: 'activo' };
    const row = calculate({ deductions: [base, { ...base, id: 'd2', is_percentage: true, percentage_value: 10 }, { ...base, id: 'd3', start_date: '2026-10-01' }, { ...base, id: 'd4', end_date: '2026-09-20' }] });
    expect(row.deductionTotal).toBe(10000);
    expect(row.warningMessage).toContain('Falta definir la base monetaria');
  });
  it('limita la última cuota al saldo y excluye préstamos futuros', () => {
    const base = { id: 'loan1', employee_id: employee.id, loan_type: 'personal', description: null, installment_amount: 100000, remaining_balance: 25000, status: 'activo' };
    expect(calculate({ loans: [base, { ...base, id: 'future', start_date: '2026-10-01' }] }).loanDeduction).toBe(25000);
  });
  it('no calcula períodos invertidos o vacíos', () => {
    expect(calculatePreLiquidation(fixture({ filters: { startDate: '2026-09-27', endDate: '2026-09-21' } }))).toEqual([]);
    expect(calculatePreLiquidation(null)).toEqual([]);
  });
  it('no mezcla empleados', () => {
    expect(calculatePreLiquidation(fixture({ employees: [employee, { ...employee, id: 'employee-2' }], assignments: [assignment('2026-09-22')] })).map(row => row.totalDias)).toEqual([1, 0]);
  });
});
