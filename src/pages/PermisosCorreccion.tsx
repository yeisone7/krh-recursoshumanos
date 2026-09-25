import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { correctionClient, correctionActionLabel, ticketStatus, ticketLabels, colombiaDateTime, colombiaInput, colombiaInputToISO, type CorrectionTicket } from '@/lib/payrollCorrections';
import { CorrectionTicketRequest, TicketActions } from '@/components/payroll/CorrectionTicketRequest';
import { CorrectionAudit } from '@/components/payroll/CorrectionAudit';
import { CorrectionDashboard } from '@/components/payroll/CorrectionDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PermisosCorreccion() {
  const { currentCompanyId, user, hasPermission } = useAuth();
  const [search, setSearch] = useState(''); const [state, setState] = useState('all');
  const [activeView, setActiveView] = useState<'dashboard' | 'requests'>('dashboard');
  const [history, setHistory] = useState<CorrectionTicket | null>(null);
  const [transition, setTransition] = useState<{ ticket: CorrectionTicket; action: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const canRead = ['view', 'create', 'approve', 'update', 'export'].some(a => hasPermission('correction_tickets', a)) || hasPermission('jornadas', 'approve') || hasPermission('novedades', 'approve');
  const canAnalytics = hasPermission('correction_tickets_analytics', 'view');
  const view = canAnalytics && activeView === 'dashboard' ? 'dashboard' : canRead ? 'requests' : 'dashboard';
  const tickets = useQuery({ queryKey: ['correction-tickets', currentCompanyId], enabled: !!currentCompanyId && canRead, refetchInterval: 15000, queryFn: async () => {
    const result: CorrectionTicket[] = [];
    for (let offset = 0; ; offset += 500) {
      const r = await correctionClient.from('payroll_correction_tickets').select('*').eq('company_id', currentCompanyId!).order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (r.error) throw r.error; result.push(...r.data); if (r.data.length < 500) return result;
    }
  } });
  if (!canRead && !canAnalytics) return <p className="p-6">Su rol no tiene acceso a los permisos de corrección.</p>;
  const filtered = (tickets.data || []).filter(t => `${t.number} ${t.employee_name} ${t.requested_by_name} ${t.center_name}`.toLowerCase().includes(search.toLowerCase()) && (state === 'all' || ticketStatus(t, now) === state));
  return <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-muted-foreground">Cortes de control</p><h1 className="text-2xl font-semibold">Permisos de corrección</h1><p className="mt-1 text-sm text-muted-foreground">Un empleado, fechas concretas y un plazo para editar y aprobar. Los cortes permanecen activos.</p></div><CorrectionTicketRequest /></header>
    {hasPermission('cortes_control', 'view') && <Link className="text-sm underline" to="/cortes-control">Volver a cortes de control</Link>}
    {canAnalytics && canRead && <div role="tablist" aria-label="Vistas de permisos de corrección" className="flex gap-2 border-b pb-2"><Button role="tab" aria-selected={view === 'dashboard'} variant={view === 'dashboard' ? 'default' : 'outline'} onClick={() => setActiveView('dashboard')}>Dashboard</Button><Button role="tab" aria-selected={view === 'requests'} variant={view === 'requests' ? 'default' : 'outline'} onClick={() => setActiveView('requests')}>Solicitudes</Button></div>}
    {view === 'dashboard' ? <CorrectionDashboard /> : <>
    <div className="flex flex-wrap gap-3"><Input className="max-w-md" aria-label="Buscar permiso" placeholder="Empleado, solicitante, centro o número" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Estado del permiso" className="rounded-md border bg-background p-2" value={state} onChange={e => setState(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(ticketLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Button variant="outline" onClick={() => tickets.refetch()}>Actualizar</Button></div>
    {tickets.isLoading && <p>Cargando permisos…</p>}{tickets.error && <p role="alert">{tickets.error.message}</p>}
    {filtered.map(t => { const status = ticketStatus(t, now); return <article key={t.id} className="space-y-3 rounded-lg border bg-card p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">#{t.number} · {t.employee_name}</h2><span className="rounded-full border px-3 py-1 text-xs">{ticketLabels[status]}</span></div><p className="text-sm">{t.center_name} · {t.start_date} al {t.end_date} · Solicitante: {t.requested_by_name}</p><p className="text-sm">Vence: <strong>{colombiaDateTime(t.expires_at)}</strong> (Colombia)</p><p className="text-sm text-muted-foreground">{t.reason}</p><p className="text-xs">{t.actions.map(correctionActionLabel).join(' / ')}</p>{status === 'expired' && <p className="text-sm text-amber-800">El plazo terminó. Los cambios se conservan; para editar o aprobar pendientes debe solicitar otro ticket.</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setHistory(t)}>Historial y cambios</Button>
      {status === 'requested' && t.requested_by !== user?.id && hasPermission('correction_tickets', 'approve') && <><Button size="sm" onClick={() => setTransition({ ticket: t, action: 'authorize' })}>Autorizar</Button><Button size="sm" variant="outline" onClick={() => setTransition({ ticket: t, action: 'reject' })}>Rechazar</Button></>}
      {status === 'active' && hasPermission('correction_tickets', 'update') && <Button size="sm" variant="outline" onClick={() => setTransition({ ticket: t, action: 'revoke' })}>Revocar</Button>}
      {t.requested_by === user?.id && ['requested', 'active'].includes(status) && hasPermission('correction_tickets', 'create') && <Button size="sm" variant="outline" onClick={() => setTransition({ ticket: t, action: status === 'requested' ? 'cancel' : 'finish' })}>{status === 'requested' ? 'Cancelar solicitud' : 'Finalizar permiso'}</Button>}
    </div></article>; })}
    {!tickets.isLoading && !filtered.length && <p className="text-sm text-muted-foreground">No hay permisos para estos filtros.</p>}
    <Dialog open={!!history} onOpenChange={v => !v && setHistory(null)}><DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>Ticket #{history?.number} · {history?.employee_name}</DialogTitle><DialogDescription>Solicitud, decisiones y cambios registrados por el servidor.</DialogDescription></DialogHeader>{history && <CorrectionAudit ticketId={history.id} />}</DialogContent></Dialog>
    {transition && <TransitionDialog {...transition} close={() => setTransition(null)} />}
    </>}
  </div>;
}
function TransitionDialog({ ticket, action, close }: { ticket: CorrectionTicket; action: string; close: () => void }) {
  const qc = useQueryClient(); const [start, setStart] = useState(ticket.start_date); const [end, setEnd] = useState(ticket.end_date);
  const [expires, setExpires] = useState(colombiaInput(ticket.expires_at)); const [actions, setActions] = useState(ticket.actions);
  const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const title = ({ authorize: 'Autorizar', reject: 'Rechazar', revoke: 'Revocar', cancel: 'Cancelar solicitud', finish: 'Finalizar permiso' } as Record<string, string>)[action];
  async function save() {
    setSaving(true); setError('');
    try {
      const r = await correctionClient.rpc('payroll_ticket_transition', { p_id: ticket.id, p_action: action, p_reason: reason, ...(action === 'authorize' ? { p_start: start, p_end: end, p_expires: colombiaInputToISO(expires), p_actions: actions } : {}) });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ['correction-tickets'] }); await qc.invalidateQueries({ queryKey: ['correction-events'] }); toast.success('Decisión registrada.'); close();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={v => !v && !saving && close()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{title} · Ticket #{ticket.number}</DialogTitle><DialogDescription>{ticket.employee_name}. Puede reducir el alcance; ampliarlo exige otra solicitud.</DialogDescription></DialogHeader>
    {action === 'authorize' && <><div className="grid grid-cols-2 gap-3"><label className="text-sm">Desde<Input type="date" min={ticket.start_date} max={end} value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-sm">Hasta<Input type="date" min={start} max={ticket.end_date} value={end} onChange={e => setEnd(e.target.value)} /></label></div><label className="text-sm">Vence (Colombia)<Input type="datetime-local" max={colombiaInput(ticket.expires_at)} value={expires} onChange={e => setExpires(e.target.value)} /></label><TicketActions value={actions} allowed={ticket.actions} onChange={setActions} /></>}
    {action === 'finish' && <p className="text-sm text-amber-800">También termina la posibilidad de aprobar con este ticket. Los pendientes necesitarán otro permiso.</p>}
    <label className="text-sm">Motivo de la decisión<Textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} /></label>{error && <p role="alert">{error}</p>}<Button disabled={saving || reason.trim().length < 5 || !actions.length} onClick={save}>{saving ? 'Guardando…' : title}</Button>
  </DialogContent></Dialog>;
}
