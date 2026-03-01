import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Minus } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdjustInventoryQuantity, type DotationInventoryItem } from '@/hooks/useDotationInventory';

interface InventoryAdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DotationInventoryItem | null;
}

export function InventoryAdjustDialog({ open, onOpenChange, item }: InventoryAdjustDialogProps) {
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('entrada');
  const adjustMutation = useAdjustInventoryQuantity();

  const handleSubmit = async () => {
    if (!item || quantity <= 0) return;

    try {
      const adjustment = adjustType === 'add' ? quantity : -quantity;
      await adjustMutation.mutateAsync({ id: item.id, adjustment });
      toast.success('Stock actualizado', {
        description: `${adjustType === 'add' ? '+' : '-'}${quantity} unidades de ${item.item_name}`,
      });
      onOpenChange(false);
      setQuantity(1);
    } catch (error: any) {
      toast.error('Error al ajustar stock', { description: error.message });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar Stock</DialogTitle>
          <DialogDescription>
            {item.item_name}{item.size ? ` (${item.size})` : ''} — Stock actual: {item.quantity_available}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={adjustType === 'add' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setAdjustType('add')}
            >
              <Plus className="w-4 h-4" /> Entrada
            </Button>
            <Button
              type="button"
              variant={adjustType === 'subtract' ? 'destructive' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setAdjustType('subtract')}
            >
              <Minus className="w-4 h-4" /> Salida
            </Button>
          </div>

          <div>
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            />
          </div>

          <div>
            <Label>Motivo</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada de mercancía</SelectItem>
                <SelectItem value="ajuste">Ajuste manual</SelectItem>
                <SelectItem value="devolucion">Devolución</SelectItem>
                <SelectItem value="dano">Daño / Pérdida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={adjustMutation.isPending}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
