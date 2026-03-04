import { motion } from 'framer-motion';
import { Stethoscope, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ExamAlert {
  id: string;
  examId: string;
  employeeId: string;
  employeeName: string;
  examType: string;
  expirationDate: string | Date;
  daysRemaining: number;
  level: 'info' | 'warning' | 'critical';
}

const examTypeLabels: Record<string, string> = {
  ingreso: 'Ingreso',
  periodico: 'Periódico',
  egreso: 'Egreso',
  reintegro: 'Reintegro',
  post_incapacidad: 'Post incapacidad',
  cambio_cargo: 'Cambio de cargo',
  seguimiento: 'Seguimiento',
};

interface ExamAlertsCardProps {
  alerts: ExamAlert[];
  onViewAll?: () => void;
  onAlertClick?: (alert: ExamAlert) => void;
}

const levelStyles = {
  info: {
    bg: 'bg-info-light',
    border: 'border-info/20',
    icon: 'text-info',
    badge: 'bg-info/10 text-info border-info/30',
  },
  warning: {
    bg: 'bg-warning-light',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning-foreground border-warning/30',
  },
  critical: {
    bg: 'bg-destructive-light',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive border-destructive/30',
  },
};

const levelLabels = {
  info: 'Info',
  warning: 'Advertencia',
  critical: 'Crítico',
};

export function ExamAlertsCard({ alerts, onViewAll, onAlertClick }: ExamAlertsCardProps) {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');

  const displayAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 5);
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

  if (displayAlerts.length === 0) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Alertas de Exámenes</h3>
            <p className="text-sm text-muted-foreground">Sin alertas pendientes</p>
          </div>
        </div>
        <div className="p-4 bg-success-light rounded-lg text-center">
          <p className="text-success font-medium">
            Todos los exámenes médicos están al día
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Alertas de Exámenes</h3>
            <p className="text-sm text-muted-foreground">
              {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll} className="text-primary">
            Ver todas
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {displayAlerts.map((alert, index) => {
          const styles = levelStyles[alert.level];
          const description = alert.daysRemaining <= 0
            ? `Examen ${examTypeLabels[alert.examType] || alert.examType} vencido`
            : `Examen ${examTypeLabels[alert.examType] || alert.examType} vence en ${alert.daysRemaining} día(s)`;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              onClick={() => onAlertClick?.(alert)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
                styles.bg,
                styles.border
              )}
            >
              <AlertTriangle className={cn('w-5 h-5 shrink-0', styles.icon)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-foreground text-sm truncate">
                    {alert.employeeName}
                  </p>
                  <Badge variant="outline" className={cn('text-[10px] font-semibold px-2 py-0 h-5 rounded-full border', styles.badge)}>
                    {levelLabels[alert.level]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
