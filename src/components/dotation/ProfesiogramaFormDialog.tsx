import { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, Loader2 } from 'lucide-react';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      <DialogContent className="flex h-[100dvh] w-screen max-w-2xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <ClipboardList className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                {isEditing ? 'Editar Profesiograma' : 'Nuevo Profesiograma'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                Estructura de dotación por perfil de cargo
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-8">
          {/* selectors */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2.5">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Centro de Operación *</Label>
              <SearchableSelect
                options={centers.map(c => ({ value: c.id, label: c.name }))}
                value={centerId}
                onValueChange={setCenterId}
                placeholder="Seleccionar centro"
                searchPlaceholder="Buscar centro..."
                emptyMessage="No se encontraron centros."
                disabled={isEditing}
                triggerClassName="h-12 rounded-xl border-border/50 bg-background"
              />
            </div>
            <div className="space-y-2.5">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo *</Label>
              <SearchableSelect
                options={positions.map(p => ({ value: p.id, label: p.name }))}
                value={positionId}
                onValueChange={setPositionId}
                placeholder="Seleccionar cargo"
                searchPlaceholder="Buscar cargo..."
                emptyMessage="No se encontraron cargos."
                disabled={isEditing}
                triggerClassName="h-12 rounded-xl border-border/50 bg-background"
              />
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Matriz de Artículos</Label>
                {items.length > 0 && (
                  <p className="text-[10px] font-bold text-primary uppercase tracking-tight">
                    {requiredCount} Obligatorios • {optionalCount} Opcionales
                  </p>
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem} 
                disabled={availableTypes.length === 0} 
                className="h-9 rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:hover:border-primary/40 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Artículo
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 rounded-[2rem] border border-dashed border-border/50 bg-background /5">
                <div className="p-4 rounded-full bg-background">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-muted-foreground">Lista vacía</p>
                  <p className="text-xs text-muted-foreground/60 max-w-[240px]">Define los elementos que componen este profesiograma.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border/50 bg-background ">
                <Table>
                  <TableHeader className="bg-background">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 px-4">Artículo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 w-24 px-4">Cant.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-10 w-28 text-center px-4">Estado</TableHead>
                      <TableHead className="w-12 px-4"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-primary/[0.01] border-border/50 transition-colors">
                        <TableCell className="px-4 py-3">
                          <Select
                            value={item.dotation_item_type_id}
                            onValueChange={(v) => updateItem(idx, 'dotation_item_type_id', v)}
                          >
                            <SelectTrigger className="h-10 rounded-xl border-border/50 bg-background font-bold text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {activeItemTypes
                                .filter((t: any) => t.id === item.dotation_item_type_id || !items.some(i => i.dotation_item_type_id === t.id))
                                .map((t: any) => (
                                  <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                    <div className="flex flex-col">
                                      <span className="font-bold text-xs">{t.name}</span>
                                      {t.category && <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{t.category}</span>}
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-10 rounded-xl border-border/50 bg-background font-black text-center text-xs tabular-nums"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex items-center justify-center gap-3">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest transition-colors",
                              item.is_required ? "text-primary" : "text-muted-foreground/60"
                            )}>
                              {item.is_required ? "Oblig" : "Opc"}
                            </span>
                            <Switch
                              checked={item.is_required}
                              onCheckedChange={(v) => updateItem(idx, 'is_required', v)}
                              className="scale-90 data-[state=checked]:bg-primary"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" 
                            onClick={() => removeItem(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/50 bg-background /10">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
          >
            Cancelar
          </Button>
          <Button 
            size="lg"
            onClick={handleSubmit} 
            disabled={isPending} 
            className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4" />
                {isEditing ? 'Actualizar Matriz' : 'Guardar Profesiograma'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
