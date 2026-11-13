import { useState } from 'react';
import { FilePenLine, History, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { usePositions } from '@/hooks/useSystemConfig';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useWorkSchedules, useShiftCycles } from '@/hooks/useSchedules';
import { useEmployeeAmendments, useAmendmentCommand, uploadAmendmentFile, openAmendmentFile } from '@/hooks/useEmployeeAmendments';
import { amendmentFields, employmentHistoryFields, amendmentStatuses, conditionLabel, filterAmendments, type AmendmentData, type AmendmentField, type EmploymentHistoryField, type ConditionValue, type EmployeeAmendment, type EmploymentConditions } from '@/types/amendment';

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const fields = Object.keys(amendmentFields) as AmendmentField[];
const editable = (r: EmployeeAmendment) => ['draft', 'awaiting_signature'].includes(r.status);

export function EmployeeAmendments({ employeeId, contractId, compact = false }: { employeeId: string; contractId?: string; compact?: boolean }) {
  const auth = useAuth();
  const query = useEmployeeAmendments(employeeId);
  const [open, setOpen] = useState(false);
  if (!(auth.canView('otrosi') || auth.isAdmin || auth.isRRHH || auth.isSuperAdmin)) return null;
  const body = query.isLoading ? <p className="text-sm text-muted-foreground">Cargando historial…</p>
    : query.error ? <div role="alert" className="text-sm text-destructive">{query.error.message}<Button type="button" variant="link" onClick={() => query.refetch()}>Reintentar</Button></div>
    : query.data ? <AmendmentWorkspace employeeId={employeeId} data={query.data} contractId={contractId} /> : null;
  if (compact) return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><History className="mr-2 h-4 w-4" />Otrosí e historial laboral</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Otrosí e historial laboral</DialogTitle><DialogDescription>Acuerdos y correcciones de las condiciones del empleado.</DialogDescription></DialogHeader>{body}
    </DialogContent></Dialog>
  </>;
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FilePenLine className="h-5 w-5" />Otrosí e historial laboral</CardTitle></CardHeader><CardContent>{body}</CardContent></Card>;
}

