import { useRef, useState } from 'react';
import { differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';
import { 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  Stethoscope,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  File,
  History,
  LockKeyhole,
  ChevronDown,
  IdCard,
  Briefcase,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useIncapacity, useDeleteIncapacity, useCreateReintegrationExam } from '@/hooks/useIncapacities';
import { formatRecoveryCurrency, getExpectedIncapacityRecovery, getRecoveryPayments } from '@/lib/incapacityRecovery';
import { 
  getIncapacityOriginLabel,
  calculateIncapacityEmployerCost,
  calculatePaymentDistribution,
  getAccumulatedDays,
  isWorkRelatedIncapacityOrigin,
  recoveryStatusLabels, 
  recoveryStatusColors,
  getCurrentLegalStage,
  getFollowUpDocumentAvailability,
  getIncapacityRootId,
  getLegalMilestones,
  getLegalMinimumDailyWage,
  getLegalMinimumMonthlyWage,
  getTotalChainDays,
  type IncapacityFollowUpDocumentType,
} from '@/types/incapacity';
import { usePilaUgppSettings } from '@/hooks/usePilaUgpp';
import { IncapacityFormDialog } from './IncapacityFormDialog';
import { RecoveryFormDialog } from './RecoveryFormDialog';
import { DocumentIndicator, DocumentSection } from '@/components/documents/DocumentSection';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';
import { useCurrentDocument } from '@/hooks/useDocuments';
import { cn } from '@/lib/utils';
import { IncapacityDialogSizeToggle } from './IncapacityDialogSizeToggle';
import { IncapacityDialogHeader } from './IncapacityDialogHeader';
import { IncapacityLegalFollowUpFields } from './IncapacityLegalFollowUpFields';

const detailTabs = [
  { value: 'general', label: 'General', icon: FileText },
  { value: 'payment', label: 'Pagos', icon: DollarSign },
  { value: 'recovery', label: 'Recobro', icon: CheckCircle2 },
  { value: 'documents', label: 'Documentos', icon: File },
  { value: 'history', label: 'Historial', icon: Clock },
  { value: 'audit', label: 'Trazabilidad', icon: History },
];

interface IncapacityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacityId: string | null;
}

interface MilestoneDocumentAttachmentProps {
  entityType: IncapacityFollowUpDocumentType;
  entityId: string;
  title: string;
  thresholdDays: number;
  allowUpload: boolean;
  isLoadingEntity: boolean;
}

