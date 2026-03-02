import { useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Package, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import { useProfesiogramas, useDeleteProfesiograma, useCreateProfesiograma, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { ProfesiogramaFormDialog } from './ProfesiogramaFormDialog';
import { CloneProfesiogramaDialog } from './CloneProfesiogramaDialog';

interface Props {
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ProfesiogramaTab({ centers, positions }: Props) {
  const { data: profesiogramas, isLoading } = useProfesiogramas();
  const deleteMutation = useDeleteProfesiograma();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<Profesiograma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<Profesiograma | null>(null);

  const handleEdit = (prof: Profesiograma) => {
    setEditData(prof);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditData(null);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Profesiograma eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
    setDeleteId(null);
  };

  const getCenterName = (id: string) => centers.find(c => c.id === id)?.name || 'Desconocido';
  const getPositionName = (id: string) => positions.find(p => p.id === id)?.name || 'Desconocido';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profesiograma de Dotación</h2>
          <p className="text-sm text-muted-foreground">
            Define qué dotación corresponde a cada combinación de Centro + Cargo
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="w-4 h-4" /> Nuevo Profesiograma
        </Button>
      </div>

      {(!profesiogramas || profesiogramas.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground card-elevated">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay profesiogramas configurados</p>
          <Button onClick={handleNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Crear Primer Profesiograma
          </Button>
        </div>
      ) : (
        <div className="card-elevated">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de Operación</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Artículos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profesiogramas.map((prof) => (
                <TableRow key={prof.id}>
                  <TableCell className="font-medium">
                    {prof.operation_centers?.name || getCenterName(prof.operation_center_id)}
                  </TableCell>
                  <TableCell>
                    {prof.positions?.name || getPositionName(prof.position_id)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {prof.items.slice(0, 3).map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {item.dotation_item_types?.name || 'Artículo'}
                          {item.quantity > 1 && ` x${item.quantity}`}
                        </Badge>
                      ))}
                      {prof.items.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{prof.items.length - 3} más
                        </Badge>
                      )}
                      {prof.items.length === 0 && (
                        <span className="text-sm text-muted-foreground">Sin artículos</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(prof)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCloneData(prof)} title="Clonar">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(prof.id)} title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProfesiogramaFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        centers={centers}
        positions={positions}
        editData={editData}
      />

      <CloneProfesiogramaDialog
        open={!!cloneData}
        onOpenChange={(open) => { if (!open) setCloneData(null); }}
        sourceData={cloneData}
        centers={centers}
        positions={positions}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar profesiograma?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este profesiograma y todos sus artículos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
