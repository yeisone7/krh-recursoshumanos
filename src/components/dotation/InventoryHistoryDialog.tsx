import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { History, ArrowUpCircle, ArrowDownCircle, RefreshCw, PackageCheck, Undo2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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

const defaultConfig = { label: 'Otro', icon: RefreshCw, color: 'text-muted-foreground', badgeClass: 'bg-background text-muted-foreground border-border' };

export function InventoryHistoryDialog({ open, onOpenChange, item }: InventoryHistoryDialogProps) {
  const { data: movements = [], isLoading } = useInventoryMovements(item?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[85vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <History className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                Trazabilidad
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                {item?.item_name}{item?.size ? ` · Talla ${item.size}` : ''}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Consultando movimientos...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
              <div className="p-4 rounded-full bg-background shadow-sm">
                <History className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-muted-foreground">Sin Historial</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No se han registrado movimientos aún</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {movements.map((mov) => {
                const cfg = movementConfig[mov.movement_type] || defaultConfig;
                const Icon = cfg.icon;
                const isPositive = ['entrada', 'devolucion'].includes(mov.movement_type);

                return (
                  <div
                    key={mov.id}
                    className="group relative flex items-start gap-4 p-4 rounded-2xl border border-border/50 bg-background hover:bg-background hover:border-primary/20 transition-all duration-300"
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110",
                      cfg.badgeClass.split(' ')[0],
                      cfg.color
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border border-transparent", cfg.badgeClass)}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground/60">
                            {format(new Date(mov.created_at), "d MMM, yyyy · HH:mm", { locale: es })}
                          </span>
                        </div>
                        <div className={cn(
                          "font-black text-sm",
                          isPositive ? "text-green-600" : "text-destructive"
                        )}>
                          {isPositive ? '+' : '-'}{mov.quantity}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground/80 truncate">
                          {mov.reason && mov.reason !== mov.movement_type ? mov.reason : 'Movimiento de inventario'}
                        </p>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background border border-border/50">
                           <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tight">Stock:</span>
                           <span className="text-[9px] font-black text-foreground">{mov.previous_stock} → {mov.new_stock}</span>
                        </div>
                      </div>
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