function MilestoneDocumentAttachment({
  entityType,
  entityId,
  title,
  thresholdDays,
  allowUpload,
  isLoadingEntity,
}: MilestoneDocumentAttachmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: currentDocument, isLoading: isLoadingDocument } = useCurrentDocument(entityType, entityId);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mt-3 border-t border-border/60 pt-2"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <File className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {isLoadingDocument
              ? 'Consultando documentos...'
              : currentDocument
                ? currentDocument.file_name
                : allowUpload
                  ? 'Sin documento adjunto'
                  : `Disponible desde el día ${thresholdDays}`}
          </span>
        </div>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between px-2 text-xs text-primary hover:text-primary sm:w-auto sm:justify-center"
            disabled={isLoadingEntity}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Documentos
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="pt-3">
        {!allowUpload && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>La carga se habilita al alcanzar {thresholdDays} días acumulados.</p>
          </div>
        )}
        <DocumentSection
          entityType={entityType}
          entityId={entityId}
          title={`Soportes de ${title}`}
          allowUpload={allowUpload}
          allowDelete
          showVersionHistory
          compact
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function IncapacityDetailDialog({
  open,
  onOpenChange,
  incapacityId,
}: IncapacityDetailDialogProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editInitialTab, setEditInitialTab] = useState<'general' | 'payment'>('general');
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedExtensionId, setSelectedExtensionId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const tabBody = useRef<HTMLDivElement>(null);
  const recoveryTrigger = useRef<HTMLButtonElement>(null);
  
  const { data: incapacity, isLoading } = useIncapacity(incapacityId || undefined);
  const { data: pilaSettings } = usePilaUgppSettings();
  const chainRootId = incapacity ? getIncapacityRootId(incapacity) : undefined;
  const { data: chainRoot, isLoading: isLoadingChainRoot } = useIncapacity(chainRootId);
  const deleteMutation = useDeleteIncapacity();
  const createReintegrationExamMutation = useCreateReintegrationExam();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIsMaximized(false);
    onOpenChange(nextOpen);
  };
  
  if (!incapacityId) return null;
  
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(incapacityId);
      toast.success('Incapacidad eliminada');
      handleOpenChange(false);
    } catch (error) {
      console.error('Error deleting incapacity:', error);
      toast.error('No se pudo eliminar la incapacidad', {
        description: 'Revisa si tiene registros relacionados o intenta nuevamente.',
      });
    }
  };

  const openEditDialog = (
    targetId: string,
    initialTab: 'general' | 'payment' = 'general',
  ) => {
    setEditTargetId(targetId);
    setEditInitialTab(initialTab);
    setShowEditDialog(true);
  };
  
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };
  
  if (isLoading || !incapacity) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Cargando incapacidad</DialogTitle>
            <DialogDescription>Estamos consultando el detalle de la incapacidad seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const employeeName = incapacity.employee 
    ? `${incapacity.employee.first_name} ${incapacity.employee.last_name}`
    : 'Empleado';
  
  const chainRootIncapacity = chainRoot || incapacity;
  const recoveryPayments = getRecoveryPayments(incapacity);
  const expectedRecoveryAmount = (() => {
    if (incapacity.recovery_status !== 'asumido_empresa') {
      return getExpectedIncapacityRecovery(incapacity);
    }
    const distribution = calculatePaymentDistribution(
      chainRootIncapacity.origin,
      incapacity.total_days,
      chainRootIncapacity.daily_base_salary || 0,
      incapacity.is_extension ? getAccumulatedDays(incapacity, [chainRootIncapacity, ...(chainRootIncapacity.extensions || [])]) : 0,
      getLegalMinimumMonthlyWage(incapacity.start_date),
    );
    return getExpectedIncapacityRecovery({ eps_amount: distribution.epsAmount, arl_amount: distribution.arlAmount });
  })();
  const totalChainDays = getTotalChainDays(chainRootIncapacity);
  const legalStage = getCurrentLegalStage(chainRootIncapacity.origin, totalChainDays);
  const legalMilestones = getLegalMilestones(chainRootIncapacity.origin, totalChainDays);
  const followUpDocuments = getFollowUpDocumentAvailability(chainRootIncapacity.origin, totalChainDays);
  const followUpDocumentEntityId = chainRootId || incapacity.id;
  const today = new Date();
  const endDate = parseDateOnlyOr(incapacity.end_date, new Date());
  const isActive = endDate >= today && parseDateOnlyOr(incapacity.start_date, new Date()) <= today;
  const daysRemaining = differenceInDays(endDate, today);
  const minimumDailyWage = getLegalMinimumDailyWage(incapacity.start_date);
  const currentSocialSecurity = incapacity.employee?.employee_social_security
    ?.find((record) => record.is_current)
    || incapacity.employee?.employee_social_security?.[0];
  const currentWorkInfo = incapacity.employee?.employee_work_info
    ?.find((record) => record.is_current)
    || incapacity.employee?.employee_work_info?.[0];
  const employerCost = calculateIncapacityEmployerCost(
    incapacity.total_amount,
    currentSocialSecurity?.risk_level,
    pilaSettings,
  );
  const formatPercentage = (rate: number) => new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: rate * 100 % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rate);
  const period = [incapacity.start_date, incapacity.end_date]
    .map((date) => formatDateOnly(date, 'd MMM yyyy', { locale: es }))
    .join(' – ');
  
  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'incapacity-dialog flex flex-col overflow-hidden bg-card',
            isMaximized
              ? 'incapacity-dialog-maximized h-dvh max-h-dvh w-screen max-w-none sm:w-screen'
              : 'h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]',
          )}
        >
          <IncapacityDialogHeader
            title={`${incapacity.is_extension ? `Prórroga #${incapacity.extension_number}` : 'Incapacidad'} · ${employeeName}`}
            description={period}
            actions={<IncapacityDialogSizeToggle isMaximized={isMaximized} onToggle={() => setIsMaximized((current) => !current)} />}
          />

          <Tabs
            defaultValue="general"
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            onValueChange={() => {
              if (tabBody.current) tabBody.current.scrollTop = 0;
            }}
          >
              <TabsList aria-label="Secciones del detalle" className="incapacity-dialog-tabs grid grid-cols-3 sm:grid-cols-6">
                {detailTabs.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="incapacity-dialog-tab">
                    <Icon className="hidden size-4 shrink-0 md:block" aria-hidden="true" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div ref={tabBody} className="incapacity-dialog-body">
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
                  {[
                    { label: 'Documento', value: incapacity.employee?.document_number, icon: IdCard },
                    { label: 'Cargo', value: currentWorkInfo?.position_name, icon: Briefcase },
                    { label: 'Centro de operación', value: currentWorkInfo?.operation_centers?.name, icon: Building2 },
                  ].map(({ label, value, icon: Icon }) => (
                    <span key={label} className="flex min-w-0 items-start gap-1.5">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span className="break-words">{label} <span className="font-medium text-foreground">{value || 'Sin registrar'}</span></span>
                    </span>
                  ))}
                  <Badge variant={isWorkRelatedIncapacityOrigin(incapacity.origin) ? 'destructive' : 'secondary'}>
                    {getIncapacityOriginLabel(incapacity.origin)}
                  </Badge>
                  {isActive && <Badge className="border-success/20 bg-success/10 text-success">Activa</Badge>}
                </div>

              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <dl aria-label="Resumen de la incapacidad" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
                  {[
                    { label: 'Días de incapacidad', value: incapacity.total_days },
                    { label: 'Días de la cadena', value: totalChainDays },
                    {
                      label: daysRemaining < 0 ? 'Estado' : 'Días restantes',
                      value: daysRemaining < 0 ? 'Finalizada' : daysRemaining,
                      tone: daysRemaining < 0 ? 'text-muted-foreground' : daysRemaining <= 3 ? 'text-destructive' : '',
                    },
                    { label: 'Valor total', value: formatCurrency(incapacity.total_amount), tone: 'text-primary' },
                  ].map(({ label, value, tone }) => (
                    <div key={label} className="min-w-0 bg-card px-3 py-2.5 sm:px-4 sm:py-3">
                      <dt className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</dt>
                      <dd className={cn('mt-0.5 break-words text-lg font-semibold tabular-nums sm:text-2xl', tone)}>{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-3">
                    <Card>
                      <CardHeader className="px-4 pb-3 pt-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Información clínica
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 pb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Diagnóstico</p>
                          <p className="break-words text-base font-semibold">{incapacity.diagnosis}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-3 break-words sm:grid-cols-2">
                          {incapacity.cie10_code && (
                            <div>
                              <p className="text-sm text-muted-foreground">Código CIE-10</p>
                              <p className="font-medium">{incapacity.cie10_code}</p>
                            </div>
                          )}
                          {incapacity.certificate_number && (
                            <div>
                              <p className="text-sm text-muted-foreground">No. Certificado</p>
                              <p className="font-medium">{incapacity.certificate_number}</p>
                            </div>
                          )}
                          {incapacity.treating_doctor && (
                            <div>
                              <p className="text-sm text-muted-foreground">Médico Tratante</p>
                              <p className="font-medium">{incapacity.treating_doctor}</p>
                            </div>
                          )}
                          {incapacity.medical_entity && (
                            <div>
                              <p className="text-sm text-muted-foreground">Entidad Médica</p>
                              <p className="font-medium">{incapacity.medical_entity}</p>
                            </div>
                          )}
                        </div>

                        {incapacity.observations && (
                          <div>
                            <p className="text-sm text-muted-foreground">Observaciones</p>
                            <p className="whitespace-pre-wrap break-words text-sm">{incapacity.observations}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {incapacity.requires_reintegration_exam && (
                      <Card className="border-warning">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2 text-warning">
                            <AlertTriangle className="h-4 w-4" />
                            Examen de Reintegro Requerido
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Esta incapacidad supera los 30 días. Se requiere examen médico de reintegro antes de que el empleado retorne a sus labores.
                          </p>
                          <div className="flex items-center gap-2">
                            {incapacity.reintegration_exam_id ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Examen Creado
                              </Badge>
                            ) : (
                              <>
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Pendiente
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    try {
                                      await createReintegrationExamMutation.mutateAsync({ incapacity });
                                      toast.success('Examen de reintegro creado exitosamente');
                                    } catch (error) {
                                      toast.error('Error al crear el examen de reintegro');
                                    }
                                  }}
                                  disabled={createReintegrationExamMutation.isPending}
                                >
                                  {createReintegrationExamMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 mr-1" />
                                  )}
                                  Crear Examen
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="gap-1 p-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-primary" />
                        Seguimiento legal Colombia
                      </CardTitle>
                      <CardDescription>
                        Etapa actual: {legalStage.label} - Responsable: {legalStage.responsible}
                      </CardDescription>
                    </CardHeader>
                    {legalMilestones.length > 0 && (
                      <CardContent className="space-y-3 px-4 pb-4">
                        {legalMilestones.map((milestone) => (
                          <div
                            key={milestone.key}
                            className={`rounded-lg border p-3 ${
                              milestone.isReached
                                ? 'border-warning/30 bg-warning/10'
                                : milestone.daysRemaining <= 20
                                  ? 'border-amber-200 bg-amber-50'
                                  : 'border-border bg-background'
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-medium text-sm">{milestone.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                              </div>
                              <Badge variant={milestone.isReached ? 'destructive' : 'outline'} className="w-fit shrink-0">
                                {milestone.isReached ? 'Alcanzado' : `Faltan ${milestone.daysRemaining} dias`}
                              </Badge>
                            </div>
                            {!isLoadingChainRoot && chainRoot && (milestone.key === 'day_120' || milestone.key === 'day_540') && (
                              <IncapacityLegalFollowUpFields
                                incapacity={chainRoot}
                                kind={milestone.key === 'day_120' ? 'rehabilitation' : 'pcl'}
                              />
                            )}
                            <MilestoneDocumentAttachment
                              entityType={milestone.documentEntityType}
                              entityId={followUpDocumentEntityId}
                              title={milestone.title}
                              thresholdDays={milestone.day}
                              allowUpload={milestone.isReached}
                              isLoadingEntity={isLoadingChainRoot}
                            />
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                </div>
              </TabsContent>
              
              {/* Payment Tab */}
              <TabsContent value="payment" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1.5">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Distribución de Pago
                        </CardTitle>
                        <CardDescription>
                          Cálculo según Decreto 780 de 2016, Decreto 1427 de 2022 y reglas por origen.
                        </CardDescription>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full shrink-0 sm:w-auto"
                        onClick={() => openEditDialog(
                          incapacity.is_extension
                            ? incapacity.parent_incapacity_id || incapacity.id
                            : incapacity.id,
                          'payment',
                        )}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {incapacity.is_extension ? 'Editar IBC inicial' : 'Editar IBC'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Salario Base Diario (IBC)</p>
                        <p className="text-lg font-bold">{formatCurrency(incapacity.daily_base_salary)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {incapacity.is_extension
                            ? 'Este valor se hereda de la incapacidad inicial.'
                            : `Piso diario SMLMV aplicado: ${formatCurrency(minimumDailyWage)}`}
                        </p>
                      </div>
                      
                      <Separator />
                      
                      {incapacity.recovery_status === 'asumido_empresa' ? (
                        <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                          <div>
                            <p className="font-medium">Empleador</p>
                            <p className="text-sm text-muted-foreground">
                              {incapacity.total_days} día{incapacity.total_days === 1 ? '' : 's'} · valor asumido por la empresa
                            </p>
                          </div>
                          <p className="text-lg font-bold">{formatCurrency(incapacity.total_amount)}</p>
                        </div>
                      ) : isWorkRelatedIncapacityOrigin(incapacity.origin) ? (
                        <>
                          {incapacity.employer_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                              <div>
                                <p className="font-medium">Empleador</p>
                                <p className="text-sm text-muted-foreground">{incapacity.employer_days} día al 100%</p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.employer_amount)}</p>
                            </div>
                          )}
                          {incapacity.arl_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                              <div>
                                <p className="font-medium">ARL - {incapacity.arl_name || 'No registrada'}</p>
                                <p className="text-sm text-muted-foreground">{incapacity.arl_days} días al 100%</p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.arl_amount)}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {incapacity.employer_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                              <div>
                                <p className="font-medium">Empleador</p>
                                <p className="text-sm text-muted-foreground">{incapacity.employer_days} días al 66.67%</p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.employer_amount)}</p>
                            </div>
                          )}
                          
                          {incapacity.eps_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                              <div>
                                <p className="font-medium">EPS - {incapacity.eps_name || 'No registrada'}</p>
                                <p className="text-sm text-muted-foreground">
                                  {incapacity.eps_days} días {['licencia_maternidad', 'licencia_paternidad'].includes(incapacity.origin) ? 'al 100%' : 'según tramo legal aplicable'}
                                </p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.eps_amount)}</p>
                            </div>
                          )}
                          
                          {incapacity.afp_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10">
                              <div>
                                <p className="font-medium">AFP - {incapacity.afp_name || 'No registrada'}</p>
                                <p className="text-sm text-muted-foreground">{incapacity.afp_days} días al 50%</p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.afp_amount)}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      <Separator />

                      <div className="space-y-5">
                        <div>
                          <p className="font-semibold">Costo laboral estimado</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Prestaciones y aportes calculados sobre {formatCurrency(employerCost.paymentBase)}.
                          </p>
                        </div>

                        {[
                          { title: 'Prestaciones sociales', items: employerCost.benefits },
                          { title: 'Aportes patronales', items: employerCost.contributions },
                        ].map((section) => (
                          <div key={section.title} className="grid gap-3 sm:grid-cols-[minmax(140px,0.7fr)_minmax(0,1.5fr)] sm:gap-5">
                            <p className="text-sm font-medium text-muted-foreground sm:pt-2">
                              {section.title}
                            </p>
                            <div className="divide-y divide-border/70 border-y border-border/70">
                              {section.items.map((item) => (
                                <div
                                  key={item.key}
                                  className="grid grid-cols-[minmax(0,1fr)_72px_100px] items-center gap-2 py-2 text-sm"
                                >
                                  <span className="truncate font-medium">{item.label}</span>
                                  <span className="text-right tabular-nums text-muted-foreground">
                                    {formatPercentage(item.rate)}
                                  </span>
                                  <span className="text-right font-semibold tabular-nums">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Total</p>
                          <p className="text-xs text-muted-foreground">Incapacidad más costo laboral estimado</p>
                        </div>
                        <p className="text-xl font-bold tabular-nums">{formatCurrency(employerCost.totalCost)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Recovery Tab */}
              <TabsContent value="recovery" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Estado del Recobro
                        </CardTitle>
                        <CardDescription>
                          Gestión del recobro ante {isWorkRelatedIncapacityOrigin(incapacity.origin) ? 'ARL' : 'EPS'}
                        </CardDescription>
                      </div>
                      <Button ref={recoveryTrigger} size="sm" disabled={isLoadingChainRoot} onClick={() => setShowRecoveryDialog(true)} className="w-full sm:w-auto">
                        <Edit className="h-4 w-4 mr-1" />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className={recoveryStatusColors[incapacity.recovery_status]}>
                        {recoveryStatusLabels[incapacity.recovery_status]}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      {incapacity.filing_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Radicación</p>
                          <p className="font-medium">{formatDateOnly(incapacity.filing_date, 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                      {incapacity.filing_number && (
                        <div>
                          <p className="text-sm text-muted-foreground">No. Radicado</p>
                          <p className="font-medium">{incapacity.filing_number}</p>
                        </div>
                      )}
                      {incapacity.expected_payment_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Esperada de Pago</p>
                          <p className="font-medium">{formatDateOnly(incapacity.expected_payment_date, 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>
                    
                    {recoveryPayments.length > 0 && (
                      <div>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <h4 className="text-sm font-medium">Pagos recibidos</h4>
                          <p className="text-sm font-semibold tabular-nums">{formatRecoveryCurrency(incapacity.recovered_amount || 0)} en total</p>
                        </div>
                        <ul className="mt-2 divide-y rounded-lg border px-3 text-sm">
                          {[...recoveryPayments].sort((first, second) => (second.date || '').localeCompare(first.date || '')).map((payment, index) => (
                            <li key={index} className="flex justify-between gap-3 py-2">
                              <span className="text-muted-foreground">{formatDateOnly(payment.date, 'dd/MM/yyyy') || 'Sin fecha registrada'}</span>
                              <span className="font-medium tabular-nums">{formatRecoveryCurrency(payment.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {incapacity.recovery_notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notas del Recobro</p>
                        <p className="text-sm">{incapacity.recovery_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </TabsContent>
              
              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <File className="h-4 w-4" />
                      Certificado Médico
                    </CardTitle>
                    <CardDescription>
                      Documento oficial de la incapacidad emitido por la entidad médica
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentSection
                      entityType="incapacity"
                      entityId={incapacityId}
                      title="Certificado de Incapacidad"
                      allowUpload={true}
                      allowDelete={true}
                      showVersionHistory={true}
                      compact
                    />
                  </CardContent>
                </Card>
                
                {incapacity.certificate_url && (
                  <div className="flex items-center gap-2 p-3 bg-background rounded-lg">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">Documento actual: {incapacity.certificate_url.split('/').pop()}</span>
                  </div>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Historia Clínica (Opcional)
                    </CardTitle>
                    <CardDescription>
                      Documentos adicionales de soporte clínico
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DocumentSection
                      entityType="incapacity_clinical_history"
                      entityId={incapacityId}
                      title="Historia Clínica"
                      allowUpload={true}
                      allowDelete={true}
                      showVersionHistory={true}
                      compact
                    />
                  </CardContent>
                </Card>

                {followUpDocuments.map((documentAvailability) => (
                  <Card key={documentAvailability.entityType}>
                    <CardHeader>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {documentAvailability.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {documentAvailability.description}
                          </CardDescription>
                        </div>
                        <Badge variant={documentAvailability.isAvailable ? 'default' : 'secondary'}>
                          Día {documentAvailability.thresholdDays}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!documentAvailability.isAvailable && (
                        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">Carga aún no habilitada</p>
                            <p>
                              Faltan {documentAvailability.daysRemaining} día(s) acumulados para habilitar nuevas versiones.
                            </p>
                          </div>
                        </div>
                      )}
                      {isLoadingChainRoot ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Consultando expediente principal...
                        </div>
                      ) : (
                        <DocumentSection
                          entityType={documentAvailability.entityType}
                          entityId={followUpDocumentEntityId}
                          title={documentAvailability.title}
                          allowUpload={documentAvailability.isAvailable}
                          allowDelete={true}
                          showVersionHistory={true}
                          compact
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              
              {/* History Tab */}
              <TabsContent value="history" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base">Historial de Prórrogas</CardTitle>
                      {!incapacity.is_extension && (
                        <Button size="sm" onClick={() => setShowExtensionDialog(true)} className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Prórroga
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {incapacity.is_extension && (
                      <p className="text-sm text-muted-foreground mb-4">
                        Esta es una prórroga (extensión #{incapacity.extension_number})
                      </p>
                    )}
                    
                    <div className="space-y-3">
                      {/* Original incapacity */}
                      {!incapacity.is_extension && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Incapacidad Original</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateOnly(incapacity.start_date, 'dd/MM/yyyy')} - {formatDateOnly(incapacity.end_date, 'dd/MM/yyyy')} ({incapacity.total_days} días)
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Extensions */}
                      {incapacity.extensions && incapacity.extensions.length > 0 ? (
                        incapacity.extensions.map((ext, index) => (
                          <div key={ext.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold">
                              {index + 2}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">Prórroga #{ext.extension_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateOnly(ext.start_date, 'dd/MM/yyyy')} - {formatDateOnly(ext.end_date, 'dd/MM/yyyy')} ({ext.total_days} días)
                              </p>
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span>Valor: {formatCurrency(ext.total_amount)}</span>
                                <span>Recobrado: {formatCurrency(ext.recovered_amount)}</span>
                                <span>Radicado: {ext.filing_number || 'Sin radicar'}</span>
                                <DocumentIndicator entityType="incapacity" entityId={ext.id} />
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                              <Badge className={recoveryStatusColors[ext.recovery_status]}>
                                {recoveryStatusLabels[ext.recovery_status]}
                              </Badge>
                              <Button size="sm" variant="outline" onClick={() => setSelectedExtensionId(ext.id)}>
                                Gestionar
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : !incapacity.is_extension ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No hay prórrogas registradas
                        </p>
                      ) : null}
                    </div>
                    
                    {totalChainDays > incapacity.total_days && (
                      <div className="mt-4 p-3 rounded-lg bg-background ">
                        <p className="text-sm font-medium">Total acumulado: {totalChainDays} días</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit" className="mt-0 space-y-4">
                <AuditLogViewer entityType="incapacity" entityId={incapacity.id} compact />
              </TabsContent>
              </div>
          </Tabs>

          <footer className="incapacity-dialog-footer">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(true)} className="px-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:px-3">
              <Trash2 className="size-4" aria-hidden="true" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={() => openEditDialog(incapacity.id)}>
                <Edit className="size-4" aria-hidden="true" />
                Editar
              </Button>
            </div>
          </footer>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <IncapacityFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        incapacityId={editTargetId}
        initialTab={editInitialTab}
      />
      
      {/* Extension Dialog */}
      <IncapacityFormDialog
        open={showExtensionDialog}
        onOpenChange={setShowExtensionDialog}
        employeeId={incapacity?.employee_id}
        parentIncapacityId={incapacityId || undefined}
      />
      
      {/* Recovery Dialog */}
      <RecoveryFormDialog
        open={showRecoveryDialog}
        onOpenChange={setShowRecoveryDialog}
        incapacity={incapacity}
        expectedAmount={expectedRecoveryAmount}
        onRestoreFocus={() => recoveryTrigger.current?.focus()}
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incapacidad?</AlertDialogTitle>
            <AlertDialogDescription>
              {incapacity.is_extension
                ? 'Esta acción no se puede deshacer. Se eliminará únicamente esta prórroga y sus documentos.'
                : 'Esta acción no se puede deshacer. Se eliminará la incapacidad y todas sus prórrogas asociadas.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <IncapacityDetailDialog
        open={!!selectedExtensionId}
        onOpenChange={(extensionOpen) => !extensionOpen && setSelectedExtensionId(null)}
        incapacityId={selectedExtensionId}
      />
    </>
  );
}
