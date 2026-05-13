import { AlertTriangle, Clock, Stethoscope, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { useIncapacityAlerts, type IncapacityAlert } from '@/hooks/useIncapacities';

interface IncapacityAlertsPanelProps {
  onIncapacityClick?: (incapacityId: string) => void;
  maxItems?: number;
  compact?: boolean;
}

export function IncapacityAlertsPanel({
  onIncapacityClick,
  maxItems = 10,
  compact = false,
}: IncapacityAlertsPanelProps) {
  const { data: alerts, isLoading } = useIncapacityAlerts();
  
  const getAlertIcon = (type: IncapacityAlert['type']) => {
    switch (type) {
      case 'extension_pending':
        return <Clock className="h-4 w-4" />;
      case 'recovery_pending':
        return <AlertTriangle className="h-4 w-4" />;
      case 'reintegration_exam':
        return <Stethoscope className="h-4 w-4" />;
    }
  };
  
  const getAlertColor = (level: IncapacityAlert['level']) => {
    switch (level) {
      case 'critical':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'warning':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };
  
  const getLevelBadge = (level: IncapacityAlert['level']) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">Advertencia</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className="text-base">Alertas de Incapacidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const displayAlerts = alerts?.slice(0, maxItems) || [];
  const totalAlerts = alerts?.length || 0;
  const criticalCount = alerts?.filter(a => a.level === 'critical').length || 0;
  
  if (displayAlerts.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : ''}>
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Alertas de Incapacidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay alertas pendientes
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="rounded-[2rem] border-border/50 shadow-lg overflow-hidden">
      <CardHeader className={compact ? 'pb-2 bg-muted/20' : 'bg-muted/20 border-b border-border/50 pb-4'}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Stethoscope className="h-4 w-4" />
              </div>
              Alertas de Incapacidades
            </CardTitle>
            {!compact && (
              <CardDescription className="mt-1 font-medium">
                {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} 
                {criticalCount > 0 && ` (${criticalCount} crítica${criticalCount !== 1 ? 's' : ''})`}
              </CardDescription>
            )}
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="rounded-xl px-2 py-1 font-bold">{criticalCount}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={compact ? 'h-48' : 'h-64'}>
          <div className="p-4 space-y-3">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${getAlertColor(alert.level)}`}
                onClick={() => onIncapacityClick?.(alert.incapacity.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-background/50 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-bold text-sm tracking-tight">{alert.title}</p>
                      <p className="text-xs opacity-80 mt-1 line-clamp-2 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {getLevelBadge(alert.level)}
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {totalAlerts > maxItems && (
          <div className="p-4 border-t border-border/50 bg-muted/10">
            <Button variant="outline" size="sm" className="w-full rounded-xl h-10 font-bold uppercase tracking-widest text-[10px]" onClick={() => onIncapacityClick?.('')}>
              Ver todas ({totalAlerts - maxItems} más)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
