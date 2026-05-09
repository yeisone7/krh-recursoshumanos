/**
 * ResponseRenderer.tsx
 * Renderiza la respuesta del AI Data Assistant según su tipo:
 * text | table | chart | kpi
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import type { DataAssistantResponse } from '@/hooks/useDataAssistant';

// Paleta de colores corporativa
const CHART_COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#10b981',
  '#f43f5e', '#8b5cf6', '#14b8a6', '#fb923c',
];

// ─── KPI Card ────────────────────────────────────────────────

function KPICard({ data }: { data: Record<string, unknown>[] }) {
  const row = data[0] ?? {};
  const entries = Object.entries(row);

  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border bg-card p-4 flex flex-col gap-1 shadow-sm"
        >
          <span className="text-xs text-muted-foreground capitalize">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-2xl font-bold text-primary">
            {typeof value === 'number'
              ? value.toLocaleString('es-CO')
              : String(value ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────

function DataTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return <p className="text-muted-foreground text-sm">Sin resultados.</p>;
  const cols = Object.keys(data[0]);
  const visible = data.slice(0, 50);

  return (
    <div className="overflow-x-auto rounded-lg border mt-2">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/60 sticky top-0">
          <tr>
            {cols.map(c => (
              <th key={c} className="px-3 py-2 text-left font-semibold text-muted-foreground capitalize whitespace-nowrap">
                {c.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30 transition-colors">
              {cols.map(c => (
                <td key={c} className="px-3 py-2 whitespace-nowrap max-w-[180px] truncate">
                  {row[c] == null ? '—' : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart ────────────────────────────────────────────────────

function DataChart({ data }: { data: Record<string, unknown>[] }) {
  if (!data.length) return null;

  const cols = Object.keys(data[0]);
  const labelKey = cols.find(c => typeof data[0][c] === 'string') ?? cols[0];
  const valueKey = cols.find(c => typeof data[0][c] === 'number') ?? cols[1];

  const isPie = data.length <= 8;

  if (isPie) {
    return (
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
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
    <div className="mt-3 h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
          <XAxis
            dataKey={labelKey}
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── ResponseRenderer (exportado) ────────────────────────────

interface ResponseRendererProps {
  response: DataAssistantResponse;
  showSQL?: boolean;
}

export function ResponseRenderer({ response, showSQL = false }: ResponseRendererProps) {
  const { type, data, explanation, metadata } = response;

  return (
    <div className="space-y-2">
      {/* Explicación en lenguaje natural con soporte Markdown */}
      <div className="text-sm leading-relaxed prose-p:my-1 prose-strong:text-primary prose-ul:list-disc prose-ul:ml-4 prose-li:my-0.5">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>

      {/* Visualización según tipo */}
      {data && data.length > 0 && (
        <>
          {type === 'kpi'   && <KPICard   data={data} />}
          {type === 'table' && <DataTable data={data} />}
          {type === 'chart' && <DataChart data={data} />}
        </>
      )}

    </div>
  );
}