function AmendmentWorkspace({ employeeId, data, contractId }: { employeeId: string; data: AmendmentData; contractId?: string }) {
  const [editor, setEditor] = useState<{ id: string; record?: EmployeeAmendment; kind: 'amendment' | 'correction'; relatedId?: string } | null>(null);
  const [filters, setFilters] = useState({ field: '', status: '', from: '', to: '', cycle: '' });
  const [cancel, setCancel] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const command = useAmendmentCommand();
  const records = filterAmendments(data.records.filter(r => !contractId || r.contract_id === contractId), filters);
  const canStart = !!data.contract && !!data.cycle_id && (!contractId || contractId === data.contract.id);
  async function cancelRecord() {
    try { await command.mutateAsync({ action: 'cancel', payload: { id: cancel, reason } }); setCancel(null); setReason(''); toast.success('Registro cancelado'); }
    catch (e) { toast.error((e as Error).message); }
  }
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Los cambios conservan el contrato, la vinculación y la antigüedad. Solo se aplican al confirmar el soporte firmado y alcanzar su fecha de vigencia.</p>
    <div className="flex flex-wrap gap-2">
      {data.can_manage && <Button type="button" disabled={!canStart} onClick={() => setEditor({ id: crypto.randomUUID(), kind: 'amendment' })}><Plus className="mr-2 h-4 w-4" />Registrar Otrosí</Button>}
      {data.can_correct && <Button type="button" variant="outline" disabled={!canStart} onClick={() => setEditor({ id: crypto.randomUUID(), kind: 'correction' })}>Corregir error de captura</Button>}
    </div>
    {!canStart && <p className="text-sm text-muted-foreground">Para registrar cambios se necesita una vinculación activa con su contrato e información laboral completos.</p>}
    {data.can_manage && <TemplateSettings data={data} />}
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <select aria-label="Filtrar por campo" className={selectClass} value={filters.field} onChange={e => setFilters({ ...filters, field: e.target.value })}><option value="">Todos los campos</option>{Object.entries(employmentHistoryFields).map(([field, label]) => <option key={field} value={field}>{label}</option>)}</select>
      <select aria-label="Filtrar por estado" className={selectClass} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Todos los estados</option>{Object.entries(amendmentStatuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <select aria-label="Filtrar por vinculación" className={selectClass} value={filters.cycle} onChange={e => setFilters({ ...filters, cycle: e.target.value })}><option value="">Todas las vinculaciones</option>{[...new Set(data.records.map(r => r.cycle_id))].map((id, i) => <option key={id} value={id}>{id === data.cycle_id ? 'Vinculación actual' : `Vinculación anterior ${i + 1}`}</option>)}</select>
      <Input aria-label="Vigencia desde" type="date" value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} />
      <Input aria-label="Vigencia hasta" type="date" value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} />
    </div>
    {records.length === 0 && <p className="py-5 text-sm text-muted-foreground">No hay registros para estos filtros.</p>}
    {records.map(record => <article key={record.id} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2"><div>
        <h4 className="font-medium">{record.kind === 'direct' ? 'Edición directa' : record.kind === 'correction' ? 'Corrección' : 'Otrosí'} #{record.number}</h4>
        <p className="text-xs text-muted-foreground">Vigencia: {record.effective_on} · Registrado por {record.actor_name} · {new Date(record.created_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
        {record.related_id && <p className="text-xs">Subsana el registro #{data.records.find(r => r.id === record.related_id)?.number || record.related_id}</p>}
      </div><Badge variant={record.status === 'needs_review' ? 'destructive' : 'secondary'}>{amendmentStatuses[record.status]}</Badge></div>
      {record.kind !== 'direct' && <p className="whitespace-pre-wrap text-sm">{record.reason}</p>}
      <ChangesTable before={record.before_values} changes={record.changes} />
      {record.has_salary && !record.changes.salary && <p className="text-sm text-muted-foreground">Incluye información salarial restringida.</p>}
      {record.declared_before && <p className="text-xs text-muted-foreground">Los valores anteriores fueron declarados a partir del soporte; preceden al historial observado.</p>}
      {record.affected_cuts.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-950">Revisión pendiente de períodos cerrados. No se recalcularon liquidaciones.{record.affected_cuts.map(c => <p key={c.id}>Nivel {c.level}: hasta {c.cutoff_date}</p>)}</div>}
      {(record.review_reason || record.cancellation_reason) && <p role="status" className="text-sm text-destructive">{record.review_reason || record.cancellation_reason}</p>}
      <div className="flex flex-wrap gap-2">
        {record.generated_path && <Button type="button" size="sm" variant="outline" onClick={() => openAmendmentFile(record.generated_path!).catch(e => toast.error(e.message))}>Ver Word generado</Button>}
        {record.signed_path && <Button type="button" size="sm" variant="outline" onClick={() => openAmendmentFile(record.signed_path!).catch(e => toast.error(e.message))}>Ver soporte firmado</Button>}
        {record.kind !== 'direct' && (record.kind === 'correction' ? data.can_correct : data.can_manage) && (!record.has_salary || data.can_salary) && <>
          {editable(record) && <Button type="button" size="sm" onClick={() => setEditor({ id: record.id, record, kind: record.kind })}>Continuar registro</Button>}
          {record.status === 'applied' && canStart && <Button type="button" size="sm" variant="outline" onClick={() => setEditor({ id: crypto.randomUUID(), kind: record.kind, relatedId: record.id })}>Subsanar con nuevo registro</Button>}
          {record.status === 'needs_review' && canStart && record.cycle_id === data.cycle_id && <Button type="button" size="sm" variant="outline" disabled={command.isPending} onClick={() => command.mutateAsync({ action: 'retry', payload: { id: record.id } }).then(() => toast.success('Aplicación reintentada')).catch(e => toast.error(e.message))}>Reintentar aplicación</Button>}
          {['draft', 'awaiting_signature', 'scheduled', 'needs_review'].includes(record.status) && <Button type="button" size="sm" variant="ghost" onClick={() => { setCancel(record.id); setReason(''); }}>Cancelar registro</Button>}
        </>}
      </div>
      {cancel === record.id && <div className="flex flex-wrap gap-2"><Input aria-label="Motivo de cancelación" placeholder="Motivo de cancelación" value={reason} onChange={e => setReason(e.target.value)} /><Button type="button" variant="destructive" disabled={reason.trim().length < 5 || command.isPending} onClick={cancelRecord}>Confirmar cancelación</Button><Button type="button" variant="ghost" onClick={() => setCancel(null)}>Volver</Button></div>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Seguimiento del registro</summary>{record.events.map(e => <p key={e.id}>{({ save: 'Borrador guardado', generated: 'Documento generado', confirm: 'Registro confirmado', applied: 'Cambios aplicados', direct_edit: 'Edición directa', cancel: 'Registro cancelado', needs_review: 'Requiere revisión' } as Record<string, string>)[e.action] || e.action} · {new Date(e.occurred_at).toLocaleString('es-CO')}</p>)}</details>
    </article>)}
    <Dialog open={!!editor} onOpenChange={value => { if (!value) setEditor(null); }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{editor?.kind === 'correction' ? 'Corregir error de captura' : 'Registrar Otrosí'}</DialogTitle><DialogDescription>Compare los valores, indique la vigencia y registre el soporte.</DialogDescription></DialogHeader>
      {editor && <AmendmentEditor key={editor.id} employeeId={employeeId} data={data} {...editor} onDone={() => setEditor(null)} />}
    </DialogContent></Dialog>
  </div>;
}

function ChangesTable({ before, changes }: { before: EmploymentConditions; changes: EmploymentConditions }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2 pr-3">Campo</th><th className="py-2 pr-3">Antes</th><th className="py-2">Después</th></tr></thead><tbody>{Object.entries(changes).map(([key, value]) => <tr key={key} className="border-b last:border-0"><td className="py-2 pr-3 align-top">{employmentHistoryFields[key as EmploymentHistoryField]}</td><td className="py-2 pr-3 align-top">{conditionLabel(key as EmploymentHistoryField, before[key as EmploymentHistoryField])}</td><td className="py-2 align-top">{conditionLabel(key as EmploymentHistoryField, value)}</td></tr>)}</tbody></table></div>;
}

function AmendmentEditor({ employeeId, data, id, record, kind, relatedId, onDone }: { employeeId: string; data: AmendmentData; id: string; record?: EmployeeAmendment; kind: 'amendment' | 'correction'; relatedId?: string; onDone: () => void }) {
  const [changes, setChanges] = useState<EmploymentConditions>(record?.changes || {});
  const [declared, setDeclared] = useState<EmploymentConditions>(record?.declared_before ? record.before_values : {});
  const [date, setDate] = useState(record?.effective_on || today());
  const [reason, setReason] = useState(record?.reason || '');
  const [saved, setSaved] = useState<EmployeeAmendment | undefined>(record);
  const [dirty, setDirty] = useState(!record);
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState<File | null>(null);
  const [employerSigner, setEmployerSigner] = useState('');
  const [employeeSigner, setEmployeeSigner] = useState(data.identity.employee_name);
  const command = useAmendmentCommand();
  const catalog = useAmendmentCatalogs();
  const priorQuery = useEmployeeAmendments(employeeId, date);
  const prior = priorQuery.data?.snapshot || {};
  const original = saved?.before_values || prior;
  const retro = date < (data.observed_on || today());
  const update = (field: AmendmentField, value: ConditionValue, previous = false) => { (previous ? setDeclared : setChanges)(old => ({ ...old, [field]: value })); setDirty(true); };
  async function run(task: () => Promise<void>) { setBusy(true); try { await task(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); } }
  async function save() {
    await command.mutateAsync({ action: 'save', payload: { id, employee_id: employeeId, kind, related_id: relatedId || record?.related_id || null, revision: saved?.revision, effective_on: date, reason, changes, declared_before: declared } });
    const refreshed = await priorQuery.refetch();
    const next = refreshed.data?.records.find(r => r.id === id);
    if (!next) throw new Error('No se pudo recargar el registro. Cierre y vuelva a consultar el historial.');
    setSaved(next); setChanges(next.changes); setDirty(false); setSigned(null); toast.success('Borrador guardado');
  }
  async function generate() {
    if (!saved || dirty || !data.template) return;
    const { generateAmendmentDocument } = await import('@/lib/amendmentDocumentGenerator');
    const blob = await generateAmendmentDocument(data, saved, employerSigner, employeeSigner);
    const path = await uploadAmendmentFile(`${saved.company_id}/${id}/${saved.revision}/${crypto.randomUUID()}.docx`, blob);
    await command.mutateAsync({ action: 'generated', payload: { id, revision: saved.revision, path, template_id: data.template.id } });
    setSaved({ ...saved, status: 'awaiting_signature', generated_path: path });
    await openAmendmentFile(path);
  }
  async function confirm() {
    if (!saved || dirty) return;
    let signedPath: string | undefined;
    if (kind === 'amendment') {
      if (!signed || signed.type !== 'application/pdf') throw new Error('Seleccione un archivo PDF firmado.');
      signedPath = await uploadAmendmentFile(`${saved.company_id}/${id}/${saved.revision}/${crypto.randomUUID()}.pdf`, signed);
    }
    await command.mutateAsync({ action: 'confirm', payload: { id, revision: saved.revision, signed_path: signedPath } });
    toast.success(kind === 'correction' ? 'Corrección registrada' : date > today() ? 'Otrosí programado' : 'Otrosí registrado y aplicado'); onDone();
  }
  return <div className="space-y-4">
    {kind === 'correction' && <p className="rounded-md bg-muted p-3 text-sm">Esta opción subsana errores de captura. Conserva el valor anterior y exige explicar el error; no representa un acuerdo contractual.</p>}
    <label className="block space-y-1 text-sm">Fecha de vigencia<Input type="date" min={data.contract?.start_date} max={kind === 'correction' ? today() : undefined} value={date} onChange={e => { setDate(e.target.value); setDirty(true); }} /></label>
    <label className="block space-y-1 text-sm">Motivo<Textarea maxLength={2000} value={reason} onChange={e => { setReason(e.target.value); setDirty(true); }} placeholder="Describa el acuerdo o el error que se corrige" /></label>
    <fieldset className="space-y-3" disabled={busy}><legend className="mb-2 text-sm font-medium">Campos que cambiarán</legend>
      {fields.filter(f => f !== 'salary' || data.can_salary).map(field => <div key={field} className="space-y-2 rounded-md border p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={field in changes} onChange={e => { setChanges(old => { const copy = { ...old }; if (e.target.checked) copy[field] = { ...(data.snapshot?.[field] || {}) }; else delete copy[field]; return copy; }); setDirty(true); }} />{amendmentFields[field]}</label>
        {field in changes && <>
          <p className="text-xs text-muted-foreground">Antes: {conditionLabel(field, declared[field] || original[field])}</p>
          <ConditionInput field={field} value={changes[field]!} onChange={v => update(field, v)} catalog={catalog} />
          {retro && !prior[field] && <div className="space-y-2 rounded bg-muted p-2"><p className="text-xs">No existe evidencia previa para esta fecha. Declare el valor anterior que consta en el soporte.</p><ConditionInput field={field} value={declared[field] || {}} onChange={v => update(field, v, true)} catalog={catalog} previous /></div>}
        </>}
      </div>)}
    </fieldset>
    <ChangesTable before={{ ...original, ...declared }} changes={changes} />
    <Button type="button" disabled={busy || !date || reason.trim().length < 5 || !Object.keys(changes).length} onClick={() => run(save)}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Guardar borrador</Button>
    {saved && <section className="space-y-3 border-t pt-4">
      {dirty && <p className="text-sm text-amber-700">Guarde los cambios y genere nuevamente el documento antes de firmar. El soporte anterior ya no se utilizará.</p>}
      {kind === 'amendment' && <>
        {data.template ? <><div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Firmante empresa" placeholder="Firmante de la empresa" value={employerSigner} onChange={e => setEmployerSigner(e.target.value)} /><Input aria-label="Firmante empleado" value={employeeSigner} onChange={e => setEmployeeSigner(e.target.value)} /></div><Button type="button" variant="outline" disabled={busy || dirty} onClick={() => run(generate)}>Generar Word para firma</Button></> : <p className="text-sm text-muted-foreground">Sin plantilla configurada. Puede adjuntar un documento firmado elaborado externamente.</p>}
        <label className="block space-y-1 text-sm">PDF firmado (máximo 20 MB)<Input type="file" accept="application/pdf" disabled={busy || dirty} onChange={e => { const f = e.target.files?.[0] || null; if (f && f.size > 20 * 1024 * 1024) { toast.error('El archivo supera 20 MB'); setSigned(null); } else setSigned(f); }} /></label>
      </>}
      <Button type="button" disabled={busy || dirty || (kind === 'amendment' && !signed)} onClick={() => run(confirm)}>{kind === 'correction' ? 'Confirmar corrección' : date > today() ? 'Confirmar y programar Otrosí' : 'Confirmar y aplicar Otrosí'}</Button>
    </section>}
  </div>;
}

function useAmendmentCatalogs() {
  const positions = usePositions(); const centers = useOperationCenters(); const types = useContractTypes();
  const schedules = useWorkSchedules(); const cycles = useShiftCycles();
  return { positions: positions.data || [], centers: centers.data || [], types: types.data || [], schedules: schedules.data || [], cycles: cycles.data || [] };
}
function ConditionInput({ field, value, onChange, catalog, previous = false }: { field: AmendmentField; value: ConditionValue; onChange: (v: ConditionValue) => void; catalog: ReturnType<typeof useAmendmentCatalogs>; previous?: boolean }) {
  const label = `${previous ? 'Anterior' : 'Nuevo'}: ${amendmentFields[field]}`;
  const select = (items: { id: string; name: string }[], key = 'id') => <select aria-label={label} className={selectClass} value={String(value[key] || '')} onChange={e => onChange({ ...value, [key]: e.target.value, label: items.find(x => x.id === e.target.value)?.name || '' })}><option value="">Seleccionar…</option>{items.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>;
  if (field === 'salary') return <Input aria-label={label} type="number" min="1" step="0.01" value={value.amount ?? ''} onChange={e => onChange({ amount: Number(e.target.value) })} />;
  if (field === 'position') return select(catalog.positions.filter(x => previous || x.is_active));
  if (field === 'center') return select(catalog.centers.filter(x => previous || x.is_active));
  if (field === 'rest_day') return <select aria-label={label} className={selectClass} value={String(value.value || '')} onChange={e => onChange({ value: e.target.value })}><option value="">Seleccionar…</option>{['lunes','martes','miercoles','jueves','viernes','sabado','domingo'].map(d => <option key={d} value={d}>{d}</option>)}</select>;
  if (field === 'contract_type') return <div className="space-y-2">{select(catalog.types.filter(x => previous || x.is_active).map(x => ({ id: x.contract_type, name: x.display_name })), 'code')}
    {catalog.types.find(t => t.contract_type === value.code)?.requires_end_date && <label className="block text-xs">Fecha final del contrato<Input aria-label={`${label}: fecha final`} type="date" value={String(value.end_date || '')} onChange={e => onChange({ ...value, end_date: e.target.value })} /></label>}
    {value.code === 'obra_labor' && <Textarea aria-label={`${label}: descripción de obra o labor`} placeholder="Descripción de obra o labor" value={String(value.work_labor_description || '')} onChange={e => onChange({ ...value, work_labor_description: e.target.value })} />}
  </div>;
  return <div className="space-y-2"><select aria-label={`${label}: modalidad`} className={selectClass} value={String(value.mode || '')} onChange={e => onChange({ mode: e.target.value })}><option value="">Seleccionar modalidad…</option><option value="administrative">Administrativo</option><option value="shift">Ciclo de turnos</option></select>
    {value.mode === 'administrative' && select(catalog.schedules.filter(x => previous || x.is_active), 'work_schedule_id')}
    {value.mode === 'shift' && <>{select(catalog.cycles.filter(x => previous || x.is_active), 'shift_cycle_id')}<label className="block text-xs">Inicio del ciclo<Input aria-label={`${label}: inicio del ciclo`} type="date" value={String(value.cycle_start_date || '')} onChange={e => onChange({ ...value, cycle_start_date: e.target.value })} /></label></>}
  </div>;
}

function TemplateSettings({ data }: { data: AmendmentData }) {
  const { currentCompanyId } = useAuth(); const command = useAmendmentCommand(); const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file || !currentCompanyId) return;
    if (!file.name.toLowerCase().endsWith('.docx') || file.size > 20 * 1024 * 1024) { toast.error('Seleccione un archivo DOCX de máximo 20 MB'); return; }
    setBusy(true);
    try { const path = await uploadAmendmentFile(`${currentCompanyId}/templates/${crypto.randomUUID()}.docx`, new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })); await command.mutateAsync({ action: 'template', payload: { company_id: currentCompanyId, path, file_name: file.name } }); toast.success('Nueva versión de plantilla registrada'); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer">Plantilla de la empresa: {data.template?.file_name || 'Sin configurar'}</summary><div className="mt-3 space-y-2">
    <p>Cargue el formato Word de la empresa. Las nuevas versiones no modifican documentos ya generados.</p>
    <p className="break-words text-xs text-muted-foreground">Campos: {'{empresa}, {nit}, {empleado}, {documento}, {contrato}, {fecha_inicio_contrato}, {consecutivo}, {vigencia}, {motivo}, {firmante_empresa}, {firmante_empleado}'}. Para repetir los cambios: {'{#cambios}{campo}: {anterior} → {nuevo}{/cambios}'}.</p>
    <Input aria-label="Plantilla Word de Otrosí" type="file" accept=".docx" disabled={busy} onChange={e => upload(e.target.files?.[0])} />
  </div></details>;
}
