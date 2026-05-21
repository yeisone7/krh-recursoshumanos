import { useState } from 'react';
import { Stethoscope, Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useExamCatalog, useDeleteExamCatalogItem, useUpdateExamCatalogItem } from '@/hooks/useExamCatalog';
import { ExamCatalogFormDialog } from './ExamCatalogFormDialog';
import type { ExamCatalogItem } from '@/hooks/useExamCatalog';
import { Switch } from '@/components/ui/switch';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { cn } from "@/lib/utils";

interface ExamCatalogTabProps {
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function ExamCatalogTab({
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: ExamCatalogTabProps) {
  const { data: catalog = [], isLoading } = useExamCatalog();
  const deleteMutation = useDeleteExamCatalogItem();
  const updateMutation = useUpdateExamCatalogItem();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ExamCatalogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = catalog.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (item: ExamCatalogItem) => {
    setEditItem(item);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditItem(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Tipo de examen eliminado');
    } catch (error: any) {
      if (error?.message?.includes('foreign key') || error?.message?.includes('referenced')) {
        toast.error('No se puede eliminar: está siendo usado en un profesiograma o aplicación');
      } else {
        toast.error('Error al eliminar');
      }
    }
    setDeleteId(null);
  };

  const toggleActive = async (item: ExamCatalogItem) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, is_active: !item.is_active });
      toast.success(item.is_active ? 'Examen desactivado' : 'Examen activado');
    } catch {
      toast.error('Error al actualizar estado');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-foreground">Catálogo de Exámenes</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Gestión de procedimientos médicos ocupacionales
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar examen..."
              className="h-11 w-full sm:w-64 pl-10 rounded-xl bg-background border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all font-medium text-sm"
            />
          </div>
          {canCreate && (
            <Button onClick={handleNew} className="h-11 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all">
              <Plus className="w-4 h-4" /> Nuevo Examen
            </Button>
          )}
        </div>
      </div>

      {catalog.length === 0 ? (
        <div className="text-center py-32 rounded-[2.5rem] border border-dashed border-border/50 bg-background">
          <Stethoscope className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
          <p className="text-lg font-black tracking-tighter text-muted-foreground">No hay tipos de exámenes configurados</p>
          {canCreate && (
            <Button onClick={handleNew} variant="ghost" className="mt-4 font-bold text-xs uppercase tracking-widest text-primary">Crear el primer examen</Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-border/50 bg-background ">
          <div className="hidden overflow-x-auto sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50 bg-background">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Nombre Procedimiento</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Identificador</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4">Descripción</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4 text-center">Estado</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest px-6 py-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCatalog.map((item) => (
                  <TableRow key={item.id} className={cn('group border-border/40 hover:bg-primary/[0.02] transition-colors', !item.is_active && 'opacity-50 grayscale-[0.5]')}>
                    <TableCell className="px-6 py-4 font-black tracking-tight text-foreground">{item.name}</TableCell>
                    <TableCell className="px-6 py-4">
                      {item.code ? (
                        <Badge variant="outline" className="h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-primary border-primary/20">{item.code}</Badge>
                      ) : (
                        <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <p className="text-[11px] font-medium text-muted-foreground max-w-[300px] leading-relaxed line-clamp-2">
                        {item.description || 'Sin descripción detallada'}
                      </p>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <Switch
                        checked={item.is_active}
                        onCheckedChange={() => toggleActive(item)}
                        disabled={!canUpdate}
                        className="data-[state=checked]:bg-primary"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canUpdate && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm transition-all" onClick={() => handleEdit(item)}>
                            <Pencil className="w-4 h-4 text-primary" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 transition-all"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <MobileCardList
            className="p-4 sm:hidden space-y-4"
            items={filteredCatalog.map((item) => ({
              id: item.id,
              title: item.name,
              subtitle: item.description || 'Sin descripción',
              badge: item.code ? <Badge variant="outline" className="rounded-lg text-[9px] font-black uppercase">{item.code}</Badge> : undefined,
              fields: [
                { label: 'Estado', value: item.is_active ? 'Activo' : 'Inactivo', className: item.is_active ? 'text-primary' : 'text-muted-foreground' },
              ],
              actions: (
                <div className="flex gap-2 w-full mt-2">
                  {canUpdate && (
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl font-black uppercase text-[9px]" onClick={() => handleEdit(item)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl text-destructive font-black uppercase text-[9px]" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Eliminar
                    </Button>
                  )}
                </div>
              ),
              itemClassName: !item.is_active ? 'opacity-60 grayscale-[0.5]' : undefined,
            }))}
          />
        </div>
      )}

      <ExamCatalogFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        item={editItem}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-[2rem] border-0 shadow-2xl bg-background overflow-hidden p-0">
          <div className="px-8 py-8 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20">
                <Trash2 className="w-6 h-6 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter text-foreground">Eliminar Procedimiento</AlertDialogTitle>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Atención: Esta acción es sensible</p>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              ¿Estás seguro de que deseas eliminar este tipo de examen? Si está vinculado a profesiogramas existentes o aplicaciones históricas, la acción será rechazada para mantener la integridad.
            </AlertDialogDescription>
            
            <div className="flex items-center justify-end gap-3 mt-8">
              <AlertDialogCancel className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-0 bg-background hover:bg-background /80 transition-all">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-all"
                onClick={handleDelete}
              >
                Confirmar Eliminación
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
