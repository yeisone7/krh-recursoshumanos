import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, ArrowUpCircle, ArrowDownCircle, RefreshCw, PackageCheck, Undo2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useInventoryMovements, type InventoryMovement } from '@/hooks/useInventoryMovements';
import type { DotationInventoryItem } from '@/hooks/useDotationInventory';

interface InventoryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DotationInventoryItem | null;
}

const movementConfig: Record<string, { label: string; icon: typeof ArrowUpCircle; color: string; badgeClass: string }> = {
  entrada: { label: 'Entrada', icon: ArrowUpCircle, color: 'text-emerald-600', badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  salida: { label: 'Salida', icon: ArrowDownCircle, color: 'text-red-600', badgeClass: 'bg-red-500/10 text-red-700 border-red-200' },
  ajuste: { label: 'Ajuste', icon: RefreshCw, color: 'text-amber-600', badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-200' },
  entrega: { label: 'Entrega', icon: PackageCheck, color: 'text-blue-600', badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  devolucion: { label: 'Devolución', icon: Undo2, color: 'text-violet-600', badgeClass: 'bg-violet-500/10 text-violet-700 border-violet-200' },
};

const defaultConfig = { label: 'Otro', icon: RefreshCw, color: 'text-muted-foreground', badgeClass: 'bg-muted text-muted-foreground border-border' };

export function InventoryHistoryDialog({ open, onOpenChange, item }: InventoryHistoryDialogProps) {
  const { data: movements = [], isLoading } = useInventoryMovements(item?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-4 sm:h-auto sm:max-h-[85vh] sm:w-full sm:rounded-lg sm:border sm:p-6">
        <DialogHeader className="pr-12">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historial de Movimientos
          </DialogTitle>
          <DialogDescription>
            {item?.item_name}{item?.size ? ` — Talla ${item.size}` : ''}
            {item?.operation_centers?.name ? ` · ${item.operation_centers.name}` : ' · General'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto min-h-0 flex-1">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Cargando historial...</div>
          ) : movements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No hay movimientos registrados para este artículo.
            </div>
          ) : (
            <div className="space-y-1 pr-1 sm:pr-3">
              {movements.map((mov) => {
                const cfg = movementConfig[mov.movement_type] || defaultConfig;
                const Icon = cfg.icon;
                const isPositive = ['entrada', 'devolucion'].includes(mov.movement_type);

                return (
                  <div
                    key={mov.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`mt-0.5 ${cfg.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${cfg.badgeClass}`}>
                          {cfg.label}
                        </Badge>
                        <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{mov.quantity}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {mov.previous_stock} → {mov.new_stock}
                        </span>
                      </div>
                      {mov.reason && mov.reason !== mov.movement_type && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{mov.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {format(new Date(mov.created_at), "d MMM yyyy · HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
