import { AlertTriangle, BellRing, CheckCircle, ChevronRight, Clock, FileWarning } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLeaveRequests, useLeaveTypeConfigs } from '@/hooks/useLeaves';
import { getLeaveTypeLabel, LeaveRequest } from '@/types/leave';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';

interface LeaveAlertsPanelProps {
  onViewRequest?: (requestId: string) => void;
  maxItems?: number;
  compact?: boolean;
}

type LeaveAlert = {
  id: string;
  request: LeaveRequest;
  type: 'missing_document' | 'pending_approval';
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  score: number;
};

export function LeaveAlertsPanel({ onViewRequest, maxItems, compact = false }: LeaveAlertsPanelProps) {
  const { data: requests = [], isLoading } = useLeaveRequests();
  const { data: typeConfigs = [] } = useLeaveTypeConfigs();
  const today = new Date();

  const alerts: LeaveAlert[] = requests.flatMap((request) => {
    const employeeName = request.employees_v2
      ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
      : 'Empleado';
    const leaveType = getLeaveTypeLabel(request.leave_type, typeConfigs);
    const config = typeConfigs.find((item) => item.leave_type === request.leave_type);
    const result: LeaveAlert[] = [];

    if (config?.requires_document && !request.document_url && !['cancelado', 'rechazado'].includes(request.status)) {
      const daysToStart = differenceInCalendarDays(parseDateOnlyOr(request.start_date, today), today);
      const isCritical = daysToStart <= 0 || request.status === 'aprobado';
      result.push({
        id: `document-${request.id}`,
        request,
        type: 'missing_document',
        level: isCritical ? 'critical' : 'warning',
        title: 'Documento pendiente por subir',
        description: `${employeeName}: falta ${config.document_description || 'el soporte requerido'} para ${leaveType}. Inicio: ${formatDateOnly(request.start_date, 'dd/MM/yyyy')}.`,
        score: isCritical ? 300 - daysToStart : 200 - daysToStart,
      });
    }

    if (request.status === 'pendiente') {
      const daysWaiting = Math.max(0, differenceInCalendarDays(today, new Date(request.requested_at)));
      result.push({
        id: `approval-${request.id}`,
        request,
        type: 'pending_approval',
        level: daysWaiting >= 3 ? 'critical' : daysWaiting >= 1 ? 'warning' : 'info',
        title: request.approval_stage === 'pending_area_leader'
          ? 'Aprobación de líder de área pendiente'
          : 'Aprobación de jefe inmediato pendiente',
        description: `${employeeName}: ${leaveType}. ${daysWaiting === 0 ? 'Radicado hoy' : `${daysWaiting} día${daysWaiting === 1 ? '' : 's'} en espera`}.`,
        score: 100 + daysWaiting,
      });
    }

    return result;
  }).sort((a, b) => b.score - a.score);

  const visibleAlerts = typeof maxItems === 'number' ? alerts.slice(0, maxItems) : alerts;
  const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
  const missingDocumentCount = alerts.filter((alert) => alert.type === 'missing_document').length;

  const levelClass = (level: LeaveAlert['level']) => {
    if (level === 'critical') return 'border-destructive/30 bg-destructive/10 text-destructive';
    if (level === 'warning') return 'border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300';
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300';
  };

  if (isLoading) {
    return <Card className="rounded-3xl p-6 text-sm text-muted-foreground">Cargando alertas de permisos...</Card>;
  }

  return (
    <Card className="min-w-0 overflow-hidden rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50 bg-background pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BellRing className="h-4 w-4" />
              </span>
              Alertas de permisos
            </CardTitle>
            <CardDescription className="mt-1 font-medium">
              {alerts.length} alerta{alerts.length === 1 ? '' : 's'} · {missingDocumentCount} documento{missingDocumentCount === 1 ? '' : 's'} pendiente{missingDocumentCount === 1 ? '' : 's'}
            </CardDescription>
          </div>
          {criticalCount > 0 && <Badge variant="destructive" className="rounded-xl">{criticalCount}</Badge>}
        </div>
      </CardHeader>
      <CardContent className={cn('p-0', compact && 'max-h-[640px] overflow-y-auto')}>
        {visibleAlerts.length === 0 ? (
          <div className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            No hay aprobaciones ni documentos pendientes.
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {visibleAlerts.map((alert) => (
              <button
                key={alert.id}
                type="button"
                className={cn('w-full rounded-2xl border p-4 text-left transition hover:shadow-md', levelClass(alert.level))}
                onClick={() => onViewRequest?.(alert.request.id)}
              >
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                    {alert.type === 'missing_document' ? <FileWarning className="h-4 w-4" /> : alert.level === 'critical' ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 text-sm font-black leading-snug">{alert.title}</span>
                      <Badge variant={alert.level === 'critical' ? 'destructive' : 'outline'} className="shrink-0 text-[9px] uppercase">
                        {alert.level === 'critical' ? 'Crítico' : alert.level === 'warning' ? 'Advertencia' : 'Info'}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs font-medium leading-relaxed opacity-80">{alert.description}</span>
                    <span className="mt-3 flex items-center justify-between rounded-xl bg-background/70 px-3 py-2 text-[10px] font-black uppercase tracking-wider">
                      Ver detalle <ChevronRight className="h-4 w-4" />
                    </span>
                  </span>
                </span>
              </button>
            ))}
            {visibleAlerts.length < alerts.length && (
              <p className="text-center text-xs font-medium text-muted-foreground">Hay {alerts.length - visibleAlerts.length} alertas adicionales en la pestaña Alertas.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
