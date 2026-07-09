import { useState } from 'react';
import { AlertTriangle, Clock, Stethoscope, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [showAllDialogOpen, setShowAllDialogOpen] = useState(false);

  const getAlertIcon = (type: IncapacityAlert['type']) => {
    switch (type) {
      case 'extension_pending':
        return <Clock className="h-4 w-4" />;
      case 'recovery_pending':
      case 'legal_milestone':
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
        return <Badge variant="destructive">Critico</Badge>;
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
  const hiddenAlertsCount = Math.max(totalAlerts - maxItems, 0);

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

  const handleAlertClick = (alert: IncapacityAlert, closeDialog = false) => {
    if (closeDialog) setShowAllDialogOpen(false);
    onIncapacityClick?.(alert.incapacity.id);
  };

  const renderAlertCard = (alert: IncapacityAlert, closeDialog = false) => (
    <div
      key={alert.id}
      className={`min-w-0 rounded-2xl border p-4 transition-all hover:shadow-md ${onIncapacityClick ? 'cursor-pointer' : ''} ${getAlertColor(alert.level)}`}
      onClick={() => handleAlertClick(alert, closeDialog)}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
            {getAlertIcon(alert.type)}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex min-w-0 flex-wrap items-start gap-2">
              <p className="min-w-0 flex-1 break-words text-sm font-black leading-snug tracking-tight">
                {alert.title}
              </p>
              <div className="shrink-0 [&_.inline-flex]:max-w-full [&_.inline-flex]:whitespace-normal [&_.inline-flex]:text-[10px] [&_.inline-flex]:font-black [&_.inline-flex]:uppercase">
                {getLevelBadge(alert.level)}
              </div>
            </div>
            <p className="mt-1 break-words text-xs font-medium leading-relaxed opacity-80">
              {alert.description}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider opacity-90 transition hover:bg-background"
          onClick={(event) => {
            event.stopPropagation();
            handleAlertClick(alert, closeDialog);
          }}
        >
          Ver detalle
          <ChevronRight className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </div>
  );

  const alertsList = (
    <div className={compact ? 'space-y-3 p-3' : 'space-y-3 p-4'}>
      {displayAlerts.map((alert) => renderAlertCard(alert))}
    </div>
  );

  return (
    <>
      <Card className="min-w-0 overflow-hidden rounded-[1.5rem] border-border/60 shadow-sm">
        <CardHeader className={compact ? 'bg-background pb-2' : 'border-b border-border/50 bg-background pb-4'}>
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base leading-tight">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <span className="min-w-0 break-words">Alertas de Incapacidades</span>
              </CardTitle>
              {!compact && (
                <CardDescription className="mt-1 font-medium">
                  {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''}
                  {criticalCount > 0 && ` (${criticalCount} critica${criticalCount !== 1 ? 's' : ''})`}
                </CardDescription>
              )}
            </div>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="w-fit shrink-0 rounded-xl px-2 py-1 font-bold">{criticalCount}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {compact ? <ScrollArea className="h-56">{alertsList}</ScrollArea> : alertsList}

          {hiddenAlertsCount > 0 && (
            <div className="p-4 border-t border-border/50 bg-background/10">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl h-10 font-bold uppercase tracking-widest text-[10px]"
                onClick={() => setShowAllDialogOpen(true)}
              >
                Ver todas ({hiddenAlertsCount} mas)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllDialogOpen} onOpenChange={setShowAllDialogOpen}>
        <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border-border/50 p-0 shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-border/50 px-6 py-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <Stethoscope className="h-5 w-5 text-primary" />
              Alertas de Incapacidades
            </DialogTitle>
            <DialogDescription>
              {totalAlerts} alerta{totalAlerts !== 1 ? 's' : ''} pendiente{totalAlerts !== 1 ? 's' : ''} por revisar.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-3 p-4">
              {(alerts || []).map((alert) => renderAlertCard(alert, true))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
