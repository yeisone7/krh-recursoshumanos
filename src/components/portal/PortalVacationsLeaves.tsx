import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Plane, FileCheck, AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PortalVacationRequestForm } from './PortalVacationRequestForm';
import { PortalLeaveRequestForm } from './PortalLeaveRequestForm';

interface PortalVacationsLeavesProps {
  vacationBalances: any[];
  leaveRequests: any[];
  vacationRequests?: any[];
  leaveTypeConfig?: { id: string; leave_type: string; display_name: string }[];
  onCreateVacation?: (data: any) => void;
  onCreateLeave?: (data: any) => void;
  isSubmittingVacation?: boolean;
  isSubmittingLeave?: boolean;
}

export function PortalVacationsLeaves({
  vacationBalances,
  leaveRequests,
  vacationRequests,
  leaveTypeConfig,
  onCreateVacation,
  onCreateLeave,
  isSubmittingVacation,
  isSubmittingLeave,
}: PortalVacationsLeavesProps) {
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Saldo de Vacaciones
              </CardTitle>
              <CardDescription>
                Periodo {currentBalance?.period_year || new Date().getFullYear()}
              </CardDescription>
            </div>
            {onCreateVacation && (
              <Button size="sm" onClick={() => setShowVacationForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Solicitar
              </Button>
            )}
          </div>
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

      {/* Vacation Requests History */}
      {vacationRequests && vacationRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="h-4 w-4" />
              Mis Solicitudes de Vacaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vacationRequests.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm capitalize">{req.request_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(req.start_date), 'PPP', { locale: es })}
                      {req.end_date !== req.start_date && (
                        <> - {format(new Date(req.end_date), 'PPP', { locale: es })}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{req.business_days} días</span>
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Historial de Permisos y Licencias
              </CardTitle>
              <CardDescription>
                Tus solicitudes de ausencias más recientes
              </CardDescription>
            </div>
            {onCreateLeave && (
              <Button size="sm" variant="outline" onClick={() => setShowLeaveForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Solicitar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {leaveRequests && leaveRequests.length > 0 ? (
            <div className="space-y-3">
              {leaveRequests.map((request: any) => (
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
                      <p className="text-sm font-medium">{request.total_days || request.days_requested} días</p>
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

      {/* Forms */}
      {onCreateVacation && (
        <PortalVacationRequestForm
          open={showVacationForm}
          onOpenChange={setShowVacationForm}
          onSubmit={(data) => {
            onCreateVacation(data);
            setShowVacationForm(false);
          }}
          isSubmitting={isSubmittingVacation || false}
          availableDays={currentBalance?.available_days || 0}
        />
      )}
      {onCreateLeave && (
        <PortalLeaveRequestForm
          open={showLeaveForm}
          onOpenChange={setShowLeaveForm}
          onSubmit={(data) => {
            onCreateLeave(data);
            setShowLeaveForm(false);
          }}
          isSubmitting={isSubmittingLeave || false}
          leaveTypes={leaveTypeConfig || []}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pendiente: { label: 'Pendiente', variant: 'secondary' },
    aprobado: { label: 'Aprobado', variant: 'default' },
    rechazado: { label: 'Rechazado', variant: 'destructive' },
    cancelado: { label: 'Cancelado', variant: 'outline' },
    en_curso: { label: 'En Curso', variant: 'default' },
  };
  const { label, variant } = config[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={variant}>{label}</Badge>;
}
