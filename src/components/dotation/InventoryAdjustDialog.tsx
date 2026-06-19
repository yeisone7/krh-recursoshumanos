import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Minus } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
  const [notes, setNotes] = useState('');
  const adjustMutation = useAdjustInventoryQuantity();

  const handleSubmit = async () => {
    if (!item || quantity <= 0) return;

    try {
      const adjustment = adjustType === 'add' ? quantity : -quantity;
      const fullReason = notes.trim() ? `${reason} | ${notes.trim()}` : reason;
      await adjustMutation.mutateAsync({ id: item.id, adjustment, reason: fullReason });
      toast.success('Stock actualizado', {
        description: `${adjustType === 'add' ? '+' : '-'}${quantity} unidades de ${item.item_name}`,
      });
      onOpenChange(false);
      setQuantity(1);
      setNotes('');
    } catch (error: unknown) {
      toast.error('Error al ajustar stock', { description: error instanceof Error ? error.message : 'No se pudo ajustar el stock' });
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden rounded-none border-0 p-0 sm:max-w-md sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-primary/10 blur-[60px] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg transition-colors duration-300",
              adjustType === 'add' ? "bg-primary shadow-primary/20" : "bg-destructive shadow-destructive/20"
            )}>
              {adjustType === 'add' ? (
                <Plus className="w-7 h-7 text-primary-foreground" />
              ) : (
                <Minus className="w-7 h-7 text-destructive-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter truncate">
                Ajustar Stock
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                {item.item_name}{item.size ? ` (${item.size})` : ''}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-12 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest transition-all duration-300",
                adjustType === 'add' 
                  ? "bg-primary/10 border-primary/30 text-primary shadow-sm" 
                  : "hover:"
              )}
              onClick={() => setAdjustType('add')}
            >
              <Plus className="w-4 h-4" /> Entrada
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-12 rounded-xl gap-2 font-bold text-xs uppercase tracking-widest transition-all duration-300",
                adjustType === 'subtract' 
                  ? "bg-destructive/10 border-destructive/30 text-destructive shadow-sm" 
                  : "hover:bg-destructive/5"
              )}
              onClick={() => setAdjustType('subtract')}
            >
              <Minus className="w-4 h-4" /> Salida
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cantidad de ajuste *</Label>
            <div className="relative">
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="h-12 rounded-xl bg-background border-border/50 focus:ring-primary/20 pl-4 font-bold text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-background border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Unds
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Motivo del ajuste *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-12 rounded-xl bg-background border-border/50 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border/50 rounded-2xl shadow-2xl">
                <SelectItem value="entrada" className="rounded-xl">Entrada de mercancía</SelectItem>
                <SelectItem value="ajuste" className="rounded-xl">Ajuste manual</SelectItem>
                <SelectItem value="devolucion" className="rounded-xl">Devolución</SelectItem>
                <SelectItem value="dano" className="rounded-xl">Daño / Pérdida</SelectItem>
                <SelectItem value="envio_centro" className="rounded-xl">Envío a centro</SelectItem>
                <SelectItem value="entrega_empleado" className="rounded-xl">Entrega a empleado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones</Label>
            <Textarea
              placeholder="Detalles adicionales sobre el ajuste..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none rounded-xl bg-background border-border/50 focus:ring-primary/20 min-h-[80px] p-4 font-medium"
              maxLength={500}
            />
          </div>

          <div className="bg-background p-4 rounded-2xl border border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Stock después del ajuste</span>
            <span className={cn(
              "font-black text-lg",
              adjustType === 'add' ? "text-primary" : "text-destructive"
            )}>
              {item.quantity_available} → {item.quantity_available + (adjustType === 'add' ? quantity : -quantity)}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-background /10 sm:flex-row sm:justify-end">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={adjustMutation.isPending}
            className={cn(
              "h-12 px-8 rounded-2xl gap-2 text-primary-foreground font-black uppercase tracking-widest text-xs transition-all",
              adjustType === 'add' 
                ? "bg-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px]" 
                : "bg-destructive shadow-lg shadow-destructive/20 hover:shadow-xl hover:translate-y-[-1px]"
            )}
          >
            {adjustMutation.isPending ? "Procesando..." : "Confirmar Ajuste"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}