import { eachDayOfInterval, format, getDay, parseISO, subDays } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { getPayrollRestDay } from '@/lib/payrollRestDay';
import { getShiftClassification } from '@/lib/shiftClassification';
import { DAY_NAMES } from '@/types/schedule';
import { NOVELTY_TYPE_LABELS, type NoveltyType } from '@/types/payroll';

type Tables = Database['public']['Tables'];
type Row<T extends keyof Tables> = Tables[T]['Row'];
type Named = { name: string } | null;
type Scope = {
  employment_cycle_id?: string | null;
  operation_center_id?: string | null;
};
export type QueryEmployee = Pick<
  Row<'employees_v2'>,
  | 'id'
  | 'company_id'
  | 'first_name'
  | 'middle_name'
  | 'last_name'
  | 'second_last_name'
  | 'document_type'
  | 'document_number'
  | 'status'
  | 'is_active'
> & { identification_types?: Named };
export type QueryWorkInfo = Row<'employee_work_info'> & {
  operation_centers?: Named;
  areas?: Named;
  positions?: Named;
};
export type QueryContract = Row<'contracts'> & {
  contract_extensions?: Array<{
    extension_number: number;
    start_date?: string;
    end_date: string;
  }>;
};
export type QueryAssignment = Row<'employee_shift_assignments'> &
  Scope & { shifts?: Row<'shifts'> | null };
export type QueryNovelty = Row<'payroll_novelties'> &
  Scope & { status: string; novelty_reasons?: Named };
export type QueryTimeConfig = Row<'employee_time_config'> &
  Scope & {
    work_schedules?: Row<'work_schedules'> | null;
    shift_cycles?: Named;
  };
export interface PayrollQuerySources {
  employees: QueryEmployee[];
  cycles: Row<'employee_employment_cycles'>[];
  workInfos: QueryWorkInfo[];
  contracts: QueryContract[];
  schedules: Row<'employee_schedule'>[];
  socialSecurities: Row<'employee_social_security'>[];
  timeConfigs: QueryTimeConfig[];
  assignments: QueryAssignment[];
  novelties: QueryNovelty[];
  overtime: (Row<'overtime_records'> & Scope)[];
  incapacities: (Row<'employee_incapacities'> & Scope)[];
  vacations: (Row<'vacation_requests'> & Scope)[];
  leaves: (Row<'leave_requests'> & Scope)[];
  holidays: Row<'company_holidays'>[];
  config: Row<'payroll_labor_config'> | null;
  centers: Pick<Row<'operation_centers'>, 'id' | 'name'>[];
}

export type CellValue = string | number;
export interface PayrollQueryEvent {
  id: string;
  concept: string;
  status: string;
  source: string;
  hours: number;
  reason: string;
  notes: string;
}
export interface PayrollQueryRow {
  id: string;
  values: Record<string, CellValue>;
  events: PayrollQueryEvent[];
}
export interface QueryColumn {
  key: string;
  label: string;
  group: string;
  numeric?: boolean;
  description?: string;
}
const groupColumns = (group: string, pairs: string[][]): QueryColumn[] =>
  pairs.map(([key, label]) => ({ key, label, group }));
