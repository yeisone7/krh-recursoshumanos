import { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useCreateExamProfesiograma, useUpdateExamProfesiograma, type ExamProfesiograma } from '@/hooks/useExamProfesiograma';
import { useExamCatalog } from '@/hooks/useExamCatalog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
  editData?: ExamProfesiograma | null;
}

interface ItemRow {
  exam_catalog_id: string;
  notes: string;
  is_required: boolean;
}

export function ExamProfesiogramaFormDialog({ open, onOpenChange, centers, positions, editData }: Props) {
  const [centerId, setCenterId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data: catalog = [] } = useExamCatalog();
  const createMutation = useCreateExamProfesiograma();
  const updateMutation = useUpdateExamProfesiograma();

  const isEditing = !!editData;

  useEffect(() => {
    if (editData) {
      setCenterId(editData.operation_center_id);
      setPositionId(editData.position_id);
      setItems(editData.items.map(i => ({
        exam_catalog_id: i.exam_catalog_id,
        notes: i.notes || '',
        is_required: i.is_required !== false,
      })));
    } else {
      setCenterId('');
      setPositionId('');
      setItems([]);
    }
  }, [editData, open]);

  const activeExams = catalog.filter(c => c.is_active);
  const availableExams = activeExams.filter(
    e => !items.some(i => i.exam_catalog_id === e.id)
  );

  const addItem = () => {
    if (availableExams.length === 0) return;
    setItems([...items, { exam_catalog_id: availableExams[0].id, notes: '', is_required: true }]);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!centerId || !positionId) {
      toast.error('Selecciona centro de operación y cargo');
      return;
    }
    if (items.length === 0) {
      toast.error('Agrega al menos un examen');
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: editData!.id, items });
        toast.success('Profesiograma actualizado');
      } else {
        await createMutation.mutateAsync({
          operation_center_id: centerId,
          position_id: positionId,
          items,
        });
        toast.success('Profesiograma creado');
      }
      onOpenChange(false);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Ya existe un profesiograma para esta combinación de centro + cargo');
      } else {
        toast.error('Error al guardar profesiograma', { description: msg });
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const requiredCount = items.filter(i => i.is_required).length;
  const optionalCount = items.filter(i => !i.is_required).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Profesiograma de Exámenes' : 'Nuevo Profesiograma de Exámenes'}
          </DialogTitle>
          <DialogDescription>
            Asocia exámenes médicos a un Centro de Operación + Cargo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pr-1 sm:max-h-[60vh] sm:overflow-y-auto">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="space-y-2">
              <Label>Centro de Operación *</Label>
              <SearchableSelect
                options={centers.map(c => ({ value: c.id, label: c.name }))}
                value={centerId}
                onValueChange={setCenterId}
                placeholder="Seleccionar centro"
                searchPlaceholder="Buscar centro..."
                emptyMessage="No se encontraron centros."
                disabled={isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <SearchableSelect
                options={positions.map(p => ({ value: p.id, label: p.name }))}
                value={positionId}
                onValueChange={setPositionId}
                placeholder="Seleccionar cargo"
                searchPlaceholder="Buscar cargo..."
                emptyMessage="No se encontraron cargos."
                disabled={isEditing}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Exámenes Médicos</Label>
                {items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {requiredCount} obligatorio{requiredCount !== 1 ? 's' : ''}, {optionalCount} opcional{optionalCount !== 1 ? 'es' : ''}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={availableExams.length === 0} className="gap-1">
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay exámenes. Haz clic en "Agregar" para comenzar.</p>
              </div>
            ) : (
              <div className="hidden overflow-x-auto sm:block">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Examen</TableHead>
                    <TableHead className="w-24 text-center">Obligatorio</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={item.exam_catalog_id}
                          onValueChange={(v) => updateItem(idx, 'exam_catalog_id', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeExams
                              .filter(e => e.id === item.exam_catalog_id || !items.some(i => i.exam_catalog_id === e.id))
                              .map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                  {e.name}
                                  {e.code && <span className="text-muted-foreground ml-1">({e.code})</span>}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={item.is_required}
                          onCheckedChange={(v) => updateItem(idx, 'is_required', v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="space-y-2 sm:hidden">
                {items.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border p-3 space-y-3">
                    <SearchableSelect
                      options={activeExams
                        .filter(e => e.id === item.exam_catalog_id || !items.some(i => i.exam_catalog_id === e.id))
                        .map(e => ({ value: e.id, label: e.code ? `${e.name} (${e.code})` : e.name }))}
                      value={item.exam_catalog_id}
                      onValueChange={(v) => updateItem(idx, 'exam_catalog_id', v)}
                      placeholder="Seleccionar examen"
                      searchPlaceholder="Buscar examen..."
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={item.is_required} onCheckedChange={(v) => updateItem(idx, 'is_required', v)} />
                        <span className="text-sm text-muted-foreground">Obligatorio</span>
                      </div>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-4 grid grid-cols-1 gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-1 backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0 sm:pt-4 sm:backdrop-blur-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
            <ClipboardList className="w-4 h-4" />
            {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear Profesiograma'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
