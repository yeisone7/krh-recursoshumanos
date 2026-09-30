import { describe, expect, it } from 'vitest';
import {
  buildPayrollQueryRows,
  EMPTY_QUERY_FILTERS,
  filterPayrollQueryRows,
  pivotPayrollQuery,
  queryMetric,
  resolveQueryHistory,
  summarizePayrollQuery,
  type PayrollQuerySources,
} from './payrollDynamicQuery';
import {
  payrollQueryFixture,
  payrollQueryOptions,
} from '@/test/payrollQueryFixtures';
import { calculatePreLiquidation } from '@/hooks/usePreLiquidation';
import type { PreLiquidationData } from '@/hooks/usePreLiquidation';

function novelty(
  type: string,
  hours: number,
  status = 'aprobada',
  date = '2026-09-14',
) {
  return {
    id: `${type}-${hours}-${status}`,
    company_id: 'company-1',
    employee_id: 'emp-1',
    employment_cycle_id: 'cycle-1',
    novelty_type: type,
    hours,
    status,
    novelty_date: date,
    source: 'manual',
  } as PayrollQuerySources['novelties'][number];
}
describe('Histórico de consulta nómina', () => {
  it('resuelve intervalos inclusivos, desempate estable y ciclo estricto', () => {
    const history = [
      {
        id: 'b',
        employment_cycle_id: 'cycle-1',
        valid_from: '2026-09-01',
        valid_to: '2026-09-15',
      },
      {
        id: 'a',
        employment_cycle_id: 'cycle-1',
        valid_from: '2026-09-01',
        valid_to: '2026-09-15',
      },
      {
        id: 'c',
        employment_cycle_id: 'cycle-2',
        valid_from: '2026-09-01',
        valid_to: null,
      },
    ];
    expect(resolveQueryHistory(history, 'cycle-1', '2026-09-15')?.id).toBe('a');
    expect(
      resolveQueryHistory(history, 'cycle-1', '2026-09-16'),
    ).toBeUndefined();
    expect(resolveQueryHistory(history, null, '2026-09-14')).toBeUndefined();
  });
  it('usa centro y cargo históricos, sin reutilizar datos actuales en fechas anteriores', () => {
    const sources = payrollQueryFixture();
    sources.workInfos[0].valid_to = '2026-09-14';
    sources.workInfos.push({
      ...sources.workInfos[0],
      id: 'work-2',
      valid_from: '2026-09-15',
      valid_to: null,
      operation_center_id: 'center-2',
      position_name: 'Supervisor',
    });
    const rows = buildPayrollQueryRows(sources, payrollQueryOptions);
    expect(rows.map((row) => row.values.center)).toEqual([
      'Bogotá',
      'Medellín',
      'Medellín',
    ]);
    expect(rows[1].values.position).toBe('Supervisor');
    sources.workInfos[0].valid_from = '2026-09-15';
    const incomplete = buildPayrollQueryRows(sources, {
      ...payrollQueryOptions,
      allowUnresolvedCenter: true,
    })[0];
    expect(incomplete.values.position).toBe('');
    expect(incomplete.values.historyStatus).toBe('Histórico incompleto');
  });
  it('incluye retirados solo hasta el fin de su vinculación y separa reingresos', () => {
    const sources = payrollQueryFixture();
    sources.employees[0].status = 'retired';
    sources.employees[0].is_active = false;
    sources.cycles[0].end_date = '2026-09-14';
    sources.cycles.push({
      ...sources.cycles[0],
      id: 'cycle-2',
      cycle_number: 2,
      start_date: '2026-09-16',
      end_date: null,
    });
    const rows = buildPayrollQueryRows(sources, {
      ...payrollQueryOptions,
      allowUnresolvedCenter: true,
    });
    expect(rows.map((row) => row.values.date)).toEqual([
      '2026-09-14',
      '2026-09-16',
    ]);
    expect(rows[1].values.cycleId).toBe('cycle-2');
    expect(rows[1].values.salary).toBe('');
    expect(rows[1].values.shift).toBe('');
    expect(rows[0].values.currentStatus).toBe('Retirado');
  });
  it('respeta prórrogas y terminación de contratos', () => {
    const sources = payrollQueryFixture();
    sources.contracts[0].end_date = '2026-09-10';
    sources.contracts[0].contract_extensions = [
      { extension_number: 1, end_date: '2026-09-30' },
    ];
    expect(
      buildPayrollQueryRows(sources, payrollQueryOptions)[0].values.salary,
    ).toBe(2000000);
    sources.contracts[0].termination_date = '2026-09-14';
    expect(
      buildPayrollQueryRows(sources, payrollQueryOptions)[1].values.salary,
    ).toBe('');
  });
  it('excluye empresas y centros no autorizados, también con registros de otro centro', () => {
    const sources = payrollQueryFixture();
    expect(
      buildPayrollQueryRows(sources, {
        ...payrollQueryOptions,
        authorizedCenterIds: ['center-2'],
      }),
    ).toEqual([]);
    expect(
      buildPayrollQueryRows(sources, {
        ...payrollQueryOptions,
        companyId: 'other-company',
      }),
    ).toEqual([]);
    sources.assignments[0].operation_center_id = 'center-2';
    sources.novelties = [
      { ...novelty('hedo', 10), operation_center_id: 'center-1' },
    ];
    const rows = buildPayrollQueryRows(sources, {
      ...payrollQueryOptions,
      authorizedCenterIds: ['center-2'],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].values.position).toBe('');
    expect(rows[0].values.hedo).toBe(0);
  });
});

