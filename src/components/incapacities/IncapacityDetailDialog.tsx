import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
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
  incapacityOriginLabels, 
  recoveryStatusLabels, 
  recoveryStatusColors,
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
      toast.error('Error al eliminar la incapacidad');
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
  const today = new Date();
  const endDate = new Date(incapacity.end_date);
  const isActive = endDate >= today && new Date(incapacity.start_date) <= today;
  const daysRemaining = differenceInDays(endDate, today);
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem]">
          
          {/* Premium Gradient Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
            
            <DialogHeader className="relative z-10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner hidden sm:flex">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1 hidden sm:inline-flex">
                      DETALLE
                    </Badge>
                    <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                      Incapacidad - {employeeName}
                    </DialogTitle>
                    <DialogDescription className="font-medium mt-1">
                      {format(new Date(incapacity.start_date), "d 'de' MMMM, yyyy", { locale: es })} - {format(endDate, "d 'de' MMMM, yyyy", { locale: es })}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end mt-2 sm:mt-0">
                  <Badge variant={incapacity.origin === 'laboral' ? 'destructive' : 'secondary'} className="rounded-xl px-3 py-1 text-xs uppercase tracking-wider font-bold">
                    {incapacityOriginLabels[incapacity.origin]}
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
          
          <div className="px-8 py-6 min-h-0">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="flex h-14 w-full justify-start overflow-x-auto p-1 bg-muted/30 rounded-2xl mb-6 custom-scrollbar">
                <TabsTrigger value="general" className="shrink-0 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-widest transition-all">General</TabsTrigger>
                <TabsTrigger value="payment" className="shrink-0 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-widest transition-all">Pagos</TabsTrigger>
                <TabsTrigger value="recovery" className="shrink-0 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-widest transition-all">Recobro</TabsTrigger>
                <TabsTrigger value="documents" className="shrink-0 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-widest transition-all">Documentos</TabsTrigger>
                <TabsTrigger value="history" className="shrink-0 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] uppercase tracking-widest transition-all">Historial</TabsTrigger>
              </TabsList>
              
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
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
              <TabsContent value="payment" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Distribución de Pago
                    </CardTitle>
                    <CardDescription>
                      Cálculo según normativa colombiana (Decreto 019 de 2012)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Salario Base Diario (IBC)</p>
                        <p className="text-lg font-bold">{formatCurrency(incapacity.daily_base_salary)}</p>
                      </div>
                      
                      <Separator />
                      
                      {incapacity.origin === 'laboral' ? (
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
                                <p className="text-sm text-muted-foreground">{incapacity.eps_days} días al 66.67%</p>
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
              <TabsContent value="recovery" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Estado del Recobro
                        </CardTitle>
                        <CardDescription>
                          Gestión del recobro ante {incapacity.origin === 'laboral' ? 'ARL' : 'EPS'}
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
                          <p className="font-medium">{format(new Date(incapacity.filing_date), 'dd/MM/yyyy')}</p>
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
                          <p className="font-medium">{format(new Date(incapacity.expected_payment_date), 'dd/MM/yyyy')}</p>
                        </div>
                      )}
                      {incapacity.actual_payment_date && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha Real de Pago</p>
                          <p className="font-medium">{format(new Date(incapacity.actual_payment_date), 'dd/MM/yyyy')}</p>
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
              <TabsContent value="documents" className="space-y-4 mt-4">
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
                      showVersionHistory={true}
                      compact
                    />
                  </CardContent>
                </Card>
                
                {incapacity.certificate_url && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
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
                      showVersionHistory={true}
                      compact
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* History Tab */}
              <TabsContent value="history" className="space-y-4 mt-4">
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
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            1
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Incapacidad Original</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(incapacity.start_date), 'dd/MM/yyyy')} - {format(new Date(incapacity.end_date), 'dd/MM/yyyy')} ({incapacity.total_days} días)
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
                                {format(new Date(ext.start_date), 'dd/MM/yyyy')} - {format(new Date(ext.end_date), 'dd/MM/yyyy')} ({ext.total_days} días)
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
                      <div className="mt-4 p-3 rounded-lg bg-muted">
                        <p className="text-sm font-medium">Total acumulado: {totalChainDays} días</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between px-8 py-6 border-t bg-muted/10">
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
