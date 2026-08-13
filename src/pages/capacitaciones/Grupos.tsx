import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  CheckCircle2, ClipboardCheck, Copy, Download, ExternalLink, Link2, Pencil,
  Plus, QrCode, Search, Trash2, UsersRound, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { QRCodeDialog } from '@/components/training';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingCourses } from '@/hooks/useTraining';
import {
  TrainingGroupEmployeeOption, useCloseTrainingGroup, useCreateTrainingGroup,
  useDeleteTrainingGroupLink, useRegenerateTrainingGroupLink,
  useTrainingGroupAssignments, useTrainingGroupEmployeeOptions, useUpdateTrainingGroup,
} from '@/hooks/useTrainingGroups';
import type { TrainingGroupAssignment, TrainingGroupParticipant } from '@/types/training';

const defaultExpiry = () => format(addDays(new Date(), 30), 'yyyy-MM-dd');
const employeeName = (employee: TrainingGroupEmployeeOption) =>
  [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name].filter(Boolean).join(' ');
const participantName = (participant: TrainingGroupParticipant) =>
  [participant.employee?.first_name, participant.employee?.middle_name, participant.employee?.last_name, participant.employee?.second_last_name].filter(Boolean).join(' ');
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Ocurrió un error inesperado';

interface GroupFormState {
  id?: string;
  name: string;
  courseId: string;
  expiresAt: string;
  requiresEvaluation: boolean;
  employeeIds: string[];
}

const emptyForm = (): GroupFormState => ({
  name: '', courseId: '', expiresAt: defaultExpiry(), requiresEvaluation: true, employeeIds: [],
});

const formFromGroup = (group?: TrainingGroupAssignment | null): GroupFormState => group ? ({
  id: group.id,
  name: group.name,
  courseId: group.course_id,
  expiresAt: format(parseISO(group.expires_at), 'yyyy-MM-dd'),
  requiresEvaluation: group.requires_evaluation,
  employeeIds: (group.participants || []).filter((item) => item.is_active).map((item) => item.employee_id),
}) : emptyForm();

function getGroupStats(group: TrainingGroupAssignment) {
  const activeParticipants = (group.participants || []).filter((item) => item.is_active && item.employee?.is_active && item.employee?.status === 'active');
  const completed = activeParticipants.filter((item) => !!item.completion_id);
  return {
    total: activeParticipants.length,
    completed: completed.length,
    pending: activeParticipants.length - completed.length,
    excluded: (group.participants || []).length - activeParticipants.length,
    percentage: activeParticipants.length ? Math.round((completed.length / activeParticipants.length) * 100) : 0,
  };
}

