import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, History, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { payrollClient, cutModule, effectiveCut, cutFormError, colombiaToday, type PayrollCut } from '@/lib/payrollControlCuts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';

type Action = { center: { id: string; name: string }; level: 1 | 2; action: 'create' | 'update' | 'reopen'; cut?: PayrollCut };
const labels = { create: 'Aplicar corte', update: 'Modificar fecha', reopen: 'Reabrir corte' };
export default function CortesControl() {
  const { currentCompanyId, hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [state, setState] = useState('all');
  const [action, setAction] = useState<Action | null>(null);
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null);
  const [date, setDate] = useState(colombiaToday());
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  async function resolveCenters() {
    if (!currentCompanyId) return;
    setResolving(true);
    try {
      const r = await payrollClient.rpc('payroll_cut_resolve_centers', { p_company_id: currentCompanyId });
      if (r.error) throw r.error;
      const pending = r.data.filter(x => x.unresolved_count > 0);
      const names: Record<string, string> = { employee_shift_assignments: 'Jornadas', employee_time_config: 'Configuraciones de jornada', payroll_novelties: 'Novedades', employee_loans: 'Préstamos', employee_deductions: 'Descuentos' };
      setResolution(pending.length ? `Revise el centro y las fechas de la información laboral histórica de los empleados: ${pending.map(x => `${names[x.source_table]} (${x.unresolved_count})`).join(', ')}. Después vuelva a revisar.` : 'Todos los registros tienen centro. Ya puede aplicar cortes.');
    } catch (e) { setResolution((e as Error).message); }
    finally { setResolving(false); }
  }
  const centers = useQuery({ queryKey: ['payroll-cut-centers', currentCompanyId], enabled: !!currentCompanyId, queryFn: async () => {
    const r = await payrollClient.rpc('payroll_cut_centers', { p_company_id: currentCompanyId! }); if (r.error) throw r.error; return r.data || [];
  } });
  const cuts = useQuery({ queryKey: ['payroll-cuts', currentCompanyId], enabled: !!currentCompanyId, refetchInterval: 30_000, queryFn: async () => {
    const r = await payrollClient.from('payroll_control_cuts').select('*').eq('company_id', currentCompanyId!).eq('active', true); if (r.error) throw r.error; return r.data || [];
  } });
  const events = useQuery({ queryKey: ['payroll-cut-events', currentCompanyId, history?.id], enabled: !!currentCompanyId && !!history, queryFn: async () => {
    const result = [];
    for (let offset = 0; ; offset += 500) {
      const r = await payrollClient.from('payroll_control_cut_events').select('*').eq('company_id', currentCompanyId!).eq('operation_center_id', history!.id).order('occurred_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (r.error) throw r.error; result.push(...r.data); if (r.data.length < 500) return result;
    }
  } });
  function open(a: Action) { setAction(a); setDate(a.cut?.cutoff_date || colombiaToday()); setReason(''); setError(''); }
  async function save() {
    if (!action || !currentCompanyId) return;
    const superior = cuts.data?.find(c => c.operation_center_id === action.center.id && c.level === 2)?.cutoff_date;
    const invalid = cutFormError(action.action, date, reason, action.level, superior, action.cut?.cutoff_date);
    if (invalid) { setError(invalid); return; }
    setSaving(true); setError('');
    try {
      const r = await payrollClient.rpc('payroll_cut_change', { p_company_id: currentCompanyId, p_center_id: action.center.id, p_level: action.level, p_action: action.action, p_date: action.action === 'reopen' ? null : date, p_reason: reason.trim(), p_cut_id: action.cut?.id });
      if (r.error) throw r.error;
      setAction(null); toast.success('Corte actualizado. La acción quedó en el historial.');
      await qc.invalidateQueries();
    } catch (e) { setError((e as Error).message || 'No se pudo guardar el corte.'); }
    finally { setSaving(false); }
  }
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-semibold"><ShieldCheck />Cortes de control</h1><p className="mt-1 text-sm text-muted-foreground">Jornadas, Novedades, Asistencia, Préstamos y Descuentos · por centro de operación</p></div><Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ['payroll-cuts'] })}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button></header>
    <div className="flex flex-wrap gap-3"><Input aria-label="Buscar centro" placeholder="Buscar centro…" className="max-w-sm" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Estado del corte" className="rounded-md border bg-background px-3" value={state} onChange={e => setState(e.target.value)}><option value="all">Todos los centros</option><option value="active">Con corte activo</option><option value="open">Sin corte activo</option></select></div>
    {(centers.isError || cuts.isError) && <p role="alert" className="text-destructive">{(centers.error || cuts.error)?.message}</p>}
    {(hasPermission(cutModule(1), 'create') || hasPermission(cutModule(2), 'create')) && <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={resolving} onClick={resolveCenters}>{resolving ? 'Revisando…' : 'Revisar centros de registros históricos'}</Button>{resolution && <p role="status" className="text-sm text-muted-foreground">{resolution}</p>}</div>}
    {(centers.isLoading || cuts.isLoading) ? <p role="status">Cargando cortes…</p> : <div className="overflow-x-auto rounded-xl border bg-card"><Table><TableHeader><TableRow><TableHead>Centro</TableHead><TableHead>Nivel 1 · Operativo</TableHead><TableHead>Nivel 2 · Superior</TableHead><TableHead>Bloqueo efectivo</TableHead><TableHead>Historial</TableHead></TableRow></TableHeader><TableBody>
      {(centers.data || []).filter(c => c.name.toLowerCase().includes(search.toLowerCase())).filter(c => state === 'all' || (state === 'active') === !!cuts.data?.some(x => x.operation_center_id === c.id)).map(center => {
        const rows = (cuts.data || []).filter(c => c.operation_center_id === center.id);
        return <TableRow key={center.id}><TableCell className="font-medium">{center.name}</TableCell>{([1, 2] as const).map(level => {
          const c = rows.find(x => x.level === level); return <TableCell key={level} className="min-w-56"><p>{c?.cutoff_date || 'Sin corte'}</p>{c && <p className="text-xs text-muted-foreground">Aplicado por {c.created_by_name}</p>}<div className="mt-2 flex flex-wrap gap-1">
            {!c && hasPermission(cutModule(level), 'create') && <Button size="sm" variant="outline" onClick={() => open({ center, level, action: 'create' })}>Aplicar</Button>}
            {c && hasPermission(cutModule(level), 'update') && <Button size="sm" variant="outline" onClick={() => open({ center, level, action: 'update', cut: c })}>Modificar fecha</Button>}
            {c && hasPermission(cutModule(level), 'approve') && <Button size="sm" variant="outline" onClick={() => open({ center, level, action: 'reopen', cut: c })}>Reabrir</Button>}
          </div></TableCell>;
        })}<TableCell>{effectiveCut(rows)?.cutoff_date || 'Abierto'}</TableCell><TableCell><Button variant="ghost" aria-label={`Historial de ${center.name}`} onClick={() => setHistory(center)}><History className="h-4 w-4" /></Button></TableCell></TableRow>;
      })}
    </TableBody></Table>{!centers.data?.length && <p className="p-6 text-sm text-muted-foreground">No hay centros autorizados.</p>}</div>}
    <Dialog open={!!action} onOpenChange={v => { if (!v && !saving) setAction(null); }}><DialogContent><DialogHeader><DialogTitle>{action && labels[action.action]} · Nivel {action?.level}</DialogTitle><DialogDescription>{action?.center.name}. La acción y su motivo quedarán registrados.</DialogDescription></DialogHeader>
      {action?.action !== 'reopen' && <div className="space-y-2"><Label htmlFor="cut-date">Fecha de corte (inclusive)</Label><Input id="cut-date" type="date" max={colombiaToday()} value={date} onChange={e => setDate(e.target.value)} /><p className="text-sm text-amber-800">Se permite cerrar con jornadas pendientes. Completar o corregir esas jornadas requerirá reabrir el corte.</p></div>}
      <div className="space-y-2"><Label htmlFor="cut-reason">Motivo</Label><Textarea id="cut-reason" value={reason} onChange={e => setReason(e.target.value)} minLength={5} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={saving} onClick={save}>{saving ? 'Guardando…' : action && labels[action.action]}</Button>
    </DialogContent></Dialog>
    <Dialog open={!!history} onOpenChange={v => !v && setHistory(null)}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Historial · {history?.name}</DialogTitle><DialogDescription>Aplicaciones, modificaciones y reaperturas de ambos niveles.</DialogDescription></DialogHeader>
      {events.isLoading && <p>Cargando historial…</p>}{events.isError && <p role="alert">{events.error.message}</p>}{events.data?.map(e => <article key={e.id} className="space-y-1 border-b py-3 text-sm"><p className="font-medium">Nivel {e.level} · {labels[e.action]} · {e.actor_name}</p><p>{e.old_date || '—'} → {e.new_date || 'Reabierto'} · {new Date(e.occurred_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p><p className="text-muted-foreground">{e.reason}</p></article>)}{events.data?.length === 0 && <p>Sin acciones registradas.</p>}
    </DialogContent></Dialog>
  </div>;
}
