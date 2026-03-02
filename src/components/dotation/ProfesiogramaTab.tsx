import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Copy, Download, Upload, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  // Unique centers/positions that appear in profesiogramas for filter dropdowns
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Profesiograma de Dotación</h2>
          <p className="text-sm text-muted-foreground">
            Define qué dotación corresponde a cada combinación de Centro + Cargo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={!profesiogramas?.length}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-1.5">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button onClick={handleNew} className="gap-2">
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
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
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
          <div className="flex justify-center gap-2 mt-4">
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
        <div className="card-elevated">
          <div className="px-4 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground">
              {filteredProfesiogramas.length} de {profesiogramas.length} profesiograma{profesiogramas.length !== 1 ? 's' : ''}
            </p>
          </div>
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
              {filteredProfesiogramas.map((prof) => (
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
