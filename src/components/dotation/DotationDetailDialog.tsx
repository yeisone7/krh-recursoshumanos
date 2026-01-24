import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, User, Calendar, Clock, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { DocumentSection } from '@/components/documents/DocumentSection';
import { cn } from '@/lib/utils';

import { 
  DotationDelivery, 
  dotationItemTypeLabels,
  dotationStatusLabels,
  calculateDaysRemaining,
} from '@/types/dotation';

interface DotationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: DotationDelivery | null;
}

const statusStyles = {
  pending: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: Clock,
  },
  delivered: {
    bg: 'bg-success-light',
    text: 'text-success',
    icon: CheckCircle,
  },
  expiring: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    icon: AlertTriangle,
  },
  expired: {
    bg: 'bg-destructive-light',
    text: 'text-destructive',
    icon: AlertTriangle,
  },
};

export function DotationDetailDialog({ open, onOpenChange, delivery }: DotationDetailDialogProps) {
  if (!delivery) return null;

  const daysRemaining = calculateDaysRemaining(delivery.expirationDate);
  const statusConfig = statusStyles[delivery.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Detalle de Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Banner */}
          <div className={cn(
            "flex items-center justify-between p-4 rounded-lg",
            statusConfig.bg
          )}>
            <div className="flex items-center gap-3">
              <StatusIcon className={cn("w-5 h-5", statusConfig.text)} />
              <div>
                <p className={cn("font-medium", statusConfig.text)}>
                  {dotationStatusLabels[delivery.status]}
                </p>
                {delivery.status !== 'pending' && (
                  <p className="text-sm text-muted-foreground">
                    {daysRemaining > 0 
                      ? `Vence en ${daysRemaining} días`
                      : daysRemaining === 0
                        ? 'Vence hoy'
                        : `Venció hace ${Math.abs(daysRemaining)} días`
                    }
                  </p>
                )}
              </div>
            </div>
            <Badge variant="outline" className={statusConfig.text}>
              {dotationItemTypeLabels[delivery.itemType]}
            </Badge>
          </div>

          {/* Employee Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="w-4 h-4" />
              Empleado
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nombre:</span>
                <span className="font-medium">{delivery.employeeName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-medium">{delivery.employeeDocument}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Centro:</span>
                <span className="font-medium">{delivery.operationCenter}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Item Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Package className="w-4 h-4" />
              Artículo Entregado
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Artículo:</span>
                <span className="font-medium">{delivery.itemName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cantidad:</span>
                <span className="font-medium">{delivery.quantity}</span>
              </div>
              {delivery.size && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Talla:</span>
                  <span className="font-medium">{delivery.size}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Fechas
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Fecha de Entrega</p>
                <p className="font-medium">{format(delivery.deliveryDate, 'PPP', { locale: es })}</p>
              </div>
              <div className={cn(
                "p-4 rounded-lg text-center",
                delivery.status === 'expired' ? 'bg-destructive-light' : 
                delivery.status === 'expiring' ? 'bg-warning-light' : 'bg-muted/50'
              )}>
                <p className="text-xs text-muted-foreground mb-1">Fecha de Vencimiento</p>
                <p className="font-medium">{format(delivery.expirationDate, 'PPP', { locale: es })}</p>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="w-4 h-4" />
              Información de Entrega
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Entregado por:</span>
                <span className="font-medium">{delivery.deliveredBy}</span>
              </div>
              {delivery.notes && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-muted-foreground text-sm mb-1">Observaciones:</p>
                  <p className="text-sm">{delivery.notes}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Document Section */}
          <DocumentSection
            entityType="dotation"
            entityId={delivery.id}
            title="Documento de Entrega"
            showVersionHistory
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            {delivery.status === 'expiring' || delivery.status === 'expired' ? (
              <Button className="gap-2">
                <Package className="w-4 h-4" />
                Registrar Nueva Entrega
              </Button>
            ) : (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
