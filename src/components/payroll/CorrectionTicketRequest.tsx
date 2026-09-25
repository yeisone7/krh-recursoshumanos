import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { correctionClient, correctionActionLabels, colombiaInput, colombiaInputToISO, correctionExpiryError, type CorrectionModule } from '@/lib/payrollCorrections';
import { colombiaToday } from '@/lib/payrollControlCuts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

export type TicketRequestDefaults = { employeeId?: string; startDate?: string; endDate?: string; centerId?: string; module?: CorrectionModule };
export function CorrectionTicketRequest({ defaults = {}, label = 'Solicitar permiso de corrección' }: { defaults?: TicketRequestDefaults; label?: string }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  if (!hasPermission('correction_tickets', 'create')) return null;
  return <><Button variant="outline" onClick={() => setOpen(true)}>{label}</Button>{open && <TicketRequestForm defaults={defaults} close={() => setOpen(false)} />}</>;
}
function TicketRequestForm({ defaults, close }: { defaults: TicketRequestDefaults; close: () => void }) {
  const { currentCompanyId } = useAuth();
  const qc = useQueryClient();
  const { data: employees = [], isLoading: loadingEmployees, error: employeesError } = useEmployees();
  const { data: centers = [], error: centersError } = useOperationCenters();
  const [employee, setEmployee] = useState(defaults.employeeId || '');
  const [center, setCenter] = useState(defaults.centerId || '');
  const [start, setStart] = useState(defaults.startDate || colombiaToday());
  const [end, setEnd] = useState(defaults.endDate || defaults.startDate || colombiaToday());
  const [expires, setExpires] = useState(colombiaInput(new Date(Date.now() + 86400000).toISOString()));
  const [actions, setActions] = useState<string[]>([`${defaults.module || 'jornadas'}:update`, `${defaults.module || 'jornadas'}:approve`]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const expiryError = correctionExpiryError(expires);
  useEffect(() => { if (!center && centers.length === 1) setCenter(centers[0].id); }, [center, centers]);
  async function save() {
    if (!currentCompanyId) return;
    const currentExpiryError = correctionExpiryError(expires);
    if (currentExpiryError) { setError(currentExpiryError); return; }
    setSaving(true); setError('');
    try {
      const r = await correctionClient.rpc('payroll_ticket_request', { p_company_id: currentCompanyId, p_employee_id: employee, p_center_id: center, p_start: start, p_end: end, p_expires: colombiaInputToISO(expires), p_actions: actions, p_reason: reason });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ['correction-tickets'] });
      toast.success('Solicitud registrada. Otra persona debe autorizarla.'); close();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={v => !v && !saving && close()}><DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Solicitar permiso de corrección</DialogTitle><DialogDescription>El permiso será para usted y un empleado. No reabre los cortes del centro.</DialogDescription></DialogHeader>
    <label className="space-y-1 text-sm">Empleado<SearchableSelect value={employee} onValueChange={setEmployee} options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} · ${e.document_number}` }))} placeholder={loadingEmployees ? 'Cargando…' : 'Seleccione empleado'} /></label>
    <label className="space-y-1 text-sm">Centro histórico<select className="w-full rounded-md border bg-background p-2" value={center} onChange={e => setCenter(e.target.value)}><option value="">Seleccione centro</option>{centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <p className="text-xs text-muted-foreground">Si el empleado cambió de centro durante el rango, solicite un ticket por cada centro.</p>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm">Corregir desde<Input type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label className="text-sm">Hasta (inclusive)<Input type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} /></label></div>
    <label className="text-sm">Permiso hasta (hora de Colombia)<Input type="datetime-local" value={expires} onChange={e => { setExpires(e.target.value); setError(''); }} /></label>
    {expiryError && <p role="alert" className="text-sm text-destructive">{expiryError}</p>}
    <TicketActions value={actions} onChange={setActions} />
    <p className="text-xs text-muted-foreground">Incluya Aprobar / rechazar si los cambios deben revisarse con el corte activo. También se exigirá el permiso normal del rol.</p>
    <label className="text-sm">Motivo<Textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} /></label>
    {(error || employeesError || centersError) && <p role="alert" className="text-sm text-destructive">{error || employeesError?.message || centersError?.message}</p>}
    <Button disabled={saving || !employee || !center || !actions.length || reason.trim().length < 5 || !!expiryError} onClick={save}>{saving ? 'Enviando…' : 'Solicitar autorización'}</Button>
  </DialogContent></Dialog>;
}
export function TicketActions({ value, onChange, allowed }: { value: string[]; onChange: (value: string[]) => void; allowed?: string[] }) {
  return <div className="grid grid-cols-2 gap-3">{(['jornadas', 'novedades'] as const).map(module => <fieldset key={module} className="space-y-2 rounded-md border p-3"><legend className="px-1 text-sm font-medium capitalize">{module}</legend>{Object.entries(correctionActionLabels).map(([action, label]) => {
    const key = `${module}:${action}`;
    return <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value.includes(key)} disabled={allowed && !allowed.includes(key)} onChange={e => onChange(e.target.checked ? [...value, key] : value.filter(v => v !== key))} />{label}</label>;
  })}</fieldset>)}</div>;
}
