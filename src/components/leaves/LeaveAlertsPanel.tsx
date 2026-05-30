import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLeaveRequests, usePendingLeavesCount } from '@/hooks/useLeaves';
import { LEAVE_TYPE_LABELS } from '@/types/leave';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';

interface LeaveAlertsPanelProps {
  onViewRequest?: (requestId: string) => void;
}

export function LeaveAlertsPanel({ onViewRequest }: LeaveAlertsPanelProps) {
  const { data: requests = [] } = useLeaveRequests({ status: 'pendiente' });
  const { data: pendingCount = 0 } = usePendingLeavesCount();

  // Sort by requested date (oldest first for urgent attention)
  const sortedRequests = [...requests].sort((a, b) => 
    new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()
  );

  const getUrgencyLevel = (requestedAt: string) => {
    const daysWaiting = differenceInDays(new Date(), new Date(requestedAt));
    if (daysWaiting >= 3) return 'critical';
    if (daysWaiting >= 1) return 'warning';
    return 'info';
  };

  if (pendingCount === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
        <div className="flex items-start gap-3 text-muted-foreground sm:items-center">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span>No hay solicitudes de permiso pendientes</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
            <Clock className="h-5 w-5" />
            Solicitudes Pendientes
          </CardTitle>
          <Badge variant="destructive">{pendingCount}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedRequests.slice(0, 5).map(request => {
            const urgency = getUrgencyLevel(request.requested_at);
            const employeeName = request.employees_v2
              ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
              : 'Empleado';
            const daysWaiting = differenceInDays(new Date(), new Date(request.requested_at));

            return (
              <div
                key={request.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${
                  urgency === 'critical' 
                    ? 'border-destructive/50 bg-destructive/5' 
                    : urgency === 'warning'
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : 'border-border'
                }`}
                onClick={() => onViewRequest?.(request.id)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {urgency === 'critical' && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="truncate font-medium">{employeeName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {LEAVE_TYPE_LABELS[request.leave_type]} • {request.total_days} días
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnly(request.start_date, 'dd MMM', { locale: es })} - {formatDateOnly(request.end_date, 'dd MMM yyyy', { locale: es })}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <Badge variant={urgency === 'critical' ? 'destructive' : urgency === 'warning' ? 'secondary' : 'outline'}>
                      {daysWaiting === 0 ? 'Hoy' : `${daysWaiting}d esperando`}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}

          {sortedRequests.length > 5 && (
            <p className="text-sm text-center text-muted-foreground">
              Y {sortedRequests.length - 5} solicitudes más...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
