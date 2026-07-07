import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
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
  File
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { 
  getIncapacityOriginLabel,
  isWorkRelatedIncapacityOrigin,
  recoveryStatusLabels, 
  recoveryStatusColors,
  getCurrentLegalStage,
  getLegalMilestones,
  getTotalChainDays 
} from '@/types/incapacity';
import { IncapacityFormDialog } from './IncapacityFormDialog';
import { RecoveryFormDialog } from './RecoveryFormDialog';
import { DocumentSection } from '@/components/documents/DocumentSection';

interface IncapacityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacityId: string | null;
}

export function IncapacityDetailDialog({
  open,
  onOpenChange,
  incapacityId,
}: IncapacityDetailDialogProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showExtensionDialog, setShowExtensionDialog] = useState(false);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data: incapacity, isLoading } = useIncapacity(incapacityId || undefined);
  const deleteMutation = useDeleteIncapacity();
  const createReintegrationExamMutation = useCreateReintegrationExam();
  
  if (!incapacityId) return null;
  
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(incapacityId);
      toast.success('Incapacidad eliminada');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting incapacity:', error);
      toast.error('No se pudo eliminar la incapacidad', {
        description: 'Revisa si tiene registros relacionados o intenta nuevamente.',
      });
    }
  };
  
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  };
  
  if (isLoading || !incapacity) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
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
  
  const totalChainDays = getTotalChainDays(incapacity);
  const legalStage = getCurrentLegalStage(incapacity.origin, totalChainDays);
  const legalMilestones = getLegalMilestones(incapacity.origin, totalChainDays);
  const today = new Date();
  const endDate = parseDateOnlyOr(incapacity.end_date, new Date());
  const isActive = endDate >= today && parseDateOnlyOr(incapacity.start_date, new Date()) <= today;
  const daysRemaining = differenceInDays(endDate, today);
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col overflow-hidden p-0 bg-background border-border/50 shadow-2xl rounded-[2rem] sm:h-[90vh] sm:max-h-[90vh]">
          
          {/* Premium Gradient Header */}
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
            
            
            <DialogHeader className="relative z-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner hidden sm:flex">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1 hidden sm:inline-flex">
                      DETALLE
                    </Badge>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                      Incapacidad - {employeeName}
                    </DialogTitle>
                    <DialogDescription className="font-medium mt-1">
                      {formatDateOnly(incapacity.start_date, "d 'de' MMMM, yyyy", { locale: es })} - {format(endDate, "d 'de' MMMM, yyyy", { locale: es })}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end mt-2 sm:mt-0">
                  <Badge variant={isWorkRelatedIncapacityOrigin(incapacity.origin) ? 'destructive' : 'secondary'} className="rounded-xl px-3 py-1 text-xs uppercase tracking-wider font-bold">
                    {getIncapacityOriginLabel(incapacity.origin)}
                  </Badge>
                  {isActive && (
                    <Badge variant="default" className="bg-green-500 rounded-xl px-3 py-1 text-xs uppercase tracking-wider font-bold">
                      Activa
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>
          
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-8 sm:py-6">
            <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
              <TabsList className="mb-4 h-12 w-full shrink-0 justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-slate-100 p-1 scrollbar-hide sm:mb-6">
                <TabsTrigger value="general" className="h-10 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"><FileText className="h-4 w-4 shrink-0" />General</TabsTrigger>
                <TabsTrigger value="payment" className="h-10 min-w-[104px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"><DollarSign className="h-4 w-4 shrink-0" />Pagos</TabsTrigger>
                <TabsTrigger value="recovery" className="h-10 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"><CheckCircle2 className="h-4 w-4 shrink-0" />Recobro</TabsTrigger>
                <TabsTrigger value="documents" className="h-10 min-w-[132px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"><File className="h-4 w-4 shrink-0" />Documentos</TabsTrigger>
                <TabsTrigger value="history" className="h-10 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"><Clock className="h-4 w-4 shrink-0" />Historial</TabsTrigger>
              </TabsList>
              <ScrollArea className="-mx-4 min-h-0 flex-1 px-4 pb-4 sm:-mx-8 sm:px-8 sm:pb-6">
              
              {/* General Tab */}
              <TabsContent value="general" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                  <Card>
                    <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                      <CardDescription>Días Totales</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <p className="text-2xl font-bold">{incapacity.total_days}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                      <CardDescription>Días Cadena</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <p className="text-2xl font-bold">{totalChainDays}</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                      <CardDescription>Días Restantes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <p className={`text-2xl font-bold ${daysRemaining < 0 ? 'text-muted-foreground' : daysRemaining <= 3 ? 'text-destructive' : ''}`}>
                        {daysRemaining < 0 ? 'Finalizada' : daysRemaining}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-2">
                      <CardDescription>Valor Total</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                      <p className="break-words text-xl font-bold sm:text-2xl">{formatCurrency(incapacity.total_amount)}</p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      Seguimiento legal Colombia
                    </CardTitle>
                    <CardDescription>
                      Etapa actual: {legalStage.label} - Responsable: {legalStage.responsible}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Información Clínica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Diagnóstico</p>
                      <p className="font-medium">{incapacity.diagnosis}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
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
                        <p className="text-sm">{incapacity.observations}</p>
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
              </TabsContent>
              
              {/* Payment Tab */}
              <TabsContent value="payment" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Distribución de Pago
                    </CardTitle>
                    <CardDescription>
                      Cálculo según Decreto 780 de 2016, Decreto 1427 de 2022 y reglas por origen.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Salario Base Diario (IBC)</p>
                        <p className="text-lg font-bold">{formatCurrency(incapacity.daily_base_salary)}</p>
                      </div>
                      
                      <Separator />
                      
                      {isWorkRelatedIncapacityOrigin(incapacity.origin) ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                          <div>
                            <p className="font-medium">ARL - {incapacity.arl_name || 'No registrada'}</p>
                            <p className="text-sm text-muted-foreground">{incapacity.arl_days} días al 100%</p>
                          </div>
                          <p className="text-lg font-bold">{formatCurrency(incapacity.arl_amount)}</p>
                        </div>
                      ) : (
                        <>
                          {incapacity.employer_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                              <div>
                                <p className="font-medium">Empleador</p>
                                <p className="text-sm text-muted-foreground">{incapacity.employer_days} días al 100%</p>
                              </div>
                              <p className="text-lg font-bold">{formatCurrency(incapacity.employer_amount)}</p>
                            </div>
                          )}
                          
                          {incapacity.eps_days > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10">
                              <div>
                                <p className="font-medium">EPS - {incapacity.eps_name || 'No registrada'}</p>
                                <p className="text-sm text-muted-foreground">{incapacity.eps_days} días según tramo legal aplicable</p>
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
                      
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Total</p>
                        <p className="text-xl font-bold">{formatCurrency(incapacity.total_amount)}</p>
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
                      <Button size="sm" onClick={() => setShowRecoveryDialog(true)} className="w-full sm:w-auto">
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
                      {incapacity.actual_payment_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Real de Pago</p>
                          <p className="font-medium">{formatDateOnly(incapacity.actual_payment_date, 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                    </div>
                    
                    {incapacity.recovered_amount !== null && incapacity.recovered_amount > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Monto Recuperado</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(incapacity.recovered_amount)}</p>
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
                          <div key={ext.id} className="flex items-center gap-3 p-3 rounded-lg border">
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground text-sm font-bold">
                              {index + 2}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Prórroga #{ext.extension_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateOnly(ext.start_date, 'dd/MM/yyyy')} - {formatDateOnly(ext.end_date, 'dd/MM/yyyy')} ({ext.total_days} días)
                              </p>
                            </div>
                            <Badge className={recoveryStatusColors[ext.recovery_status]}>
                              {recoveryStatusLabels[ext.recovery_status]}
                            </Badge>
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
              </ScrollArea>
            </Tabs>
          </div>
          
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t bg-background /10 px-4 py-4 sm:flex-row sm:justify-between sm:px-8 sm:py-6">
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
                Cerrar
              </Button>
              <Button onClick={() => setShowEditDialog(true)} className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <IncapacityFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        incapacityId={incapacityId}
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
      />
      
      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar incapacidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la incapacidad y todas sus prórrogas asociadas.
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
    </>
  );
}
