import { useState, useRef } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Loader2, Copy, Download, Upload } from 'lucide-react';
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
import * as XLSX from 'xlsx';

import { useProfesiogramas, useDeleteProfesiograma, useCreateProfesiograma, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { useDotationItemTypes } from '@/hooks/useSystemConfig';
import { ProfesiogramaFormDialog } from './ProfesiogramaFormDialog';
import { CloneProfesiogramaDialog } from './CloneProfesiogramaDialog';

interface Props {
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ProfesiogramaTab({ centers, positions }: Props) {
  const { data: profesiogramas, isLoading } = useProfesiogramas();
  const deleteMutation = useDeleteProfesiograma();
  const createMutation = useCreateProfesiograma();
  const { data: itemTypes = [] } = useDotationItemTypes();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<Profesiograma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cloneData, setCloneData] = useState<Profesiograma | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          'Cantidad': 0 as number | string,
          'Notas': '',
        }];
      }
      return prof.items.map((item) => ({
        'Centro de Operación': prof.operation_centers?.name || getCenterName(prof.operation_center_id),
        'Cargo': prof.positions?.name || getPositionName(prof.position_id),
        'Artículo': item.dotation_item_types?.name || '',
        'Código Artículo': item.dotation_item_types?.code || '',
        'Categoría': item.dotation_item_types?.category || '',
        'Cantidad': item.quantity,
        'Notas': item.notes || '',
      }));
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profesiogramas');

    // Template sheet for imports
    const templateRows = [
      {
        'Centro de Operación (nombre exacto)': 'Ejemplo Centro',
        'Cargo (nombre exacto)': 'Ejemplo Cargo',
        'Código Artículo': 'EPP-001',
        'Cantidad': 1,
        'Notas': '',
      },
    ];
    const wsTemplate = XLSX.utils.json_to_sheet(templateRows);
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Plantilla Importación');

    XLSX.writeFile(wb, `profesiogramas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Archivo exportado exitosamente');
  };

  // ── Import from Excel ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      if (rows.length === 0) {
        toast.error('El archivo está vacío');
        setIsImporting(false);
        return;
      }

      // Build lookup maps
      const centerMap = new Map(centers.map(c => [c.name.toLowerCase().trim(), c.id]));
      const positionMap = new Map(positions.map(p => [p.name.toLowerCase().trim(), p.id]));
      const itemTypeMap = new Map((itemTypes as any[]).map((t: any) => [
        (t.code || '').toLowerCase().trim(), t.id
      ]));
      const itemTypeNameMap = new Map((itemTypes as any[]).map((t: any) => [
        t.name.toLowerCase().trim(), t.id
      ]));

      // Group rows by center+position
      const grouped = new Map<string, { centerId: string; positionId: string; items: { dotation_item_type_id: string; quantity: number; notes?: string }[] }>();

      let skippedRows = 0;

      for (const row of rows) {
        const centerName = String(row['Centro de Operación'] || row['Centro de Operación (nombre exacto)'] || '').toLowerCase().trim();
        const positionName = String(row['Cargo'] || row['Cargo (nombre exacto)'] || '').toLowerCase().trim();
        const itemCode = String(row['Código Artículo'] || row['Código'] || '').toLowerCase().trim();
        const itemName = String(row['Artículo'] || '').toLowerCase().trim();
        const quantity = parseInt(row['Cantidad']) || 1;
        const notes = String(row['Notas'] || '');

        const centerId = centerMap.get(centerName);
        const positionId = positionMap.get(positionName);
        const itemTypeId = itemTypeMap.get(itemCode) || itemTypeNameMap.get(itemName);

        if (!centerId || !positionId || !itemTypeId) {
          skippedRows++;
          continue;
        }

        const key = `${centerId}|${positionId}`;
        if (!grouped.has(key)) {
          grouped.set(key, { centerId, positionId, items: [] });
        }
        const group = grouped.get(key)!;
        if (!group.items.some(i => i.dotation_item_type_id === itemTypeId)) {
          group.items.push({ dotation_item_type_id: itemTypeId, quantity, notes: notes || undefined });
        }
      }

      // Check for existing profesiogramas
      const existingKeys = new Set(
        (profesiogramas || []).map(p => `${p.operation_center_id}|${p.position_id}`)
      );

      let created = 0;
      let duplicates = 0;

      for (const [key, group] of grouped) {
        if (existingKeys.has(key)) {
          duplicates++;
          continue;
        }
        if (group.items.length === 0) continue;

        try {
          await createMutation.mutateAsync({
            operation_center_id: group.centerId,
            position_id: group.positionId,
            items: group.items,
          });
          created++;
        } catch {
          // skip on error
        }
      }

      const messages: string[] = [];
      if (created > 0) messages.push(`${created} profesiograma${created > 1 ? 's' : ''} creado${created > 1 ? 's' : ''}`);
      if (duplicates > 0) messages.push(`${duplicates} ya existían`);
      if (skippedRows > 0) messages.push(`${skippedRows} filas omitidas (datos no encontrados)`);

      if (created > 0) {
        toast.success('Importación completada', { description: messages.join('. ') });
      } else {
        toast.info('No se crearon nuevos profesiogramas', { description: messages.join('. ') });
      }
    } catch (error) {
      toast.error('Error al leer el archivo Excel');
      console.error(error);
    }

    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
          <h2 className="text-lg font-semibold">Profesiograma de Dotación</h2>
          <p className="text-sm text-muted-foreground">
            Define qué dotación corresponde a cada combinación de Centro + Cargo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5" disabled={!profesiogramas?.length}>
            <Download className="w-4 h-4" /> Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
            disabled={isImporting}
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImport}
          />
          <Button onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> Nuevo
          </Button>
        </div>
      </div>

      {(!profesiogramas || profesiogramas.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground card-elevated">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay profesiogramas configurados</p>
          <div className="flex justify-center gap-2 mt-4">
            <Button onClick={handleNew} className="gap-2">
              <Plus className="w-4 h-4" /> Crear Profesiograma
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> Importar desde Excel
            </Button>
          </div>
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
