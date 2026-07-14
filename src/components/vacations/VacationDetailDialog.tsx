import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';
import { 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Pause,
  Play
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  useVacationRequest,
  useApproveVacation,
  useUpdateVacationRequest,
  useInterruptVacation,
  useResumeVacation,
} from '@/hooks/useVacations';
import {
  VacationRequest,
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_COLORS,
  calculateBusinessDays,
  calculateRemainingDays,
} from '@/types/vacation';

interface VacationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string | null;
}

export function VacationDetailDialog({ open, onOpenChange, requestId }: VacationDetailDialogProps) {
  const [interruptionDate, setInterruptionDate] = useState<Date | undefined>();
  const [interruptionReason, setInterruptionReason] = useState('');
  const [resumeStartDate, setResumeStartDate] = useState<Date | undefined>();
  const [resumeEndDate, setResumeEndDate] = useState<Date | undefined>();
  
  const { data: request, isLoading } = useVacationRequest(requestId ?? undefined);
  const approveVacation = useApproveVacation();
  const updateRequest = useUpdateVacationRequest();
  const interruptVacation = useInterruptVacation();
  const resumeVacation = useResumeVacation();

  if (!requestId || isLoading || !request) {
    return null;
  }

  const handleApprove = async () => {
    await approveVacation.mutateAsync({
      requestId: request.id,
      balanceId: request.balance_id ?? undefined,
      businessDays: request.business_days,
      requestType: request.request_type,
      employeeId: request.employee_id,
      startDate: request.start_date,
      endDate: request.end_date,
    });
    onOpenChange(false);
  };

  const handleCancel = async () => {
    await updateRequest.mutateAsync({
      id: request.id,
      status: 'cancelado',
    });
    onOpenChange(false);
  };

  const handleStartVacation = async () => {
    await updateRequest.mutateAsync({
      id: request.id,
      status: 'en_curso',
    });
    onOpenChange(false);
  };

  const handleCompleteVacation = async () => {
    await updateRequest.mutateAsync({
      id: request.id,
      status: 'completado',
    });
    onOpenChange(false);
  };

  const handleInterrupt = async () => {
    if (!interruptionDate || !interruptionReason) return;
    
    const remaining = calculateRemainingDays(
      parseDateOnlyOr(request.start_date, new Date()),
      parseDateOnlyOr(request.end_date, new Date()),
      interruptionDate
    );

    await interruptVacation.mutateAsync({
      requestId: request.id,
      interruptionDate: format(interruptionDate, 'yyyy-MM-dd'),
      interruptionReason,
      remainingDays: remaining,
    });
  };

  const handleResume = async () => {
    if (!resumeStartDate || !resumeEndDate) return;

    await resumeVacation.mutateAsync({
      requestId: request.id,
      resumeStartDate: format(resumeStartDate, 'yyyy-MM-dd'),
      resumeEndDate: format(resumeEndDate, 'yyyy-MM-dd'),
    });
  };

  const employeeName = request.employee 
    ? `${request.employee.first_name} ${request.employee.last_name}`
    : 'Empleado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0 border-b border-border/70 bg-slate-50/70 px-5 py-4 pr-12 dark:bg-slate-900/70 sm:px-6 sm:py-5 sm:pr-14">
          <DialogTitle className="flex items-center gap-3 text-left text-lg font-semibold tracking-tight sm:text-xl">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calendar className="h-[18px] w-[18px]" />
            </span>
            Detalle de vacaciones
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex min-h-0 w-full flex-1 flex-col">
          <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border-0 bg-slate-100 p-1 dark:bg-slate-900">
              <TabsTrigger
                className="rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wide data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white sm:text-xs"
                value="general"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wide data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white sm:text-xs"
                value="interruption"
              >
                Interrupción
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wide data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white sm:text-xs"
                value="actions"
              >
                Acciones
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
            {/* General Tab */}
            <TabsContent value="general" className="mt-0 space-y-4">
            {/* Employee and request state */}
            <section className="rounded-xl border border-border/70 bg-slate-50/60 p-4 dark:bg-slate-900/50 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground ring-1 ring-border/70">
                    <User className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Empleado</p>
                    <h3 className="mt-1 truncate text-lg font-semibold text-foreground">{employeeName}</h3>
                    {request.employee && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Documento {request.employee.document_number}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[45%] sm:justify-end">
                  <Badge
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide',
                      STATUS_COLORS[request.status]
                    )}
                  >
                    {STATUS_LABELS[request.status]}
                  </Badge>
                  <Badge
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide',
                      REQUEST_TYPE_COLORS[request.request_type]
                    )}
                  >
                    {REQUEST_TYPE_LABELS[request.request_type]}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Fecha de inicio</span>
                </div>
                <p className="font-semibold tabular-nums text-foreground">
                  {formatDateOnly(request.start_date, "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Fecha de finalización</span>
                </div>
                <p className="font-semibold tabular-nums text-foreground">
                  {formatDateOnly(request.end_date, "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>

            {/* Duration summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-xs font-medium text-muted-foreground">Días hábiles</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{request.business_days}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                <p className="text-xs font-medium text-muted-foreground">Días calendario</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{request.calendar_days ?? '-'}</p>
              </div>
            </div>

            {/* Compensation Amount */}
            {request.request_type === 'compensacion' && request.compensation_amount && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Monto compensación</p>
                <p className="text-xl font-bold">
                  ${request.compensation_amount.toLocaleString('es-CO')} COP
                </p>
              </div>
            )}

            {/* Notes */}
            {request.notes && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Observaciones</span>
                </div>
                <p className="text-sm">{request.notes}</p>
              </div>
            )}

            {/* Approval Info */}
            {request.approved_at && (
              <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
                <div className="mb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Aprobado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(request.approved_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Interruption Tab */}
          <TabsContent value="interruption" className="mt-0 space-y-4">
            {request.status === 'interrumpido' ? (
              <>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Vacaciones Interrumpidas</span>
                  </div>
                  <p className="text-sm">
                    Fecha: {request.interruption_date && formatDateOnly(request.interruption_date, 'dd/MM/yyyy', { locale: es })}
                  </p>
                  <p className="text-sm mt-1">Motivo: {request.interruption_reason}</p>
                  <p className="text-sm mt-2 font-medium">
                    Días pendientes: <span className="text-primary">{request.remaining_days}</span>
                  </p>
                </div>

                {/* Resume Section */}
                {request.remaining_days > 0 && !request.resume_start_date && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Reprogramar días pendientes
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nueva fecha inicio</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full justify-start', !resumeStartDate && 'text-muted-foreground')}>
                              {resumeStartDate ? format(resumeStartDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={resumeStartDate}
                              onSelect={setResumeStartDate}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Nueva fecha fin</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn('w-full justify-start', !resumeEndDate && 'text-muted-foreground')}>
                              {resumeEndDate ? format(resumeEndDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={resumeEndDate}
                              onSelect={setResumeEndDate}
                              disabled={(date) => resumeStartDate ? date < resumeStartDate : false}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button 
                      onClick={handleResume}
                      disabled={!resumeStartDate || !resumeEndDate || resumeVacation.isPending}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Reprogramar vacaciones
                    </Button>
                  </div>
                )}

                {/* Already resumed */}
                {request.resume_start_date && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Vacaciones Reprogramadas</span>
                    </div>
                    <p className="text-sm">
                      {formatDateOnly(request.resume_start_date, 'dd/MM/yyyy', { locale: es })} - {' '}
                      {request.resume_end_date && formatDateOnly(request.resume_end_date, 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                )}
              </>
            ) : request.status === 'en_curso' ? (
              <div className="space-y-4 border rounded-lg p-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Pause className="h-4 w-4" />
                  Registrar Interrupción
                </h4>
                <p className="text-sm text-muted-foreground">
                  Use esta opción si las vacaciones fueron interrumpidas por incapacidad médica u otra razón válida.
                </p>

                <div className="space-y-2">
                  <Label>Fecha de interrupción</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start', !interruptionDate && 'text-muted-foreground')}>
                        {interruptionDate ? format(interruptionDate, 'dd/MM/yyyy', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={interruptionDate}
                        onSelect={setInterruptionDate}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Motivo de interrupción</Label>
                  <Textarea
                    placeholder="Ej: Incapacidad médica por..."
                    value={interruptionReason}
                    onChange={(e) => setInterruptionReason(e.target.value)}
                  />
                </div>

                {interruptionDate && (
                  <div className="rounded-lg bg-background p-3">
                    <p className="text-sm">
                      Días restantes a reprogramar: {' '}
                      <span className="font-bold text-primary">
                        {calculateRemainingDays(
                          parseDateOnlyOr(request.start_date, new Date()),
                          parseDateOnlyOr(request.end_date, new Date()),
                          interruptionDate
                        )}
                      </span>
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleInterrupt}
                  disabled={!interruptionDate || !interruptionReason || interruptVacation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Registrar interrupción
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Pause className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>La interrupción solo está disponible para vacaciones en curso.</p>
              </div>
            )}
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="mt-0 space-y-4">
            <div className="space-y-3">
              {/* Approve */}
              {request.status === 'borrador' && (
                <Button 
                  onClick={handleApprove}
                  disabled={approveVacation.isPending}
                  className="w-full"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprobar solicitud
                </Button>
              )}

              {/* Start */}
              {request.status === 'aprobado' && request.request_type === 'disfrute' && (
                <Button 
                  onClick={handleStartVacation}
                  disabled={updateRequest.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Marcar como iniciada
                </Button>
              )}

              {/* Complete */}
              {request.status === 'en_curso' && (
                <Button 
                  onClick={handleCompleteVacation}
                  disabled={updateRequest.isPending}
                  className="w-full"
                  variant="secondary"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como completada
                </Button>
              )}

              {/* Cancel */}
              {['borrador', 'aprobado'].includes(request.status) && (
                <Button 
                  onClick={handleCancel}
                  disabled={updateRequest.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar solicitud
                </Button>
              )}
            </div>

            {/* Audit info */}
            <div className="rounded-lg bg-background p-4 text-sm">
              <p className="text-muted-foreground">
                Creado: {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
              <p className="text-muted-foreground">
                Actualizado: {format(new Date(request.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