export const DAY_METRICS = [
  ['jornada', 'Días jornada ordinaria'],
  ['dominicalTrabajado', 'Días descanso obligatorio trabajado'],
  ['festivoTrabajado', 'Días festivo trabajado'],
  ['descansoRemunerado', 'Días descanso remunerado'],
  ['noTrabajado', 'Días no trabajados'],
  ['suspension', 'Días suspensión'],
  ['incapacidad', 'Días incapacidad'],
  ['vacaciones', 'Días vacaciones'],
  ['permiso', 'Días permiso'],
] as const;
export const HOUR_METRICS = [
  ['hedo', 'H.E. diurna ordinaria'],
  ['heno', 'H.E. nocturna ordinaria'],
  ['hedf', 'H.E. diurna descanso/festivo'],
  ['henf', 'H.E. nocturna descanso/festivo'],
  ['rn', 'Recargo nocturno'],
  ['rnf', 'Recargo nocturno descanso/festivo'],
] as const;
export const QUERY_COLUMNS: QueryColumn[] = [
  ...groupColumns('Empleado y vinculación', [
    ['employeeId', 'ID empleado'],
    ['employee', 'Empleado'],
    ['firstNames', 'Nombres'],
    ['lastNames', 'Apellidos'],
    ['documentType', 'Tipo documento'],
    ['documentNumber', 'Documento'],
    ['companyId', 'ID empresa'],
    ['company', 'Empresa'],
    ['cycleId', 'ID vinculación'],
    ['cycleNumber', 'Número vinculación'],
    ['currentStatus', 'Estado actual del empleado'],
    ['hireDate', 'Ingreso vinculación'],
    ['terminationDate', 'Retiro vinculación'],
  ]),
  ...groupColumns('Información laboral', [
    ['centerId', 'ID centro'],
    ['center', 'Centro de operación'],
    ['costCenter', 'Centro de costo'],
    ['area', 'Área'],
    ['position', 'Cargo'],
    ['workCity', 'Ciudad laboral'],
    ['linkType', 'Tipo vinculación'],
    ['contractId', 'ID contrato'],
    ['contractNumber', 'Número contrato'],
    ['contractType', 'Tipo contrato'],
    ['contractStart', 'Inicio contrato'],
    ['contractEnd', 'Fin contrato'],
    ['salaryType', 'Tipo salario'],
    ['payrollType', 'Tipo nómina'],
    ['restDay', 'Descanso semanal'],
    ['eps', 'EPS'],
    ['afp', 'AFP'],
    ['arl', 'ARL'],
    ['riskLevel', 'Nivel de riesgo'],
    ['ccf', 'CCF'],
    ['afc', 'AFC'],
    ['ips', 'IPS'],
  ]),
  ...[
    'salary:Salario',
    'transportAllowance:Auxilio transporte',
    'otherAllowances:Otros auxilios',
  ].map((item) => {
    const [key, label] = item.split(':');
    return { key, label, group: 'Información laboral', numeric: true };
  }),
  ...groupColumns('Programación', [
    ['date', 'Fecha'],
    ['year', 'Año'],
    ['month', 'Mes'],
    ['weekday', 'Día semana'],
    ['holiday', 'Festivo'],
    ['holidayName', 'Nombre festivo'],
    ['mode', 'Modalidad'],
    ['workSchedule', 'Horario administrativo'],
    ['shiftId', 'ID turno'],
    ['shift', 'Turno'],
    ['shiftCode', 'Código turno'],
    ['rotationCycle', 'Ciclo rotación'],
    ['source', 'Origen programación'],
    ['programStatus', 'Estado programación'],
    ['startTime', 'Entrada programada'],
    ['endTime', 'Salida programada'],
    ['crossesMidnight', 'Cruza medianoche'],
  ]),
  {
    key: 'breakMinutes',
    label: 'Descanso (minutos)',
    group: 'Programación',
    numeric: true,
  },
  {
    key: 'programmedHours',
    label: 'Horas netas programadas',
    group: 'Programación',
    numeric: true,
    description: 'Duración del horario menos descanso; no acredita asistencia.',
  },
  ...DAY_METRICS.map(([key, label]) => ({
    key,
    label,
    group: 'Días efectivos',
    numeric: true,
    description:
      'Días para nómina según programación, ausencias y correcciones aprobadas; no acredita asistencia.',
  })),
  ...HOUR_METRICS.map(([key, label]) => ({
    key,
    label: `${label} (horas)`,
    group: 'Horas efectivas',
    numeric: true,
    description:
      'Horas de registros aprobados; los recargos no son horas adicionales trabajadas.',
  })),
  ...(['approved', 'pending', 'rejected'] as const).flatMap((status, index) => [
    {
      key: `${status}Events`,
      label: `Registros ${['aprobados', 'pendientes', 'rechazados'][index]}`,
      group: 'Novedades',
      numeric: true,
    },
    {
      key: `${status}Hours`,
      label: `Horas registradas ${['aprobadas', 'pendientes', 'rechazadas'][index]}`,
      group: 'Novedades',
      numeric: true,
      description:
        'Suma de horas declaradas en novedades y extras; puede incluir conceptos superpuestos.',
    },
    ...Object.entries(NOVELTY_TYPE_LABELS).map(([concept, label]) => ({
      key: `${status}_${concept}`,
      label: `${label}: ${['aprobadas', 'pendientes', 'rechazadas'][index]} (h)`,
      group: `Novedades ${['aprobadas', 'pendientes', 'rechazadas'][index]}`,
      numeric: true,
    })),
  ]),
  ...groupColumns('Trazabilidad', [
    ['concepts', 'Conceptos registrados'],
    ['approvalStatuses', 'Estados de aprobación'],
    ['eventSources', 'Orígenes novedades'],
    ['assignmentId', 'ID asignación'],
    ['timeConfigId', 'ID configuración jornada'],
    ['eventIds', 'Identificadores de origen'],
    ['reasons', 'Motivos'],
    ['notes', 'Observaciones'],
    ['historyStatus', 'Calidad histórico'],
    ['warnings', 'Advertencias'],
  ]),
];
export const DEFAULT_QUERY_FIELDS = [
  'date',
  'employee',
  'documentNumber',
  'center',
  'area',
  'position',
  'mode',
  'shift',
  'programStatus',
  'startTime',
  'endTime',
  'programmedHours',
  'jornada',
  'descansoRemunerado',
  'incapacidad',
  'vacaciones',
  'permiso',
  'hedo',
  'heno',
  'hedf',
  'henf',
  'rn',
  'rnf',
  'pendingEvents',
  'historyStatus',
  'warnings',
];
export const QUERY_METRICS = QUERY_COLUMNS.filter(
  (column) =>
    column.numeric &&
    ![
      'salary',
      'transportAllowance',
      'otherAllowances',
      'breakMinutes',
    ].includes(column.key),
).concat([
  {
    key: 'records',
    label: 'Días registrados',
    group: 'Conteos',
    numeric: true,
  },
  {
    key: 'employees',
    label: 'Empleados únicos',
    group: 'Conteos',
    numeric: true,
  },
]);
export const QUERY_DIMENSIONS = QUERY_COLUMNS.filter(
  (column) =>
    !column.numeric &&
    !['warnings', 'notes', 'reasons', 'eventIds'].includes(column.key),
);

