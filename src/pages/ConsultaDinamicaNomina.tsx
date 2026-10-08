import { useMemo, useState } from 'react';
import { endOfMonth, format, parseISO } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Filter,
  Loader2,
  RotateCcw,
  Search,
  Table2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePayrollDynamicQuery,
  type PayrollQueryPeriod,
} from '@/hooks/usePayrollDynamicQuery';
import { colombiaToday } from '@/lib/payrollControlCuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DEFAULT_QUERY_FIELDS,
  EMPTY_QUERY_FILTERS,
  QUERY_COLUMNS as BASE_QUERY_COLUMNS,
  QUERY_DIMENSIONS,
  QUERY_METRICS as BASE_QUERY_METRICS,
  filterPayrollQueryRows,
  pivotPayrollQuery,
  queryMetric,
  summarizePayrollQuery,
  type CellValue,
  type PayrollQueryFilters,
  type QueryColumn,
} from '@/lib/payrollDynamicQuery';
import { NOVELTY_TYPE_LABELS } from '@/types/payroll';
import { downloadPayrollQuery } from '@/lib/payrollDynamicQueryExport';

type ViewMode = 'detalle' | 'resumen' | 'pivote';
const numberFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 4,
});
const columnMap = new Map(
  [...BASE_QUERY_COLUMNS, ...BASE_QUERY_METRICS].map((column) => [column.key, column]),
);
const selectClass =
  'flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm';
