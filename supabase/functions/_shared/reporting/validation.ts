import type { Field, ReportFilters, ReportPlan, Source } from './types.ts';

export class ReportError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function fail(message: string): never {
  throw new ReportError('INVALID_PLAN', message);
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const list = (v: unknown, max: number): unknown[] =>
  Array.isArray(v) && v.length <= max
    ? v
    : fail(
        'La consulta contiene demasiados elementos o tiene un formato inválido.',
      );
const keys = (v: Record<string, unknown>, allowed: string[]) => {
  if (Object.keys(v).some((k) => !allowed.includes(k)))
    fail('La consulta contiene instrucciones no reconocidas.');
};
export function validatePlan(value: unknown, sources: Source[]): ReportPlan {
  if (!object(value))
    return fail('La IA no produjo un plan de reporte válido.');
  keys(value, [
    'source',
    'columns',
    'dimensions',
    'metrics',
    'filters',
    'related',
    'order',
    'chart',
    'limit',
    'comparePrevious',
  ]);
  const source = sources.find((s) => s.key === value.source);
  if (!source)
    throw new ReportError(
      'FORBIDDEN_SOURCE',
      'No tienes acceso a la fuente solicitada.',
      403,
    );
  const field = (v: unknown, s = source): Field =>
    s.fields.find((f) => f.key === v) ??
    fail(`Campo no disponible: ${String(v).slice(0, 60)}.`);
  const output: string[] = [];
  for (const c of list(value.columns, 30)) {
    field(c);
    output.push(String(c));
  }
  for (const d of list(value.dimensions, 5)) {
    if (!object(d)) fail('Agrupación inválida.');
    keys(d, ['field', 'grain']);
    const f = field(d.field);
    if (!['value', 'day', 'month', 'year'].includes(String(d.grain)))
      fail('Agrupación temporal inválida.');
    if (d.grain !== 'value' && !['date', 'datetime'].includes(f.type))
      fail('Solo se pueden agrupar fechas por periodo.');
    output.push(String(d.field));
  }
  for (const m of list(value.metrics, 12)) {
    if (!object(m)) fail('Métrica inválida.');
    keys(m, ['field', 'op', 'key']);
    const f = m.field === '*' ? null : field(m.field);
    if (
      !['count', 'distinct', 'sum', 'avg', 'min', 'max'].includes(String(m.op))
    )
      fail('Operación no disponible.');
    if (!/^[a-z][a-z0-9_]{0,49}$/.test(String(m.key)))
      fail('Nombre de métrica inválido.');
    if (m.field === '*' && m.op !== 'count')
      fail('Esta métrica necesita un campo.');
    if (['sum', 'avg'].includes(String(m.op)) && f?.type !== 'number')
      fail('La métrica requiere un campo numérico.');
    output.push(String(m.key));
  }
  if (!output.length || new Set(output).size !== output.length)
    fail('Selecciona columnas o métricas sin nombres duplicados.');
  if (
    (value.metrics as unknown[]).length &&
    (value.columns as unknown[]).length
  )
    fail('Usa agrupaciones en lugar de columnas para un reporte agregado.');
  if (
    !(value.metrics as unknown[]).length &&
    (value.dimensions as unknown[]).length
  )
    fail('Una agrupación necesita al menos una métrica.');
  const filters = (items: unknown, s = source) => {
    for (const f of list(items, 20)) {
      if (!object(f)) fail('Filtro inválido.');
      keys(f, ['field', 'op', 'values']);
      const col = field(f.field, s);
      if (
        ![
          'eq',
          'neq',
          'gt',
          'gte',
          'lt',
          'lte',
          'contains',
          'in',
          'is_null',
          'not_null',
        ].includes(String(f.op))
      )
        fail('Operador no disponible.');
      const values = list(f.values, 100);
      if (values.some((v) => typeof v !== 'string' || v.length > 500))
        fail('Valor de filtro inválido.');
      if (!['is_null', 'not_null'].includes(String(f.op)) && !values.length)
        fail('Falta el valor del filtro.');
      if (
        !['in', 'is_null', 'not_null'].includes(String(f.op)) &&
        values.length !== 1
      )
        fail('El filtro necesita un único valor.');
      if (f.op === 'contains' && col.type !== 'text')
        fail('La búsqueda de texto necesita una columna de texto.');
      for (const v of values as string[]) {
        if (col.type === 'number' && !/^-?\d+(\.\d+)?$/.test(v))
          fail('Número inválido.');
        if (col.type === 'boolean' && !['true', 'false'].includes(v))
          fail('Valor lógico inválido.');
        if (col.type === 'date' && !validDate(v)) fail('Fecha inválida.');
      }
    }
  };
  filters(value.filters);
  for (const r of list(value.related, 5)) {
    if (!object(r)) fail('Cruce inválido.');
    keys(r, ['source', 'mode', 'filters']);
    const target = sources.find((s) => s.key === r.source);
    if (!target || !source.employeeField || !target.employeeField)
      fail('Este cruce no tiene una relación de empleado autorizada.');
    if (!['exists', 'not_exists'].includes(String(r.mode)))
      fail('Tipo de cruce inválido.');
    filters(r.filters, target);
  }
  for (const o of list(value.order, 5)) {
    if (!object(o)) fail('Orden inválido.');
    keys(o, ['field', 'direction']);
    if (
      !output.includes(String(o.field)) ||
      !['asc', 'desc'].includes(String(o.direction))
    )
      fail('Orden no disponible.');
  }
  if (!['bar', 'line', 'donut', 'none'].includes(String(value.chart)))
    fail('Gráfico inválido.');
  if (
    value.limit !== null &&
    (!Number.isInteger(value.limit) ||
      Number(value.limit) < 1 ||
      Number(value.limit) > 50000)
  )
    fail('El límite debe estar entre 1 y 50.000.');
  if (typeof value.comparePrevious !== 'boolean') fail('Comparación inválida.');
  if (value.comparePrevious && !(value.metrics as unknown[]).length)
    fail('Para comparar periodos, utiliza métricas agregadas.');
  return value as unknown as ReportPlan;
}
export function validDate(v: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v
  );
}
export function validateFilters(value: unknown): ReportFilters {
  if (value == null) return {};
  if (!object(value)) fail('Filtros inválidos.');
  keys(value, ['startDate', 'endDate', 'centerIds']);
  for (const key of ['startDate', 'endDate'])
    if (
      value[key] &&
      (typeof value[key] !== 'string' || !validDate(value[key] as string))
    )
      fail('Fecha inválida.');
  if (value.startDate && value.endDate && value.startDate > value.endDate)
    fail('La fecha inicial debe ser anterior a la final.');
  if (
    value.centerIds &&
    list(value.centerIds, 200).some(
      (v) => typeof v !== 'string' || !/^[0-9a-f-]{36}$/i.test(v),
    )
  )
    fail('Centro inválido.');
  return value as ReportFilters;
}
export function bogotaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
