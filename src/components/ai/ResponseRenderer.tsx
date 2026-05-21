/**
 * ResponseRenderer.tsx
 * Renderiza la respuesta del AI Data Assistant según su tipo:
 * text | table | chart | kpi
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DataAssistantResponse } from '@/hooks/useDataAssistant';

const CHART_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#6366f1',
  '#ef4444',
  '#14b8a6',
  '#8b5cf6',
  '#64748b',
];

function formatCell(value: unknown) {
  if (value == null || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString('es-CO');
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  return String(value);
}

function KPICard({ data }: { data: Record<string, unknown>[] }) {
  const row = data[0] ?? {};
  const entries = Object.entries(row);

  return (
    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm">
          <span className="text-xs capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</span>
          <span className="text-2xl font-bold text-primary">{formatCell(value)}</span>
        </div>
      ))}
    </div>
  );
}

function toCsv(data: Record<string, unknown>[]) {
  if (!data.length) return '';
  const cols = Object.keys(data[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [cols.map(escape).join(','), ...data.map(row => cols.map(col => escape(row[col])).join(','))].join('\n');
}

function downloadCsv(data: Record<string, unknown>[]) {
  const csv = toCsv(data);
  if (!csv) return;

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analisis_datos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-sm text-muted-foreground">Sin resultados.</p>;

  const cols = Object.keys(data[0]);
  const visible = data.slice(0, 50);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">
          {data.length.toLocaleString('es-CO')} fila{data.length === 1 ? '' : 's'} devuelta{data.length === 1 ? '' : 's'}
        </p>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => downloadCsv(data)}>
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-background">
            <tr>
              {cols.map(col => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-semibold capitalize text-muted-foreground">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={index} className="border-t transition-colors hover:bg-background">
                {cols.map(col => (
                  <td key={col} className="max-w-[220px] truncate whitespace-nowrap px-3 py-2" title={String(row[col] ?? '')}>
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DataChart({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null;

  const cols = Object.keys(data[0]);
  const labelKey = cols.find(col => typeof data[0][col] === 'string') ?? cols[0];
  const valueKey = cols.find(col => typeof data[0][col] === 'number' || Number.isFinite(Number(data[0][col]))) ?? cols[1];
  const chartData = data.map(row => ({ ...row, [valueKey]: Number(row[valueKey] ?? 0) }));
  const isPie = data.length <= 8;

  if (isPie) {
    return (
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-3 h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 28, left: 0 }}>
          <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} angle={-35} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ResponseRendererProps {
  response: DataAssistantResponse;
  showSQL?: boolean;
}

export function ResponseRenderer({ response, showSQL = false }: ResponseRendererProps) {
  const { type, data, explanation, metadata } = response;

  return (
    <div className="space-y-2">
      <div className="text-sm leading-relaxed prose-p:my-1 prose-strong:text-primary prose-ul:ml-4 prose-ul:list-disc prose-li:my-0.5">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>

      {data && data.length > 0 && (
        <>
          {type === 'kpi' && <KPICard data={data} />}
          {type === 'table' && <DataTable data={data} />}
          {type === 'chart' && <DataChart data={data} />}
        </>
      )}

      {metadata && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3" />
          <span>{metadata.row_count.toLocaleString('es-CO')} resultado{metadata.row_count === 1 ? '' : 's'}</span>
          {metadata.sourceTables?.slice(0, 4).map(table => (
            <Badge key={table} variant="outline" className="h-5 px-1.5 text-[9px] font-medium">
              {table}
            </Badge>
          ))}
          {metadata.cappedAt && metadata.row_count >= metadata.cappedAt && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[9px]">
              limite {metadata.cappedAt}
            </Badge>
          )}
        </div>
      )}

      {showSQL && metadata?.sql && (
        <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/30 p-3 text-[11px] text-muted-foreground">
          {metadata.sql}
        </pre>
      )}
    </div>
  );
}