describe('Detalle diario de jornadas y novedades', () => {
  it('incluye días sin programación y calcula turnos que cruzan medianoche', () => {
    const sources = payrollQueryFixture();
    sources.assignments = [sources.assignments[0]];
    Object.assign(sources.assignments[0].shifts!, {
      start_time: '22:00',
      end_time: '06:00',
      crosses_midnight: true,
      break_minutes: 30,
    });
    const rows = buildPayrollQueryRows(sources, payrollQueryOptions);
    expect(rows[0].values.programmedHours).toBe(7.5);
    expect(rows[0].values.crossesMidnight).toBe('Sí');
    expect(rows[1].values.programStatus).toBe('Sin programación');
    expect(rows[1].values.jornada).toBe(0);
  });
  it('deriva jornadas administrativas y descansos desde días de semana', () => {
    const sources = payrollQueryFixture();
    sources.assignments = [];
    Object.assign(sources.timeConfigs[0], {
      mode: 'administrative',
      work_schedules: {
        name: 'Oficina',
        start_time: '08:00',
        end_time: '17:00',
        break_minutes: 60,
        days_of_week: [1, 2, 3, 4, 5],
      },
    });
    const rows = buildPayrollQueryRows(sources, {
      ...payrollQueryOptions,
      startDate: '2026-09-13',
      endDate: '2026-09-14',
    });
    expect(rows[0].values.descansoRemunerado).toBe(1);
    expect(rows[1].values.programmedHours).toBe(8);
    expect(rows[1].values.source).toBe('Horario administrativo');
  });
  it.each([
    ['is_rest_day', 'descansoRemunerado'],
    ['is_not_worked_day', 'noTrabajado'],
    ['is_suspension_day', 'suspension'],
  ])('clasifica %s sin atribuir horas trabajadas', (flag, metric) => {
    const sources = payrollQueryFixture();
    Object.assign(sources.assignments[0].shifts!, { [flag]: true });
    const row = buildPayrollQueryRows(sources, payrollQueryOptions)[0];
    expect(row.values[metric]).toBe(1);
    expect(row.values.jornada).toBe(0);
    expect(row.values.programmedHours).toBe(0);
  });
  it('una corrección aprobada reemplaza la jornada; pendientes y rechazadas permanecen separadas', () => {
    const sources = payrollQueryFixture();
    sources.novelties = [
      novelty('incapacidad', 4),
      novelty('hedo', 3, 'pendiente'),
      novelty('heno', 2, 'rechazada'),
    ];
    const row = buildPayrollQueryRows(sources, payrollQueryOptions)[0];
    expect(row.values.jornada).toBe(0);
    expect(row.values.incapacidad).toBe(0.5);
    expect(row.values.pending_hedo).toBe(3);
    expect(row.values.hedo).toBe(0);
    expect(row.values.rejected_heno).toBe(2);
    expect(row.values.heno).toBe(0);
    expect(row.values.pendingEvents).toBe(1);
  });
  it('resuelve ausencias superpuestas y permisos parciales sin duplicar días', () => {
    const sources = payrollQueryFixture();
    sources.incapacities = [
      {
        id: 'inc-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        start_date: '2026-09-14',
        end_date: '2026-09-14',
      } as PayrollQuerySources['incapacities'][number],
    ];
    sources.leaves = [
      {
        id: 'leave-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        start_date: '2026-09-14',
        end_date: '2026-09-15',
        status: 'aprobado',
        duration_type: 'medio_dia',
      } as PayrollQuerySources['leaves'][number],
    ];
    const rows = buildPayrollQueryRows(sources, payrollQueryOptions);
    expect(rows[0].values.incapacidad).toBe(1);
    expect(rows[0].values.permiso).toBe(0);
    expect(rows[0].values.warnings).toContain('Ausencias superpuestas');
    expect(rows[1].values.permiso).toBe(0.5);
    expect(rows[1].values.jornada).toBe(0.5);
  });
  it('respeta interrupción y reanudación de vacaciones', () => {
    const sources = payrollQueryFixture();
    sources.vacations = [
      {
        id: 'vac-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        start_date: '2026-09-10',
        end_date: '2026-09-20',
        interruption_date: '2026-09-15',
        resume_start_date: '2026-09-16',
        resume_end_date: '2026-09-18',
        status: 'interrumpido',
        request_type: 'disfrute',
      } as PayrollQuerySources['vacations'][number],
    ];
    expect(
      buildPayrollQueryRows(sources, payrollQueryOptions).map(
        (row) => row.values.vacaciones,
      ),
    ).toEqual([1, 0, 1]);
  });
  it('clasifica festivos, extras y recargos según descanso semanal; alerta conceptos ambiguos', () => {
    const sources = payrollQueryFixture();
    sources.holidays = [
      {
        company_id: 'company-1',
        holiday_date: '2026-09-14',
        is_active: true,
        name: 'Festivo prueba',
      } as PayrollQuerySources['holidays'][number],
    ];
    sources.overtime = [
      'extra_diurna',
      'recargo_nocturno',
      'festivo_diurna',
    ].map(
      (type, index) =>
        ({
          id: `extra-${index}`,
          company_id: 'company-1',
          employee_id: 'emp-1',
          overtime_type: type,
          status: 'aprobado',
          total_hours: 2,
          work_date: '2026-09-14',
        }) as PayrollQuerySources['overtime'][number],
    );
    const row = buildPayrollQueryRows(sources, payrollQueryOptions)[0];
    expect(row.values.festivoTrabajado).toBe(1);
    expect(row.values.hedf).toBe(2);
    expect(row.values.rnf).toBe(2);
    expect(row.values.warnings).toContain('ambiguo');
  });
  it('alerta duplicados y cantidades inválidas', () => {
    const sources = payrollQueryFixture();
    sources.assignments.push({ ...sources.assignments[0], id: 'duplicate' });
    sources.novelties = [novelty('jornada', 16), novelty('hedo', NaN)];
    const row = buildPayrollQueryRows(sources, payrollQueryOptions)[0];
    expect(row.values.warnings).toContain('Asignaciones duplicadas');
    expect(row.values.warnings).toContain('superan una jornada');
    expect(row.values.warnings).toContain('horas inválidas');
    expect(row.values.hedo).toBe(0);
  });
  it('concilia conceptos equivalentes con Pre-Liquidación', () => {
    const sources = payrollQueryFixture();
    sources.novelties = [novelty('permiso', 4), novelty('rn', 3)];
    const rows = buildPayrollQueryRows(sources, payrollQueryOptions);
    const preliq = calculatePreLiquidation({
      assignments: sources.assignments,
      holidays: new Set(),
      novelties: sources.novelties,
      overtimeRecords: [],
      incapacities: [],
      vacations: [],
      leaves: [],
      loans: [],
      deductions: [],
      employees: [
        {
          id: 'emp-1',
          first_name: 'María',
          last_name: 'Muñoz',
          document_number: '001234',
          operationCenterIds: ['center-1'],
          operationCenterName: 'Bogotá',
          restDay: 'domingo',
          shiftName: 'Diurno',
        },
      ],
      config: sources.config,
      filters: {
        startDate: payrollQueryOptions.startDate,
        endDate: payrollQueryOptions.endDate,
      },
    } as unknown as PreLiquidationData)[0];
    for (const metric of [
      'jornada',
      'permiso',
      'rn',
      'descansoRemunerado',
      'incapacidad',
      'hedo',
    ])
      expect(queryMetric(rows, metric)).toBe(preliq[metric]);
  });
});

