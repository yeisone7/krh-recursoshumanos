import { FormEvent, useMemo, useState } from 'react';
import { Building2, Mail, Pencil, Phone, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { LaborReference, LaborReferenceInput, useLaborReferences } from '@/hooks/useLaborReferences';

const MODULE_CODE = 'catalogos_seleccion_referencias_laborales';
const emptyForm: LaborReferenceInput = { company: '', phone: '', email: '', observations: '' };

export default function ReferenciasLaborales() {
  const { canCreate, canUpdate, canDelete } = useAuth();
  const { data, isLoading, refetch, create, update, remove, isSaving, isDeleting } = useLaborReferences();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LaborReference | null>(null);
  const [form, setForm] = useState<LaborReferenceInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<LaborReference | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((item) => [item.company, item.phone, item.email, item.observations].some((value) => value?.toLowerCase().includes(term)));
  }, [data, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (item: LaborReference) => {
    setEditing(item);
    setForm({ company: item.company, phone: item.phone || '', email: item.email || '', observations: item.observations || '' });
    setFormOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (editing) await update({ id: editing.id, ...form });
    else await create(form);
    setFormOpen(false);
  };

  return (
    <div className="selection-catalog-page mx-auto max-w-7xl space-y-6 px-2">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="size-7" /></div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Referencias laborales</h1>
            <p className="text-sm text-muted-foreground">Catálogo de empresas y datos de contacto para validaciones laborales.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Actualizar referencias"><RefreshCw className={isLoading ? 'size-4 animate-spin' : 'size-4'} /></Button>
          {canCreate(MODULE_CODE) && <Button onClick={openCreate}><Plus className="mr-2 size-4" />Nueva referencia</Button>}
        </div>
      </header>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" placeholder="Buscar por empresa, teléfono o correo" />
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center"><Building2 className="mx-auto mb-3 size-10 text-muted-foreground/40" /><p className="font-medium">No hay referencias laborales registradas</p><p className="mt-1 text-sm text-muted-foreground">{search ? 'Prueba con otro término de búsqueda.' : 'Crea la primera referencia para comenzar.'}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Teléfono</TableHead><TableHead>Correo electrónico</TableHead><TableHead>Observaciones</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>{filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.company}</TableCell>
                  <TableCell>{item.phone ? <span className="inline-flex items-center gap-2"><Phone className="size-3.5 text-muted-foreground" />{item.phone}</span> : '—'}</TableCell>
                  <TableCell>{item.email ? <span className="inline-flex items-center gap-2"><Mail className="size-3.5 text-muted-foreground" />{item.email}</span> : '—'}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal text-muted-foreground">{item.observations || '—'}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end gap-1">
                    {canUpdate(MODULE_CODE) && <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label={`Editar ${item.company}`}><Pencil className="size-4" /></Button>}
                    {canDelete(MODULE_CODE) && <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(item)} aria-label={`Eliminar ${item.company}`}><Trash2 className="size-4" /></Button>}
                  </div></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] gap-5 rounded-2xl p-5 sm:max-w-lg sm:p-7">
          <DialogHeader className="pr-8"><DialogTitle>{editing ? 'Editar referencia laboral' : 'Nueva referencia laboral'}</DialogTitle><DialogDescription>Registra los datos de contacto de la referencia.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="labor-reference-company">Empresa *</Label><Input id="labor-reference-company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} maxLength={160} required autoFocus /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="labor-reference-phone">Teléfono</Label><Input id="labor-reference-phone" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={50} /></div>
              <div className="space-y-2"><Label htmlFor="labor-reference-email">Correo electrónico</Label><Input id="labor-reference-email" type="email" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="labor-reference-observations">Observaciones</Label><Textarea id="labor-reference-observations" value={form.observations || ''} onChange={(event) => setForm({ ...form, observations: event.target.value })} maxLength={2000} rows={4} /></div>
            <DialogFooter className="border-t pt-4"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSaving || !form.company.trim()}>{isSaving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear referencia'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar referencia laboral?</AlertDialogTitle><AlertDialogDescription>Se eliminará la referencia de {deleteTarget?.company}. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting} onClick={async () => { if (deleteTarget) { await remove(deleteTarget.id); setDeleteTarget(null); } }}>{isDeleting ? 'Eliminando…' : 'Eliminar'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
