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
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Copy className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                Clonación Masiva
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                Replica matrices de dotación por centro y cargo
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Source info */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background p-5 transition-all">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Copy className="w-12 h-12 text-primary" />
            </div>
            <div className="relative space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" /> Origen de Datos
              </div>
              <div>
                <p className="text-sm font-black text-foreground">{sourceCenterName}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{sourcePositionName}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {sourceData.items.map((item, i) => (
                  <Badge key={i} variant="outline" className="h-6 rounded-lg px-2 bg-background border-border/50 font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                    {item.dotation_item_types?.name || 'Artículo'}
                    <span className="ml-1 text-primary font-black">×{item.quantity}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Quick action: all centers */}
          <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] p-5 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
              <Building2 className="w-3.5 h-3.5" /> Acción rápida: Propagar a todos los centros
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo Destino</Label>
                <Select value={quickPositionId} onValueChange={setQuickPositionId}>
                  <SelectTrigger className="h-11 rounded-xl border-border/50 bg-background font-bold text-sm">
                    <SelectValue placeholder="Seleccionar cargo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {positions.map(p => (
                      <SelectItem key={p.id} value={p.id} className="rounded-lg font-bold text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-xl gap-2 font-black text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:hover:border-primary/40 transition-all shadow-sm"
                onClick={() => handleSelectAllCenters(quickPositionId)}
              >
                Aplicar a {centers.length} Centros
              </Button>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Destinations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Destinos Definidos ({destinations.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDestination} className="h-8 rounded-lg gap-1.5 font-black text-[9px] uppercase tracking-widest border-border/50">
                <Plus className="w-3 h-3" /> Añadir Destino
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {destinations.map((dest, idx) => {
                const status = getDestinationStatus(dest);
                return (
                  <div key={idx} className="group relative rounded-2xl border border-border/50 bg-background p-4 transition-all hover:border-primary/20">
                    <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-lg bg-background text-[10px] font-black border border-border/50 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      {idx + 1}
                    </div>
                    {destinations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 absolute top-2 right-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => removeDestination(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Centro</Label>
                        <Select value={dest.centerId} onValueChange={(v) => updateDestination(idx, 'centerId', v)}>
                          <SelectTrigger className="h-10 rounded-xl border-border/50 bg-background font-bold text-xs">
                            <SelectValue placeholder="Centro" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {centers.map(c => (
                              <SelectItem key={c.id} value={c.id} className="rounded-lg font-bold text-xs">{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo</Label>
                        <Select value={dest.positionId} onValueChange={(v) => updateDestination(idx, 'positionId', v)}>
                          <SelectTrigger className="h-10 rounded-xl border-border/50 bg-background font-bold text-xs">
                            <SelectValue placeholder="Cargo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {positions.map(p => (
                              <SelectItem key={p.id} value={p.id} className="rounded-lg font-bold text-xs">{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end">
                      {status === 'same' && (
                        <Badge variant="outline" className="h-5 rounded-lg bg-destructive/10 text-destructive border-0 font-bold text-[8px] uppercase tracking-widest">
                          Mismo que origen
                        </Badge>
                      )}
                      {status === 'exists' && (
                        <Badge variant="outline" className="h-5 rounded-lg bg-amber-500/10 text-amber-600 border-0 font-bold text-[8px] uppercase tracking-widest">
                          Ya existe
                        </Badge>
                      )}
                      {status === 'ok' && (
                        <Badge variant="outline" className="h-5 rounded-lg bg-green-500/10 text-green-600 border-0 font-bold text-[8px] uppercase tracking-widest">
                          ✓ Listo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-background /10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resumen de Destino</span>
            <p className="text-xs font-bold text-muted-foreground">
              {validDestinations.length} combinaciones {validDestinations.length === 1 ? 'lista' : 'listas'} para replicar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
            >
              Cancelar
            </Button>
            <Button 
              size="lg"
              onClick={handleClone} 
              disabled={isCloning || validDestinations.length === 0} 
              className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Ejecutar Clonación
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
