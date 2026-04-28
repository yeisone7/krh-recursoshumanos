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

export function ExamCatalogTab() {
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Catálogo de Exámenes</h2>
          <p className="text-sm text-muted-foreground">
            Tipos de exámenes médicos que se pueden aplicar a los empleados
          </p>
        </div>
        <Button onClick={handleNew} className="w-full gap-2 sm:w-auto">
          <Plus className="w-4 h-4" /> Nuevo Examen
        </Button>
      </div>

      {catalog.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar examen..."
            className="pl-10"
          />
        </div>
      )}

      {catalog.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground card-elevated">
          <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay tipos de exámenes configurados</p>
          <Button onClick={handleNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Crear Tipo de Examen
          </Button>
        </div>
      ) : (
        <div className="card-elevated">
          <div className="hidden overflow-x-auto sm:block">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Activo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCatalog.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    {item.code ? (
                      <Badge variant="outline" className="text-xs">{item.code}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {item.description || '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => toggleActive(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            className="p-3 sm:hidden"
            items={filteredCatalog.map((item) => ({
              id: item.id,
              title: item.name,
              subtitle: item.description || 'Sin descripción',
              badge: item.code ? <Badge variant="outline" className="text-xs">{item.code}</Badge> : undefined,
              fields: [
                { label: 'Estado', value: item.is_active ? 'Activo' : 'Inactivo' },
              ],
              actions: (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                    <Pencil className="w-4 h-4 mr-2" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              ),
              itemClassName: !item.is_active ? 'opacity-60' : undefined,
            }))}
          />

          {filteredCatalog.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No se encontraron exámenes con esos criterios</p>
            </div>
          )}
        </div>
      )}

      <ExamCatalogFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        item={editItem}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="w-[calc(100vw-1rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de examen</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? Si este tipo está siendo usado en profesiogramas o aplicaciones, no se podrá eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
