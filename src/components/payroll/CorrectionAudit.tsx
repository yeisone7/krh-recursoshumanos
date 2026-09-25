import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { correctionClient, correctionEventLabel, colombiaInput, colombiaDateTime, type CorrectionEvent } from '@/lib/payrollCorrections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function CorrectionAudit({ ticketId, employeeId, workDate }: { ticketId?: string; employeeId?: string; workDate?: string }) {
  const { currentCompanyId, hasPermission } = useAuth();
  const [employee, setEmployee] = useState(''); const [actor, setActor] = useState('');
  const [ticket, setTicket] = useState(''); const [module, setModule] = useState('all');
  const [start, setStart] = useState(''); const [end, setEnd] = useState('');
  const [page, setPage] = useState(0);
  const enabled = !!currentCompanyId && (!!ticketId || (!!employeeId && hasPermission('jornadas', 'view')) || hasPermission('correction_tickets', 'export'));
  const rows = useQuery({ queryKey: ['correction-events', currentCompanyId, ticketId, employeeId, workDate], enabled, queryFn: async () => {
    const result: CorrectionEvent[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = correctionClient.from('payroll_correction_events').select('*').eq('company_id', currentCompanyId!).order('occurred_at', { ascending: false }).order('id').range(offset, offset + 499);
      if (ticketId) query = query.eq('ticket_id', ticketId);
      if (employeeId) query = query.eq('employee_id', employeeId).eq('module', 'jornadas');
      if (workDate) query = query.eq('work_date', workDate);
      const r = await query; if (r.error) throw r.error; result.push(...r.data); if (r.data.length < 500) return result;
    }
  } });
  if (!enabled) return null;
  const filtered = (rows.data || []).filter(r => r.employee_name.toLowerCase().includes(employee.toLowerCase()) && r.actor_name.toLowerCase().includes(actor.toLowerCase()) && (!ticket || r.ticket_id?.includes(ticket)) && (module === 'all' || r.module === module) && (!start || (r.work_date || colombiaInput(r.occurred_at).slice(0, 10)) >= start) && (!end || (r.work_date || colombiaInput(r.occurred_at).slice(0, 10)) <= end));
  async function exportRows() {
    try {
      const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtered.map(r => ({ Ticket: r.ticket_id || '', Empleado: r.employee_name, Fecha: r.work_date || '', Momento: colombiaDateTime(r.occurred_at), Usuario: r.actor_name, Módulo: r.module, Acción: correctionEventLabel(r.action), Motivo: r.reason || '', Antes: JSON.stringify(r.old_values), Después: JSON.stringify(r.new_values), Cortes: JSON.stringify(r.cuts) }))), 'Correcciones');
      XLSX.writeFile(wb, 'auditoria-correcciones.xlsx');
    } catch (e) { toast.error((e as Error).message); }
  }
  return <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Auditoría de correcciones</h2><div className="flex gap-2"><Button variant="outline" onClick={() => rows.refetch()}>Actualizar</Button><Button variant="outline" disabled={!filtered.length} onClick={exportRows}>Exportar Excel</Button></div></div>
    <div className="grid gap-2 sm:grid-cols-3" onChange={() => setPage(0)}><Input aria-label="Filtrar empleado" placeholder="Empleado" value={employee} onChange={e => setEmployee(e.target.value)} /><Input aria-label="Filtrar usuario" placeholder="Usuario" value={actor} onChange={e => setActor(e.target.value)} /><select aria-label="Filtrar módulo" className="rounded-md border bg-background p-2" value={module} onChange={e => setModule(e.target.value)}><option value="all">Todos los módulos</option><option value="jornadas">Jornadas</option><option value="novedades">Novedades</option><option value="tickets">Tickets</option></select>{!ticketId && <Input aria-label="Filtrar ticket" placeholder="ID del ticket" value={ticket} onChange={e => setTicket(e.target.value)} />}<Input aria-label="Fecha inicial auditoría" type="date" value={start} onChange={e => setStart(e.target.value)} /><Input aria-label="Fecha final auditoría" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
    {rows.isLoading && <p>Cargando auditoría…</p>}{rows.error && <p role="alert">{rows.error.message}</p>}
    {filtered.slice(page * 25, (page + 1) * 25).map(r => <details key={r.id} className="rounded-md border p-3 text-sm"><summary className="cursor-pointer"><strong>{r.employee_name}</strong> · {r.module} · {correctionEventLabel(r.action)} · {r.work_date || 'Solicitud'}<span className="block text-xs text-muted-foreground">{r.actor_name} · {colombiaDateTime(r.occurred_at)}</span></summary><p className="mt-2">{r.reason}</p><p className="break-all text-xs">Ticket: {r.ticket_id || 'Sin ticket (fecha abierta)'}</p><div className="mt-2 grid gap-3 sm:grid-cols-2"><div><p className="font-medium">Antes</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(r.old_values, null, 2)}</pre></div><div><p className="font-medium">Después</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(r.new_values, null, 2)}</pre></div></div><details className="mt-2"><summary>Cortes activos en ese momento</summary><pre className="overflow-auto text-xs">{JSON.stringify(r.cuts, null, 2)}</pre></details></details>)}
    {!rows.isLoading && !filtered.length && <p className="text-sm text-muted-foreground">Sin eventos para estos filtros.</p>}
    {filtered.length > 25 && <div className="flex items-center gap-3"><Button variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>{page + 1} / {Math.ceil(filtered.length / 25)}</span><Button variant="outline" disabled={(page + 1) * 25 >= filtered.length} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div>}
  </section>;
}
