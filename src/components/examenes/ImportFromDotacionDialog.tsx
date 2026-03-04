import { useState, useMemo } from 'react';
import { Download, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useProfesiogramas, type Profesiograma } from '@/hooks/useDotationProfesiograma';
import { useExamProfesiogramas, useCreateExamProfesiograma } from '@/hooks/useExamProfesiograma';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centers: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

export function ImportFromDotacionDialog({ open, onOpenChange, centers, positions }: Props) {
  const { data: dotacionProfs, isLoading: loadingDot } = useProfesiogramas();
  const { data: examProfs } = useExamProfesiogramas();
  const createMutation = useCreateExamProfesiograma();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  const existingExamKeys = useMemo(() => {
    return new Set(
      (examProfs || []).map(p => `${p.operation_center_id}|${p.position_id}`)
    );
  }, [examProfs]);

  const availableProfs = useMemo(() => {
    if (!dotacionProfs) return [];
    return dotacionProfs.map(p => ({
      ...p,
      alreadyExists: existingExamKeys.has(`${p.operation_center_id}|${p.position_id}`),
    }));
  }, [dotacionProfs, existingExamKeys]);

  const selectableProfs = availableProfs.filter(p => !p.alreadyExists);

  const getCenterName = (id: string) =>
    centers.find(c => c.id === id)?.name || 'Desconocido';
  const getPositionName = (id: string) =>
    positions.find(p => p.id === id)?.name || 'Desconocido';

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === selectableProfs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableProfs.map(p => p.id)));
    }
  };

  const handleImport = async () => {
    const toImport = selectableProfs.filter(p => selectedIds.has(p.id));
    if (toImport.length === 0) return;

    setIsImporting(true);
    let success = 0;
    let errors = 0;

    for (const prof of toImport) {
      try {
        await createMutation.mutateAsync({
          operation_center_id: prof.operation_center_id,
          position_id: prof.position_id,
          items: [], // Empty items - user will add exam catalog items later
        });
        success++;
      } catch {
        errors++;
      }
    }

    setIsImporting(false);
    setSelectedIds(new Set());

    if (success > 0) {
      toast.success(`${success} profesiograma${success > 1 ? 's' : ''} importado${success > 1 ? 's' : ''} exitosamente`);
    }
    if (errors > 0) {
      toast.error(`${errors} fallaron al importar`);
    }
    if (success > 0) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Importar desde Dotaciones
          </DialogTitle>
          <DialogDescription>
            Clona las combinaciones Centro + Cargo de los profesiogramas de Dotación para crear profesiogramas de Exámenes. Los exámenes se configuran después.
          </DialogDescription>
        </DialogHeader>

        {loadingDot ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : availableProfs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay profesiogramas de dotación configurados</p>
          </div>
        ) : (
          <>
            {selectableProfs.length > 0 && (
              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                  <Checkbox
                    checked={selectedIds.size === selectableProfs.length && selectableProfs.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  Seleccionar todos ({selectableProfs.length})
                </label>
                <Badge variant="secondary" className="text-xs">
                  {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}

            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-2 pr-2">
                {availableProfs.map((prof) => {
                  const centerName = prof.operation_centers?.name || getCenterName(prof.operation_center_id);
                  const positionName = prof.positions?.name || getPositionName(prof.position_id);
                  const disabled = prof.alreadyExists;

                  return (
                    <div
                      key={prof.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        disabled
                          ? 'opacity-50 bg-muted/30 border-border'
                          : selectedIds.has(prof.id)
                          ? 'bg-primary/5 border-primary/30'
                          : 'border-border hover:bg-muted/20'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(prof.id)}
                        onCheckedChange={() => toggleSelect(prof.id)}
                        disabled={disabled}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{centerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{positionName}</p>
                      </div>
                      {disabled ? (
                        <Badge variant="outline" className="text-xs gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> Ya existe
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {prof.items.length} artículo{prof.items.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="flex items-center justify-between pt-4 border-t mt-2">
          <p className="text-xs text-muted-foreground">
            Se crearán sin exámenes asignados
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedIds.size === 0}
              className="gap-2"
            >
              {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isImporting ? 'Importando...' : `Importar (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
