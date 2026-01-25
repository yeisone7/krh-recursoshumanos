import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Plane, Clock, FileCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PortalVacationsLeavesProps {
  vacationBalances: any[];
  leaveRequests: any[];
}

export function PortalVacationsLeaves({ vacationBalances, leaveRequests }: PortalVacationsLeavesProps) {
  const currentBalance = vacationBalances?.[0];
  const usedDays = currentBalance ? currentBalance.total_days - currentBalance.available_days : 0;
  const progressPercent = currentBalance 
    ? Math.min(100, (usedDays / currentBalance.total_days) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Vacation Balance Card */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Saldo de Vacaciones
          </CardTitle>
          <CardDescription>
            Periodo {currentBalance?.period_year || new Date().getFullYear()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentBalance ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold text-primary">
                    {currentBalance.available_days}
                  </p>
                  <p className="text-sm text-muted-foreground">días disponibles</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-medium">{currentBalance.total_days}</p>
                  <p className="text-sm text-muted-foreground">días causados</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Usados: {usedDays} días</span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-lg font-semibold">{currentBalance.days_enjoyed || 0}</p>
                  <p className="text-xs text-muted-foreground">Disfrutados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{currentBalance.days_compensated || 0}</p>
                  <p className="text-xs text-muted-foreground">Compensados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{currentBalance.days_accumulated || 0}</p>
                  <p className="text-xs text-muted-foreground">Acumulados</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay saldo de vacaciones registrado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Historial de Permisos y Licencias
          </CardTitle>
          <CardDescription>
            Tus solicitudes de ausencias más recientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests && leaveRequests.length > 0 ? (
            <div className="space-y-3">
              {leaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {request.leave_type_config?.display_name || 'Permiso'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.start_date), 'PPP', { locale: es })}
                        {request.end_date !== request.start_date && (
                          <> - {format(new Date(request.end_date), 'PPP', { locale: es })}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{request.days_requested} días</p>
                    </div>
                    <StatusBadge status={request.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hay solicitudes de permisos registradas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pendiente: { label: 'Pendiente', variant: 'secondary' },
    aprobado: { label: 'Aprobado', variant: 'default' },
    rechazado: { label: 'Rechazado', variant: 'destructive' },
    cancelado: { label: 'Cancelado', variant: 'outline' },
  };

  const { label, variant } = config[status] || { label: status, variant: 'outline' };

  return <Badge variant={variant}>{label}</Badge>;
}