type Historical = {
  id: string;
  employment_cycle_id?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};
export function resolveQueryHistory<T extends Historical>(
  records: T[],
  cycleId: string | null,
  date: string,
): T | undefined {
  return records
    .filter(
      (record) =>
        (record.employment_cycle_id || null) === cycleId &&
        !!(record.valid_from || record.start_date) &&
        (record.valid_from || record.start_date)! <= date &&
        (!(record.valid_to || record.end_date) ||
          (record.valid_to || record.end_date)! >= date),
    )
    .sort(
      (a, b) =>
        (b.valid_from || b.start_date || '').localeCompare(
          a.valid_from || a.start_date || '',
        ) || a.id.localeCompare(b.id),
    )[0];
}

function byEmployee<T extends { employee_id: string }>(rows: T[]) {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const group = map.get(row.employee_id);
    if (group) group.push(row);
    else map.set(row.employee_id, [row]);
  });
  return map;
}
function byDay<T extends { employee_id: string }>(
  rows: T[],
  date: (row: T) => string,
) {
  const map = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = `${row.employee_id}|${date(row)}`;
    const group = map.get(key);
    if (group) group.push(row);
    else map.set(key, [row]);
  });
  return map;
}
const text = (value: unknown): string => (value == null ? '' : String(value));
const join = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter(Boolean))].join(' | ');
const number = (value: unknown): number | '' =>
  value == null ? '' : Number.isFinite(Number(value)) ? Number(value) : '';
const approved = (status: string) =>
  [
    'aprobada',
    'aprobado',
    'pagado',
    'en_curso',
    'completado',
    'interrumpido',
  ].includes(status);
const rejected = (status: string) =>
  ['rechazada', 'rechazado', 'cancelada', 'cancelado'].includes(status);
const eventBucket = (status: string) =>
  approved(status) ? 'approved' : rejected(status) ? 'rejected' : 'pending';
function overlaps(date: string, start: string, end?: string | null) {
  return start <= date && (!end || end >= date);
}
function contractEnd(contract: QueryContract) {
  const extensionEnd = [...(contract.contract_extensions || [])].sort(
    (a, b) => b.extension_number - a.extension_number,
  )[0]?.end_date;
  const end = extensionEnd || contract.end_date;
  return contract.termination_date && (!end || contract.termination_date < end)
    ? contract.termination_date
    : end;
}
function duration(
  start: string,
  end: string,
  breaks: number,
  crosses: boolean,
  warnings: Set<string>,
) {
  const toMinutes = (value: string) => {
    const parts = value?.split(':').map(Number);
    return parts?.length >= 2 &&
      parts[0] >= 0 &&
      parts[0] < 24 &&
      parts[1] >= 0 &&
      parts[1] < 60
      ? parts[0] * 60 + parts[1]
      : NaN;
  };
  let minutes = toMinutes(end) - toMinutes(start);
  if (crosses || minutes < 0) minutes += 1440;
  if (
    !Number.isFinite(minutes) ||
    !Number.isFinite(breaks) ||
    breaks < 0 ||
    breaks > minutes ||
    minutes <= 0
  ) {
    warnings.add('Horario o descanso inválido');
    return 0;
  }
  return (minutes - breaks) / 60;
}

