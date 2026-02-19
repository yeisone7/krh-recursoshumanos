import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
      new Date(request.start_date),
      new Date(request.end_date),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            Detalle de Vacaciones
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="interruption">Interrupción</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            {/* Header with badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={STATUS_COLORS[request.status]}>
                {STATUS_LABELS[request.status]}
              </Badge>
              <Badge className={REQUEST_TYPE_COLORS[request.request_type]}>
                {REQUEST_TYPE_LABELS[request.request_type]}
              </Badge>
            </div>

            {/* Employee Info */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Empleado</h3>
              </div>
              <p className="text-lg font-medium">{employeeName}</p>
              {request.employee && (
                <p className="text-sm text-muted-foreground">
                  Doc: {request.employee.document_number}
                </p>
              )}
            </div>

            {/* Dates and Days */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fecha inicio</span>
                </div>
                <p className="font-medium">
                  {format(new Date(request.start_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Fecha fin</span>
                </div>
                <p className="font-medium">
                  {format(new Date(request.end_date), "dd 'de' MMMM, yyyy", { locale: es })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-sm text-muted-foreground">Días hábiles</p>
                <p className="text-2xl font-bold text-primary">{request.business_days}</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Días calendario</p>
                <p className="text-2xl font-bold">{request.calendar_days ?? '-'}</p>
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
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
                <div className="flex items-center gap-2 mb-2">
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
          <TabsContent value="interruption" className="space-y-4">
            {request.status === 'interrumpido' ? (
              <>
                <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-600">Vacaciones Interrumpidas</span>
                  </div>
                  <p className="text-sm">
                    Fecha: {request.interruption_date && format(new Date(request.interruption_date), 'dd/MM/yyyy', { locale: es })}
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
                    
                    <div className="grid grid-cols-2 gap-4">
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
                      {format(new Date(request.resume_start_date), 'dd/MM/yyyy', { locale: es })} - {' '}
                      {request.resume_end_date && format(new Date(request.resume_end_date), 'dd/MM/yyyy', { locale: es })}
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
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-sm">
                      Días restantes a reprogramar: {' '}
                      <span className="font-bold text-primary">
                        {calculateRemainingDays(
                          new Date(request.start_date),
                          new Date(request.end_date),
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
          <TabsContent value="actions" className="space-y-4">
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
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="text-muted-foreground">
                Creado: {format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
              <p className="text-muted-foreground">
                Actualizado: {format(new Date(request.updated_at), "dd/MM/yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