function Choice({
  label,
  value,
  onChange,
  options,
  all = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  all?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium">
      {label}
      <select
        aria-label={label}
        className={selectClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {all && <option value="">Todos</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label || 'Sin dato'}
          </option>
        ))}
      </select>
    </label>
  );
}
function FieldSelector({
  title,
  choices,
  selected,
  onChange,
  reorder = false,
}: {
  title: string;
  choices: QueryColumn[];
  selected: string[];
  onChange: (keys: string[]) => void;
  reorder?: boolean;
}) {
  const groups = [...new Set(choices.map((column) => column.group))];
  const move = (key: string, offset: number) => {
    const next = [...selected];
    const index = next.indexOf(key);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <details className="rounded-lg border bg-card p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        {title} · {selected.length}
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(choices.map((column) => column.key))}
        >
          Seleccionar todas
        </Button>
        <Button variant="outline" size="sm" onClick={() => onChange([])}>
          Limpiar
        </Button>
      </div>
      {reorder && (
        <div
          className="mt-3 max-h-48 overflow-y-auto rounded border p-2"
          aria-label="Orden de columnas"
        >
          {selected.map((key, index) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 py-1 text-xs"
            >
              <span>
                {index + 1}. {(choices.find(column => column.key === key)?.label || columnMap.get(key)?.label)}
              </span>
              <span className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === 0}
                  aria-label={`Subir ${columnMap.get(key)?.label}`}
                  onClick={() => move(key, -1)}
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={index === selected.length - 1}
                  aria-label={`Bajar ${columnMap.get(key)?.label}`}
                  onClick={() => move(key, 1)}
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-bold text-muted-foreground">
              {group}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {choices
                .filter((column) => column.group === group)
                .map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-start gap-2 text-xs"
                  >
                    <Checkbox
                      checked={selected.includes(column.key)}
                      onCheckedChange={(checked) =>
                        onChange(
                          checked
                            ? [...selected, column.key]
                            : selected.filter((key) => key !== column.key),
                        )
                      }
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function ConsultaDinamicaNomina() {
  const {
    user,
    currentCompanyId,
    assignedCenterIds,
    isAdmin,
    isSuperAdmin,
    permissionsLoaded,
    canView,
  } = useAuth();
  if (!permissionsLoaded)
    return (
      <div role="status" className="p-6">
        Cargando permisos…
      </div>
    );
  if (!canView('analitica_nomina'))
    return (
      <div role="alert" className="p-6">
        No tiene permiso para consultar la analítica de Nómina.
      </div>
    );
  if (!currentCompanyId)
    return (
      <div className="p-6">Seleccione una empresa para consultar jornadas.</div>
    );
  // Remount synchronously when identity/scope changes: an old company's result
  // cannot remain visible or exportable while a new request is pending.
  const scope = JSON.stringify([
    user?.id,
    currentCompanyId,
    [...assignedCenterIds].sort(),
    isAdmin,
    isSuperAdmin,
  ]);
  return <PayrollQueryContent key={scope} />;
}

function PayrollQueryContent() {
  const { canExport, companies, currentCompanyId } = useAuth();
  const today = colombiaToday();
  const [startDate, setStartDate] = useState(() => today.slice(0, 7) + '-01');
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(parseISO(today)), 'yyyy-MM-dd'),
  );
  const [period, setPeriod] = useState<PayrollQueryPeriod | null>(null);
  const [mode, setMode] = useState<ViewMode>('detalle');
  const [filters, setFilters] = useState<PayrollQueryFilters>({
    ...EMPTY_QUERY_FILTERS,
  });
  const [fields, setFields] = useState<string[]>(DEFAULT_QUERY_FIELDS);
  const [dimensions, setDimensions] = useState(['month', 'center']);
  const [metrics, setMetrics] = useState([
    'jornada',
    'programmedHours',
    'approvedEvents',
    'pendingEvents',
    'employees',
  ]);
  const [pivotRow, setPivotRow] = useState('employee');
  const [pivotColumn, setPivotColumn] = useState('date');
  const [pivotMetric, setPivotMetric] = useState('jornada');
  const [sort, setSort] = useState({ key: 'date', ascending: true });
  const [pageSize, setPageSize] = useState(50);
  const [paging, setPaging] = useState({ scope: '', page: 0 });
  const [exporting, setExporting] = useState(false);
  const query = usePayrollDynamicQuery(period);
  const rows = useMemo(() => query.data || [], [query.data]);
  const customFields = useMemo<QueryColumn[]>(() => {
    const concepts = [...new Map(rows.flatMap(row => row.events).filter(event => event.concept.startsWith('concept:')).map(event => [event.concept, event])).values()];
    return concepts.flatMap(event => ['approved', 'pending', 'rejected'].map(status => ({
      key: `${status}_${event.concept}`, label: `${event.label} (${event.unit === 'days' ? 'días' : 'horas'}) · ${status === 'approved' ? 'Aprobado' : status === 'pending' ? 'Pendiente' : 'Rechazado'}`, group: 'Conceptos adicionales', numeric: true,
    })));
  }, [rows]);
  const QUERY_COLUMNS = [...BASE_QUERY_COLUMNS, ...customFields];
  const QUERY_METRICS = [...BASE_QUERY_METRICS, ...customFields];
  const columnMap = useMemo(() => new Map([...BASE_QUERY_COLUMNS, ...BASE_QUERY_METRICS, ...customFields].map(column => [column.key, column])), [customFields]);
  const filtered = useMemo(
    () => filterPayrollQueryRows(rows, filters),
    [rows, filters],
  );
  const summary = useMemo(
    () =>
      mode === 'resumen'
        ? summarizePayrollQuery(filtered, dimensions, metrics)
        : [],
    [mode, filtered, dimensions, metrics],
  );
  const pivot = useMemo(
    () =>
      pivotPayrollQuery(
        mode === 'pivote' ? filtered : [],
        pivotRow,
        pivotColumn,
        pivotMetric,
      ),
    [mode, filtered, pivotRow, pivotColumn, pivotMetric],
  );
  const pivotColumns: QueryColumn[] = useMemo(
    () => [
      {
        key: 'pivotLabel',
        label: columnMap.get(pivotRow)?.label || pivotRow,
        group: 'Pivote',
      },
      ...pivot.columns.map((label, index) => ({
        key: `pivot_${index}`,
        label: label || 'Sin dato',
        group: 'Pivote',
        numeric: true,
        description: columnMap.get(pivotMetric)?.description,
      })),
      { key: 'pivotTotal', label: 'Total', group: 'Pivote', numeric: true },
    ],
    [pivot.columns, pivotRow, pivotMetric, columnMap],
  );
  const displayColumns =
    mode === 'detalle'
      ? fields.map((key) => columnMap.get(key)!)
      : mode === 'resumen'
        ? [...dimensions, ...metrics].map((key) => columnMap.get(key)!)
        : pivotColumns;
  const records = useMemo<Record<string, CellValue>[]>(
    () =>
      mode === 'detalle'
        ? filtered.map((row) => ({ ...row.values, rowId: row.id }))
        : mode === 'resumen'
          ? summary
          : pivot.rows.map((row) => ({
              pivotLabel: row.label,
              ...Object.fromEntries(
                row.cells.map((value, index) => [`pivot_${index}`, value]),
              ),
              pivotTotal: row.total,
            })),
    [mode, filtered, summary, pivot.rows],
  );
  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        const left = a[sort.key] ?? '';
        const right = b[sort.key] ?? '';
        const difference =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'es', {
                numeric: true,
              });
        return sort.ascending ? difference : -difference;
      }),
    [records, sort],
  );
  const pageScope = JSON.stringify([
    period,
    query.dataUpdatedAt,
    filters,
    mode,
    dimensions,
    metrics,
    pivotRow,
    pivotColumn,
    pivotMetric,
    sort,
    pageSize,
  ]);
  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const page = Math.min(
    paging.scope === pageScope ? paging.page : 0,
    pageCount - 1,
  );
  const visibleRecords = sortedRecords.slice(
    page * pageSize,
    (page + 1) * pageSize,
  );
  const dirty =
    !!period && (startDate !== period.startDate || endDate !== period.endDate);
  const ready =
    !!period &&
    query.isSuccess &&
    !query.isFetching &&
    !query.isError &&
    !dirty;
  const canDownload =
    ready && canExport('analitica_nomina') && filtered.length > 0 && !exporting;
  const setFilter = (key: keyof PayrollQueryFilters, value: string) =>
    setFilters((previous) => ({ ...previous, [key]: value }));
  const options = (key: string) =>
    [
      ...new Set(
        rows.map((row) => String(row.values[key] || '')).filter(Boolean),
      ),
    ]
      .sort((a, b) => a.localeCompare(b, 'es'))
      .map((value) => ({ value, label: value }));
  const sourceOptions = [
    ...new Set(
      [
        ...rows.map((row) => String(row.values.source || '')),
        ...rows.flatMap((row) => row.events.map((event) => event.source)),
      ].filter(Boolean),
    ),
  ]
    .sort()
    .map((value) => ({ value, label: value }));
  const dimensionOptions = QUERY_DIMENSIONS.map((column) => ({
    value: column.key,
    label: column.label,
  }));
  const metricOptions = QUERY_METRICS.map((column) => ({
    value: column.key,
    label: column.label,
  }));
  const consult = () => {
    if (
      !startDate ||
      !endDate ||
      startDate > endDate ||
      !Number.isFinite(parseISO(startDate).getTime()) ||
      !Number.isFinite(parseISO(endDate).getTime())
    ) {
      toast.error('Seleccione un rango de fechas válido.');
      return;
    }
    if (period?.startDate === startDate && period.endDate === endDate)
      void query.refetch();
    else setPeriod({ startDate, endDate });
  };
  const totals =
    mode === 'resumen'
      ? Object.fromEntries(
          metrics.map((metric) => [metric, queryMetric(filtered, metric)]),
        )
      : mode === 'pivote'
        ? {
            ...Object.fromEntries(
              pivot.totals.map((value, index) => [`pivot_${index}`, value]),
            ),
            pivotTotal: pivot.grandTotal,
          }
        : {};
  const exportData = async (fileFormat: 'xlsx' | 'csv', allFields = false) => {
    if (!canDownload || !period || (!allFields && !displayColumns.length))
      return;
    setExporting(true);
    try {
      const columns =
        allFields && mode === 'detalle' ? QUERY_COLUMNS : displayColumns;
      const companyName =
        companies.find((company) => company.id === currentCompanyId)?.name ||
        '';
      const metadata: Record<string, string> = {
        Empresa: companyName,
        Desde: period.startDate,
        Hasta: period.endDate,
        Vista: mode,
        'Exportado en': new Date().toISOString(),
      };
      Object.entries(filters).forEach(([key, value]) => {
        metadata[
          key === 'search'
            ? 'Búsqueda'
            : columnMap.get(key)?.label ||
              { concept: 'Concepto', approval: 'Aprobación' }[key] ||
              key
        ] = value || 'Todos';
      });
      if (mode === 'resumen') {
        metadata.Agrupaciones = dimensions
          .map((key) => columnMap.get(key)?.label)
          .join(', ');
        metadata.Métricas = metrics
          .map((key) => columnMap.get(key)?.label)
          .join(', ');
      }
      if (mode === 'pivote') {
        metadata.Filas = columnMap.get(pivotRow)?.label || '';
        metadata.Columnas = columnMap.get(pivotColumn)?.label || '';
        metadata.Métrica = columnMap.get(pivotMetric)?.label || '';
      }
      const exportRows =
        mode === 'detalle'
          ? sortedRecords
          : [
              ...sortedRecords,
              {
                ...Object.fromEntries(
                  displayColumns
                    .filter((column) => !column.numeric)
                    .map((column, index) => [
                      column.key,
                      index === 0 ? 'TOTAL' : '',
                    ]),
                ),
                ...totals,
              },
            ];
      await downloadPayrollQuery(
        {
          name: `consulta-nomina-${mode}-${period.startDate}-${period.endDate}`,
          columns,
          rows: exportRows,
          metadata,
        },
        fileFormat,
      );
      toast.success(`${exportRows.length} filas exportadas`);
    } catch (error) {
      toast.error('No se pudo exportar', {
        description:
          error instanceof Error ? error.message : 'Intente nuevamente.',
      });
    } finally {
      setExporting(false);
    }
  };
  const displayValue = (value: CellValue | undefined) =>
    value === '' || value == null
      ? '—'
      : typeof value === 'number'
        ? numberFormatter.format(value)
        : value;

  return (
    <div className="min-w-0 space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Table2 className="h-4 w-4" /> Nómina
          </div>
          <h1 className="text-2xl font-bold">Consulta Dinámica</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jornadas y novedades por empleado y fecha, listas para analizar y
            exportar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!canDownload || !displayColumns.length}
            onClick={() => void exportData('xlsx')}
          >
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            variant="outline"
            disabled={!canDownload || !displayColumns.length}
            onClick={() => void exportData('csv')}
          >
            CSV
          </Button>
        </div>
      </div>
      <section
        className="space-y-4 rounded-xl border bg-card p-4"
        aria-label="Filtros de consulta"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="query-from">Desde</Label>
            <Input
              id="query-from"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="query-to">Hasta</Label>
            <Input
              id="query-to"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <Button
            className="self-end"
            disabled={query.isFetching}
            onClick={consult}
          >
            {query.isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Consultar
          </Button>
          <Button
            variant="outline"
            className="self-end"
            onClick={() => setFilters({ ...EMPTY_QUERY_FILTERS })}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
        <div>
          <Label htmlFor="query-search">Empleado o documento</Label>
          <Input
            id="query-search"
            className="mt-1.5"
            placeholder="Buscar nombre, documento o ID…"
            value={filters.search}
            onChange={(event) => setFilter('search', event.target.value)}
          />
        </div>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            <Filter className="mr-2 inline h-4 w-4" />
            Filtros adicionales
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(
              [
                ['center', 'Centro de operación'],
                ['area', 'Área'],
                ['position', 'Cargo'],
                ['currentStatus', 'Estado actual'],
                ['mode', 'Modalidad'],
                ['shift', 'Turno'],
              ] as const
            ).map(([key, label]) => (
              <Choice
                key={key}
                label={label}
                value={filters[key]}
                onChange={(value) => setFilter(key, value)}
                options={options(key)}
                all
              />
            ))}
            <Choice
              label="Origen"
              value={filters.source}
              onChange={(value) => setFilter('source', value)}
              options={sourceOptions}
              all
            />
            <Choice
              label="Concepto registrado"
              value={filters.concept}
              onChange={(value) => setFilter('concept', value)}
              options={Object.entries(NOVELTY_TYPE_LABELS).filter(([key]) => key !== 'custom')
                .map(([value, label]) => ({ value, label }))
                .concat(
                  [
                    ...new Set(
                      rows.flatMap((row) =>
                        row.events.map((event) => event.concept),
                      ),
                    ),
                  ]
                    .filter((concept) => !(concept in NOVELTY_TYPE_LABELS))
                    .map((value) => ({ value, label: rows.flatMap(row => row.events).find(event => event.concept === value)?.label || value })),
                )}
              all
            />
            <Choice
              label="Aprobación"
              value={filters.approval}
              onChange={(value) => setFilter('approval', value)}
              options={[
                { value: 'approved', label: 'Aprobadas' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'rejected', label: 'Rechazadas' },
              ]}
              all
            />
          </div>
        </details>
      </section>
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Vista de consulta"
      >
        {(['detalle', 'resumen', 'pivote'] as const).map((view) => (
          <Button
            key={view}
            variant={mode === view ? 'default' : 'outline'}
            aria-pressed={mode === view}
            onClick={() => setMode(view)}
          >
            {view === 'detalle'
              ? 'Detalle'
              : view === 'resumen'
                ? 'Resumen'
                : 'Pivote'}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length.toLocaleString('es-CO')} días ·{' '}
          {queryMetric(filtered, 'employees')} empleados
        </span>
      </div>
      {mode === 'detalle' && (
        <div className="space-y-2">
          <FieldSelector
            title="Columnas disponibles"
            choices={QUERY_COLUMNS}
            selected={fields}
            onChange={setFields}
            reorder
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFields([...DEFAULT_QUERY_FIELDS])}
            >
              Restaurar columnas iniciales
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canDownload}
              onClick={() => void exportData('xlsx', true)}
            >
              Exportar todos los campos · Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canDownload}
              onClick={() => void exportData('csv', true)}
            >
              Todos los campos · CSV
            </Button>
          </div>
        </div>
      )}
      {mode === 'resumen' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <FieldSelector
            title="Agrupar por"
            choices={QUERY_DIMENSIONS}
            selected={dimensions}
            onChange={setDimensions}
          />
          <FieldSelector
            title="Métricas"
            choices={QUERY_METRICS}
            selected={metrics}
            onChange={setMetrics}
          />
        </div>
      )}
      {mode === 'pivote' && (
        <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
          <Choice
            label="Filas"
            value={pivotRow}
            onChange={setPivotRow}
            options={dimensionOptions}
          />
          <Choice
            label="Columnas"
            value={pivotColumn}
            onChange={setPivotColumn}
            options={dimensionOptions}
          />
          <Choice
            label="Métrica"
            value={pivotMetric}
            onChange={setPivotMetric}
            options={metricOptions}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Horas programadas y días para nómina según registros disponibles. Los
        recargos son métricas independientes. Los datos históricos faltantes se
        muestran vacíos; el estado del empleado es el actual.
      </p>
      {dirty && (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          Cambió el período. Pulse Consultar para actualizar resultados y
          habilitar la exportación.
        </p>
      )}
      {query.isError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 p-4"
        >
          <p>
            No se pudo completar la consulta. No se exportarán resultados
            parciales.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.error instanceof Error
              ? query.error.message
              : 'Error de carga'}
          </p>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void query.refetch()}
          >
            Reintentar
          </Button>
        </div>
      ) : query.isFetching ? (
        <div
          role="status"
          className="flex items-center justify-center gap-3 rounded-lg border p-12"
        >
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando jornadas y datos históricos…
        </div>
      ) : !period ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Seleccione el período y pulse Consultar.
        </div>
      ) : !displayColumns.length ? (
        <div className="rounded-lg border p-10 text-center">
          Seleccione al menos una columna o métrica.
        </div>
      ) : !sortedRecords.length ? (
        <div
          role="status"
          className="rounded-lg border p-10 text-center text-muted-foreground"
        >
          No hay jornadas con los filtros actuales.
        </div>
      ) : (
        <>
          <div
            className="relative max-h-[65vh] overflow-auto rounded-lg border"
            tabIndex={0}
            aria-label="Resultados de la consulta"
          >
            <table className="w-full border-collapse text-sm">
              <TableHeader className="sticky top-0 z-10 bg-muted">
                <TableRow className="bg-muted">
                  {displayColumns.map((column) => (
                    <TableHead
                      key={column.key}
                      className="min-w-36 whitespace-nowrap border-b px-3 py-2 text-left font-semibold"
                      aria-sort={
                        sort.key === column.key
                          ? sort.ascending
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <button
                        className="flex w-full items-center gap-2"
                        onClick={() =>
                          setSort({
                            key: column.key,
                            ascending:
                              sort.key === column.key ? !sort.ascending : true,
                          })
                        }
                      >
                        {column.label}
                        {sort.key === column.key &&
                          (sort.ascending ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          ))}
                      </button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecords.map((record, index) => (
                  <TableRow
                    key={String(record.rowId || `${page}-${index}`)}
                    className="border-b last:border-b-0 hover:bg-muted/40"
                  >
                    {displayColumns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`max-w-md px-3 py-2 align-top ${column.numeric ? 'text-right tabular-nums' : 'whitespace-nowrap'}`}
                        title={String(record[column.key] ?? '')}
                      >
                        {displayValue(record[column.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {mode !== 'detalle' && (
                <TableFooter className="sticky bottom-0 bg-muted font-semibold">
                  <TableRow className="bg-muted">
                    {displayColumns.map((column, index) => (
                      <TableCell
                        key={column.key}
                        className={`border-t px-3 py-2 ${column.numeric ? 'text-right tabular-nums' : ''}`}
                      >
                        {column.numeric
                          ? displayValue(totals[column.key])
                          : index === 0
                            ? 'TOTAL'
                            : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Label htmlFor="query-page-size">Filas</Label>
              <select
                id="query-page-size"
                className={`${selectClass} w-24`}
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
              >
                {[50, 100, 200].map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
              <span>{sortedRecords.length} resultados</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPaging({ scope: pageScope, page: page - 1 })}
              >
                Anterior
              </Button>
              <span>
                {page + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPaging({ scope: pageScope, page: page + 1 })}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}
      {!canExport('analitica_nomina') && (
        <p className="text-xs text-muted-foreground">
          Su rol permite consultar; requiere el permiso de exportación de
          Analítica Nómina para descargar archivos.
        </p>
      )}
    </div>
  );
}
