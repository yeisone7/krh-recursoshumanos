import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  FileText,
  Stethoscope,
  Shirt,
  ShieldCheck,
  Umbrella,
  Wallet,
  ChevronRight,
  Bell,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useEmployee360Alerts, Employee360Alert, AlertType, AlertLevel } from '@/hooks/useEmployee360Alerts';

interface Employee360AlertsProps {
  employeeId: string;
}

const alertTypeConfig: Record<AlertType, { icon: typeof AlertTriangle; label: string }> = {
  contract: { icon: FileText, label: 'Contrato' },
  extension: { icon: FileText, label: 'Prórroga' },
  medical: { icon: Stethoscope, label: 'Examen Médico' },
  dotation: { icon: Shirt, label: 'Dotación' },
  certification: { icon: ShieldCheck, label: 'Certificación' },
  incapacity: { icon: Stethoscope, label: 'Incapacidad' },
  vacation: { icon: Umbrella, label: 'Vacaciones' },
  cesantias: { icon: Wallet, label: 'Cesantías' },
  document: { icon: FileText, label: 'Documento' },
};

const levelStyles: Record<AlertLevel, { badge: string; border: string; icon: string; bg: string }> = {
  critical: {
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    border: 'border-l-destructive',
    icon: 'text-destructive',
    bg: 'bg-destructive/5 hover:bg-destructive/10',
  },
  warning: {
    badge: 'bg-warning/10 text-warning border-warning/20',
    border: 'border-l-warning',
    icon: 'text-warning',
    bg: 'bg-warning/5 hover:bg-warning/10',
  },
  info: {
    badge: 'bg-primary/10 text-primary border-primary/20',
    border: 'border-l-primary',
    icon: 'text-primary',
    bg: 'bg-primary/5 hover:bg-primary/10',
  },
};

function AlertCard({ alert, onNavigate }: { alert: Employee360Alert; onNavigate: (path: string) => void }) {
  const config = alertTypeConfig[alert.type];
  const styles = levelStyles[alert.level];
  const Icon = config.icon;
  const isExpired = alert.daysRemaining < 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={cn(
        'p-3 rounded-lg border-l-4 cursor-pointer transition-all group',
        styles.border,
        styles.bg
      )}
      onClick={() => alert.navigateTo && onNavigate(alert.navigateTo)}
    >
      <div className="flex items-start gap-3">
        <div className={cn('shrink-0 mt-0.5', styles.icon)}>
          {isExpired ? <AlertTriangle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-foreground">{alert.title}</span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', styles.badge)}>
              {config.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{alert.description}</p>
        </div>
        {alert.navigateTo && (
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        )}
      </div>
    </motion.div>
  );
}

export function Employee360Alerts({ employeeId }: Employee360AlertsProps) {
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useEmployee360Alerts(employeeId);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // Group alerts by level for summary
  const criticalCount = alerts?.filter(a => a.level === 'critical').length || 0;
  const warningCount = alerts?.filter(a => a.level === 'warning').length || 0;
  const infoCount = alerts?.filter(a => a.level === 'info').length || 0;

  if (isLoading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas del Empleado</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-success" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Sin alertas pendientes</p>
          <p className="text-xs text-muted-foreground">
            No hay vencimientos ni pendientes próximos
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas del Empleado</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
        </Badge>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {criticalCount > 0 && (
          <Badge className={levelStyles.critical.badge}>
            <AlertTriangle className="w-3 h-3 mr-1" />
            {criticalCount} críticas
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge className={levelStyles.warning.badge}>
            <Clock className="w-3 h-3 mr-1" />
            {warningCount} advertencias
          </Badge>
        )}
        {infoCount > 0 && (
          <Badge className={levelStyles.info.badge}>
            <Clock className="w-3 h-3 mr-1" />
            {infoCount} informativas
          </Badge>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
