import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Search, ChevronDown, ChevronRight, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import { useExamProfesiogramas, useDeleteExamProfesiograma, type ExamProfesiograma } from '@/hooks/useExamProfesiograma';
import { ExamProfesiogramaFormDialog } from './ExamProfesiogramaFormDialog';
import { ImportFromDotacionDialog } from './ImportFromDotacionDialog';

interface Props {
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ExamProfesiogramaTab({ centers, positions }: Props) {
  const { data: profesiogramas, isLoading } = useExamProfesiogramas();
  const deleteMutation = useDeleteExamProfesiograma();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<ExamProfesiograma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [collapsedCenters, setCollapsedCenters] = useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');

  const getCenterName = (id: string) => centers.find(c => c.id === id)?.name || 'Desconocido';
  const getPositionName = (id: string) => positions.find(p => p.id === id)?.name || 'Desconocido';

  const filteredProfesiogramas = useMemo(() => {
    if (!profesiogramas) return [];
    return profesiogramas.filter((prof) => {
      const cName = (prof.operation_centers?.name || getCenterName(prof.operation_center_id)).toLowerCase();
      const pName = (prof.positions?.name || getPositionName(prof.position_id)).toLowerCase();
      const itemNames = prof.items.map(i => (i.exam_catalog?.name || '').toLowerCase()).join(' ');
      const query = searchQuery.toLowerCase();

      const matchesSearch = !query || cName.includes(query) || pName.includes(query) || itemNames.includes(query);
      const matchesCenter = centerFilter === 'all' || prof.operation_center_id === centerFilter;

      return matchesSearch && matchesCenter;
    });
  }, [profesiogramas, searchQuery, centerFilter, centers, positions]);

  const groupedByCenter = useMemo(() => {
    const groups: { centerId: string; centerName: string; items: typeof filteredProfesiogramas }[] = [];
    const map = new Map<string, typeof filteredProfesiogramas>();

    filteredProfesiogramas.forEach((prof) => {
      const cId = prof.operation_center_id;
      if (!map.has(cId)) map.set(cId, []);
      map.get(cId)!.push(prof);
    });

    map.forEach((items, centerId) => {
      const centerName = items[0]?.operation_centers?.name || getCenterName(centerId);
      groups.push({ centerId, centerName, items });
    });

    groups.sort((a, b) => a.centerName.localeCompare(b.centerName));
    return groups;
  }, [filteredProfesiogramas, centers]);

  const usedCenters = useMemo(() => {
    if (!profesiogramas) return [];
    const ids = [...new Set(profesiogramas.map(p => p.operation_center_id))];
    return centers.filter(c => ids.includes(c.id));
  }, [profesiogramas, centers]);

  const handleEdit = (prof: ExamProfesiograma) => {
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

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    let deleted = 0;
    for (const id of selectedIds) {
      try {
        await deleteMutation.mutateAsync(id);
        deleted++;
      } catch { /* skip */ }
    }
    setIsBulkDeleting(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    toast.success(`${deleted} profesiograma${deleted > 1 ? 's' : ''} eliminado${deleted > 1 ? 's' : ''}`);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profesiograma de Exámenes Médicos</h2>
          <p className="text-sm text-muted-foreground">
            Define qué exámenes médicos corresponden a cada combinación de Centro + Cargo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-1.5">
              <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.size})
            </Button>
          )}
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo
          </Button>
        </div>
      </div>

      {profesiogramas && profesiogramas.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por centro, cargo o examen..."
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {usedCenters.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(!profesiogramas || profesiogramas.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground card-elevated">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay profesiogramas de exámenes configurados</p>
          <Button onClick={handleNew} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Crear Profesiograma
          </Button>
        </div>
      ) : filteredProfesiogramas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground card-elevated">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron profesiogramas con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByCenter.map((group) => (
            <div key={group.centerId} className="card-elevated">
              <div
                className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center justify-between cursor-pointer select-none"
                onClick={() => {
                  setCollapsedCenters(prev => {
                    const next = new Set(prev);
                    if (next.has(group.centerId)) next.delete(group.centerId);
                    else next.add(group.centerId);
                    return next;
                  });
                }}
              >
                <div className="flex items-center gap-2">
                  {collapsedCenters.has(group.centerId) ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <ClipboardList className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">{group.centerName}</h3>
                  <Badge variant="secondary" className="text-xs">{group.items.length}</Badge>
                </div>
              </div>
              {!collapsedCenters.has(group.centerId) && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={group.items.every(p => selectedIds.has(p.id))}
                          onCheckedChange={() => {
                            const allSelected = group.items.every(p => selectedIds.has(p.id));
                            const next = new Set(selectedIds);
                            group.items.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
                            setSelectedIds(next);
                          }}
                        />
                      </TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Exámenes</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((prof) => (
                      <TableRow key={prof.id} className={selectedIds.has(prof.id) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(prof.id)}
                            onCheckedChange={() => toggleSelect(prof.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {prof.positions?.name || getPositionName(prof.position_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prof.items.slice(0, 3).map((item, i) => (
                              <Badge
                                key={i}
                                variant={item.is_required ? 'secondary' : 'outline'}
                                className={`text-xs ${!item.is_required ? 'border-dashed' : ''}`}
                              >
                                {item.exam_catalog?.name || 'Examen'}
                                {!item.is_required && ' ⓘ'}
                              </Badge>
                            ))}
                            {prof.items.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{prof.items.length - 3} más
                              </Badge>
                            )}
                            {prof.items.length === 0 && (
                              <span className="text-sm text-muted-foreground">Sin exámenes</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(prof)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(prof.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </div>
      )}

      <ExamProfesiogramaFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        centers={centers}
        positions={positions}
        editData={editData}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar profesiograma</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este profesiograma de exámenes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar {selectedIds.size} profesiograma(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
