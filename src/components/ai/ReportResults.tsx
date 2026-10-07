import { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowDownUp, Download, Star, Volume2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  collectReportRows,
  exportReport,
  formatReportCell,
  reportRequest,
  type ReportResult,
} from '@/lib/reporting';

const palette = [
  '#0284c7',
  '#7c3aed',
  '#0d9488',
  '#ea580c',
  '#db2777',
  '#4f46e5',
];
const indicatorStyles = [
  'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
  'border-violet-200 bg-violet-50 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100',
  'border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100',
  'border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100',
  'border-pink-200 bg-pink-50 text-pink-950 dark:border-pink-700 dark:bg-pink-950 dark:text-pink-100',
  'border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100',
];
const tooltipStyle = { borderRadius: 12, border: '1px solid #cbd5e1', color: '#0f172a', backgroundColor: '#ffffff', boxShadow: '0 8px 24px #0f172a18' };
export function ReportResults({
  report,
  companyId,
  companyName,
  busy,
  onPage,
  onFavorite,
  onRefine,
}: {
  report: ReportResult;
  companyId: string;
  companyName: string;
  busy: boolean;
  onPage: (params: Record<string, unknown>) => void;
  onFavorite: () => void;
  onRefine: (question: string) => void;
}) {
  const [chart, setChart] = useState(report.plan.chart),
    [search, setSearch] = useState(''),
    [order, setOrder] = useState<string>(),
    [desc, setDesc] = useState(false),
    [refinement, setRefinement] = useState('');
  const [progress, setProgress] = useState<string>(),
    [exportError, setExportError] = useState('');
  const controller = useRef<AbortController>();
  const graph = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  const numeric = report.columns.filter(
    (c) =>
      c.type === 'number' && report.plan.metrics.some((m) => m.key === c.key),
  );
  const label = report.columns.find((c) => !numeric.includes(c));
  const compatible = !!label && numeric.length > 0 && report.series.length > 0;
  const donut =
    compatible &&
    numeric.length === 1 &&
    ['count', 'sum', 'distinct'].includes(report.plan.metrics[0]?.op) &&
    report.series.every((r) => Number(r[numeric[0].key]) >= 0);
  const page = (offset: number, changes: Record<string, unknown> = {}) =>
    onPage({ offset, order, desc, search, ...changes });
  async function download(format: 'csv' | 'xlsx' | 'pdf') {
    const abort = new AbortController();
    controller.current = abort;
    setProgress('Preparando descarga…');
    setExportError('');
    try {
      const rows = await collectReportRows(
        (offset) =>
          reportRequest<ReportResult>(
            companyId,
            'export',
            { id: report.id, offset, pageSize: 1000 },
            abort.signal,
          ),
        abort.signal,
        (n, total) =>
          setProgress(
            `${n.toLocaleString('es-CO')} de ${total.toLocaleString('es-CO')} filas`,
          ),
      );
      setProgress('Creando archivo…');
      await exportReport(
        format,
        report,
        rows,
        companyName,
        abort.signal,
        graph.current,
      );
    } catch (e) {
      if (!abort.signal.aborted) setExportError((e as Error).message);
    } finally {
      setProgress(undefined);
    }
  }
  return (
    <article
      className="rounded-2xl border bg-card shadow-sm overflow-hidden"
      aria-label="Resultado del reporte"
      aria-busy={busy}
    >
      <div className="p-5 sm:p-7 border-b border-t-4 border-t-sky-500 bg-sky-50/40 dark:bg-sky-950/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
              Reporte generado
            </p>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{report.title}</h2>
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(report.createdAt).toLocaleString('es-CO', {
                timeZone: 'America/Bogota',
              })}{' '}
              · {report.provider} · Ejecución {report.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onFavorite}
              disabled={busy}
            >
              <Star className="h-4 w-4 mr-1" />
              Guardar favorita
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Leer resumen"
              disabled={!window.speechSynthesis}
              onClick={() => {
                if (
                  !window.speechSynthesis ||
                  typeof SpeechSynthesisUtterance === 'undefined'
                )
                  return;
                window.speechSynthesis?.cancel();
                const speech = new SpeechSynthesisUtterance(
                  `${report.title}. ${report.summary}`,
                );
                speech.lang = 'es-CO';
                window.speechSynthesis?.speak(speech);
              }}
            >
              <Volume2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="mt-4 border-l-4 border-sky-500 pl-4 text-sm leading-relaxed text-foreground">
          {report.summary}
        </p>
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          {report.sources.map((s) => (
            <span key={s.key} className="bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100 rounded-full px-3 py-1 font-medium">
              {s.label}
            </span>
          ))}
          <span className="bg-secondary rounded-full px-3 py-1">
            {report.filters.startDate || 'Sin fecha inicial'} →{' '}
            {report.filters.endDate || 'Sin fecha final'}
          </span>
        </div>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="cursor-pointer">
            Ver filtros interpretados
          </summary>
          <ul className="mt-2 space-y-1">
            {(report.effectiveFilters || []).map((filter, index) => (
              <li key={index}>
                {filter.label}: {filter.value}
              </li>
            ))}
            {report.plan.limit && (
              <li>Primeros {report.plan.limit} resultados solicitados</li>
            )}
          </ul>
        </details>
      </div>
      {report.indicators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5 sm:px-7">
          {report.indicators.map((i, index) => (
            <div key={index} className={`relative overflow-hidden rounded-xl border p-5 shadow-sm ${indicatorStyles[index % indicatorStyles.length]}`}>
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: palette[index % palette.length] }} />
              <p className="text-sm font-medium">{i.label}</p>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums break-words mt-3">
                {formatReportCell(i.value, {
                  key: '',
                  label: i.label,
                  type: 'number',
                  unit: i.unit,
                })}
              </p>
              {i.unit && !['COP', 'percent'].includes(i.unit) && (
                <p className="text-xs mt-2">
                  {{ minutes: 'minutos', hours: 'horas', days: 'días' }[i.unit]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {compatible && (
        <section className="p-5 sm:px-7" aria-label="Gráfico">
          <div className="flex flex-wrap justify-between gap-3 mb-5">
            <h3 className="font-semibold text-base">Visualización</h3>
            <div className="flex gap-1">
              {(['bar', 'line', 'donut'] as const)
                .filter((c) => c !== 'donut' || donut)
                .map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant={chart === c ? 'secondary' : 'ghost'}
                    className={chart === c ? 'bg-sky-700 text-white hover:bg-sky-800' : ''}
                    onClick={() => setChart(c)}
                    aria-pressed={chart === c}
                  >
                    {{ bar: 'Barras', line: 'Líneas', donut: 'Dona' }[c]}
                  </Button>
                ))}
            </div>
          </div>
          <div ref={graph} className="h-80 rounded-xl border border-slate-200 bg-white p-3">
            <ResponsiveContainer width="100%" height="100%">
              {chart === 'donut' && donut ? (
                <PieChart>
                  <Pie
                    data={report.series}
                    dataKey={numeric[0].key}
                    nameKey={label.key}
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {report.series.map((_, i) => (
                      <Cell key={i} fill={palette[i % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              ) : chart === 'line' ? (
                <LineChart data={report.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={label.key} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  {numeric.map((c, i) => (
                    <Line
                      key={c.key}
                      name={c.label}
                      type="monotone"
                      dataKey={c.key}
                      stroke={palette[i % palette.length]}
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={report.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey={label.key} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#e0f2fe' }} />
                  {numeric.length > 1 && <Legend />}
                  {numeric.map((c, i) => (
                    <Bar
                      key={c.key}
                      name={c.label}
                      dataKey={c.key}
                      fill={palette[i % palette.length]}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={64}
                    >
                      {numeric.length === 1 && report.series.map((_, index) => (
                        <Cell key={index} fill={palette[index % palette.length]} />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          {report.seriesTruncated && (
            <p className="text-xs text-muted-foreground mt-2">
              El gráfico muestra los primeros 60 grupos. La tabla y la
              exportación incluyen el resultado completo.
            </p>
          )}
        </section>
      )}
      {report.comparison && (
        <div className="m-5 p-4 rounded-xl border border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/30 text-sm">
          <h3 className="font-medium">
            Comparación: {report.comparison.startDate} a{' '}
            {report.comparison.endDate}
          </h3>
          <p className="text-muted-foreground">
            {report.comparison.totalRows} grupos en el periodo anterior.
          </p>
          <div className="max-h-48 overflow-auto mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c.key} className="text-left p-2">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.comparison.rows.map((r, i) => (
                  <tr key={i}>
                    {report.columns.map((c) => (
                      <td key={c.key} className="p-2">
                        {formatReportCell(r[c.key], c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <section
        className="border-t p-5 sm:px-7"
        aria-label="Tabla de resultados"
      >
        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <h3 className="font-medium">
            Detalle{' '}
            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-900 dark:bg-sky-900 dark:text-sky-100 text-sm font-semibold tabular-nums">
              {report.totalRows.toLocaleString('es-CO')}
            </span>
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              page(0);
            }}
            className="flex gap-2"
          >
            <Input
              className="w-44"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el resultado"
              aria-label="Buscar en la tabla"
              maxLength={200}
            />
            <Button variant="outline" disabled={busy}>
              Filtrar
            </Button>
          </form>
        </div>
        {report.rows.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">
            No hay registros para estos filtros. Puedes ajustar tu pregunta o el
            periodo.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-sky-800 text-white">
                <tr>
                  {report.columns.map((c) => (
                    <th
                      key={c.key}
                      className="text-left p-3 whitespace-nowrap"
                      aria-sort={
                        order === c.key
                          ? desc
                            ? 'descending'
                            : 'ascending'
                          : 'none'
                      }
                    >
                      <button
                        className="flex items-center gap-2"
                        disabled={busy}
                        onClick={() => {
                          const next = order === c.key ? !desc : false;
                          setOrder(c.key);
                          setDesc(next);
                          page(0, { order: c.key, desc: next });
                        }}
                      >
                        {c.label}
                        <ArrowDownUp className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r, i) => (
                  <tr
                    key={report.offset + i}
                    className="border-b last:border-0 even:bg-sky-50/50 hover:bg-sky-100/70 dark:even:bg-sky-950/20 dark:hover:bg-sky-900/30"
                  >
                    {report.columns.map((c) => (
                      <td key={c.key} className={`p-3 whitespace-nowrap ${numeric.includes(c) ? 'font-bold tabular-nums text-sky-800 dark:text-sky-200' : ''}`}>
                        {formatReportCell(r[c.key], c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 mt-4">
          <span className="text-xs text-muted-foreground">
            {report.totalRows ? report.offset + 1 : 0}–
            {Math.min(report.offset + report.rows.length, report.totalRows)} de{' '}
            {report.totalRows}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || report.offset === 0}
              onClick={() => page(Math.max(0, report.offset - report.pageSize))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                busy || report.offset + report.pageSize >= report.totalRows
              }
              onClick={() => page(report.offset + report.pageSize)}
            >
              Siguiente
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-5">
          <Download className="w-4 h-4 text-muted-foreground" />
          {(['xlsx', 'csv', 'pdf'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant="outline"
              disabled={!report.canExport || !!progress}
              onClick={() => download(f)}
            >
              {f === 'xlsx' ? 'Excel' : f.toUpperCase()}
            </Button>
          ))}
          <span className="text-xs text-muted-foreground">
            {report.canExport
              ? 'Descarga completa · hasta 50.000 filas'
              : 'Tu perfil no tiene permiso de exportación'}
          </span>
        </div>
        {progress && (
          <div role="status" className="flex items-center gap-2 text-sm mt-3">
            {progress}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => controller.current?.abort()}
            >
              <X className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
          </div>
        )}
        {exportError && (
          <p role="alert" className="text-sm text-destructive mt-3">
            {exportError}
          </p>
        )}
      </section>
      <form
        className="bg-muted/30 p-5 sm:px-7 border-t"
        onSubmit={(e) => {
          e.preventDefault();
          if (refinement.trim()) onRefine(refinement);
        }}
      >
        <label htmlFor="report-refinement" className="text-sm font-medium">
          Refinar reporte
        </label>
        <div className="flex gap-2 mt-2">
          <Input
            id="report-refinement"
            placeholder="Por ejemplo: agrúpalo por centro"
            value={refinement}
            maxLength={2000}
            onChange={(e) => setRefinement(e.target.value)}
          />
          <Button disabled={busy || !refinement.trim()}>Refinar</Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {[
            'Compáralo con el periodo anterior',
            'Agrúpalo por centro',
            'Muéstrame el detalle',
          ].map((q) => (
            <button
              type="button"
              key={q}
              className="text-xs text-primary hover:underline"
              onClick={() => setRefinement(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </form>
    </article>
  );
}
