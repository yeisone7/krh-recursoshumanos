import { motion } from 'framer-motion';
import { AlertTriangle, Package, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { DotationAlert, getAlertLevel } from '@/types/dotation';

interface DotationAlertsCardProps {
  alerts: DotationAlert[];
  onViewAll?: () => void;
  onAlertClick?: (alert: DotationAlert) => void;
}

const levelStyles = {
  info: {
    bg: 'bg-info-light',
    border: 'border-info/20',
    icon: 'text-info',
    badge: 'bg-info/10 text-info',
  },
  warning: {
    bg: 'bg-warning-light',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning-foreground',
  },
  critical: {
    bg: 'bg-destructive-light',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
};

export function DotationAlertsCard({ alerts, onViewAll, onAlertClick }: DotationAlertsCardProps) {
  const criticalCount = alerts.filter(a => a.level === 'critical').length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Package className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">
              Alertas de Dotación
            </h2>
            <p className="text-sm text-muted-foreground">
              {criticalCount > 0 && <span className="text-destructive font-medium">{criticalCount} críticas</span>}
              {criticalCount > 0 && warningCount > 0 && ' • '}
              {warningCount > 0 && <span className="text-warning font-medium">{warningCount} advertencias</span>}
              {criticalCount === 0 && warningCount === 0 && 'Sin alertas pendientes'}
            </p>
          </div>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover" onClick={onViewAll}>
            Ver todas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay alertas de dotación pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 5).map((alert, index) => {
            const styles = levelStyles[alert.level];

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => onAlertClick?.(alert)}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                  styles.bg,
                  styles.border
                )}
              >
                <div className={cn("w-10 h-10 rounded-lg bg-card flex items-center justify-center", styles.icon)}>
                  {alert.level === 'critical' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-foreground truncate">{alert.employeeName}</p>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", styles.badge)}>
                      {alert.daysRemaining > 0 
                        ? `${alert.daysRemaining} días`
                        : alert.daysRemaining === 0
                          ? 'Hoy'
                          : 'Vencido'
                      }
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {alert.itemName} • Vence {format(alert.expirationDate, 'PPP', { locale: es })}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
