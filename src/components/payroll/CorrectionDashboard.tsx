import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { correctionClient, ticketLabels, type CorrectionAnalytics } from '@/lib/payrollCorrections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const dayInColombia = () => new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
const firstDayOfMonth = (monthsBack: number) => {
  const [year, month] = dayInColombia().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 - monthsBack, 1)).toISOString().slice(0, 10);
};
const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

function Ranking({ title, rows, onCenter }: { title: string; rows: CorrectionAnalytics['employees']; onCenter?: (id: string) => void }) {
  return <section className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">{title}</h3>
    {rows.length ? <div className="space-y-2">{rows.map((row, index) => <div key={row.id} className="flex items-center gap-3 text-sm">
      <span className="w-5 text-muted-foreground">{index + 1}</span>
      {onCenter ? <button className="min-w-0 flex-1 truncate text-left underline-offset-2 hover:underline" onClick={() => onCenter(row.id)} title={`Filtrar ${row.name}`}>{row.name}</button> : <span className="min-w-0 flex-1 truncate" title={row.name}>{row.name}</span>}
      <strong>{number(row.count)}</strong>
    </div>)}</div> : <p className="text-sm text-muted-foreground">Sin solicitudes en este período.</p>}
  </section>;
}

export function CorrectionDashboard() {
  const { currentCompanyId } = useAuth();
  const [allHistory, setAllHistory] = useState(false);
  const [from, setFrom] = useState(() => firstDayOfMonth(11));
  const [to, setTo] = useState(dayInColombia);
  const [center, setCenter] = useState('all');
  const [status, setStatus] = useState('all');
  const datesValid = allHistory || (!from || !to || from <= to);
  const result = useQuery({
    queryKey: ['correction-analytics', currentCompanyId, allHistory, from, to, center, status],
    enabled: !!currentCompanyId && datesValid,
    queryFn: async () => {
      const response = await correctionClient.rpc('payroll_correction_analytics', {
        p_company_id: currentCompanyId!, p_from: allHistory ? null : from || null,
        p_to: allHistory ? null : to || null, p_center_id: center === 'all' ? null : center,
        p_status: status === 'all' ? null : status,
      });
      if (response.error) throw response.error;
      return response.data as unknown as CorrectionAnalytics;
    }, staleTime: 30000,
  });
  const data = result.data;
  const trend = useMemo(() => data?.trend ?? [], [data]);
  const selectMonth = (month: string) => {
    const [year, number] = month.split('-').map(Number);
    setAllHistory(false);
    setFrom(`${month}-01`);
    setTo(new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10));
  };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
      <label className="text-sm">Desde<Input aria-label="Analítica desde" type="date" disabled={allHistory} value={from} onChange={event => setFrom(event.target.value)} /></label>
      <label className="text-sm">Hasta<Input aria-label="Analítica hasta" type="date" disabled={allHistory} value={to} onChange={event => setTo(event.target.value)} /></label>
      <label className="text-sm">Centro<select aria-label="Centro de la analítica" className="block h-10 min-w-40 rounded-md border bg-background px-3" value={center} onChange={event => setCenter(event.target.value)}><option value="all">Todos mis centros</option>{data?.centerOptions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm">Estado<select aria-label="Estado de la analítica" className="block h-10 min-w-36 rounded-md border bg-background px-3" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Todos</option>{Object.entries(ticketLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <Button variant={allHistory ? 'default' : 'outline'} onClick={() => setAllHistory(value => !value)}>Todo el historial</Button>
      <Button variant="outline" onClick={() => { setAllHistory(false); setFrom(firstDayOfMonth(11)); setTo(dayInColombia()); setCenter('all'); setStatus('all'); }}>Restablecer</Button>
      <Button variant="outline" onClick={() => result.refetch()} disabled={!datesValid}>Actualizar</Button>
    </div>
    {!datesValid && <p role="alert" className="text-sm text-destructive">La fecha inicial no puede ser posterior a la final.</p>}
    {result.isLoading && <p>Cargando analítica…</p>}
    {result.error && <p role="alert" className="text-sm text-destructive">No se pudo cargar la analítica: {result.error.message}</p>}
    {data && <>
      <p className="text-xs text-muted-foreground">Solicitudes por fecha de creación; cambios por fecha de ejecución. Solo incluye centros autorizados y cambios vinculados a permisos.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{([
        ['Solicitudes', data.summary.requests], ['Cambios realizados', data.summary.changes], ['Pendientes', data.summary.pending],
        ['Activos', data.summary.active], ['Vencidos', data.summary.expired],
      ] as const).map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold">{number(value)}</p></div>)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Solicitudes y cambios por mes</h3><div className="h-72">
          {trend.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={trend} onClick={event => event?.activeLabel && selectMonth(String(event.activeLabel))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="requests" name="Solicitudes" fill="hsl(var(--primary))" /><Bar dataKey="changes" name="Cambios" fill="hsl(var(--secondary))" /></BarChart></ResponsiveContainer> : <p className="text-sm text-muted-foreground">Sin actividad en este período.</p>}
        </div><p className="text-xs text-muted-foreground">Seleccione un mes para filtrar.</p></section>
        <section className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">Estado de las solicitudes</h3><div className="grid gap-2 sm:grid-cols-2">{data.statuses.map(item => <button key={item.key} className="flex justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setStatus(item.key)}><span>{ticketLabels[item.key as keyof typeof ticketLabels] || item.key}</span><strong>{number(item.count)}</strong></button>)}</div>{!data.statuses.length && <p className="text-sm text-muted-foreground">Sin solicitudes en este período.</p>}</section>
      </div>
      <div className="grid gap-4 lg:grid-cols-3"><Ranking title="Usuarios que más solicitan" rows={data.requesters} /><Ranking title="Empleados con más solicitudes" rows={data.employees} /><Ranking title="Centros con más solicitudes" rows={data.centers} onCenter={setCenter} /></div>
      <div className="grid gap-4 md:grid-cols-3">{([
        ['Cambios por módulo', data.modules.map(row => ({ ...row, label: row.key === 'jornadas' ? 'Jornadas' : 'Novedades' }))],
        ['Tipos de cambio', data.actions.map(row => ({ ...row, label: ({ create: 'Creación', insert: 'Creación', update: 'Modificación', delete: 'Eliminación', upsert: 'Asignación' } as Record<string, string>)[row.key] || row.key }))],
        ['Decisiones de autorización', data.decisions.map(row => ({ ...row, label: row.key === 'authorize' ? 'Autorizadas' : 'Rechazadas' }))],
      ] as const).map(([title, rows]) => <section key={title} className="rounded-xl border bg-card p-4"><h3 className="mb-3 font-semibold">{title}</h3>{rows.length ? rows.map(row => <div key={row.key} className="flex justify-between py-1 text-sm"><span>{row.label}</span><strong>{number(row.count)}</strong></div>) : <p className="text-sm text-muted-foreground">Sin datos en este período.</p>}</section>)}</div>
    </>}
  </div>;
}
