import { useState, useEffect } from 'react';
import { Copy, Plus, X, Loader2, Building2 } from 'lucide-react';
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
import { useCreateProfesiograma, useProfesiogramas, type Profesiograma } from '@/hooks/useDotationProfesiograma';

interface Destination {
  centerId: string;
  positionId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceData: Profesiograma | null;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function CloneProfesiogramaDialog({ open, onOpenChange, sourceData, centers, positions }: Props) {
  const [destinations, setDestinations] = useState<Destination[]>([{ centerId: '', positionId: '' }]);
  const [isCloning, setIsCloning] = useState(false);
  const [quickPositionId, setQuickPositionId] = useState('');
  const createMutation = useCreateProfesiograma();
  const { data: existingProfesiogramas } = useProfesiogramas();

  useEffect(() => {
    if (open) {
      setDestinations([{ centerId: '', positionId: '' }]);
      setQuickPositionId(sourceData?.position_id || '');
    }
  }, [open, sourceData?.position_id]);

  if (!sourceData) return null;

  const sourceCenterName = sourceData.operation_centers?.name || centers.find(c => c.id === sourceData.operation_center_id)?.name || '';
  const sourcePositionName = sourceData.positions?.name || positions.find(p => p.id === sourceData.position_id)?.name || '';

  const existingKeys = new Set(
    (existingProfesiogramas || []).map(p => `${p.operation_center_id}|${p.position_id}`)
  );

  const addDestination = () => {
    setDestinations([...destinations, { centerId: '', positionId: '' }]);
  };

  const removeDestination = (idx: number) => {
    if (destinations.length <= 1) return;
    setDestinations(destinations.filter((_, i) => i !== idx));
  };

  const updateDestination = (idx: number, field: keyof Destination, value: string) => {
    const updated = [...destinations];
    updated[idx] = { ...updated[idx], [field]: value };
    setDestinations(updated);
  };

  const handleSelectAllCenters = (positionId: string) => {
    if (!positionId) {
      toast.error('Primero selecciona un cargo para aplicar a todos los centros');
      return;
    }
    const newDestinations = centers
      .filter(c => {
        // Exclude the source combination
        if (c.id === sourceData.operation_center_id && positionId === sourceData.position_id) return false;
        return true;
      })
      .map(c => ({ centerId: c.id, positionId }));

    if (newDestinations.length === 0) {
      toast.info('No hay centros disponibles para este cargo');
      return;
    }
    setDestinations(newDestinations);
    toast.success(`${newDestinations.length} centros seleccionados`);
  };

  const getDestinationStatus = (dest: Destination) => {
    if (!dest.centerId || !dest.positionId) return null;
    if (dest.centerId === sourceData.operation_center_id && dest.positionId === sourceData.position_id) return 'same';
    if (existingKeys.has(`${dest.centerId}|${dest.positionId}`)) return 'exists';
    return 'ok';
  };

  const validDestinations = destinations.filter(d => getDestinationStatus(d) === 'ok');

  const handleClone = async () => {
    if (validDestinations.length === 0) {
      toast.error('No hay destinos válidos para clonar');
      return;
    }

    setIsCloning(true);
    let successCount = 0;
    let errorCount = 0;

    for (const dest of validDestinations) {
      try {
        await createMutation.mutateAsync({
          operation_center_id: dest.centerId,
          position_id: dest.positionId,
          items: sourceData.items.map(i => ({
            dotation_item_type_id: i.dotation_item_type_id,
            quantity: i.quantity,
            notes: i.notes || undefined,
          })),
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setIsCloning(false);

    if (successCount > 0) {
      toast.success(`${successCount} profesiograma${successCount > 1 ? 's' : ''} clonado${successCount > 1 ? 's' : ''} exitosamente`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} destino${errorCount > 1 ? 's' : ''} fallaron al clonar`);
    }
    if (successCount > 0) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-4 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-lg sm:border sm:p-6">
        <DialogHeader className="pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Clonación Masiva de Profesiograma
          </DialogTitle>
          <DialogDescription>
            Copia los artículos a múltiples combinaciones de Centro + Cargo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
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

          {/* Quick action: all centers */}
          <div className="rounded-lg border border-dashed border-primary/30 bg-primary-light/30 p-3 space-y-2">
            <p className="text-xs font-medium text-primary uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> Acción rápida: Todos los centros
            </p>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Cargo a aplicar</Label>
                <Select value={quickPositionId} onValueChange={setQuickPositionId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                  <SelectContent>
                    {positions.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                  className="gap-1 h-9 whitespace-nowrap border-primary/30 text-primary hover:bg-primary-light"
                onClick={() => handleSelectAllCenters(quickPositionId)}
              >
                <Building2 className="w-3.5 h-3.5" />
                Todos los centros ({centers.length})
              </Button>
            </div>
          </div>

          {/* Destinations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Destinos ({destinations.length})
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addDestination} className="gap-1 h-7 text-xs">
                <Plus className="w-3 h-3" /> Agregar destino
              </Button>
            </div>

            {destinations.map((dest, idx) => {
              const status = getDestinationStatus(dest);
              return (
                <div key={idx} className="rounded-lg border border-border p-3 space-y-2 relative">
                  {destinations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                      onClick={() => removeDestination(idx)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground font-medium">Destino {idx + 1}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Centro</Label>
                      <Select value={dest.centerId} onValueChange={(v) => updateDestination(idx, 'centerId', v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Centro" /></SelectTrigger>
                        <SelectContent>
                          {centers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cargo</Label>
                      <Select value={dest.positionId} onValueChange={(v) => updateDestination(idx, 'positionId', v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Cargo" /></SelectTrigger>
                        <SelectContent>
                          {positions.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {status === 'same' && (
                    <p className="text-xs text-destructive">⚠ Igual al origen, se omitirá</p>
                  )}
                  {status === 'exists' && (
                    <p className="text-xs text-destructive">⚠ Ya existe, se omitirá</p>
                  )}
                  {status === 'ok' && (
                    <p className="text-xs text-success">✓ Válido</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-4 border-t mt-2 sm:flex sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {validDestinations.length} destino{validDestinations.length !== 1 ? 's' : ''} válido{validDestinations.length !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:flex">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleClone} disabled={isCloning || validDestinations.length === 0} className="gap-2">
              {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
              {isCloning ? 'Clonando...' : `Clonar a ${validDestinations.length} destino${validDestinations.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
