import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateNoveltyReason, useUpdateNoveltyReason, type NoveltyReason } from '@/hooks/useNoveltyReasons';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: NoveltyReason | null;
  nextItemNumber?: number;
}

export function NoveltyReasonFormDialog({ open, onOpenChange, reason, nextItemNumber = 1 }: Props) {
  const create = useCreateNoveltyReason();
  const update = useUpdateNoveltyReason();
  const isEditing = !!reason;

  const [form, setForm] = useState({
    item_number: reason?.item_number || nextItemNumber,
    name: reason?.name || '',
    description: reason?.description || '',
    is_active: reason?.is_active ?? true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        item_number: reason?.item_number || nextItemNumber,
        name: reason?.name || '',
        description: reason?.description || '',
        is_active: reason?.is_active ?? true,
      });
    }
  }, [open, reason, nextItemNumber]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Complete los campos requeridos', variant: 'destructive' });
      return;
    }
    try {
      if (isEditing) {
        await update.mutateAsync({ id: reason.id, ...form });
        toast({ title: 'Motivo actualizado' });
      } else {
        await create.mutateAsync(form);
        toast({ title: 'Motivo creado' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Motivo' : 'Nuevo Motivo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del motivo"
            />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Activo</Label>
            <Switch
              checked={form.is_active}
              onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