export interface BuildQueryOptions {
  companyId: string;
  companyName: string;
  startDate: string;
  endDate: string;
  authorizedCenterIds: string[];
  allowUnresolvedCenter: boolean;
}
export function buildPayrollQueryRows(
  sources: PayrollQuerySources,
  options: BuildQueryOptions,
): PayrollQueryRow[] {
  const { startDate, endDate, companyId } = options;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate ||
    !Number.isFinite(parseISO(startDate).getTime()) ||
    !Number.isFinite(parseISO(endDate).getTime())
  )
    return [];
  const withinCompany = <T extends { company_id: string }>(rows: T[]) =>
    rows.filter((row) => row.company_id === companyId);
  const workIndex = byEmployee(withinCompany(sources.workInfos));
  const cycleIndex = byEmployee(withinCompany(sources.cycles));
  const contractIndex = byEmployee(withinCompany(sources.contracts));
  const scheduleIndex = byEmployee(withinCompany(sources.schedules));
  const socialIndex = byEmployee(withinCompany(sources.socialSecurities));
  const configIndex = byEmployee(withinCompany(sources.timeConfigs));
  const assignments = byDay(
    withinCompany(sources.assignments),
    (row) => row.assignment_date,
  );
  const novelties = byDay(
    withinCompany(sources.novelties),
    (row) => row.novelty_date,
  );
  const overtime = byDay(
    withinCompany(sources.overtime),
    (row) => row.work_date,
  );
  const incapIndex = byEmployee(withinCompany(sources.incapacities));
  const vacIndex = byEmployee(withinCompany(sources.vacations));
  const leaveIndex = byEmployee(withinCompany(sources.leaves));
  const holidays = new Map(
    withinCompany(sources.holidays)
      .filter((row) => row.is_active)
      .map((row) => [row.holiday_date, row.name]),
  );
  const centers = new Map(
    sources.centers.map((center) => [center.id, center.name]),
  );
  const allowedCenters = new Set(options.authorizedCenterIds);
  const dailyHours =
    sources.config?.company_id === companyId &&
    Number(sources.config.daily_hours) > 0
      ? Number(sources.config.daily_hours)
      : 8;
  const dates = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).map((date) => ({
    date: format(date, 'yyyy-MM-dd'),
    weekday: getDay(date),
  }));
  const result: PayrollQueryRow[] = [];
  withinCompany(sources.employees).forEach((employee) => {
    const works = workIndex.get(employee.id) || [];
    const employeeCycles = cycleIndex.get(employee.id) || [];
    // Legacy dates are only used when no employment cycles exist; never borrow another cycle's data.
    const cycles = employeeCycles.length
      ? employeeCycles.map((cycle) => ({
          id: cycle.id as string | null,
          cycle_number: cycle.cycle_number,
          start_date: cycle.start_date,
          end_date: cycle.end_date,
        }))
      : works
          .filter((work) => !work.employment_cycle_id && work.hire_date)
          .map((work) => ({
            id: null,
            cycle_number: '',
            start_date: work.hire_date,
            end_date: work.termination_date,
          }));
    const emitted = new Set<string>();
    cycles.forEach((cycle) =>
      dates.forEach(({ date, weekday }) => {
        if (!overlaps(date, cycle.start_date, cycle.end_date)) return;
        const rowKey = `${employee.id}|${cycle.id || 'legacy'}|${date}`;
        if (emitted.has(rowKey)) return;
        emitted.add(rowKey);
        const warnings = new Set<string>();
        const work = resolveQueryHistory(works, cycle.id, date);
        const schedule = resolveQueryHistory(
          scheduleIndex.get(employee.id) || [],
          cycle.id,
          date,
        );
        const social = resolveQueryHistory(
          socialIndex.get(employee.id) || [],
          cycle.id,
          date,
        );
        const config = resolveQueryHistory(
          configIndex.get(employee.id) || [],
          cycle.id,
          date,
        );
        const contracts = (contractIndex.get(employee.id) || []).map(
          (item) => ({ ...item, end_date: contractEnd(item) }),
        );
        const contract = resolveQueryHistory(contracts, cycle.id, date);
        const inCycle = <T extends Scope>(records: T[]) =>
          records.filter((record) =>
            record.employment_cycle_id
              ? record.employment_cycle_id === cycle.id
              : employeeCycles.filter((c) =>
                  overlaps(date, c.start_date, c.end_date),
                ).length <= 1,
          );
        const dayAssignments = inCycle(
          assignments.get(`${employee.id}|${date}`) || [],
        ).sort((a, b) => a.id.localeCompare(b.id));
        const assignment = dayAssignments[0];
        const dayNovelties = inCycle(
          novelties.get(`${employee.id}|${date}`) || [],
        );
        const centerId =
          assignment?.operation_center_id ||
          work?.operation_center_id ||
          config?.operation_center_id ||
          dayNovelties.find((item) => item.operation_center_id)
            ?.operation_center_id ||
          '';
        if (
          centerId
            ? !allowedCenters.has(centerId)
            : !options.allowUnresolvedCenter
        )
          return;
        const sameCenter = <T extends Scope>(items: T[]) =>
          items.filter(
            (item) =>
              !item.operation_center_id ||
              item.operation_center_id === centerId,
          );
        const usableWork =
          work?.operation_center_id && work.operation_center_id !== centerId
            ? undefined
            : work;
        const missingHistory =
          !cycle.id ||
          !usableWork ||
          !schedule ||
          !social ||
          !config ||
          !contract;
        if (missingHistory) warnings.add('Histórico incompleto');
        if (dayAssignments.length > 1)
          warnings.add('Asignaciones duplicadas: se usa una sola');
        if (
          employeeCycles.filter((c) => overlaps(date, c.start_date, c.end_date))
            .length > 1
        )
          warnings.add(
            'Vinculaciones superpuestas: registros sin ciclo no imputados',
          );
        const shift = assignment?.shifts;
        const administrative =
          !assignment &&
          config?.mode === 'administrative' &&
          config.work_schedules;
        const program = shift || administrative || undefined;
        const administrativeWorkday =
          !!administrative && administrative.days_of_week.includes(weekday);
        let classification = shift
          ? getShiftClassification(shift)
          : administrative
            ? administrativeWorkday
              ? 'work'
              : 'rest'
            : undefined;
        if (assignment && !shift) {
          classification = undefined;
          warnings.add('Falta información del turno');
        }
        const programmed = classification === 'work' && program;
        const crosses = !!(
          shift?.crosses_midnight ||
          (program && program.end_time < program.start_time)
        );
        const netHours = programmed
          ? duration(
              program.start_time,
              program.end_time,
              program.break_minutes || 0,
              crosses,
              warnings,
            )
          : 0;
        const values: Record<string, CellValue> = {
          employeeId: employee.id,
          employee: [
            employee.first_name,
            employee.middle_name,
            employee.last_name,
            employee.second_last_name,
          ]
            .filter(Boolean)
            .join(' '),
          firstNames: join([employee.first_name, employee.middle_name]).replace(
            ' | ',
            ' ',
          ),
          lastNames: join([
            employee.last_name,
            employee.second_last_name,
          ]).replace(' | ', ' '),
          documentType:
            employee.identification_types?.name || text(employee.document_type),
          documentNumber: employee.document_number,
          companyId,
          company: options.companyName,
          cycleId: cycle.id || '',
          cycleNumber: cycle.cycle_number,
          currentStatus:
            employee.status === 'retired'
              ? 'Retirado'
              : employee.status === 'suspended'
                ? 'Suspendido'
                : employee.status === 'en_retiro'
                  ? 'En retiro'
                  : employee.is_active
                    ? 'Activo'
                    : 'Inactivo',
          hireDate: cycle.start_date,
          terminationDate: cycle.end_date || '',
          centerId,
          center: centers.get(centerId) || '',
          costCenter: text(usableWork?.cost_center),
          area: usableWork?.areas?.name || '',
          position:
            usableWork?.positions?.name || usableWork?.position_name || '',
          workCity: text(usableWork?.work_city),
          linkType: text(usableWork?.link_type),
          contractId: contract?.id || '',
          contractNumber: text(contract?.contract_number),
          contractType: text(contract?.contract_type),
          contractStart: text(contract?.start_date),
          contractEnd: text(contract?.end_date),
          salary: number(contract?.salary),
          salaryType: text(contract?.salary_type),
          transportAllowance: number(contract?.transport_allowance),
          otherAllowances: number(contract?.other_allowances),
          payrollType: text(schedule?.payroll_type),
          restDay: text(schedule?.rest_day),
          eps: text(social?.eps),
          afp: text(social?.afp),
          arl: text(social?.arl),
          riskLevel: text(social?.risk_level),
          ccf: text(social?.ccf),
          afc: text(social?.afc),
          ips: text(social?.ips),
          date,
          year: date.slice(0, 4),
          month: date.slice(0, 7),
          weekday: DAY_NAMES[weekday],
          holiday: holidays.has(date) ? 'Sí' : 'No',
          holidayName: holidays.get(date) || '',
          mode: assignment
            ? 'Turnos'
            : config?.mode === 'administrative'
              ? 'Administrativa'
              : config?.mode === 'shift'
                ? 'Turnos'
                : '',
          workSchedule: administrative
            ? administrative.name
            : config?.work_schedules?.name || '',
          shiftId: text(assignment?.shift_id),
          shift: text(shift?.name),
          shiftCode: text(shift?.code),
          rotationCycle: config?.shift_cycles?.name || '',
          source: assignment
            ? assignment.source === 'cycle'
              ? 'Ciclo'
              : 'Manual'
            : administrative
              ? 'Horario administrativo'
              : '',
          programStatus:
            classification === 'work'
              ? 'Laboral'
              : classification === 'rest'
                ? 'Descanso'
                : classification === 'not_worked'
                  ? 'No trabajado'
                  : classification === 'suspension'
                    ? 'Suspensión'
                    : 'Sin programación',
          startTime: programmed ? program.start_time.slice(0, 5) : '',
          endTime: programmed ? program.end_time.slice(0, 5) : '',
          crossesMidnight: programmed ? (crosses ? 'Sí' : 'No') : '',
          breakMinutes: programmed ? program.break_minutes || 0 : 0,
          programmedHours: netHours,
          assignmentId: assignment?.id || '',
          timeConfigId: config?.id || '',
          historyStatus: missingHistory ? 'Histórico incompleto' : 'Completo',
        };
        [...DAY_METRICS, ...HOUR_METRICS].forEach(([key]) => {
          values[key] = 0;
        });
        ['approved', 'pending', 'rejected'].forEach((bucket) => {
          values[`${bucket}Events`] = 0;
          values[`${bucket}Hours`] = 0;
          Object.keys(NOVELTY_TYPE_LABELS).forEach((concept) => {
            values[`${bucket}_${concept}`] = 0;
          });
        });
        const events: PayrollQueryEvent[] = [];
        const addEvent = (event: PayrollQueryEvent) => {
          events.push(event);
          const bucket = eventBucket(event.status);
          values[`${bucket}Events`] = Number(values[`${bucket}Events`]) + 1;
          if (!Number.isFinite(event.hours) || event.hours < 0) {
            warnings.add('Registro con horas inválidas');
            return;
          }
          values[`${bucket}Hours`] =
            Number(values[`${bucket}Hours`]) + event.hours;
          if (`${bucket}_${event.concept}` in values)
            values[`${bucket}_${event.concept}`] =
              Number(values[`${bucket}_${event.concept}`]) + event.hours;
        };
        sameCenter(dayNovelties).forEach((item) =>
          addEvent({
            id: `novedad:${item.id}`,
            concept: item.novelty_type,
            status: item.status,
            source: item.source === 'manual' ? 'Manual' : 'Automática',
            hours: Number(item.hours),
            reason: item.novelty_reasons?.name || '',
            notes: item.notes || '',
          }),
        );
        const restDay = getPayrollRestDay(schedule?.rest_day);
        if (restDay === null)
          warnings.add('Descanso semanal no identifica un día');
        const special = holidays.has(date) || weekday === restDay;
        const effectiveConcept = holidays.has(date)
          ? 'festivoTrabajado'
          : weekday === restDay
            ? 'dominicalTrabajado'
            : 'jornada';
        sameCenter(
          inCycle(overtime.get(`${employee.id}|${date}`) || []),
        ).forEach((item) => {
          const mapping: Record<string, string> = {
            extra_diurna: special ? 'hedf' : 'hedo',
            extra_nocturna: special ? 'henf' : 'heno',
            recargo_nocturno: special ? 'rnf' : 'rn',
          };
          const concept = mapping[item.overtime_type] || item.overtime_type;
          addEvent({
            id: `extra:${item.id}`,
            concept,
            status: item.status,
            source: 'Horas extra',
            hours: Number(item.total_hours),
            reason: item.reason || '',
            notes: join([item.approval_notes, item.rejected_reason]),
          });
          if (!mapping[item.overtime_type])
            warnings.add(
              'Concepto dominical/festivo ambiguo: excluido de horas efectivas',
            );
        });
        const incapacities = sameCenter(
          inCycle(incapIndex.get(employee.id) || []),
        ).filter((item) => overlaps(date, item.start_date, item.end_date));
        const vacations = sameCenter(
          inCycle(vacIndex.get(employee.id) || []),
        ).filter((item) => {
          if (['compensacion', 'acumulacion'].includes(item.request_type || ''))
            return false;
          const end = item.interruption_date
            ? [
                item.end_date,
                format(
                  subDays(parseISO(item.interruption_date), 1),
                  'yyyy-MM-dd',
                ),
              ].sort()[0]
            : item.end_date;
          return (
            overlaps(date, item.start_date, end) ||
            !!(
              item.resume_start_date &&
              item.resume_end_date &&
              overlaps(date, item.resume_start_date, item.resume_end_date)
            )
          );
        });
        const leaves = sameCenter(
          inCycle(leaveIndex.get(employee.id) || []),
        ).filter((item) => overlaps(date, item.start_date, item.end_date));
        incapacities.forEach((item) =>
          addEvent({
            id: `incapacidad:${item.id}`,
            concept: 'incapacidad',
            status: 'aprobada',
            source: 'Incapacidades',
            hours: dailyHours,
            reason: '',
            notes: item.observations || '',
          }),
        );
        vacations.forEach((item) =>
          addEvent({
            id: `vacaciones:${item.id}`,
            concept: 'vacaciones',
            status: item.status,
            source: 'Vacaciones',
            hours: dailyHours,
            reason: item.interruption_reason || '',
            notes: item.notes || '',
          }),
        );
        leaves.forEach((item) =>
          addEvent({
            id: `permiso:${item.id}`,
            concept: 'permiso',
            status: item.status,
            source: 'Permisos',
            hours:
              item.duration_type === 'medio_dia'
                ? dailyHours / 2
                : item.duration_type === 'horas'
                  ? Number(item.total_hours || 0)
                  : dailyHours,
            reason: item.reason || '',
            notes: join([item.review_notes, item.rejection_reason]),
          }),
        );
        const dailyConcepts = new Set([
          'jornada',
          'dominical_trabajado',
          'festivo_trabajado',
          'descanso_remunerado',
          'incapacidad',
          'vacaciones',
          'permiso',
        ]);
        const corrections = events.filter(
          (item) =>
            item.id.startsWith('novedad:') &&
            approved(item.status) &&
            dailyConcepts.has(item.concept),
        );
        if (corrections.length) {
          let correctedDays = 0;
          corrections.forEach((item) => {
            if (!Number.isFinite(item.hours) || item.hours <= 0) {
              warnings.add('Novedad diaria con horas inválidas');
              return;
            }
            const fraction = item.hours / dailyHours;
            const key = ['incapacidad', 'vacaciones', 'permiso'].includes(
              item.concept,
            )
              ? item.concept
              : item.concept === 'descanso_remunerado'
                ? 'descansoRemunerado'
                : effectiveConcept;
            values[key] = Number(values[key]) + fraction;
            correctedDays += fraction;
          });
          if (correctedDays > 1)
            warnings.add(
              'Las novedades superan una jornada; revise duplicados',
            );
        } else {
          const effectiveVacations = vacations.filter((item) =>
            approved(item.status),
          );
          const leaveFraction = events
            .filter(
              (item) =>
                item.id.startsWith('permiso:') &&
                approved(item.status) &&
                Number.isFinite(item.hours) &&
                item.hours >= 0,
            )
            .reduce((sum, item) => sum + item.hours / dailyHours, 0);
          if (
            Number(incapacities.length > 0) +
              Number(effectiveVacations.length > 0) +
              Number(leaveFraction > 0) >
            1
          )
            warnings.add(
              'Ausencias superpuestas: se contabilizan una sola vez',
            );
          if (incapacities.length > 1 || effectiveVacations.length > 1)
            warnings.add('Ausencias duplicadas');
          if (incapacities.length) values.incapacidad = 1;
          else if (effectiveVacations.length) values.vacaciones = 1;
          else {
            if (leaveFraction > 1)
              warnings.add('Los permisos superan una jornada');
            values.permiso = Math.min(1, leaveFraction);
            const remaining = 1 - Number(values.permiso);
            const key =
              classification === 'rest'
                ? 'descansoRemunerado'
                : classification === 'not_worked'
                  ? 'noTrabajado'
                  : classification === 'suspension'
                    ? 'suspension'
                    : classification === 'work'
                      ? effectiveConcept
                      : undefined;
            if (key) values[key] = remaining;
          }
        }
        HOUR_METRICS.forEach(([key]) => {
          const matching = events.filter(
            (item) =>
              item.concept === key &&
              approved(item.status) &&
              Number.isFinite(item.hours) &&
              item.hours >= 0,
          );
          values[key] = matching.reduce((sum, item) => sum + item.hours, 0);
          if (matching.length > 1)
            warnings.add(`Múltiples registros de ${key}; revise duplicados`);
        });
        values.concepts = join(
          events.map(
            (item) =>
              NOVELTY_TYPE_LABELS[item.concept as NoveltyType] || item.concept,
          ),
        );
        values.approvalStatuses = join(events.map((item) => item.status));
        values.eventSources = join(events.map((item) => item.source));
        values.eventIds = join(events.map((item) => item.id));
        values.reasons = join(events.map((item) => item.reason));
        values.notes = join([
          assignment?.notes,
          config?.notes,
          ...events.map((item) => item.notes),
        ]);
        values.warnings = [...warnings].join(' | ');
        result.push({ id: rowKey, values, events });
      }),
    );
  });
  return result.sort(
    (a, b) =>
      text(a.values.date).localeCompare(text(b.values.date)) ||
      text(a.values.employee).localeCompare(text(b.values.employee), 'es') ||
      a.id.localeCompare(b.id),
  );
}

