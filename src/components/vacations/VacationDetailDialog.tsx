import { useEffect, useState } from 'react';
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
  Play,
  BriefcaseBusiness,
  UsersRound,
  WalletCards,
  Info,
  ShieldCheck,
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
  useManagerVacationDecision,
  useAreaLeaderVacationDecision,
  useTalentLeaderVacationVisa,
  useUpdateVacationRequest,
  useInterruptVacation,
  useResumeVacation,
} from '@/hooks/useVacations';
import { useAuth } from '@/contexts/AuthContext';
import { VacationApprovalTimeline } from './VacationApprovalTimeline';
import {
  VacationRequest,
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_COLORS,
  calculateBusinessDays,
  calculateRemainingDays,
  APPROVAL_STAGE_COLORS,
  APPROVAL_STAGE_LABELS,
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
  const [payrollRecordedDays, setPayrollRecordedDays] = useState(0);
  const [leaderObservations, setLeaderObservations] = useState('');
  const [talentVisaObservations, setTalentVisaObservations] = useState('');
  
  const { data: request, isLoading } = useVacationRequest(requestId ?? undefined);
  const managerDecision = useManagerVacationDecision();
  const areaLeaderDecision = useAreaLeaderVacationDecision();
  const talentLeaderVisa = useTalentLeaderVacationVisa();
  const updateRequest = useUpdateVacationRequest();
  const interruptVacation = useInterruptVacation();
  const resumeVacation = useResumeVacation();
  const { hasPermission, isAdmin, isRRHH, isSuperAdmin } = useAuth();

  const canApproveAsManager = isAdmin || isRRHH || isSuperAdmin || hasPermission('vac_approve_manager', 'approve');
  const canApproveAsAreaLeader = isAdmin || isRRHH || isSuperAdmin || hasPermission('vac_approve_area_leader', 'approve');
  const canVisaAsTalentLeader = isAdmin || isRRHH || isSuperAdmin || hasPermission('vac_visa_talent_leader', 'approve');

  useEffect(() => {
    if (!request) return;
    setPayrollRecordedDays(Number(request.payroll_recorded_days ?? request.total_requested_days ?? 0));
    setLeaderObservations(request.area_leader_observations ?? '');
    setTalentVisaObservations(request.talent_leader_visa_observations ?? '');
  }, [request]);

  if (!requestId || isLoading || !request) {
    return null;
  }

  const decideAsManager = async (approved: boolean) => {
    await managerDecision.mutateAsync({
      requestId: request.id,
      approved,
      replacementRequiresHiring: request.replacement_requires_hiring,
      replacementEmployeeId: request.replacement_employee_id || undefined,
      pendingActivities: request.pending_activities || undefined,
      returnToWorkDate: request.return_to_work_date || undefined,
      observations: request.manager_observations || undefined,
    });
  };

  const decideAsAreaLeader = async (approved: boolean) => {
    await areaLeaderDecision.mutateAsync({
      requestId: request.id,
      approved,
      payrollRecordedDays,
      observations: leaderObservations,
    });
  };

  const visaAsTalentLeader = async () => {
    await talentLeaderVisa.mutateAsync({
      requestId: request.id,
      observations: talentVisaObservations,
    });
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
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[92dvh]">
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
            <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-xl border-0 bg-slate-100 p-1 dark:bg-slate-900">
              <TabsTrigger
                className="rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wide data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white sm:text-xs"
                value="general"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                className="rounded-lg px-2 py-2.5 text-[11px] font-semibold tracking-wide data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=active]:hover:text-white sm:text-xs"
                value="approval"
              >
                Aprobación
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
                  <Badge className={cn('rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide', APPROVAL_STAGE_COLORS[request.approval_stage])}>
                    {APPROVAL_STAGE_LABELS[request.approval_stage]}
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-xs font-medium text-muted-foreground">Días a disfrutar</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{request.enjoyment_days}</p>
              </div>
              <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800/60">
                <p className="text-xs font-medium text-muted-foreground">Días compensados</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{request.compensated_days}</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-950/30">
                <p className="text-xs font-medium text-muted-foreground">Total solicitado</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-sky-700 dark:text-sky-300">{request.total_requested_days}</p>
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

            <div className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
              <p>Nota: El reintegro anticipado a sus labores deberá ser informado a Talento Humano con las justificaciones correspondientes. De lo contrario, se descontarán los días de su acumulado de vacaciones y no será sujeto a reclamaciones.</p>
            </div>
          </TabsContent>

          <TabsContent value="approval" className="mt-0 space-y-5">
            <VacationApprovalTimeline request={request} />

            <section className="overflow-hidden rounded-2xl border border-border/70">
              <div className="flex items-center gap-3 border-b border-border/60 bg-amber-50/70 px-4 py-4 dark:bg-amber-950/20 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"><BriefcaseBusiness className="h-4 w-4" /></span>
                <div><h3 className="font-bold">Información registrada en la solicitud</h3><p className="text-xs text-muted-foreground">Reemplazo, pendientes y fecha de reingreso.</p></div>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <Label>Reemplazo requiere nueva contratación</Label>
                  <Badge variant="outline">{request.replacement_requires_hiring ? 'Sí' : 'No'}</Badge>
                </div>

                {!request.replacement_requires_hiring && (
                  <div className="space-y-2">
                    <Label>Nombre o documento del reemplazo</Label>
                    <Input disabled value={request.replacement_employee ? `${request.replacement_employee.first_name} ${request.replacement_employee.last_name} · ${request.replacement_employee.document_number}` : 'Sin registrar'} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Actividades pendientes a tener en cuenta</Label>
                  <Textarea rows={4} value={request.pending_activities || 'No aplica'} disabled className="resize-none rounded-xl" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Fecha de reingreso a labores</Label><Input disabled value={request.return_to_work_date ? formatDateOnly(request.return_to_work_date, 'dd/MM/yyyy', { locale: es }) : 'Sin registrar'} /></div>
                  <div className="space-y-2"><Label>Quien reporta</Label><Input disabled value={request.report_submitter_name || 'Sin registrar'} /></div>
                </div>

                <div className="space-y-2"><Label>Observaciones del reporte</Label><Textarea rows={2} value={request.manager_observations || 'Sin observaciones'} disabled className="resize-none" /></div>
                {request.manager_approved_at && <p className="text-xs text-muted-foreground">Decisión registrada por {request.manager_approver_name || 'el jefe inmediato'} el {format(new Date(request.manager_approved_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}.</p>}

                {request.approval_stage === 'pending_manager' && canApproveAsManager && (
                  <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                    <Button variant="destructive" onClick={() => decideAsManager(false)} disabled={managerDecision.isPending}><XCircle className="mr-2 h-4 w-4" />Devolver solicitud</Button>
                    <Button onClick={() => decideAsManager(true)} disabled={managerDecision.isPending}><CheckCircle2 className="mr-2 h-4 w-4" />Aprobar y enviar al líder de área</Button>
                  </div>
                )}
              </div>
            </section>

            <section className={cn('overflow-hidden rounded-2xl border border-border/70', request.approval_stage === 'pending_manager' && 'opacity-60')}>
              <div className="flex items-center gap-3 border-b border-border/60 bg-sky-50/70 px-4 py-4 dark:bg-sky-950/20 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200"><UsersRound className="h-4 w-4" /></span>
                <div><h3 className="font-bold">Aprobación del líder de área</h3><p className="text-xs text-muted-foreground">Se habilita después de la aprobación del jefe inmediato.</p></div>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Fecha de inicio de contrato</Label><Input disabled value={request.contract_start_date ? formatDateOnly(request.contract_start_date, 'dd/MM/yyyy', { locale: es }) : 'Sin información'} /></div>
                  <div className="space-y-2"><Label>Fechas a disfrutar</Label><Input disabled value={`${formatDateOnly(request.start_date, 'dd/MM/yyyy', { locale: es })} — ${formatDateOnly(request.end_date, 'dd/MM/yyyy', { locale: es })}`} /></div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Días acumulados a la solicitud</p><p className="mt-1 text-xl font-bold text-primary">{request.accrued_days_at_request}</p></div>
                  <div className="space-y-2 rounded-xl border p-4"><Label>Días grabados nómina</Label><Input type="number" min="0" step="0.5" value={payrollRecordedDays} onChange={(event) => setPayrollRecordedDays(Number(event.target.value))} disabled={request.approval_stage !== 'pending_area_leader' || !canApproveAsAreaLeader} /></div>
                  <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-900"><p className="text-xs text-muted-foreground">Días pendientes por disfrutar</p><p className="mt-1 text-xl font-bold">{request.pending_days_to_enjoy}</p></div>
                </div>

                <div className="space-y-2"><Label>Quien realiza la aprobación final</Label><Input disabled value={request.area_leader_approver_name || 'Se registrará el líder conectado'} /></div>
                <div className="space-y-2"><Label>Observaciones de la decisión</Label><Textarea rows={2} value={leaderObservations} onChange={(event) => setLeaderObservations(event.target.value)} disabled={request.approval_stage !== 'pending_area_leader' || !canApproveAsAreaLeader} className="resize-none" /></div>
                {request.area_leader_approved_at && <p className="text-xs text-muted-foreground">Decisión registrada el {format(new Date(request.area_leader_approved_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}.</p>}

                {request.approval_stage === 'pending_area_leader' && canApproveAsAreaLeader && (
                  <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                    <Button variant="destructive" onClick={() => decideAsAreaLeader(false)} disabled={areaLeaderDecision.isPending}><XCircle className="mr-2 h-4 w-4" />No aprobar</Button>
                    <Button onClick={() => decideAsAreaLeader(true)} disabled={areaLeaderDecision.isPending || payrollRecordedDays < 0}><WalletCards className="mr-2 h-4 w-4" />Aprobar solicitud</Button>
                  </div>
                )}
              </div>
            </section>

            <section className={cn(
              'overflow-hidden rounded-2xl border border-border/70',
              request.area_leader_approved !== true && 'opacity-60',
            )}>
              <div className="flex items-center gap-3 border-b border-border/60 bg-violet-50/70 px-4 py-4 dark:bg-violet-950/20 sm:px-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200"><ShieldCheck className="h-4 w-4" /></span>
                <div><h3 className="font-bold">Visado de Talento Humano</h3><p className="text-xs text-muted-foreground">Constancia posterior; no modifica la aprobación ni vuelve a afectar los saldos.</p></div>
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="space-y-2"><Label>Quien visa</Label><Input disabled value={request.talent_leader_visa_name || 'Se registrará el líder de Talento Humano conectado'} /></div>
                <div className="space-y-2">
                  <Label>Observaciones del visado</Label>
                  <Textarea
                    rows={2}
                    value={talentVisaObservations}
                    onChange={(event) => setTalentVisaObservations(event.target.value)}
                    disabled={request.area_leader_approved !== true || !!request.talent_leader_visa_at || !canVisaAsTalentLeader}
                    className="resize-none"
                  />
                </div>
                {request.talent_leader_visa_at && <p className="text-xs text-muted-foreground">Visado registrado el {format(new Date(request.talent_leader_visa_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}.</p>}

                {request.area_leader_approved === true && !request.talent_leader_visa_at && canVisaAsTalentLeader && (
                  <div className="flex border-t pt-4 sm:justify-end">
                    <Button onClick={visaAsTalentLeader} disabled={talentLeaderVisa.isPending}>
                      <ShieldCheck className="mr-2 h-4 w-4" />Registrar visado
                    </Button>
                  </div>
                )}
              </div>
            </section>
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
              {request.status === 'aprobado' && (
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
