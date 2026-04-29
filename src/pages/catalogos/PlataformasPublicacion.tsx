import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Pencil, Trash2, Globe } from 'lucide-react';
import { useVacancyPlatforms, type VacancyPublicationPlatform } from '@/hooks/useVacancyPlatforms';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function PlataformasPublicacion() {
  const { data, isLoading, create, update, delete: deleteItem, isCreating, isUpdating } = useVacancyPlatforms();
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VacancyPublicationPlatform | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const filtered = data.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setUrl('');
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (item: VacancyPublicationPlatform) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description || '');
    setUrl(item.url || '');
    setIsActive(item.is_active);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (editing) {
      await update({ id: editing.id, name, description, url, is_active: isActive });
    } else {
      await create({ name, description, url, is_active: isActive });
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 break-words">
                <Globe className="h-5 w-5 shrink-0" />
                Plataformas de Publicación
              </CardTitle>
              <CardDescription>
                Catálogo de plataformas donde se publican las vacantes
              </CardDescription>
            </div>
            <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" /> Nueva Plataforma
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar plataforma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay plataformas registradas.</p>
          ) : (
            <>
              <MobileCardList
                className="md:hidden"
                emptyMessage="No hay plataformas registradas."
                items={filtered.map((item) => ({
                  id: item.id,
                  title: item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {item.name}
                    </a>
                  ) : item.name,
                  subtitle: item.description || 'Sin descripción',
                  badge: (
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  ),
                  fields: [
                    { label: 'URL', value: item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {item.url}
                      </a>
                    ) : '—', className: 'col-span-2' },
                  ],
                  actions: (
                    <>
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        Eliminar
                      </Button>
                    </>
                  ),
                }))}
              />
              <div className="hidden md:block overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {item.name}
                            </a>
                          ) : item.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{item.description || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px] block">
                              {item.url}
                            </a>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.is_active ? 'default' : 'secondary'}>
                            {item.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Plataforma' : 'Nueva Plataforma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: CompuTrabajo, elempleo.com..." />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción opcional" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <Label>Activa</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || isCreating || isUpdating}>
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la plataforma del catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteItem(deleteId); setDeleteId(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
