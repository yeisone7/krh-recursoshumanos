import { useEffect, useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useTransferInventory, type DotationInventoryItem } from '@/hooks/useDotationInventory';
import { supabase } from '@/integrations/supabase/client';

interface InventoryTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DotationInventoryItem | null;
}

export function InventoryTransferDialog({ open, onOpenChange, item }: InventoryTransferDialogProps) {
  const { currentCompanyId } = useAuth();
  const transfer = useTransferInventory();
  const [destination, setDestination] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');

  const { data: centers = [] } = useQuery({
    queryKey: ['operation_centers_list', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_centers')
        .select('id, name')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentCompanyId,
  });

  useEffect(() => {
    if (open) {
      setDestination('');
      setQuantity(1);
      setReason('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const submit = async () => {
    if (!destination) {
      toast.error('Selecciona el centro de destino');
      return;
    }
    if (quantity <= 0 || quantity > item.quantity_available) {
      toast.error('Cantidad inválida', {
        description: `Puedes trasladar entre 1 y ${item.quantity_available} unidades.`,
      });
      return;
    }

    try {
      await transfer.mutateAsync({
        sourceInventoryId: item.id,
        destinationCenterId: destination === '__general__' ? null : destination,
        quantity,
        reason: reason.trim() || undefined,
      });
      toast.success('Traslado realizado', {
        description: `${quantity} unidad(es) de ${item.item_name} fueron trasladadas.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('No se pudo realizar el traslado', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden rounded-none border-0 p-0 sm:max-w-md sm:rounded-[2rem] sm:border sm:shadow-2xl">
        <div className="border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <ArrowRightLeft className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate text-2xl font-black tracking-tighter">Trasladar inventario</DialogTitle>
              <DialogDescription className="truncate font-medium">
                {item.item_name}{item.size ? ` · Talla ${item.size}` : ''}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Origen</p>
              <p className="font-bold">{item.operation_centers?.name || 'General'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponible</p>
              <p className="font-bold">{item.quantity_available}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Centro de destino *</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Seleccionar destino" />
              </SelectTrigger>
              <SelectContent>
                {item.operation_center_id !== null && (
                  <SelectItem value="__general__">General</SelectItem>
                )}
                {centers.filter((center) => center.id !== item.operation_center_id).map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-quantity">Cantidad *</Label>
            <Input
              id="transfer-quantity"
              type="number"
              min={1}
              max={item.quantity_available}
              value={quantity}
              onChange={(event) => setQuantity(Number.parseInt(event.target.value, 10) || 1)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-reason">Motivo</Label>
            <Textarea
              id="transfer-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ej. Reposición de inventario del centro"
              maxLength={500}
              className="min-h-20 resize-none rounded-xl"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border/50 p-6 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={transfer.isPending || item.quantity_available === 0} className="gap-2">
            {transfer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Confirmar traslado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
