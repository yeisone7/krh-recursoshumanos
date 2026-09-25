import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { reviewLabels, colombiaDateTime, writePayrollRecords, type ScheduleDay } from '@/lib/payrollCorrections';
import { CorrectionTicketRequest } from '@/components/payroll/CorrectionTicketRequest';
import { CorrectionAudit } from '@/components/payroll/CorrectionAudit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

type Employee = { id: string; first_name: string; last_name: string };
type Selection = { employeeId: string; dates: string[] }[];
const dayKey = (d: Pick<ScheduleDay, 'employee_id' | 'work_date'>) => `${d.employee_id}:${d.work_date}`;
export function ScheduleReviewControl({ employees, start, end, selection, days = [], loading, error }: {
  employees: Employee[]; start: string; end: string; selection: Selection; days?: ScheduleDay[]; loading: boolean; error: Error | null;
}) {
  const [open, setOpen] = useState(false);
  const selectedEmployee = selection.length === 1 ? selection[0] : undefined;
  const dates = selectedEmployee?.dates.slice().sort();
  const pending = days.filter(d => d.status === 'pending' || d.status === 'rejected').length;
  return <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" onClick={() => setOpen(true)}>Revisar y aprobar jornadas{pending > 0 && ` · ${pending} pendientes`}</Button>
    <CorrectionTicketRequest defaults={{ module: 'jornadas', employeeId: selectedEmployee?.employeeId, startDate: dates?.[0] || start, endDate: dates?.at(-1) || end }} />
    {error && <span role="alert" className="text-sm text-destructive">No se pudo consultar la aprobación: {error.message}</span>}
    {open && <ReviewDialog employees={employees} days={days} loading={loading} selection={selection} start={start} end={end} close={() => setOpen(false)} />}
  </div>;
}
function ReviewDialog({ employees, days, loading, selection, start, end, close }: { employees: Employee[]; days: ScheduleDay[]; loading: boolean; selection: Selection; start: string; end: string; close: () => void }) {
  const { currentCompanyId, hasPermission } = useAuth(); const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selection.flatMap(s => s.dates.map(d => `${s.employeeId}:${d}`))));
  const [state, setState] = useState('all'); const [search, setSearch] = useState('');
  const [from, setFrom] = useState(start); const [to, setTo] = useState(end);
  const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const [detail, setDetail] = useState<ScheduleDay | null>(null); const [page, setPage] = useState(0);
  const names = new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));
  const filtered = days.filter(d => (state === 'all' || d.status === state) && (names.get(d.employee_id) || '').toLowerCase().includes(search.toLowerCase()) && d.work_date >= from && d.work_date <= to);
  const chosen = filtered.filter(d => selected.has(dayKey(d)));
  async function decide(status: 'approved' | 'rejected') {
    setSaving(true); setError('');
    try {
      await writePayrollRecords(currentCompanyId, chosen.map(d => ({ module: 'jornadas', action: 'approve', values: { employee_id: d.employee_id, work_date: d.work_date, snapshot: d.snapshot, status, reason } })));
      await qc.invalidateQueries({ queryKey: ['schedule-reviews'] }); await qc.invalidateQueries({ queryKey: ['correction-events'] });
      setSelected(new Set()); toast.success(`${chosen.length} jornadas ${status === 'approved' ? 'aprobadas' : 'rechazadas'}.`);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={v => !v && !saving && close()}><DialogContent className="flex max-h-[92vh] max-w-5xl flex-col"><DialogHeader><DialogTitle>Revisión de jornadas</DialogTitle><DialogDescription>Seleccione empleados y días del {start} al {end}. La aprobación conserva la programación revisada, incluidos descansos y horarios administrativos.</DialogDescription></DialogHeader>
    <div className="grid gap-2 sm:grid-cols-4" onChange={() => { setPage(0); setSelected(new Set()); }}><Input aria-label="Buscar empleado para aprobar" placeholder="Empleado" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="Estado de aprobación" className="rounded-md border bg-background p-2" value={state} onChange={e => setState(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(reviewLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><Input aria-label="Revisión desde" type="date" min={start} max={to} value={from} onChange={e => setFrom(e.target.value)} /><Input aria-label="Revisión hasta" type="date" min={from} max={end} value={to} onChange={e => setTo(e.target.value)} /></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filtered.length > 0 && chosen.length === filtered.length} onChange={e => setSelected(new Set(e.target.checked ? filtered.map(dayKey) : []))} />Seleccionar {filtered.length} jornadas filtradas · {chosen.length} seleccionadas</label>
    {loading && <p>Cargando programación…</p>}
    <div className="min-h-0 flex-1 overflow-auto rounded-md border"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-2">Elegir</th><th className="p-2 text-left">Empleado / fecha</th><th className="p-2 text-left">Programación</th><th className="p-2 text-left">Estado</th><th className="p-2">Detalle</th></tr></thead><tbody>{filtered.slice(page * 50, (page + 1) * 50).map(d => <tr key={dayKey(d)} className="border-t"><td className="p-2 text-center"><input type="checkbox" aria-label={`Seleccionar ${names.get(d.employee_id)} ${d.work_date}`} checked={selected.has(dayKey(d))} onChange={e => setSelected(previous => { const next = new Set(previous); if (e.target.checked) next.add(dayKey(d)); else next.delete(dayKey(d)); return next; })} /></td><td className="p-2">{names.get(d.employee_id)}<span className="block text-xs text-muted-foreground">{d.work_date}</span></td><td className="p-2">{d.snapshot.is_rest_day ? 'Descanso' : String(d.snapshot.name)}<span className="block text-xs">{!d.snapshot.is_rest_day && `${String(d.snapshot.start_time).slice(0, 5)} – ${String(d.snapshot.end_time).slice(0, 5)}`}</span></td><td className="p-2">{reviewLabels[d.status]}</td><td className="p-2"><Button size="sm" variant="ghost" onClick={() => setDetail(d)}>Ver</Button></td></tr>)}</tbody></table>{!loading && !filtered.length && <p className="p-4 text-muted-foreground">No hay jornadas programadas para estos filtros.</p>}</div>
    {filtered.length > 50 && <div className="flex items-center gap-2"><Button variant="outline" disabled={!page} onClick={() => setPage(p => p - 1)}>Anterior</Button><span>{page + 1}/{Math.ceil(filtered.length / 50)}</span><Button variant="outline" disabled={(page + 1) * 50 >= filtered.length} onClick={() => setPage(p => p + 1)}>Siguiente</Button></div>}
    {hasPermission('jornadas', 'approve') && <><label className="text-sm">Observación (obligatoria para rechazar)<Textarea value={reason} onChange={e => setReason(e.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={!chosen.length || chosen.length > 2000 || saving} onClick={() => decide('approved')}>Aprobar selección</Button><Button variant="outline" disabled={!chosen.length || chosen.length > 2000 || saving || reason.trim().length < 5} onClick={() => decide('rejected')}>Rechazar selección</Button></div>{chosen.length > 2000 && <p role="alert">Seleccione hasta 2000 jornadas por operación.</p>}</>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={!!detail} onOpenChange={v => !v && setDetail(null)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{detail && names.get(detail.employee_id)} · {detail?.work_date}</DialogTitle><DialogDescription>Programación, revisión e historial del día.</DialogDescription></DialogHeader>{detail && <><p>{reviewLabels[detail.status]}</p>{detail.review?.reviewed_at && <p className="text-sm">{detail.review.reviewed_by_name} · {colombiaDateTime(detail.review.reviewed_at)}</p>}<p>{detail.review?.reason}</p><div className="rounded-md border p-3 text-sm"><p className="font-medium">{String(detail.snapshot.name || "Programación")}</p><p>{detail.snapshot.kind === "administrative" ? "Horario administrativo" : "Turno asignado"} · {detail.snapshot.is_rest_day ? "Descanso" : `${String(detail.snapshot.start_time).slice(0, 5)} – ${String(detail.snapshot.end_time).slice(0, 5)}`}</p><p>Descanso durante la jornada: {String(detail.snapshot.break_minutes || 0)} minutos</p></div><CorrectionAudit employeeId={detail.employee_id} workDate={detail.work_date} /></>}</DialogContent></Dialog>
  </DialogContent></Dialog>;
}
