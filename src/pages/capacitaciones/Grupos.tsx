import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import {
  ArrowRight, Check, CheckCircle2, ClipboardCheck, Copy, Download, ExternalLink,
  FileText, Link2, Loader2, Pencil, Plus, QrCode, Search, SlidersHorizontal, Trash2, UserPlus,
  UsersRound, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QRCodeDialog } from '@/components/training';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingCourses } from '@/hooks/useTraining';
import {
  fetchTrainingGroupReportCompletions, TrainingGroupEmployeeOption, useCloseTrainingGroup, useCreateTrainingGroup,
  useDeleteTrainingGroupLink, useRegenerateTrainingGroupLink,
  useTrainingGroupAssignments, useTrainingGroupEmployeeOptions, useUpdateTrainingGroup,
} from '@/hooks/useTrainingGroups';
import { useCompany } from '@/hooks/useCompanies';
import { buildTrainingAttendanceReportPdf, sanitizeTrainingReportFileName } from '@/lib/trainingAttendanceReportPdf';
import type { TrainingCompletion, TrainingGroupAssignment, TrainingGroupParticipant } from '@/types/training';

const defaultExpiry = () => format(addDays(new Date(), 30), 'yyyy-MM-dd');
const employeeName = (employee: TrainingGroupEmployeeOption) =>
  [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name].filter(Boolean).join(' ');
