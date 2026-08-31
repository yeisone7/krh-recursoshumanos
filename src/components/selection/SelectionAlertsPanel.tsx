import { useState } from 'react';
import { AlertTriangle, ChevronRight, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SelectionAlert } from '@/lib/selectionAlerts';

interface Props {
  alerts: SelectionAlert[];
  isLoading: boolean;
  hasError: boolean;
  onRetry: () => void;
  onAlertClick: (alert: SelectionAlert) => void;
  maxItems?: number;
}

const sourceLabels = { requisition: 'Requisiciones', vacancy: 'Vacantes', candidate: 'Selección' };

function AlertCard({ alert, onClick }: { alert: SelectionAlert; onClick: () => void }) {
  const critical = alert.level === 'critical';
  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${critical ? 'text-destructive bg-destructive/10 border-destructive/20' : 'text-warning bg-warning/10 border-warning/20'}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider">{sourceLabels[alert.source]}</p>
          <div className="flex flex-wrap items-start gap-2">
            <p className="min-w-0 flex-1 break-words text-sm font-black leading-snug">{alert.title}</p>
            <Badge variant={critical ? 'destructive' : 'outline'} className={critical ? 'text-[10px] uppercase' : 'border-warning text-warning text-[10px] uppercase'}>
              {critical ? 'Crítico' : 'Advertencia'}
            </Badge>
          </div>
          <p className="mt-1 break-words text-xs font-medium leading-relaxed">{alert.description}</p>
        </div>
      </div>
      <button type="button" onClick={onClick} aria-label={`Ver detalle: ${alert.description}`}
        className="mt-3 flex w-full items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        Ver detalle <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SelectionAlertsPanel({ alerts, isLoading, hasError, onRetry, onAlertClick, maxItems = 5 }: Props) {
  const [showAll, setShowAll] = useState(false);
  const criticalCount = alerts.filter(alert => alert.level === 'critical').length;
  const openDetail = (alert: SelectionAlert) => {
    setShowAll(false);
    onAlertClick(alert);
  };
  return (
    <>
      <Card className="min-w-0 overflow-hidden rounded-[1.5rem] border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-background pb-4">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base leading-tight">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ClipboardList className="h-4 w-4" /></span>
              Alertas de Selección y Vacantes
            </CardTitle>
            {!isLoading && !hasError && criticalCount > 0 && <Badge variant="destructive" className="shrink-0 rounded-xl">{criticalCount}</Badge>}
          </div>
          <CardDescription>Requisiciones y procesos de selección</CardDescription>
          {!isLoading && !hasError && <p className="text-sm text-muted-foreground" aria-live="polite">{alerts.length} alerta{alerts.length !== 1 ? 's' : ''} ({criticalCount} crítica{criticalCount !== 1 ? 's' : ''})</p>}
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {isLoading ? <div role="status" aria-label="Cargando alertas" className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
            : hasError ? <div role="alert"><p className="text-sm text-muted-foreground">No se pudieron cargar todas las alertas.</p><Button variant="outline" size="sm" onClick={onRetry} className="mt-3">Reintentar</Button></div>
            : alerts.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No hay alertas pendientes</p>
            : <>{alerts.slice(0, maxItems).map(alert => <AlertCard key={alert.id} alert={alert} onClick={() => openDetail(alert)} />)}
              {alerts.length > maxItems && <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowAll(true)}>Ver todas ({alerts.length - maxItems} más)</Button>}</>}
        </CardContent>
      </Card>
      <Dialog open={showAll && !isLoading && !hasError} onOpenChange={setShowAll}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden rounded-2xl p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-5 text-left">
            <DialogTitle>Alertas de Selección y Vacantes</DialogTitle>
            <DialogDescription>{alerts.length} alertas de requisiciones, vacantes y candidatos.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-3 overflow-y-auto p-4">{alerts.map(alert => <AlertCard key={alert.id} alert={alert} onClick={() => openDetail(alert)} />)}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
