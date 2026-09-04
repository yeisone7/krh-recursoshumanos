import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, ExternalLink, Link2, Plus, RefreshCw, ShieldAlert, Trash2, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { EmployeeAvatarZoom } from '@/components/employees/EmployeeAvatarZoom';
import {
  COPASST_PERMISSIONS, COPASST_REFRESH_QUERY_OPTIONS, bogotaInputToIso, closeCopasstElection, createCopasstElection,
  cancelCopasstElection, deleteCopasstDraft, getCopasstCandidates, getEffectiveCopasstStatus, isoToBogotaInput,
  listCandidateEmployees, listCopasstElections, publicCopasstUrl, publishCopasstElection,
  rotateCopasstToken, setCopasstTokenActive, updateCopasstDraft, updateCopasstSchedule, uploadCopasstCandidatePhoto,
} from '@/lib/copasst';
import type { CopasstElection, CopasstElectionPayload, CopasstEmployeeOption } from '@/types/copasst';

const statusLabel = { draft: 'Borrador', scheduled: 'Programada', open: 'Abierta', closed: 'Cerrada', cancelled: 'Cancelada' } as const;
const emptyForm = { title: '', description: '', term_label: '', seats: 1, allow_blank_vote: true, starts_at: '', ends_at: '' };

export default function CopasstElections() {
  const { currentCompanyId, canCreate, canUpdate, canDelete } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CopasstElection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const electionsQuery = useQuery({
    queryKey: ['copasst-elections', currentCompanyId],
    queryFn: () => listCopasstElections(currentCompanyId!), enabled: !!currentCompanyId,
    ...COPASST_REFRESH_QUERY_OPTIONS,
  });
  const employeesQuery = useQuery({
    queryKey: ['copasst-candidate-employees', currentCompanyId],
    queryFn: () => listCandidateEmployees(currentCompanyId!), enabled: !!currentCompanyId && dialogOpen,
    ...COPASST_REFRESH_QUERY_OPTIONS,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['copasst-elections', currentCompanyId] });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa');
      const candidates = Object.entries(selected).map(([employee_id, photo_url]) => ({ employee_id, photo_url }));
      if (!form.title.trim() || !form.term_label.trim() || !form.starts_at || !form.ends_at) throw new Error('Completa nombre, período y fechas');
      if (candidates.length < form.seats) throw new Error('Debe haber al menos tantos candidatos como puestos');
      if (candidates.some((candidate) => !candidate.photo_url)) throw new Error('Todos los candidatos deben tener fotografía');
      const payload: CopasstElectionPayload = { ...form, company_id: currentCompanyId, starts_at: bogotaInputToIso(form.starts_at), ends_at: bogotaInputToIso(form.ends_at), candidates };
      return editing ? updateCopasstDraft(editing.id, payload) : createCopasstElection(payload);
    },
    onSuccess: () => { toast.success(editing ? 'Borrador actualizado' : 'Elección creada'); setDialogOpen(false); invalidate(); },
    onError: (error: Error) => toast.error(error.message),
  });

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    try { await action(); toast.success(message); invalidate(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'No fue posible completar la acción'); }
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setSelected({}); setSearch(''); setDialogOpen(true); };
  const openEdit = async (election: CopasstElection) => {
    const candidates = await getCopasstCandidates(election.id);
    setEditing(election);
    setForm({ title: election.title, description: election.description ?? '', term_label: election.term_label, seats: election.seats, allow_blank_vote: election.allow_blank_vote, starts_at: isoToBogotaInput(election.starts_at), ends_at: isoToBogotaInput(election.ends_at) });
    setSelected(Object.fromEntries(candidates.map((candidate) => [candidate.employee_id, candidate.photo_url])));
    setDialogOpen(true);
  };

  const filteredEmployees = useMemo(() => (employeesQuery.data ?? []).filter((employee) =>
    `${employee.display_name} ${employee.document_number} ${employee.position_name ?? ''}`.toLowerCase().includes(search.toLowerCase())), [employeesQuery.data, search]);

  const toggleCandidate = (employee: CopasstEmployeeOption, checked: boolean) => setSelected((current) => {
    const next = { ...current };
    if (checked) next[employee.id] = employee.avatar_url ?? '';
    else delete next[employee.id];
    return next;
  });

  const changeSchedule = (election: CopasstElection) => {
    const startsAt = window.prompt('Nueva fecha de inicio (AAAA-MM-DDTHH:mm, hora Colombia)', isoToBogotaInput(election.starts_at));
    if (!startsAt) return;
    const endsAt = window.prompt('Nueva fecha de cierre (AAAA-MM-DDTHH:mm, hora Colombia)', isoToBogotaInput(election.ends_at));
    if (!endsAt) return;
    void runAction(() => updateCopasstSchedule(election.id, bogotaInputToIso(startsAt), bogotaInputToIso(endsAt)), 'Fechas actualizadas');
  };

  const cancelElection = (election: CopasstElection) => {
    const note = window.prompt('Motivo de cancelación (solo es posible si no hay votos)');
    if (!note) return;
    void runAction(() => cancelCopasstElection(election.id, note), 'Elección cancelada');
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-3xl font-bold tracking-tight">Elecciones COPASST</h1><p className="text-muted-foreground">Configura la papeleta, congela el censo y administra el enlace público.</p></div>
      {canCreate(COPASST_PERMISSIONS.elections) && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nueva elección</Button>}
    </div>
    <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/10"><CardContent className="flex gap-3 p-4 text-sm"><ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" /><p>El documento valida pertenencia al censo, pero no prueba la identidad de quien lo digita. La aplicación separa participación y papeleta para que RR. HH. nunca pueda consultar elector → candidato.</p></CardContent></Card>
    {electionsQuery.isLoading ? <p className="text-muted-foreground">Cargando elecciones…</p> : !electionsQuery.data?.length ?
      <Card><CardContent className="flex flex-col items-center gap-3 py-14 text-center"><Vote className="h-10 w-10 text-muted-foreground" /><p className="font-medium">Aún no hay elecciones COPASST</p><p className="text-sm text-muted-foreground">Crea un borrador y selecciona los candidatos.</p></CardContent></Card> :
      <div className="grid gap-4 lg:grid-cols-2">{electionsQuery.data.map((election) => {
        const effective = getEffectiveCopasstStatus(election);
        const url = publicCopasstUrl(election.public_token);
        return <Card key={election.id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{election.title}</CardTitle><CardDescription>{election.term_label} · {election.seats} puesto(s)</CardDescription></div><Badge variant={effective === 'open' ? 'default' : 'secondary'}>{statusLabel[effective]}</Badge></div></CardHeader>
          <CardContent className="space-y-4"><div className="text-sm text-muted-foreground"><p>Inicio: {new Date(election.starts_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p><p>Cierre: {new Date(election.ends_at).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p></div>
          {election.status !== 'draft' && <div className="flex gap-2"><Input value={url} readOnly aria-label="Enlace público" /><Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'))}><Copy className="h-4 w-4" /></Button><Button variant="outline" size="icon" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button></div>}
          <div className="flex flex-wrap gap-2">
            {election.status === 'draft' && canUpdate(COPASST_PERMISSIONS.elections) && <><Button size="sm" variant="outline" onClick={() => openEdit(election)}>Editar</Button><Button size="sm" onClick={() => runAction(() => publishCopasstElection(election.id), 'Elección publicada y censo congelado')}>Publicar</Button></>}
            {election.status === 'published' && canUpdate(COPASST_PERMISSIONS.elections) && <><Button size="sm" variant="outline" onClick={() => changeSchedule(election)}>Cambiar fechas</Button><Button size="sm" variant="outline" onClick={() => runAction(() => rotateCopasstToken(election.id), 'Enlace rotado') }><RefreshCw className="mr-2 h-4 w-4" />Rotar enlace</Button><Button size="sm" variant="outline" onClick={() => runAction(() => setCopasstTokenActive(election.id, !election.token_active), election.token_active ? 'Enlace desactivado' : 'Enlace activado')}><Link2 className="mr-2 h-4 w-4" />{election.token_active ? 'Desactivar' : 'Activar'}</Button><Button size="sm" onClick={() => runAction(() => closeCopasstElection(election.id), 'Elección cerrada')}>Cerrar ahora</Button></>}
            {election.status === 'published' && canDelete(COPASST_PERMISSIONS.elections) && <Button size="sm" variant="destructive" onClick={() => cancelElection(election)}>Cancelar elección</Button>}
            {election.status === 'draft' && canDelete(COPASST_PERMISSIONS.elections) && <Button size="sm" variant="destructive" onClick={() => confirm('¿Eliminar este borrador?') && runAction(() => deleteCopasstDraft(election.id), 'Borrador eliminado')}><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>}
          </div></CardContent></Card>;
      })}</div>}

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar elección' : 'Nueva elección COPASST'}</DialogTitle><DialogDescription>Las fechas se interpretan en America/Bogota. La configuración quedará inmutable al publicar.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Nombre</Label><Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="term">Período</Label><Input id="term" placeholder="2026–2028" value={form.term_label} onChange={(e) => setForm({ ...form, term_label: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="seats">Puestos</Label><Input id="seats" type="number" min={1} max={50} value={form.seats} onChange={(e) => setForm({ ...form, seats: Number(e.target.value) })} /></div><div className="space-y-2"><Label htmlFor="start">Inicio</Label><Input id="start" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="end">Cierre</Label><Input id="end" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div><div className="flex items-center gap-3 sm:col-span-2"><Switch id="blank" checked={form.allow_blank_vote} onCheckedChange={(value) => setForm({ ...form, allow_blank_vote: value })} /><Label htmlFor="blank">Permitir voto en blanco</Label></div></div>
      <div className="space-y-3"><div className="flex items-center justify-between"><Label>Candidatos ({Object.keys(selected).length})</Label><span className="text-xs text-muted-foreground">Haz clic en una foto para ampliarla</span></div><Input placeholder="Buscar por nombre, documento o cargo" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">{filteredEmployees.map((employee) => <div key={employee.id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/60"><Checkbox checked={employee.id in selected} onCheckedChange={(value) => toggleCandidate(employee, value === true)} /><EmployeeAvatarZoom imageUrl={selected[employee.id] || employee.avatar_url} name={employee.display_name} initials={employee.display_name.slice(0, 2).toUpperCase()} /><div className="min-w-0 flex-1"><p className="truncate font-medium">{employee.display_name}</p><p className="truncate text-xs text-muted-foreground">{employee.position_name ?? 'Sin cargo'} · {employee.operation_center_name ?? 'Sin centro'}</p></div>{employee.id in selected && <Label className="cursor-pointer text-xs text-primary">Cambiar foto<Input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !currentCompanyId) return; try { const url = await uploadCopasstCandidatePhoto(currentCompanyId, employee.id, file); setSelected((current) => ({ ...current, [employee.id]: url })); toast.success('Foto cargada'); } catch (error) { toast.error(error instanceof Error ? error.message : 'No fue posible cargar la foto'); } }} /></Label>}</div>)}</div></div>
      <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Guardando…' : 'Guardar borrador'}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}
