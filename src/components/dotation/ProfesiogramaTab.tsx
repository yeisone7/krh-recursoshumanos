import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Copy, Download, Upload, Search, ChevronDown, ChevronRight, Eye } from 'lucide-react';
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
import * as XLSX from 'xlsx';

import { useProfesiogramas, useDeleteProfesiograma, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { useDotationItemTypes } from '@/hooks/useSystemConfig';
import { ProfesiogramaFormDialog } from './ProfesiogramaFormDialog';
import { CloneProfesiogramaDialog } from './CloneProfesiogramaDialog';
import { ImportProfesiogramaDialog } from './ImportProfesiogramaDialog';
import { ProfesiogramaDetailDialog } from './ProfesiogramaDetailDialog';

interface Props {
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ProfesiogramaTab({ centers, positions }: Props) {
  const { data: profesiogramas, isLoading } = useProfesiogramas();
  const deleteMutation = useDeleteProfesiograma();
  const { data: itemTypes = [] } = useDotationItemTypes();
  

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<Profesiograma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<Profesiograma | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [previewData, setPreviewData] = useState<Profesiograma | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [collapsedCenters, setCollapsedCenters] = useState<Set<string>>(new Set());

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [centerFilter, setCenterFilter] = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');

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

  const getCenterName = (id: string) => centers.find(c => c.id === id)?.name || 'Desconocido';
  const getPositionName = (id: string) => positions.find(p => p.id === id)?.name || 'Desconocido';

  // Filtered data
  const filteredProfesiogramas = useMemo(() => {
    if (!profesiogramas) return [];
    return profesiogramas.filter((prof) => {
      const cName = (prof.operation_centers?.name || getCenterName(prof.operation_center_id)).toLowerCase();
      const pName = (prof.positions?.name || getPositionName(prof.position_id)).toLowerCase();
      const itemNames = prof.items.map(i => (i.dotation_item_types?.name || '').toLowerCase()).join(' ');
      const query = searchQuery.toLowerCase();

      const matchesSearch = !query || cName.includes(query) || pName.includes(query) || itemNames.includes(query);
      const matchesCenter = centerFilter === 'all' || prof.operation_center_id === centerFilter;
      const matchesPosition = positionFilter === 'all' || prof.position_id === positionFilter;

      return matchesSearch && matchesCenter && matchesPosition;
    });
  }, [profesiogramas, searchQuery, centerFilter, positionFilter, centers, positions]);

  // Group filtered profesiogramas by center
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

  const usedPositions = useMemo(() => {
    if (!profesiogramas) return [];
    const ids = [...new Set(profesiogramas.map(p => p.position_id))];
    return positions.filter(p => ids.includes(p.id));
  }, [profesiogramas, positions]);

  // Selection helpers
  const allFilteredSelected = filteredProfesiogramas.length > 0 && filteredProfesiogramas.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProfesiogramas.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  // ── Export to Excel ──
  const handleExport = () => {
    if (!profesiogramas || profesiogramas.length === 0) {
      toast.error('No hay profesiogramas para exportar');
      return;
    }

    const rows = profesiogramas.flatMap((prof) => {
      if (prof.items.length === 0) {
        return [{
          'Centro de Operación': prof.operation_centers?.name || getCenterName(prof.operation_center_id),
          'Cargo': prof.positions?.name || getPositionName(prof.position_id),
          'Artículo': '',
          'Código Artículo': '',
          'Categoría': '',
          'Cantidad': '' as string | number,
          'Obligatorio': '',
          'Notas': '',
        }];
      }
      return prof.items.map((item) => ({
        'Centro de Operación': prof.operation_centers?.name || getCenterName(prof.operation_center_id),
        'Cargo': prof.positions?.name || getPositionName(prof.position_id),
        'Artículo': item.dotation_item_types?.name || '',
        'Código Artículo': item.dotation_item_types?.code || '',
        'Categoría': item.dotation_item_types?.category || '',
        'Cantidad': item.quantity as string | number,
        'Obligatorio': (item as any).is_required !== false ? 'Sí' : 'No',
        'Notas': item.notes || '',
      }));
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profesiogramas');

    const templateRows = [{
      'Centro de Operación (nombre exacto)': 'Ejemplo Centro',
      'Cargo (nombre exacto)': 'Ejemplo Cargo',
      'Código Artículo': 'EPP-001',
      'Cantidad': 1,
      'Obligatorio': 'Sí',
      'Notas': '',
    }];
    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Plantilla Importación');

    XLSX.writeFile(wb, `profesiogramas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Archivo exportado exitosamente');
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
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profesiograma de Dotación</h2>
          <p className="text-sm text-muted-foreground">
            Define qué dotación corresponde a cada combinación de Centro + Cargo
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          {selectedIds.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="col-span-2 gap-1.5 sm:col-span-1">
              <Trash2 className="w-4 h-4" /> Eliminar ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={!profesiogramas?.length}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-1.5">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button onClick={handleNew} className="col-span-2 gap-2 sm:col-span-1">
            <Plus className="w-4 h-4" /> Nuevo
          </Button>
        </div>
      </div>


      {/* Filters */}
      {profesiogramas && profesiogramas.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por centro, cargo o artículo..."
              className="w-full h-9 pl-10 pr-4 rounded-lg bg-background border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <Select value={centerFilter} onValueChange={setCenterFilter}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los centros</SelectItem>
              {usedCenters.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-9 w-full text-sm sm:w-[180px]">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los cargos</SelectItem>
              {usedPositions.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table or Empty State */}
      {(!profesiogramas || profesiogramas.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground card-elevated">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay profesiogramas configurados</p>
          <div className="grid grid-cols-1 gap-2 mt-4 sm:flex sm:justify-center">
            <Button onClick={handleNew} className="gap-2">
              <Plus className="w-4 h-4" /> Crear Profesiograma
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Importar desde Excel
            </Button>
          </div>
        </div>
      ) : filteredProfesiogramas.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground card-elevated">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No se encontraron profesiogramas con los filtros seleccionados</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setSearchQuery(''); setCenterFilter('all'); setPositionFilter('all'); }}>
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="px-1 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filteredProfesiogramas.length} de {profesiogramas.length} profesiograma{profesiogramas.length !== 1 ? 's' : ''}
            </p>
            {selectedIds.size > 0 && (
              <p className="text-xs font-medium text-primary">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</p>
            )}
          </div>
          {groupedByCenter.map((group) => (
            <div key={group.centerId} className="card-elevated">
              <div
                className="px-4 py-2.5 border-b border-border bg-background flex items-center justify-between cursor-pointer select-none"
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
              <>
              <div className="hidden overflow-x-auto overscroll-x-contain sm:block">
              <Table className="min-w-[640px]">
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
                        aria-label="Seleccionar grupo"
                      />
                    </TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Artículos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.items.map((prof) => (
                    <TableRow key={prof.id} className={selectedIds.has(prof.id) ? '' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(prof.id)}
                          onCheckedChange={() => toggleSelect(prof.id)}
                          aria-label="Seleccionar"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {prof.positions?.name || getPositionName(prof.position_id)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prof.items.slice(0, 3).map((item, i) => {
                            const isRequired = (item as any).is_required !== false;
                            return (
                              <Badge
                                key={i}
                                variant={isRequired ? 'secondary' : 'outline'}
                                className={`text-xs ${!isRequired ? 'border-dashed' : ''}`}
                              >
                                {item.dotation_item_types?.name || 'Artículo'}
                                {item.quantity > 1 && ` x${item.quantity}`}
                                {!isRequired && ' ⓘ'}
                              </Badge>
                            );
                          })}
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewData(prof); }} title="Ver detalle">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEdit(prof); }} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setCloneData(prof); }} title="Clonar">
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteId(prof.id); }} title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="divide-y divide-border sm:hidden">
                {group.items.map((prof) => (
                  <div key={prof.id} className={selectedIds.has(prof.id) ? 'space-y-3 p-4' : 'space-y-3 p-4'}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(prof.id)}
                        onCheckedChange={() => toggleSelect(prof.id)}
                        aria-label="Seleccionar"
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{prof.positions?.name || getPositionName(prof.position_id)}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {prof.items.slice(0, 3).map((item, i) => {
                            const isRequired = (item as any).is_required !== false;
                            return (
                              <Badge key={i} variant={isRequired ? 'secondary' : 'outline'} className={`text-xs ${!isRequired ? 'border-dashed' : ''}`}>
                                {item.dotation_item_types?.name || 'Artículo'}{item.quantity > 1 && ` x${item.quantity}`}
                              </Badge>
                            );
                          })}
                          {prof.items.length > 3 && <Badge variant="outline" className="text-xs">+{prof.items.length - 3} más</Badge>}
                          {prof.items.length === 0 && <span className="text-sm text-muted-foreground">Sin artículos</span>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-full" onClick={() => setPreviewData(prof)} title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-full" onClick={() => handleEdit(prof)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-full" onClick={() => setCloneData(prof)} title="Clonar">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-full text-destructive" onClick={() => setDeleteId(prof.id)} title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
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

      <ImportProfesiogramaDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        centers={centers}
        positions={positions}
        itemTypes={itemTypes as any[]}
      />

      <ProfesiogramaDetailDialog
        open={!!previewData}
        onOpenChange={(open) => { if (!open) setPreviewData(null); }}
        data={previewData}
      />

      {/* Single delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar profesiograma?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará este profesiograma y todos sus artículos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} profesiograma{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán los profesiogramas seleccionados y todos sus artículos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-destructive text-destructive-foreground gap-2">
              {isBulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isBulkDeleting ? 'Eliminando...' : 'Eliminar todos'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
