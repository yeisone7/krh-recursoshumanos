import { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { useCreateProfesiograma, useUpdateProfesiograma, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { useDotationItemTypes } from '@/hooks/useSystemConfig';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
  editData?: Profesiograma | null;
}

interface ItemRow {
  dotation_item_type_id: string;
  quantity: number;
  notes: string;
  is_required: boolean;
}

export function ProfesiogramaFormDialog({ open, onOpenChange, centers, positions, editData }: Props) {
  const [centerId, setCenterId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data: itemTypes = [] } = useDotationItemTypes();
  const createMutation = useCreateProfesiograma();
  const updateMutation = useUpdateProfesiograma();

  const isEditing = !!editData;

  useEffect(() => {
    if (editData) {
      setCenterId(editData.operation_center_id);
      setPositionId(editData.position_id);
      setItems(editData.items.map(i => ({
        dotation_item_type_id: i.dotation_item_type_id,
        quantity: i.quantity,
        notes: i.notes || '',
        is_required: (i as any).is_required !== false,
      })));
    } else {
      setCenterId('');
      setPositionId('');
      setItems([]);
    }
  }, [editData, open]);

  const activeItemTypes = (itemTypes as any[])?.filter((t: any) => t.is_active !== false) || [];
  const availableTypes = activeItemTypes.filter(
    (t: any) => !items.some(i => i.dotation_item_type_id === t.id)
  );

  const addItem = () => {
    if (availableTypes.length === 0) return;
    setItems([...items, { dotation_item_type_id: availableTypes[0].id, quantity: 1, notes: '', is_required: true }]);
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
      toast.error('Agrega al menos un artículo');
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Profesiograma' : 'Nuevo Profesiograma'}
          </DialogTitle>
          <DialogDescription>
            Asocia artículos de dotación a un Centro de Operación + Cargo
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
          {/* Center + Position selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Centro de Operación *</Label>
              <Select value={centerId} onValueChange={setCenterId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar centro" />
                </SelectTrigger>
                <SelectContent>
                  {centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={positionId} onValueChange={setPositionId} disabled={isEditing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Artículos de Dotación</Label>
                {items.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {requiredCount} obligatorio{requiredCount !== 1 ? 's' : ''}, {optionalCount} opcional{optionalCount !== 1 ? 'es' : ''}
                  </p>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={availableTypes.length === 0} className="gap-1">
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay artículos. Haz clic en "Agregar" para comenzar.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artículo</TableHead>
                    <TableHead className="w-20">Cant.</TableHead>
                    <TableHead className="w-24 text-center">Obligatorio</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select
                          value={item.dotation_item_type_id}
                          onValueChange={(v) => updateItem(idx, 'dotation_item_type_id', v)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeItemTypes
                              .filter((t: any) => t.id === item.dotation_item_type_id || !items.some(i => i.dotation_item_type_id === t.id))
                              .map((t: any) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                  {t.category && <span className="text-muted-foreground ml-1">({t.category})</span>}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="h-9"
                        />
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
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
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