describe('Filtros, resumen y pivote', () => {
  it('filtra por concepto y aprobación del mismo registro preservando los demás conceptos del día', () => {
    const sources = payrollQueryFixture();
    sources.novelties = [novelty('hedo', 3, 'pendiente'), novelty('rn', 2)];
    const rows = buildPayrollQueryRows(sources, payrollQueryOptions);
    const filtered = filterPayrollQueryRows(rows, {
      ...EMPTY_QUERY_FILTERS,
      concept: 'hedo',
      approval: 'pending',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].values.rn).toBe(2);
    expect(
      filterPayrollQueryRows(rows, {
        ...EMPTY_QUERY_FILTERS,
        concept: 'hedo',
        approval: 'approved',
      }),
    ).toHaveLength(0);
  });
  it('resumen y pivote concilian con detalle; empleados únicos no se suman por celdas', () => {
    const rows = buildPayrollQueryRows(
      payrollQueryFixture(),
      payrollQueryOptions,
    );
    expect(
      summarizePayrollQuery(
        rows,
        ['month', 'center'],
        ['jornada', 'employees'],
      )[0],
    ).toMatchObject({ jornada: 3, employees: 1 });
    expect(
      pivotPayrollQuery(rows, 'employee', 'date', 'jornada').grandTotal,
    ).toBe(3);
    const pivot = pivotPayrollQuery(rows, 'employee', 'date', 'employees');
    expect(pivot.rows[0].cells).toEqual([1, 1, 1]);
    expect(pivot.rows[0].total).toBe(1);
    expect(pivot.grandTotal).toBe(1);
  });
  it('mantiene separados empleados homónimos', () => {
    const rows = buildPayrollQueryRows(
      payrollQueryFixture(),
      payrollQueryOptions,
    );
    rows.push({
      ...rows[0],
      id: 'emp-2-date',
      values: {
        ...rows[0].values,
        employeeId: 'emp-2',
        documentNumber: '000567',
      },
    });
    expect(
      pivotPayrollQuery(rows, 'employee', 'date', 'jornada').rows,
    ).toHaveLength(2);
    expect(summarizePayrollQuery(rows, ['employee'], ['jornada'])).toHaveLength(
      2,
    );
  });
});
