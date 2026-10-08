import { useId, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { correctionClient, correctionActionLabels, colombiaInput, colombiaInputToISO, correctionExpiryError, type CorrectionModule } from '@/lib/payrollCorrections';
import { colombiaToday } from '@/lib/payrollControlCuts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Building2, CalendarDays, ClipboardList, Clock3, Loader2 } from 'lucide-react';
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
  const [employee, setEmployee] = useState(defaults.employeeId || '');
  const [start, setStart] = useState(defaults.startDate || colombiaToday());
  const [end, setEnd] = useState(defaults.endDate || defaults.startDate || colombiaToday());
  const [expires, setExpires] = useState(colombiaInput(new Date(Date.now() + 86400000).toISOString()));
  const [actions, setActions] = useState<string[]>([`${defaults.module || 'jornadas'}:update`, `${defaults.module || 'jornadas'}:approve`]);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formId = useId();
  const selectedEmployee = employees.find(e => e.id === employee);
  const soleAssignment = selectedEmployee?.operation_center_assignments?.length === 1
    ? selectedEmployee.operation_center_assignments[0]
    : undefined;
  const center = selectedEmployee?.work_info?.operation_center_id
    || selectedEmployee?.operation_centers?.id
    || soleAssignment?.operation_center_id
    || '';
  const centerName = selectedEmployee?.operation_centers?.name || soleAssignment?.operation_centers?.name;
  const rangeError = !start || !end ? 'Seleccione las fechas que desea corregir.'
    : start > end ? 'La fecha final debe ser igual o posterior a la inicial.' : '';
  const expiryError = correctionExpiryError(expires);
  async function save() {
    if (!currentCompanyId || saving) return;
    if (!employee || !center) { setError('El empleado debe tener un centro de operación asignado.'); return; }
    if (rangeError) { setError(rangeError); return; }
    if (!actions.length || reason.trim().length < 5) { setError('Seleccione al menos una acción y escriba un motivo de mínimo 5 caracteres.'); return; }
    const currentExpiryError = correctionExpiryError(expires);
    if (currentExpiryError) { setError(currentExpiryError); return; }
    setSaving(true); setError('');
    try {
      const r = await correctionClient.rpc('payroll_ticket_request', { p_company_id: currentCompanyId, p_employee_id: employee, p_center_id: center, p_start: start, p_end: end, p_expires: colombiaInputToISO(expires), p_actions: actions, p_reason: reason });
      if (r.error) throw r.error;
      await qc.invalidateQueries({ queryKey: ['correction-tickets'] });
      toast.success('Solicitud registrada. Un usuario con permiso puede aprobarla.'); close();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <Dialog open onOpenChange={v => !v && !saving && close()}><DialogContent className="max-w-2xl gap-5">
    <DialogHeader className="border-b pb-4 text-left">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><ClipboardList className="h-4 w-4" />Permisos de nómina</div>
      <DialogTitle className="pr-5 text-xl leading-tight">Solicitar permiso de corrección</DialogTitle>
      <DialogDescription className="leading-relaxed">Solicite autorización para corregir los registros de un empleado durante un periodo específico. Los cortes del centro permanecen cerrados.</DialogDescription>
    </DialogHeader>
    <form id={formId} className="correction-ticket-form space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <div className="space-y-2">
          <Label className="block text-sm font-medium">Empleado</Label>
          <SearchableSelect value={employee} onValueChange={value => { setEmployee(value); setError(''); }} options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} · ${e.document_number}` }))} placeholder={loadingEmployees ? 'Cargando empleados…' : 'Seleccione empleado'} searchPlaceholder="Buscar por nombre o documento…" disabled={loadingEmployees || saving || !!employeesError} triggerClassName="min-h-11" wrapLabels />
          {employee && !loadingEmployees && <div className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-xs', center ? 'bg-muted/50 text-muted-foreground' : 'bg-destructive/5 text-destructive')} role={!center ? 'alert' : undefined}>
            <Building2 className="h-4 w-4 shrink-0" />
            <span>{center ? `Centro de operación: ${centerName || 'Asignado al empleado'}` : 'Este empleado no tiene un centro de operación definido. Revise su información laboral.'}</span>
          </div>}
        </div>
        <section className="space-y-3" aria-labelledby={`${formId}-period`}>
          <h3 id={`${formId}-period`} className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-muted-foreground" />Periodo a corregir</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor={`${formId}-start`}>Corregir desde</Label><Input id={`${formId}-start`} className="h-11" type="date" value={start} onChange={e => setStart(e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor={`${formId}-end`}>Hasta (inclusive)</Label><Input id={`${formId}-end`} className="h-11" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)} required /></div>
          </div>
          {rangeError && <p role="alert" className="text-xs text-destructive">{rangeError}</p>}
          <div className="space-y-2"><Label htmlFor={`${formId}-expires`} className="correction-ticket-expiry-label flex flex-wrap items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" />Permiso hasta <span className="font-normal text-muted-foreground">(hora de Colombia)</span></Label><Input id={`${formId}-expires`} className="h-11" type="datetime-local" value={expires} onChange={e => { setExpires(e.target.value); setError(''); }} required aria-invalid={!!expiryError} /></div>
          {expiryError && <p role="alert" className="text-xs text-destructive">{expiryError}</p>}
        </section>
        <section className="space-y-3" aria-labelledby={`${formId}-actions`}>
          <div className="flex flex-wrap items-baseline justify-between gap-1"><h3 id={`${formId}-actions`} className="text-sm font-semibold">Acciones que necesita</h3><span className="text-xs text-muted-foreground">{actions.length} seleccionadas</span></div>
          <TicketActions value={actions} onChange={setActions} />
          <p className="text-xs leading-relaxed text-muted-foreground">Seleccione Aprobar / rechazar si también necesita revisar los cambios. Se mantienen los permisos habituales de su rol.</p>
        </section>
        <div className="space-y-2"><Label htmlFor={`${formId}-reason`}>Motivo de la corrección</Label><Textarea id={`${formId}-reason`} className="min-h-24 resize-y" value={reason} onChange={e => setReason(e.target.value)} minLength={5} required placeholder="Explique qué necesita corregir y por qué…" /><p className="text-xs text-muted-foreground">Mínimo 5 caracteres.</p></div>
      </fieldset>
      {(error || employeesError) && <p role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{error || employeesError?.message}</p>}
    </form>
    <div className="sticky -bottom-5 -mx-5 flex flex-col-reverse gap-2 border-t bg-background px-5 pb-5 pt-4 sm:-bottom-6 sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-6">
      <Button type="button" variant="outline" disabled={saving} onClick={close}>Cancelar</Button>
      <Button type="submit" form={formId} disabled={saving || loadingEmployees || !!employeesError || !employee || !center || !actions.length || reason.trim().length < 5 || !!expiryError || !!rangeError}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{saving ? 'Enviando…' : 'Solicitar autorización'}</Button>
    </div>
  </DialogContent></Dialog>;
}
export function TicketActions({ value, onChange, allowed }: { value: string[]; onChange: (value: string[]) => void; allowed?: string[] }) {
  const groupId = useId();
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(['jornadas', 'novedades'] as const).map(module => <fieldset key={module} className="min-w-0 rounded-xl border bg-muted/20 p-3"><legend className="px-2 text-sm font-semibold capitalize">{module}</legend><div className="grid grid-cols-2 gap-1.5">{Object.entries(correctionActionLabels).map(([action, label]) => {
    const key = `${module}:${action}`;
    const checked = value.includes(key);
    const disabled = !!allowed && !allowed.includes(key);
    const id = `${groupId}-${key}`;
    return <Label key={key} htmlFor={id} className={cn('correction-action-option flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2 py-2 text-sm font-normal transition-colors hover:bg-muted/70 focus-within:ring-2 focus-within:ring-ring', checked ? 'border-primary/20 bg-primary/5 text-foreground' : 'border-transparent text-muted-foreground', disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent')}>
      <Checkbox id={id} checked={checked} disabled={disabled} className="h-[18px] w-[18px] rounded border-muted-foreground/40 data-[state=checked]:border-primary" onCheckedChange={next => onChange(next === true ? [...value.filter(v => v !== key), key] : value.filter(v => v !== key))} />
      <span className="min-w-0 leading-snug">{label}</span>
    </Label>;
  })}</div></fieldset>)}</div>;
}
