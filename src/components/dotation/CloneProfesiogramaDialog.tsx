import { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCreateProfesiograma, type Profesiograma } from '@/hooks/useDotationProfesiograma';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceData: Profesiograma | null;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function CloneProfesiogramaDialog({ open, onOpenChange, sourceData, centers, positions }: Props) {
  const [centerId, setCenterId] = useState('');
  const [positionId, setPositionId] = useState('');
  const createMutation = useCreateProfesiograma();

  useEffect(() => {
    if (open) {
      setCenterId('');
      setPositionId('');
    }
  }, [open]);

  if (!sourceData) return null;

  const sourceCenterName = sourceData.operation_centers?.name || centers.find(c => c.id === sourceData.operation_center_id)?.name || '';
  const sourcePositionName = sourceData.positions?.name || positions.find(p => p.id === sourceData.position_id)?.name || '';

  const handleClone = async () => {
    if (!centerId || !positionId) {
      toast.error('Selecciona centro de operación y cargo destino');
      return;
    }
    if (centerId === sourceData.operation_center_id && positionId === sourceData.position_id) {
      toast.error('El destino es igual al origen');
      return;
    }

    try {
      await createMutation.mutateAsync({
        operation_center_id: centerId,
        position_id: positionId,
        items: sourceData.items.map(i => ({
          dotation_item_type_id: i.dotation_item_type_id,
          quantity: i.quantity,
          notes: i.notes || undefined,
        })),
      });
      toast.success('Profesiograma clonado exitosamente');
      onOpenChange(false);
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Ya existe un profesiograma para esa combinación');
      } else {
        toast.error('Error al clonar', { description: msg });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Clonar Profesiograma
          </DialogTitle>
          <DialogDescription>
            Copia los artículos de un profesiograma existente a otra combinación de Centro + Cargo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Origen</p>
            <p className="text-sm font-medium">{sourceCenterName} — {sourcePositionName}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {sourceData.items.map((item, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {item.dotation_item_types?.name || 'Artículo'}
                  {item.quantity > 1 && ` x${item.quantity}`}
                </Badge>
              ))}
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Destino</p>
            <div className="space-y-2">
              <Label>Centro de Operación *</Label>
              <Select value={centerId} onValueChange={setCenterId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                <SelectContent>
                  {centers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo *</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleClone} disabled={createMutation.isPending} className="gap-2">
            <Copy className="w-4 h-4" />
            {createMutation.isPending ? 'Clonando...' : 'Clonar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
