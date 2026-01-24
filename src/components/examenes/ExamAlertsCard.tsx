import { motion } from 'framer-motion';
import { Stethoscope, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MedicalExamAlert, examTypeLabels } from '@/types/medicalExam';

interface ExamAlertsCardProps {
  alerts: MedicalExamAlert[];
  onViewAll?: () => void;
  onAlertClick?: (alert: MedicalExamAlert) => void;
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

export function ExamAlertsCard({ alerts, onViewAll, onAlertClick }: ExamAlertsCardProps) {
  const criticalAlerts = alerts.filter(a => a.level === 'critical');
  const warningAlerts = alerts.filter(a => a.level === 'warning');

  const displayAlerts = [...criticalAlerts, ...warningAlerts].slice(0, 5);

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
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Alertas de Exámenes</h3>
            <p className="text-sm text-muted-foreground">
              {criticalAlerts.length} críticas, {warningAlerts.length} advertencias
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
              <Stethoscope className={cn('w-5 h-5', styles.icon)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground text-sm truncate">
                    {alert.employeeName}
                  </p>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', styles.badge)}>
                    {alert.daysRemaining} días
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {examTypeLabels[alert.examType]} por vencer
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