export interface PayrollQueryFilters {
  search: string;
  center: string;
  area: string;
  position: string;
  currentStatus: string;
  mode: string;
  shift: string;
  source: string;
  concept: string;
  approval: string;
}
export const EMPTY_QUERY_FILTERS: PayrollQueryFilters = {
  search: '',
  center: '',
  area: '',
  position: '',
  currentStatus: '',
  mode: '',
  shift: '',
  source: '',
  concept: '',
  approval: '',
};
export function filterPayrollQueryRows(
  rows: PayrollQueryRow[],
  filters: PayrollQueryFilters,
) {
  const query = filters.search.trim().toLocaleLowerCase('es');
  return rows.filter((row) => {
    if (
      query &&
      ![
        row.values.employee,
        row.values.documentNumber,
        row.values.employeeId,
      ].some((value) => text(value).toLocaleLowerCase('es').includes(query))
    )
      return false;
    for (const key of [
      'center',
      'area',
      'position',
      'currentStatus',
      'mode',
      'shift',
    ] as const)
      if (filters[key] && row.values[key] !== filters[key]) return false;
    if (
      filters.source &&
      row.values.source !== filters.source &&
      !row.events.some((event) => event.source === filters.source)
    )
      return false;
    return (
      (!filters.concept && !filters.approval) ||
      row.events.some(
        (event) =>
          (!filters.concept || event.concept === filters.concept) &&
          (!filters.approval || eventBucket(event.status) === filters.approval),
      )
    );
  });
}
export function queryMetric(rows: PayrollQueryRow[], metric: string) {
  if (metric === 'employees')
    return new Set(rows.map((row) => row.values.employeeId)).size;
  if (metric === 'records') return rows.length;
  return rows.reduce((sum, row) => sum + (Number(row.values[metric]) || 0), 0);
}
function dimensionValue(row: PayrollQueryRow, field: string): CellValue {
  // Homonymous employees must not collapse into the same summary/pivot row.
  return field === 'employee'
    ? `${row.values.employee} (${row.values.documentNumber || row.values.employeeId})`
    : (row.values[field] ?? '');
}
export function summarizePayrollQuery(
  rows: PayrollQueryRow[],
  dimensions: string[],
  metrics: string[],
): Record<string, CellValue>[] {
  const groups = new Map<string, PayrollQueryRow[]>();
  rows.forEach((row) => {
    const key = JSON.stringify(
      dimensions.map((field) =>
        field === 'employee'
          ? row.values.employeeId
          : (row.values[field] ?? ''),
      ),
    );
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  });
  return [...groups.values()].map((group) =>
    Object.fromEntries([
      ...dimensions.map((field) => [field, dimensionValue(group[0], field)]),
      ...metrics.map((metric) => [metric, queryMetric(group, metric)]),
    ]),
  );
}
export function pivotPayrollQuery(
  rows: PayrollQueryRow[],
  rowField: string,
  columnField: string,
  metric: string,
) {
  const columns = [
    ...new Set(rows.map((row) => text(dimensionValue(row, columnField)))),
  ].sort();
  const groups = new Map<string, PayrollQueryRow[]>();
  const columnGroups = new Map<string, PayrollQueryRow[]>();
  rows.forEach((row) => {
    const label = text(dimensionValue(row, rowField));
    const group = groups.get(label);
    if (group) group.push(row);
    else groups.set(label, [row]);
    const column = text(dimensionValue(row, columnField));
    const columnGroup = columnGroups.get(column);
    if (columnGroup) columnGroup.push(row);
    else columnGroups.set(column, [row]);
  });
  return {
    columns,
    rows: [...groups.entries()].map(([label, group]) => {
      const cells = new Map<string, PayrollQueryRow[]>();
      group.forEach((row) => {
        const key = text(dimensionValue(row, columnField));
        const cell = cells.get(key);
        if (cell) cell.push(row);
        else cells.set(key, [row]);
      });
      return {
        label,
        cells: columns.map((column) =>
          queryMetric(cells.get(column) || [], metric),
        ),
        total: queryMetric(group, metric),
      };
    }),
    totals: columns.map((column) =>
      queryMetric(columnGroups.get(column) || [], metric),
    ),
    grandTotal: queryMetric(rows, metric),
  };
}