const employeeInitials = (employee: TrainingGroupEmployeeOption) =>
  `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
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
  const selectedIdSet = useMemo(() => new Set(form.employeeIds), [form.employeeIds]);
  const availableEmployees = useMemo(
    () => filteredEmployees.filter((employee) => !selectedIdSet.has(employee.id)),
    [filteredEmployees, selectedIdSet],
  );
  const selectedEmployees = useMemo(() => {
    const byId = new Map(employees.map((employee) => [employee.id, employee]));
    return form.employeeIds.flatMap((id) => {
      const employee = byId.get(id);
      return employee ? [employee] : [];
    });
  }, [employees, form.employeeIds]);
  const centers = useMemo(() => Array.from(new Map(employees.map((item) => [item.centerId, item.centerName])).entries()).filter(([id]) => !!id), [employees]);
  const areas = useMemo(() => Array.from(new Map(employees.map((item) => [item.areaId, item.areaName])).entries()).filter(([id]) => !!id), [employees]);
  const positions = useMemo(() => Array.from(new Map(employees.map((item) => [item.positionId, item.positionName])).entries()).filter(([id]) => !!id), [employees]);

  const addEmployee = (id: string) => setForm((current) => current.employeeIds.includes(id) ? current : ({
    ...current, employeeIds: [...current.employeeIds, id],
  }));
  const removeEmployee = (id: string) => setForm((current) => ({
    ...current, employeeIds: current.employeeIds.filter((value) => value !== id),
  }));
  const clearSelected = () => setForm((current) => ({ ...current, employeeIds: [] }));
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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-6xl overflow-hidden rounded-3xl border-primary/15 p-0 shadow-2xl shadow-primary/10">
        <DialogHeader className="relative overflow-hidden border-b border-primary/10 bg-gradient-to-r from-primary/15 via-primary/7 to-background px-6 py-6 text-left">
          <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UsersRound className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">{initial ? 'Editar capacitación grupal' : 'Nueva capacitación grupal'}</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl text-sm">Configura el enlace y arma el grupo con las personas que deben completar esta capacitación.</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="max-h-[76vh] space-y-6 overflow-y-auto bg-muted/10 p-6">
          <section className="grid gap-4 rounded-2xl border border-border/70 bg-background p-5 shadow-sm md:grid-cols-2">
            <div className="space-y-2"><Label>Nombre del grupo *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Inducción supervisores agosto" /></div>
            <div className="space-y-2"><Label>Capacitación *</Label><Select value={form.courseId} onValueChange={(value) => setForm({ ...form, courseId: value })} disabled={!!initial}><SelectTrigger><SelectValue placeholder="Seleccionar capacitación" /></SelectTrigger><SelectContent>{courses.filter((course) => course.status === 'publicado').map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Vencimiento *</Label><Input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></div>
            <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 p-4"><div><Label>Evaluación requerida</Label><p className="text-xs text-muted-foreground">Exige aprobar antes de firmar.</p></div><Switch checked={form.requiresEvaluation} onCheckedChange={(value) => setForm({ ...form, requiresEvaluation: value })} /></div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-primary/15 bg-background shadow-sm">
            <div className="border-b border-primary/10 bg-gradient-to-r from-primary/10 to-transparent p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-5 w-5" /></div>
                  <div><h3 className="font-bold">Armar grupo de participantes</h3><p className="text-sm text-muted-foreground">Busca a una persona y agrégala al grupo de la derecha.</p></div>
                </div>
                <Badge className="w-fit gap-1.5 px-3 py-1.5"><Check className="h-3.5 w-3.5" />{form.employeeIds.length} seleccionados</Badge>
              </div>
            </div>
            <div className="space-y-3 border-b bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />Filtrar empleados disponibles</div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="bg-background pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o cédula" /></div>
                <Select value={center} onValueChange={setCenter}><SelectTrigger className="bg-background"><SelectValue placeholder="Centro" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los centros</SelectItem>{centers.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
                <Select value={area} onValueChange={setArea}><SelectTrigger className="bg-background"><SelectValue placeholder="Área" /></SelectTrigger><SelectContent><SelectItem value="all">Todas las áreas</SelectItem>{areas.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
                <Select value={position} onValueChange={setPosition}><SelectTrigger className="bg-background"><SelectValue placeholder="Cargo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los cargos</SelectItem>{positions.map(([id, name]) => <SelectItem key={id} value={id!}>{name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="grid min-h-[25rem] lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
              <div className="border-b lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div><p className="font-semibold">Empleados disponibles</p><p className="text-xs text-muted-foreground">{availableEmployees.length} coinciden con los filtros</p></div>
                  <Button type="button" variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/5" onClick={selectVisible} disabled={!availableEmployees.length}>
                    Agregar visibles <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
                <ScrollArea className="h-[22rem]">
                  <div className="divide-y p-2">
                    {availableEmployees.map((employee) => (
                      <button key={employee.id} type="button" onClick={() => addEmployee(employee.id)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <Avatar className="h-10 w-10 rounded-xl"><AvatarFallback className="rounded-xl bg-primary/10 text-xs font-bold text-primary">{employeeInitials(employee)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{employeeName(employee)}</p><p className="truncate text-xs text-muted-foreground">{employee.document_number} · {employee.centerName} · {employee.positionName}</p></div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/15 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground"><Plus className="h-4 w-4" /></span>
                      </button>
                    ))}
                    {!availableEmployees.length ? <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center"><CheckCircle2 className="mb-3 h-9 w-9 text-primary/60" /><p className="font-semibold">No hay más personas por agregar</p><p className="mt-1 text-sm text-muted-foreground">Cambia los filtros o revisa la lista seleccionada.</p></div> : null}
                  </div>
                </ScrollArea>
              </div>
              <aside className="bg-primary/[0.035]">
                <div className="flex items-center justify-between border-b border-primary/10 px-4 py-3">
                  <div><p className="font-semibold text-primary">Grupo seleccionado</p><p className="text-xs text-muted-foreground">Lista final para esta capacitación</p></div>
                  {selectedEmployees.length ? <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={clearSelected}>Limpiar</Button> : null}
                </div>
                <ScrollArea className="h-[22rem]">
                  <div className="space-y-2 p-3">
                    {selectedEmployees.map((employee, index) => (
                      <div key={employee.id} className="flex items-center gap-3 rounded-xl border border-primary/10 bg-background p-3 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold tabular-nums text-primary-foreground">{index + 1}</div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{employeeName(employee)}</p><p className="truncate text-xs text-muted-foreground">{employee.centerName} · {employee.positionName}</p></div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => removeEmployee(employee.id)} aria-label={`Quitar a ${employeeName(employee)}`}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {!selectedEmployees.length ? <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-background/60 px-6 text-center"><UsersRound className="mb-3 h-10 w-10 text-primary/35" /><p className="font-semibold">El grupo está vacío</p><p className="mt-1 max-w-56 text-sm text-muted-foreground">Agrega empleados desde la lista de disponibles.</p></div> : null}
                  </div>
                </ScrollArea>
              </aside>
            </div>
          </section>
        </div>
        <DialogFooter className="flex-row items-center justify-between border-t border-primary/10 bg-background px-6 py-4 sm:justify-between"><p className="hidden text-sm text-muted-foreground sm:block"><strong className="text-foreground">{form.employeeIds.length}</strong> personas recibirán esta capacitación</p><div className="flex gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button className="shadow-md shadow-primary/15" onClick={handleSave} disabled={createGroup.isPending || updateGroup.isPending}>{initial ? 'Guardar cambios' : 'Crear y generar enlace'}</Button></div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TrainingGroups() {
  const { currentCompanyId, hasPermission, isAdmin, isSuperAdmin } = useAuth();
  const { data: currentCompany } = useCompany(currentCompanyId || undefined);
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
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);
  const canCreate = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'create');
  const canUpdate = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'update');
  const canDelete = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'delete');
  const canExport = isAdmin || isSuperAdmin || hasPermission('capacitaciones_grupos', 'export');
  const accessUrl = (token: string) => `${window.location.origin}/capacitacion/grupo?token=${token}`;

  const filtered = useMemo(() => groups.filter((group) => {
    const effectiveStatus = group.status === 'closed' ? 'closed' : !group.token_id ? 'without_link' : new Date(group.expires_at) < new Date() ? 'expired' : 'active';
    return (status === 'all' || status === effectiveStatus) && `${group.name} ${group.course?.name}`.toLowerCase().includes(search.toLowerCase());
  }), [groups, search, status]);
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
  const exportAttendancePdf = async (group: TrainingGroupAssignment) => {
    const completedParticipants = (group.participants || []).filter((participant) => (
      participant.is_active && participant.employee?.is_active && participant.completion_id
    ));
    if (!completedParticipants.length) {
      toast.error('No hay participantes completados para generar el informe');
      return;
    }

    setExportingPdfId(group.id);
    try {
      const storedCompletions = await fetchTrainingGroupReportCompletions(
        completedParticipants.map((participant) => participant.completion_id!),
      );
      const completionsById = new Map(storedCompletions.map((completion) => [completion.id, completion]));
      const reportCompletions = completedParticipants.flatMap((participant) => {
        const completion = participant.completion_id ? completionsById.get(participant.completion_id) : null;
        if (!completion || !participant.employee) return [];
        const employee = participant.employee;
        const employeeWorkInfo = (employee.employee_work_info || []).map((workInfo) => ({
          id: `${employee.id}-${workInfo.operation_center_id || 'work-info'}`,
          employee_id: employee.id,
          position_name: workInfo.position_name,
          operation_center_id: workInfo.operation_center_id,
          operation_centers: workInfo.operation_centers,
          is_current: true,
        }));
        return [{
          ...completion,
          course: group.course,
          employee: {
            id: employee.id,
            first_name: employee.first_name,
            last_name: employee.last_name,
            document_number: employee.document_number,
            employee_work_info: employeeWorkInfo,
          },
        } satisfies TrainingCompletion];
      });
      const centers = [...new Set(completedParticipants
        .map((participant) => participant.employee?.employee_work_info?.[0]?.operation_centers?.name)
        .filter((name): name is string => Boolean(name)))];
      const centerName = centers.length <= 1 ? centers[0] || 'Sin centro' : `Varios centros (${centers.length})`;
      const doc = await buildTrainingAttendanceReportPdf({
        completions: reportCompletions,
        company: currentCompany,
        centerName,
        courseName: group.course?.name || 'Capacitacion',
        sourceLabel: `capacitaciones por grupo - ${group.name}`,
      });
      doc.save(`registro-asistencia-${sanitizeTrainingReportFileName(group.name)}.pdf`);
      toast.success('Informe de asistencia generado');
    } catch (error) {
      console.error('Group attendance report generation failed', error);
      toast.error('No se pudo generar el informe de asistencia');
    } finally {
      setExportingPdfId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-[2rem] border bg-gradient-to-br from-primary/10 via-background to-primary/5 p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-3 text-3xl font-black"><UsersRound className="h-8 w-8 text-primary" />Capacitaciones por grupo</h1><p className="mt-1 text-muted-foreground">Asigna una capacitación a personas específicas y sigue su cumplimiento.</p></div>{canCreate ? <Button className="h-12 rounded-xl" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva asignación</Button> : null}</div></div>
      <Card><CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_220px]"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar grupo o capacitación" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="expired">Vencidos</SelectItem><SelectItem value="closed">Cerrados</SelectItem><SelectItem value="without_link">Sin enlace</SelectItem></SelectContent></Select></CardContent></Card>
      {isLoading ? <Card><CardContent className="p-12 text-center text-muted-foreground">Cargando asignaciones...</CardContent></Card> : null}
      {!isLoading && !filtered.length ? <Card><CardContent className="p-12 text-center text-muted-foreground">No hay capacitaciones grupales para mostrar.</CardContent></Card> : null}
      <div className="grid gap-4 lg:grid-cols-2">{filtered.map((group) => {
        const stats = getGroupStats(group); const expired = new Date(group.expires_at) < new Date();
        const state = group.status === 'closed' ? 'Cerrado' : !group.token_id ? 'Sin enlace' : expired ? 'Vencido' : 'Activo';
        const stateBadgeClass = state === 'Activo'
          ? 'border-primary/20 bg-primary text-primary-foreground'
          : state === 'Vencido'
            ? 'border-warning/25 bg-warning/15 text-warning'
            : state === 'Sin enlace'
              ? 'border-info/25 bg-info/10 text-info'
              : 'border-border bg-muted text-muted-foreground';
        const utilityButtonClass = 'border-primary/20 bg-primary/[0.055] text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary hover:text-primary-foreground hover:shadow-md active:translate-y-0';

        return (
          <Card key={group.id} className="overflow-hidden rounded-2xl border-primary/15 bg-gradient-to-br from-background via-background to-primary/[0.055] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card-hover">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/20" />
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-foreground">{group.name}</h2>
                  <p className="mt-0.5 text-sm font-medium text-muted-foreground">{group.course?.name}</p>
                </div>
                <Badge variant="outline" className={stateBadgeClass}>{state}</Badge>
              </div>

              <div className="rounded-xl border border-primary/10 bg-background/80 p-3.5">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">{stats.completed}/{stats.total} completaron</span>
                  <strong className="tabular-nums text-primary">{stats.percentage}%</strong>
                </div>
                <Progress value={stats.percentage} className="h-2.5 bg-primary/10" />
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="border-warning/25 bg-warning/10 text-warning">
                  {stats.pending} pendientes
                </Badge>
                {stats.excluded ? (
                  <Badge variant="outline" className="border-border bg-muted text-muted-foreground">{stats.excluded} excluidos</Badge>
                ) : null}
                <Badge variant="outline" className="border-primary/15 bg-primary/[0.06] text-primary">
                  Vence {format(parseISO(group.expires_at), 'dd/MM/yyyy')}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-primary/10 pt-4">
                <Button size="sm" className="shadow-sm" onClick={() => setDetail(group)}>
                  <ClipboardCheck className="mr-1.5 h-4 w-4" />Cumplimiento
                </Button>
                {group.token?.token ? (
                  <>
                    <Button size="sm" variant="outline" className={utilityButtonClass} onClick={() => copyLink(group)} aria-label="Copiar enlace"><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className={utilityButtonClass} onClick={() => setQr({ url: accessUrl(group.token!.token), title: group.name })} aria-label="Mostrar código QR"><QrCode className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className={utilityButtonClass} onClick={() => window.open(accessUrl(group.token!.token), '_blank')} aria-label="Abrir enlace"><ExternalLink className="h-4 w-4" /></Button>
                  </>
                ) : null}
                {canUpdate && state === 'Activo' ? (
                  <Button size="sm" variant="outline" className={utilityButtonClass} onClick={() => { setEditing(group); setFormOpen(true); }} aria-label="Editar asignación"><Pencil className="h-4 w-4" /></Button>
                ) : null}
                {canUpdate && !group.token_id && group.status === 'active' ? (
                  <Button size="sm" onClick={() => { setRegenerateExpiry(defaultExpiry()); setRegenerateTarget(group); }}><Link2 className="mr-1 h-4 w-4" />Generar enlace</Button>
                ) : null}
                {canDelete && group.token_id ? (
                  <Button size="sm" variant="outline" className="border-destructive/20 bg-destructive/5 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteTarget(group)} aria-label="Eliminar enlace"><Trash2 className="h-4 w-4" /></Button>
                ) : null}
                {canUpdate && group.status === 'active' ? (
                  <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground hover:bg-primary/10 hover:text-primary" onClick={() => setCloseTarget(group)}>Cerrar</Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}</div>

      <GroupFormDialog key={`${editing?.id || 'new'}-${formOpen}`} open={formOpen} onOpenChange={setFormOpen} initial={editing} employees={employees} />
      {qr ? <QRCodeDialog open={!!qr} onOpenChange={() => setQr(null)} url={qr.url} title={qr.title} /> : null}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl border-primary/15 p-0 shadow-elevated-lg sm:rounded-2xl sm:p-0">
          <DialogHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-background px-5 py-5 pr-14 sm:px-7 sm:py-6 sm:pr-16">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1 text-left">
                <DialogTitle className="break-words text-xl font-bold leading-tight sm:text-2xl">{detail?.name}</DialogTitle>
                <DialogDescription className="text-sm leading-relaxed">
                  Cumplimiento exclusivo de las personas seleccionadas en esta capacitación.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {detail ? (
            <div className="min-h-0 flex-1 overflow-auto bg-muted/15 p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Participantes del grupo</h3>
                  <p className="text-sm text-muted-foreground">Consulta el estado individual y la fecha de finalización.</p>
                </div>
                <Badge variant="outline" className="w-fit border-primary/20 bg-background px-3 py-1.5 text-primary">
                  <UsersRound className="mr-1.5 h-3.5 w-3.5" />
                  {(detail.participants || []).length} participantes
                </Badge>
              </div>

              <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
                <div className="max-h-[52vh] overflow-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                      <tr className="border-b text-left text-xs font-semibold text-muted-foreground">
                        <th className="px-4 py-3.5">Empleado</th>
                        <th className="px-4 py-3.5">Documento</th>
                        <th className="px-4 py-3.5">Centro</th>
                        <th className="px-4 py-3.5">Cargo</th>
                        <th className="px-4 py-3.5">Estado</th>
                        <th className="px-4 py-3.5">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {(detail.participants || []).map((participant) => {
                        const excluded = !participant.is_active || !participant.employee?.is_active;
                        const completed = !excluded && !!participant.completion_id;
                        return (
                          <tr key={participant.id} className="transition-colors hover:bg-primary/[0.035]">
                            <td className="px-4 py-4 font-semibold text-foreground">{participantName(participant)}</td>
                            <td className="px-4 py-4 tabular-nums text-muted-foreground">{participant.employee?.document_number}</td>
                            <td className="px-4 py-4">{participant.employee?.employee_work_info?.[0]?.operation_centers?.name || '-'}</td>
                            <td className="px-4 py-4">{participant.employee?.employee_work_info?.[0]?.position_name || '-'}</td>
                            <td className="px-4 py-4">
                              <Badge
                                variant="outline"
                                className={excluded
                                  ? 'border-border bg-muted text-muted-foreground'
                                  : completed
                                    ? 'border-success/20 bg-success/10 text-success'
                                    : 'border-warning/25 bg-warning/10 text-warning'}
                              >
                                {excluded ? 'Excluido' : completed ? 'Completado' : 'Pendiente'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 tabular-nums text-muted-foreground">
                              {participant.completion?.completed_at ? format(parseISO(participant.completion.completed_at), 'dd/MM/yyyy') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t bg-background px-4 py-4 sm:px-6">
            <Button variant="outline" className="rounded-lg" onClick={() => setDetail(null)}>Cerrar</Button>
            {canExport && detail ? (
              <Button variant="outline" className="rounded-lg" onClick={() => exportGroup(detail)}>
                <Download className="mr-2 h-4 w-4" />Exportar Excel
              </Button>
            ) : null}
            {canExport && detail ? (
              <Button
                className="rounded-lg shadow-sm"
                onClick={() => exportAttendancePdf(detail)}
                disabled={exportingPdfId === detail.id || !(detail.participants || []).some((participant) => participant.is_active && participant.employee?.is_active && participant.completion_id)}
              >
                {exportingPdfId === detail.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Informe asistencia
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar el enlace?</AlertDialogTitle><AlertDialogDescription>El acceso dejará de funcionar inmediatamente. La capacitación, el grupo, el cumplimiento, las firmas y las evidencias se conservarán.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (!deleteTarget) return; try { await deleteLink.mutateAsync({ assignment_id_value: deleteTarget.id }); toast.success('Enlace eliminado'); setDeleteTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Eliminar enlace</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!closeTarget} onOpenChange={(open) => !open && setCloseTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cerrar esta asignación?</AlertDialogTitle><AlertDialogDescription>El enlace quedará inactivo y el cumplimiento se conservará como histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={async () => { if (!closeTarget) return; try { await closeGroup.mutateAsync({ assignment_id_value: closeTarget.id }); toast.success('Asignación cerrada'); setCloseTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Cerrar asignación</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={!!regenerateTarget} onOpenChange={(open) => !open && setRegenerateTarget(null)}><DialogContent><DialogHeader><DialogTitle>Generar nuevo enlace</DialogTitle><DialogDescription>El cumplimiento existente no se reiniciará.</DialogDescription></DialogHeader><div className="space-y-2"><Label>Nueva fecha de vencimiento</Label><Input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={regenerateExpiry} onChange={(event) => setRegenerateExpiry(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setRegenerateTarget(null)}>Cancelar</Button><Button onClick={async () => { if (!regenerateTarget) return; try { await regenerateLink.mutateAsync({ assignment_id_value: regenerateTarget.id, expires_at_value: new Date(`${regenerateExpiry}T23:59:59`).toISOString() }); toast.success('Nuevo enlace generado'); setRegenerateTarget(null); } catch (error: unknown) { toast.error(errorMessage(error)); } }}>Generar enlace</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
