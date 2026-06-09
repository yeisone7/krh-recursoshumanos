import { useState, useEffect } from 'react';
import { Plus, Trash2, ClipboardList, Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
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
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-0 sm:w-full rounded-[2.5rem] border-0 shadow-2xl bg-background overflow-hidden">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-violet/10 via-background to-violet/5 border-b border-violet/10 relative overflow-hidden">
          
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet flex items-center justify-center shadow-lg shadow-violet/20">
              <ClipboardList className="w-6 h-6 text-violet-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">
                {isEditing ? 'Editar Profesiograma' : 'Nuevo Profesiograma'}
              </DialogTitle>
              <DialogDescription className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-violet" /> Definición de Requerimientos Médicos
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-violet px-1">Centro de Operación *</Label>
              <SearchableSelect
                options={centers.map(c => ({ value: c.id, label: c.name }))}
                value={centerId}
                onValueChange={setCenterId}
                placeholder="Seleccionar centro"
                searchPlaceholder="Buscar centro..."
                emptyMessage="No se encontraron centros."
                disabled={isEditing}
                triggerClassName="h-12 rounded-xl bg-background border-border/50 focus:ring-4 focus:ring-violet/10 transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-violet px-1">Cargo *</Label>
              <SearchableSelect
                options={positions.map(p => ({ value: p.id, label: p.name }))}
                value={positionId}
                onValueChange={setPositionId}
                placeholder="Seleccionar cargo"
                searchPlaceholder="Buscar cargo..."
                emptyMessage="No se encontraron cargos."
                disabled={isEditing}
                triggerClassName="h-12 rounded-xl bg-background border-border/50 focus:ring-4 focus:ring-violet/10 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-violet">Lista de Procedimientos</Label>
                {items.length > 0 && (
                  <div className="flex gap-1">
                    <Badge variant="outline" className="h-5 px-1.5 rounded-lg bg-violet/5 text-violet border-violet/20 font-black text-[8px] uppercase tracking-tighter">
                      {requiredCount} Obligatorios
                    </Badge>
                    <Badge variant="outline" className="h-5 px-1.5 rounded-lg bg-background text-muted-foreground border-border font-black text-[8px] uppercase tracking-tighter">
                      {optionalCount} Opcionales
                    </Badge>
                  </div>
                )}
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addItem} 
                disabled={availableExams.length === 0} 
                className="h-8 px-4 rounded-lg gap-2 font-black uppercase tracking-widest text-[9px] border-violet/20 text-violet hover:bg-violet/5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Examen
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-16 rounded-[2rem] border border-dashed border-border/50 bg-background">
                <Info className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">No hay exámenes configurados para este cargo.</p>
                <Button variant="link" onClick={addItem} className="mt-2 font-black text-[10px] uppercase tracking-widest">Haz clic para agregar el primero</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Table for Desktop */}
                <div className="hidden sm:block overflow-hidden rounded-2xl border border-border/50 bg-background ">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-background border-border/50">
                        <TableHead className="text-[9px] font-black uppercase tracking-widest px-6 h-10">Procedimiento Médico</TableHead>
                        <TableHead className="w-24 text-center text-[9px] font-black uppercase tracking-widest px-6 h-10">Requerido</TableHead>
                        <TableHead className="w-10 px-6 h-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => (
                        <TableRow key={idx} className="group border-border/30 hover:bg-violet/[0.02]">
                          <TableCell className="px-6 py-3">
                            <Select
                              value={item.exam_catalog_id}
                              onValueChange={(v) => updateItem(idx, 'exam_catalog_id', v)}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 focus:ring-4 focus:ring-violet/10 font-medium text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {activeExams
                                  .filter(e => e.id === item.exam_catalog_id || !items.some(i => i.exam_catalog_id === e.id))
                                  .map(e => (
                                    <SelectItem key={e.id} value={e.id} className="font-medium">
                                      {e.name} {e.code && <span className="text-muted-foreground opacity-50 ml-1">[{e.code}]</span>}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-6 py-3 text-center">
                            <Switch
                              checked={item.is_required}
                              onCheckedChange={(v) => updateItem(idx, 'is_required', v)}
                              className="data-[state=checked]:bg-violet"
                            />
                          </TableCell>
                          <TableCell className="px-6 py-3">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Cards for Mobile */}
                <div className="grid grid-cols-1 gap-3 sm:hidden">
                  {items.map((item, idx) => (
                    <div key={idx} className="rounded-2xl border border-border/50 p-4 space-y-4 bg-background ">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Examen Seleccionado</Label>
                        <Select value={item.exam_catalog_id} onValueChange={(v) => updateItem(idx, 'exam_catalog_id', v)}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {activeExams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-2 border-t border-border/50 mt-4">
                        <div className="flex items-center gap-3">
                          <Switch checked={item.is_required} onCheckedChange={(v) => updateItem(idx, 'is_required', v)} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Es Requerido</span>
                        </div>
                        <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl text-destructive border-destructive/20" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-background border-t border-border/50 flex flex-col sm:flex-row gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-12 flex-1 rounded-xl font-black uppercase tracking-widest text-[10px]"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isPending} 
            className="h-12 flex-[2] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet/20 hover:shadow-xl transition-all gap-2 bg-violet hover:bg-violet/90 text-white"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isEditing ? 'Actualizar Profesiograma' : 'Crear Profesiograma'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
