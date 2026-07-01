import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, CheckSquare, FileText, Loader2, RotateCw, ShieldCheck, Square } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AutomaticExtensionPreview } from '@/lib/contractExtensionRegularization';

export interface AutomaticExtensionRegularizationItem {
  contractId: string;
  employeeName: string;
  currentEndDate: Date | null;
  extensions: AutomaticExtensionPreview[];
}

interface AutomaticExtensionRegularizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AutomaticExtensionRegularizationItem[];
  selectable?: boolean;
  isSubmitting?: boolean;
  onConfirm: (selectedItems: AutomaticExtensionRegularizationItem[]) => void;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Sin fecha';
  return format(date, 'dd MMM yyyy', { locale: es });
}

export function AutomaticExtensionRegularizationDialog({
  open,
  onOpenChange,
  items,
  selectable = false,
  isSubmitting = false,
  onConfirm,
}: AutomaticExtensionRegularizationDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(items.map((item) => item.contractId)));
    }
  }, [open, items]);

  const selectedItems = useMemo(
    () => selectable ? items.filter((item) => selectedIds.has(item.contractId)) : items,
    [items, selectable, selectedIds]
  );
  const totalExtensions = selectedItems.reduce((total, item) => total + item.extensions.length, 0);
  const firstItem = selectedItems[0];
  const title = selectable
    ? 'Regularizacion general'
    : items.length === 1
    ? 'Regularizar prorrogas automaticas'
    : 'Regularizacion masiva de prorrogas';
  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleItem = (contractId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contractId)) {
        next.delete(contractId);
      } else {
        next.add(contractId);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b bg-muted/30 px-5 py-5 pr-12 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCw className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black tracking-tight">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                Se crearan {totalExtensions} prorroga{totalExtensions === 1 ? '' : 's'} automatica{totalExtensions === 1 ? '' : 's'} para {selectedItems.length} contrato{selectedItems.length === 1 ? '' : 's'}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 sm:px-6">
          <Alert className="border-primary/20 bg-primary/5">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Evidencia de regularizacion</AlertTitle>
            <AlertDescription className="text-sm">
              Cada fila quedara como prorroga automatica, con observacion de regularizacion por preaviso vencido y registro de auditoria.
            </AlertDescription>
          </Alert>

          {selectable && (
            <div className="rounded-xl border bg-background p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">Contratos elegibles</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedItems.length} de {items.length} contrato{items.length === 1 ? '' : 's'} seleccionado{selectedItems.length === 1 ? '' : 's'}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setSelectedIds(new Set(items.map((item) => item.contractId)))}
                    disabled={allSelected || isSubmitting}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={selectedIds.size === 0 || isSubmitting}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {items.map((item) => {
                  const checked = selectedIds.has(item.contractId);

                  return (
                    <label
                      key={item.contractId}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleItem(item.contractId)}
                        disabled={isSubmitting}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{item.employeeName}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Vigencia actual: {formatDate(item.currentEndDate)} · {item.extensions.length} prorroga{item.extensions.length === 1 ? '' : 's'}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {!selectable && items.length === 1 && firstItem && (
            <div className="grid gap-3 rounded-xl border bg-background p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Empleado</p>
                <p className="mt-1 font-semibold">{firstItem.employeeName}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Ultima vigencia</p>
                <p className="mt-1 font-semibold">{formatDate(firstItem.currentEndDate)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Nuevas prorrogas</p>
                <p className="mt-1 font-semibold">{firstItem.extensions.length}</p>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1 border-y">
          <div className="space-y-4 px-5 py-4 sm:px-6">
            {selectedItems.map((item) => (
              <div key={item.contractId} className="rounded-xl border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate text-sm font-bold">{item.employeeName}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {item.extensions.length} prorroga{item.extensions.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {item.extensions.map((extension) => (
                    <div
                      key={`${item.contractId}-${extension.extensionNumber}`}
                      className="grid gap-2 rounded-lg bg-background px-3 py-2 text-sm sm:grid-cols-[120px_1fr_1fr]"
                    >
                      <span className="font-bold text-primary">#{extension.extensionNumber}</span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatDate(extension.startDate)}
                      </span>
                      <span className="font-semibold">{formatDate(extension.endDate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="grid grid-cols-1 gap-2 bg-muted/30 px-5 py-4 sm:grid-cols-[1fr_auto] sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onConfirm(selectedItems)} disabled={isSubmitting || totalExtensions === 0} className="gap-2">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Confirmar regularizacion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
