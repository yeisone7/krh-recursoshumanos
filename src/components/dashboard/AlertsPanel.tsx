import { motion } from 'framer-motion';
import { AlertTriangle, Clock, FileText, Stethoscope, Package, ChevronRight, CheckCircle, Award, HeartPulse, Palmtree, Scale, Warehouse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDashboardAlerts, type DashboardAlert } from '@/hooks/useDashboardAlerts';
import { Skeleton } from '@/components/ui/skeleton';

const typeIcons: Record<DashboardAlert['type'], typeof FileText> = {
  contract: FileText,
  extension: Clock,
  medical: Stethoscope,
  dotation: Package,
  certification: Award,
  incapacity: HeartPulse,
  vacation: Palmtree,
  preaviso: Scale,
  inventory_low_stock: Warehouse,
};

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

export function AlertsPanel() {
  const navigate = useNavigate();
  const { data: alerts = [], isLoading } = useDashboardAlerts({ includeDotationCompliance: false });

  const handleAlertClick = (alert: DashboardAlert) => {
    switch (alert.type) {
      case 'contract':
      case 'extension':
      case 'preaviso':
        navigate(`/contratos?detail=${alert.entityId}`);
        break;
      case 'medical':
        navigate(`/examenes?detail=${alert.entityId}`);
        break;
      case 'dotation':
        navigate(`/dotacion?detail=${alert.entityId}`);
        break;
      case 'certification':
        navigate(`/empleados?detail=${alert.entityId}`);
        break;
      case 'incapacity':
        navigate(`/incapacidades?incapacidad=${alert.entityId}`);
        break;
      case 'vacation':
        navigate(`/vacaciones?empleado=${alert.entityId}`);
        break;
      case 'inventory_low_stock':
        navigate('/dotacion');
        break;
    }
  };

  const handleViewAll = () => {
    navigate('/notificaciones');
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Alertas Activas</h2>
            <p className="text-sm text-muted-foreground">Sin alertas pendientes</p>
          </div>
        </div>
        <div className="p-6 bg-success-light rounded-xl text-center">
          <p className="text-success font-medium">
            ¡Todo al día! No hay vencimientos próximos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Alertas Activas</h2>
            <p className="text-sm text-muted-foreground">{alerts.length} alertas pendientes</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary-hover"
          onClick={handleViewAll}
        >
          Ver todas
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {alerts.slice(0, 5).map((alert, index) => {
          const Icon = typeIcons[alert.type];
          const styles = levelStyles[alert.level];

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                styles.bg,
                styles.border
              )}
              onClick={() => handleAlertClick(alert)}
            >
              <div className={cn("w-10 h-10 rounded-lg bg-card flex items-center justify-center", styles.icon)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", styles.badge)}>
                    {alert.type === 'inventory_low_stock'
                      ? (alert.daysRemaining < 0 ? 'Agotado' : 'Bajo')
                      : alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)}d vencido` : `${alert.daysRemaining} días`}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{alert.entityName} • {alert.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
