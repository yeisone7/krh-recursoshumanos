import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Search, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { cn } from "@/lib/utils";

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
    <div className="space-y-8 p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-foreground">Profesiograma de Exámenes</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Requerimientos médicos por centro y cargo
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedIds.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => setBulkDeleteOpen(true)} 
              className="h-11 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-destructive/20 animate-in zoom-in-95"
            >
              <Trash2 className="w-4 h-4" /> Eliminar Seleccionados ({selectedIds.size})
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setIsImportOpen(true)} 
            className="h-11 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] bg-background/50 border-border/50 hover:bg-background transition-all"
          >
            <Download className="w-4 h-4" /> Importar Dotaciones
          </Button>
          <Button 
            onClick={handleNew} 
            className="h-11 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> Nuevo Requerimiento
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por centro, cargo o examen..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-background/50 border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 focus:outline-none text-sm font-medium transition-all"
          />
        </div>
        <Select value={centerFilter} onValueChange={setCenterFilter}>
          <SelectTrigger className="h-11 w-full sm:w-64 rounded-xl bg-background/50 border-border/50 font-black uppercase tracking-widest text-[10px]">
            <SelectValue placeholder="Filtrar por Centro" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-border/50">
            <SelectItem value="all" className="font-black uppercase tracking-widest text-[10px]">Todos los centros</SelectItem>
            {usedCenters.map(c => (
              <SelectItem key={c.id} value={c.id} className="font-black uppercase tracking-widest text-[10px]">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(!profesiogramas || profesiogramas.length === 0) ? (
        <div className="text-center py-32 rounded-[2.5rem] border border-dashed border-border/50 bg-background/20">
          <ClipboardList className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
          <p className="text-lg font-black tracking-tighter text-muted-foreground">No hay profesiogramas configurados</p>
          <Button onClick={handleNew} variant="ghost" className="mt-4 font-bold text-xs uppercase tracking-widest text-primary">Configurar primer requerimiento</Button>
        </div>
      ) : filteredProfesiogramas.length === 0 ? (
        <div className="text-center py-24">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <p className="text-sm font-medium text-muted-foreground">No se encontraron resultados para tu búsqueda</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByCenter.map((group) => (
            <div key={group.centerId} className="group overflow-hidden rounded-[2.5rem] border border-border/50 bg-background/40 backdrop-blur-xl transition-all hover:shadow-2xl hover:shadow-primary/5">
              <div
                className="px-8 py-5 border-b border-border/50 bg-muted/30 flex items-center justify-between cursor-pointer select-none group-hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setCollapsedCenters(prev => {
                    const next = new Set(prev);
                    if (next.has(group.centerId)) next.delete(group.centerId);
                    else next.add(group.centerId);
                    return next;
                  });
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-background/50 transition-transform", !collapsedCenters.has(group.centerId) && "rotate-0", collapsedCenters.has(group.centerId) && "-rotate-90")}>
                    <ChevronDown className="w-4 h-4 text-primary" />
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tighter text-foreground">{group.centerName}</h3>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{group.items.length} Cargos configurados</p>
                  </div>
                </div>
                <Badge variant="outline" className="h-7 px-3 rounded-xl bg-background/50 border-primary/20 text-primary font-black uppercase tracking-widest text-[9px]">
                  Vista Expandida
                </Badge>
              </div>
              
              {!collapsedCenters.has(group.centerId) && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <div className="hidden overflow-x-auto sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-border/40 bg-background/20">
                          <TableHead className="w-16 px-8">
                            <Checkbox
                              checked={group.items.every(p => selectedIds.has(p.id))}
                              onCheckedChange={() => {
                                const allSelected = group.items.every(p => selectedIds.has(p.id));
                                const next = new Set(selectedIds);
                                group.items.forEach(p => allSelected ? next.delete(p.id) : next.add(p.id));
                                setSelectedIds(next);
                              }}
                              className="rounded-md data-[state=checked]:bg-primary"
                            />
                          </TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Cargo Ocupacional</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Procedimientos Requeridos</TableHead>
                          <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right px-8">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((prof) => (
                          <TableRow key={prof.id} className={cn("group/row border-border/30 hover:bg-primary/[0.02] transition-colors", selectedIds.has(prof.id) && "bg-primary/[0.04]")}>
                            <TableCell className="px-8 py-4">
                              <Checkbox
                                checked={selectedIds.has(prof.id)}
                                onCheckedChange={() => toggleSelect(prof.id)}
                                className="rounded-md data-[state=checked]:bg-primary"
                              />
                            </TableCell>
                            <TableCell className="font-black tracking-tight text-foreground py-4">
                              {prof.positions?.name || getPositionName(prof.position_id)}
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex flex-wrap gap-2">
                                {prof.items.slice(0, 4).map((item, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className={cn(
                                      "h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest border-0",
                                      item.is_required ? "bg-violet/10 text-violet" : "bg-muted text-muted-foreground border-dashed border border-border"
                                    )}
                                  >
                                    {item.exam_catalog?.name || 'Examen'}
                                    {!item.is_required && ' (Opcional)'}
                                  </Badge>
                                ))}
                                {prof.items.length > 4 && (
                                  <Badge variant="outline" className="h-6 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary">
                                    +{prof.items.length - 4} Adicionales
                                  </Badge>
                                )}
                                {prof.items.length === 0 && (
                                  <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest italic">Sin requerimientos</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-8 py-4">
                              <div className="flex justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm" onClick={() => handleEdit(prof)}>
                                  <Pencil className="w-4 h-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(prof.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="p-4 space-y-4 sm:hidden">
                    {group.items.map((prof) => (
                      <div key={prof.id} className={cn("rounded-[2rem] border border-border/50 p-6 space-y-4 transition-all", selectedIds.has(prof.id) ? "bg-primary/[0.04] border-primary/20" : "bg-background/40")}>
                        <div className="flex items-start gap-4">
                          <Checkbox checked={selectedIds.has(prof.id)} onCheckedChange={() => toggleSelect(prof.id)} className="rounded-md mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-black tracking-tight text-foreground">{prof.positions?.name || getPositionName(prof.position_id)}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {prof.items.map((item, i) => (
                                <Badge key={i} variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", item.is_required ? "bg-violet/10 text-violet" : "bg-muted text-muted-foreground")}>
                                  {item.exam_catalog?.name || 'Examen'}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 font-black uppercase tracking-widest text-[9px]" onClick={() => handleEdit(prof)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 rounded-xl h-10 text-destructive font-black uppercase tracking-widest text-[9px]" onClick={() => setDeleteId(prof.id)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl p-0 overflow-hidden max-w-md">
          <div className="px-8 py-8 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20">
                <Trash2 className="w-6 h-6 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter">Eliminar Requerimiento</AlertDialogTitle>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Esta acción no se puede deshacer</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              ¿Estás seguro de que deseas eliminar este profesiograma? Se borrará la configuración de exámenes médicos para este cargo en este centro de operación.
            </AlertDialogDescription>
            <div className="flex justify-end gap-3 mt-8">
              <AlertDialogCancel className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-0 bg-muted hover:bg-muted/80">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20" onClick={handleDelete}>
                Confirmar Eliminación
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="rounded-[2.5rem] border-0 shadow-2xl bg-background/95 backdrop-blur-xl p-0 overflow-hidden max-w-md">
          <div className="px-8 py-8 bg-gradient-to-br from-destructive/10 via-background to-destructive/5 border-b border-destructive/10">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive flex items-center justify-center shadow-lg shadow-destructive/20">
                <Trash2 className="w-6 h-6 text-destructive-foreground" />
              </div>
              <div>
                <AlertDialogTitle className="text-2xl font-black tracking-tighter text-foreground">Eliminar Masivamente</AlertDialogTitle>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Se eliminarán {selectedIds.size} registros</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground leading-relaxed">
              Has seleccionado múltiples profesiogramas para eliminar. ¿Confirmas que deseas proceder con la eliminación masiva?
            </AlertDialogDescription>
            <div className="flex justify-end gap-3 mt-8">
              <AlertDialogCancel className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-0 bg-muted hover:bg-muted/80">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                {isBulkDeleting ? 'Procesando...' : 'Confirmar Eliminación'}
              </AlertDialogAction>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <ImportFromDotacionDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        centers={centers}
        positions={positions}
      />
    </div>
  );
}