function GroupFormDialog({
  open, onOpenChange, initial, employees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: TrainingGroupAssignment | null;
  employees: TrainingGroupEmployeeOption[];
}) {
  const { currentCompanyId } = useAuth();
  const { data: courses = [] } = useTrainingCourses();
  const createGroup = useCreateTrainingGroup();
  const updateGroup = useUpdateTrainingGroup();
  const [form, setForm] = useState<GroupFormState>(() => formFromGroup(initial));
  const [search, setSearch] = useState('');
  const [center, setCenter] = useState('all');
  const [area, setArea] = useState('all');
  const [position, setPosition] = useState('all');

  const resetFromInitial = () => {
    setForm(formFromGroup(initial));
    setSearch(''); setCenter('all'); setArea('all'); setPosition('all');
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch = !query || `${employeeName(employee)} ${employee.document_number}`.toLowerCase().includes(query);
      return matchesSearch && (center === 'all' || employee.centerId === center)
        && (area === 'all' || employee.areaId === area)
        && (position === 'all' || employee.positionId === position);
    });
  }, [area, center, employees, position, search]);
  const centers = useMemo(() => Array.from(new Map(employees.map((item) => [item.centerId, item.centerName])).entries()).filter(([id]) => !!id), [employees]);
  const areas = useMemo(() => Array.from(new Map(employees.map((item) => [item.areaId, item.areaName])).entries()).filter(([id]) => !!id), [employees]);
  const positions = useMemo(() => Array.from(new Map(employees.map((item) => [item.positionId, item.positionName])).entries()).filter(([id]) => !!id), [employees]);

  const toggleEmployee = (id: string) => setForm((current) => ({
    ...current,
    employeeIds: current.employeeIds.includes(id) ? current.employeeIds.filter((value) => value !== id) : [...current.employeeIds, id],
  }));
  const selectVisible = () => setForm((current) => ({
    ...current,
    employeeIds: Array.from(new Set([...current.employeeIds, ...filteredEmployees.map((item) => item.id)])),
  }));

  const handleSave = async () => {
    if (!currentCompanyId || !form.name.trim() || !form.courseId || !form.expiresAt || !form.employeeIds.length) {
      toast.error('Completa los datos y selecciona al menos una persona'); return;
    }
    const payload = {
      name: form.name.trim(), course_id: form.courseId, company_id: currentCompanyId,
      expires_at: new Date(`${form.expiresAt}T23:59:59`).toISOString(),
      requires_evaluation: form.requiresEvaluation, employee_ids: form.employeeIds,
    };
    try {
      if (form.id) await updateGroup.mutateAsync({ assignment_id_value: form.id, payload });
      else await createGroup.mutateAsync({ payload });
      toast.success(form.id ? 'Grupo actualizado' : 'Capacitación grupal creada');
      onOpenChange(false);
    } catch (error: unknown) { toast.error(errorMessage(error)); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) resetFromInitial(); onOpenChange(next); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-5xl p-0 overflow-hidden rounded-3xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 text-left">
          <DialogTitle className="text-2xl font-black">{initial ? 'Editar capacitación grupal' : 'Nueva capacitación grupal'}</DialogTitle>
          <DialogDescription>Configura el enlace y define exactamente quiénes deben realizarla.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[72vh] overflow-y-auto p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Nombre del grupo *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Inducción supervisores agosto" /></div>
            <div className="space-y-2"><Label>Capacitación *</Label><Select value={form.courseId} onValueChange={(value) => setForm({ ...form, courseId: value })} disabled={!!initial}><SelectTrigger><SelectValue placeholder="Seleccionar capacitación" /></SelectTrigger><SelectContent>{courses.filter((course) => course.status === 'publicado').map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Vencimiento *</Label><Input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></div>
            <div className="flex items-center justify-between rounded-xl border p-4"><div><Label>Evaluación requerida</Label><p className="text-xs text-muted-foreground">Exige aprobar antes de firmar.</p></div><Switch checked={form.requiresEvaluation} onCheckedChange={(value) => setForm({ ...form, requiresEvaluation: value })} /></div>
          </div>
          <div className="rounded-2xl border overflow-hidden">
            <div className="border-b bg-muted/30 p-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Participantes</h3><p className="text-xs text-muted-foreground">{form.employeeIds.length} seleccionados</p></div><Button type="button" variant="outline" size="sm" onClick={selectVisible}>Seleccionar visibles</Button></div>
              <div className="grid gap-2 md:grid-cols-4">
                <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o cédula" /></div>
                <Select value={center} onValueChange={setCenter}><SelectTrigger><SelectValue placeholder="Centro" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los centros</SelectItem>{centers.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
                <Select value={area} onValueChange={setArea}><SelectTrigger><SelectValue placeholder="Área" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las áreas</SelectItem>{areas.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
                <Select value={position} onValueChange={setPosition}><SelectTrigger><SelectValue placeholder="Cargo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cargos</SelectItem>{positions.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {filteredEmployees.map((employee) => <label key={employee.id} className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/30"><Checkbox checked={form.employeeIds.includes(employee.id)} onCheckedChange={() => toggleEmployee(employee.id)} /><div className="min-w-0 flex-1"><p className="font-semibold truncate">{employeeName(employee)}</p><p className="text-xs text-muted-foreground truncate">{employee.document_number} · {employee.centerName} · {employee.positionName}</p></div></label>)}
              {!filteredEmployees.length ? <p className="p-8 text-center text-sm text-muted-foreground">No hay empleados activos con estos filtros.</p> : null}
            </div>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={handleSave} disabled={createGroup.isPending || updateGroup.isPending}>{initial ? 'Guardar cambios' : 'Crear y generar enlace'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingGroups() {
  const { hasPermission, isAdmin, isSuperAdmin } = useAuth();
  const { data: groups = [], isLoading } = useTrainingGroupAssignments();
  const { data: employees = [] } = useTrainingGroupEmployeeOptions();
  const closeGroup = useCloseTrainingGroup();
  const deleteLink = useDeleteTrainingGroupLink();
  const regenerateLink = useRegenerateTrainingGroupLink();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingGroupAssignment | null>(null);
  const [detail, setDetail] = useState<TrainingGroupAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingGroupAssignment | null>(null);
  const [closeTarget, setCloseTarget] = useState<TrainingGroupAssignment | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<TrainingGroupAssignment | null>(null);
  const [regenerateExpiry, setRegenerateExpiry] = useState(defaultExpiry());
  const [qr, setQr] = useState<{ url: string; title: string } | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const canCreate = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'create');
  const canUpdate = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'update');
  const canDelete = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'delete');
  const canExport = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'export');
  const accessUrl = (token: string) => `${window.location.origin}/capacitacion/grupo?token=${token}`;

  const filtered = useMemo(() => groups.filter((group) => {
    const effectiveStatus = group.status === 'closed' ? 'closed' : !group.token_id ? 'without_link' : new Date(group.expires_at) < new Date() ? 'expired' : 'active';
    return (status === 'all' || status === effectiveStatus) && `${group.name} ${group.course?.name}`.toLowerCase().includes(search.toLowerCase());
  }), [groups, search, status]);
  const totals = useMemo(() => groups.reduce((acc, group) => {
    const stats = getGroupStats(group); acc.people += stats.total; acc.completed += stats.completed; acc.pending += stats.pending; return acc;
  }, { people: 0, completed: 0, pending: 0 }), [groups]);

  const copyLink = async (group: TrainingGroupAssignment) => {
    if (!group.token?.token) return;
    await navigator.clipboard.writeText(accessUrl(group.token.token)); toast.success('Enlace copiado');
  };
  const exportGroup = (group: TrainingGroupAssignment) => {
    const rows = (group.participants || []).map((participant) => ({
      Grupo: group.name, Capacitación: group.course?.name, Empleado: participantName(participant),
      Cédula: participant.employee?.document_number, Centro: participant.employee?.employee_work_info?.[0]?.operation_centers?.name || '',
      Cargo: participant.employee?.employee_work_info?.[0]?.position_name || '',
      Estado: !participant.is_active || !participant.employee?.is_active ? 'Excluido' : participant.completion_id ? 'Completado' : 'Pendiente',
      Fecha: participant.completion?.completed_at ? format(parseISO(participant.completion.completed_at), 'dd/MM/yyyy') : '',
    }));
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Cumplimiento'); XLSX.writeFile(book, `cumplimiento-${group.name}.xlsx`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-[2rem] border bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-3 text-3xl font-black"><UsersRound className="h-8 w-8 text-primary" />Capacitaciones por grupo</h1><p className="mt-1 text-muted-foreground">Asigna una capacitación a personas específicas y sigue su cumplimiento.</p></div>{canCreate ? <Button className="h-12 rounded-xl" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva asignación</Button> : null}</div></div>
      <div className="grid gap-4 sm:grid-cols-3">{[
        { label: 'Participantes válidos', value: totals.people, Icon: UsersRound },
        { label: 'Completadas', value: totals.completed, Icon: CheckCircle2 },
        { label: 'Pendientes', value: totals.pending, Icon: XCircle },
      ].map(({ label, value, Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-5"><Icon className="h-6 w-6 text-primary" /><div><p className="text-2xl font-black">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></CardContent></Card>)}</div>
      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo o capacitación" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="expired">Vencidos</SelectItem><SelectItem value="closed">Cerrados</SelectItem><SelectItem value="without_link">Sin enlace</SelectItem></SelectContent></Select></CardContent></Card>
      {isLoading ? <Card><CardContent className="p-12 text-center text-muted-foreground">Cargando asignaciones...</CardContent></Card> : null}
      {!isLoading && !filtered.length ? <Card><CardContent className="p-12 text-center text-muted-foreground">No hay capacitaciones grupales para mostrar.</CardContent></Card> : null}
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map((group) => {
        const stats = getGroupStats(group); const expired = new Date(group.expires_at) < new Date();
        const state = group.status === 'closed' ? 'Cerrado' : !group.token_id ? 'Sin enlace' : expired ? 'Vencido' : 'Activo';
        return <Card key={group.id} className="overflow-hidden rounded-2xl"><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{group.name}</h2><p className="text-sm text-muted-foreground">{group.course?.name}</p></div><Badge variant={state === 'Activo' ? 'default' : 'secondary'}>{state}</Badge></div><div><div className="mb-2 flex justify-between text-sm"><span>{stats.completed}/{stats.total} completaron</span><strong>{stats.percentage}%</strong></div><Progress value={stats.percentage} /></div><div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline">{stats.pending} pendientes</Badge>{stats.excluded ? <Badge variant="outline">{stats.excluded} excluidos</Badge> : null}<Badge variant="outline">Vence {format(parseISO(group.expires_at), 'dd/MM/yyyy')}</Badge></div><div className="flex flex-wrap gap-2 border-t pt-4"><Button size="sm" variant="outline" onClick={() => setDetail(group)}><ClipboardCheck className="mr-1 h-4 w-4" />Cumplimiento</Button>{group.token?.token ? <><Button size="sm" variant="outline" onClick={() => copyLink(group)}><Copy className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setQr({ url: accessUrl(group.token!.token), title: group.name })}><QrCode className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => window.open(accessUrl(group.token!.token), '_blank')}><ExternalLink className="h-4 w-4" /></Button></> : null}{canUpdate && state === 'Activo' ? <Button size="sm" variant="outline" onClick={() => { setEditing(group); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button> : null}{canUpdate && !group.token_id && group.status === 'active' ? <Button size="sm" onClick={() => { setRegenerateExpiry(defaultExpiry()); setRegenerateTarget(group); }}><Link2 className="mr-1 h-4 w-4" />Generar enlace</Button> : null}{canDelete && group.token_id ? <Button size="sm" variant="outline" className="text-destructive" onClick={() => setDeleteTarget(group)}><Trash2 className="h-4 w-4" /></Button> : null}{canUpdate && group.status === 'active' ? <Button size="sm" variant="ghost" onClick={() => setCloseTarget(group)}>Cerrar</Button> : null}</div></CardContent></Card>;
      })}</div>

      <GroupFormDialog key={`${editing?.id || 'new'}-${formOpen}`} open={formOpen} onOpenChange={setFormOpen} initial={editing} employees={employees} />
      {qr ? <QRCodeDialog open={!!qr} onOpenChange={() => setQr(null)} url={qr.url} title={qr.title} /> : null}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>{detail?.name}</DialogTitle><DialogDescription>Cumplimiento exclusivo de las personas seleccionadas.</DialogDescription></DialogHeader>{detail ? <div className="max-h-[65vh] overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-3">Empleado</th><th className="p-3">Documento</th><th className="p-3">Centro</th><th className="p-3">Cargo</th><th className="p-3">Estado</th><th className="p-3">Fecha</th></tr></thead><tbody>{(detail.participants || []).map((participant) => { const excluded = !participant.is_active || !participant.employee?.is_active; return <tr key={participant.id} className="border-b"><td className="p-3 font-semibold">{participantName(participant)}</td><td className="p-3">{participant.employee?.document_number}</td><td className="p-3">{participant.employee?.employee_work_info?.[0]?.operation_centers?.name || '-'}</td><td className="p-3">{participant.employee?.employee_work_info?.[0]?.position_name || '-'}</td><td className="p-3"><Badge variant={excluded ? 'secondary' : participant.completion_id ? 'default' : 'destructive'}>{excluded ? 'Excluido' : participant.completion_id ? 'Completado' : 'Pendiente'}</Badge></td><td className="p-3">{participant.completion?.completed_at ? format(parseISO(participant.completion.completed_at), 'dd/MM/yyyy') : '-'}</td></tr>; })}</tbody></table></div> : null}<DialogFooter>{canExport && detail ? <Button variant="outline" onClick={() => exportGroup(detail)}><Download className="mr-2 h-4 w-4" />Exportar Excel</Button> : null}</DialogFooter></DialogContent></Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar el enlace?</AlertDialogTitle><AlertDialogDescription>El acceso dejará de funcionar inmediatamente. La capacitación, el grupo, el cumplimiento, las firmas y las evidencias se conservarán.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (!deleteTarget) return; try { await deleteLink.mutateAsync({ assignment_id_value: deleteTarget.id }); toast.success('Enlace eliminado'); setDeleteTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Eliminar enlace</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cerrar esta asignación?</AlertDialogTitle><AlertDialogDescription>El enlace quedará inactivo y el cumplimiento se conservará como histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!closeTarget) return; try { await closeGroup.mutateAsync({ assignment_id_value: closeTarget.id }); toast.success('Asignación cerrada'); setCloseTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Cerrar asignación</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={!!regenerateTarget} onOpenChange={(open) => !open && setRegenerateTarget(null)}><DialogContent><DialogHeader><DialogTitle>Generar nuevo enlace</DialogTitle><DialogDescription>El cumplimiento existente no se reiniciará.</DialogDescription></DialogHeader><div className="space-y-2"><Label>Nueva fecha de vencimiento</Label><Input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={regenerateExpiry} onChange={(event) => setRegenerateExpiry(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setRegenerateTarget(null)}>Cancelar</Button><Button onClick={async () => { if (!regenerateTarget) return; try { await regenerateLink.mutateAsync({ assignment_id_value: regenerateTarget.id, expires_at_value: new Date(`${regenerateExpiry}T23:59:59`).toISOString() }); toast.success('Nuevo enlace generado'); setRegenerateTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Generar enlace</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
