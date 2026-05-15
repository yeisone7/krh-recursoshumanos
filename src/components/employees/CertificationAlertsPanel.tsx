import { AlertTriangle, Clock, FileWarning, ChevronRight, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DashboardAlert } from '@/hooks/useDashboardAlerts';

interface CertificationAlertsPanelProps {
  onEmployeeClick: (employeeId: string) => void;
  alerts?: DashboardAlert[];
}

export function CertificationAlertsPanel({ onEmployeeClick, alerts = [] }: CertificationAlertsPanelProps) {
  const getLevelStyles = (level: DashboardAlert['level']) => {
    switch (level) {
      case 'critical':
        return {
          badge: 'bg-destructive/10 text-destructive border-destructive/20',
          icon: 'text-destructive',
          border: 'border-l-destructive',
        };
      case 'warning':
        return {
          badge: 'bg-warning/10 text-warning border-warning/20',
          icon: 'text-warning',
          border: 'border-l-warning',
        };
      default:
        return {
          badge: 'bg-primary/10 text-primary border-primary/20',
          icon: 'text-primary',
          border: 'border-l-primary',
        };
    }
  };

  const getLevelLabel = (level: DashboardAlert['level']) => {
    switch (level) {
      case 'critical':
        return 'Crítico';
      case 'warning':
        return 'Advertencia';
      default:
        return 'Info';
    }
  };

  if (alerts.length === 0) {
    return (
      <div className="card-elevated p-4 h-full">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas de Certificaciones</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <FileWarning className="w-6 h-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            No hay certificaciones vencidas o por vencer
          </p>
        </div>
      </div>
    );
  }

  // Group alerts by level for summary
  const expiredCount = alerts.filter(a => a.daysRemaining < 0).length;
  const criticalCount = alerts.filter(a => a.level === 'critical' && a.daysRemaining >= 0).length;
  const warningCount = alerts.filter(a => a.level === 'warning').length;

  return (
    <div className="card-elevated p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas de Certificaciones</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Compact summary badges */}
          {expiredCount > 0 && (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {expiredCount} vencidas
            </Badge>
          )}
          {criticalCount > 0 && (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {criticalCount} críticas
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {warningCount} advertencias
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {alerts.length} total
          </Badge>
        </div>
      </div>

      {/* Grid layout for alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {alerts.map((alert) => {
          const styles = getLevelStyles(alert.level);
          const isExpired = alert.daysRemaining < 0;

          return (
            <div
              key={alert.id}
              className={cn(
                'p-3 rounded-lg border-l-4 bg-background hover:bg-background cursor-pointer transition-colors group',
                styles.border
              )}
              onClick={() => onEmployeeClick(alert.entityId)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {isExpired ? (
                      <AlertTriangle className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
                    ) : (
                      <Clock className={cn('w-4 h-4 flex-shrink-0', styles.icon)} />
                    )}
                    <span className="font-medium text-sm text-foreground truncate">
                      {alert.entityName}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6 line-clamp-2">{alert.description}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className={cn('text-xs whitespace-nowrap', styles.badge)}>
                    {getLevelLabel(alert.level)}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
