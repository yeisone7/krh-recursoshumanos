import { AlertTriangle, Clock, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVacationAlerts } from '@/hooks/useVacations';
import { VacationAlert } from '@/types/vacation';
import { cn } from '@/lib/utils';

interface VacationAlertsPanelProps {
  onAlertClick?: (alert: VacationAlert) => void;
  maxItems?: number;
}

export function VacationAlertsPanel({ onAlertClick, maxItems }: VacationAlertsPanelProps) {
  const { data: alerts, isLoading } = useVacationAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas de Vacaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = maxItems ? alerts?.slice(0, maxItems) : alerts;

  const getAlertIcon = (type: VacationAlert['type']) => {
    switch (type) {
      case 'accumulation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'expiring':
        return <Clock className="h-4 w-4" />;
      case 'interrupted':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertColor = (level: VacationAlert['level']) => {
    switch (level) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
    }
  };

  const getLevelBadge = (level: VacationAlert['level']) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Advertencia</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Alertas de Vacaciones
          </CardTitle>
          {alerts && alerts.length > 0 && (
            <Badge variant="outline">{alerts.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!displayAlerts || displayAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No hay alertas pendientes</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-2">
            <div className="space-y-3">
              {displayAlerts.map((alert, index) => (
                <button
                  key={`${alert.type}-${alert.employee_id}-${index}`}
                  onClick={() => onAlertClick?.(alert)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border-l-4 transition-all hover:shadow-sm',
                    getAlertColor(alert.level)
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        'mt-0.5',
                        alert.level === 'critical' ? 'text-destructive' : 
                        alert.level === 'warning' ? 'text-orange-500' : 'text-blue-500'
                      )}>
                        {getAlertIcon(alert.type)}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{alert.employee_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        {alert.days && (
                          <p className="text-xs font-medium text-primary mt-1">
                            {alert.days} días
                          </p>
                        )}
                      </div>
                    </div>
                    {getLevelBadge(alert.level)}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {maxItems && alerts && alerts.length > maxItems && (
          <div className="pt-3 border-t mt-3">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Ver todas las alertas ({alerts.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
