import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Send, 
  Edit, 
  Plus, 
  Building2, 
  MapPin, 
  Calendar, 
  Users,
  FileText,
  DollarSign,
  FileCheck,
  FileDown,
  Loader2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useRequisitionWithVacancies, useSubmitRequisition, useUpdateRequisition } from '@/hooks/useRequisitions';
import { useAuth } from '@/contexts/AuthContext';
import { usePsychologyUsers } from '@/hooks/usePsychologyUsers';
import { RequisitionTimeline } from './RequisitionTimeline';
import { RequisitionApprovalDialog } from './RequisitionApprovalDialog';
import { exportRequisitionToPDF } from '@/lib/requisitionPdfGenerator';
import { useToast } from '@/hooks/use-toast';
import {
  requisitionStatusLabels,
  requisitionStatusConfig,
  requisitionReasonLabels,
  dayOfWeekLabels,
  RequisitionStatus,
  RequisitionReason,
  DayOfWeek,
  autorizaLabels,
  AutorizaType,
} from '@/types/requisition';

interface RequisitionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionId: string | null;
  onEdit?: () => void;
  onCreateVacancy?: () => void;
}

export function RequisitionDetailDialog({
  open,
  onOpenChange,
  requisitionId,
  onEdit,
  onCreateVacancy,
}: RequisitionDetailDialogProps) {
  const { data: requisition, isLoading } = useRequisitionWithVacancies(requisitionId || undefined);
  const { companies, currentCompanyId } = useAuth();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const updateRequisition = useUpdateRequisition();
  const submitRequisition = useSubmitRequisition();
  const { data: psychologyUsers = [], isLoading: loadingPsychology } = usePsychologyUsers();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [liderProceso, setLiderProceso] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalStep, setApprovalStep] = useState<'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia' | null>(null);

  useEffect(() => {
    if (requisition?.lider_proceso) {
      setLiderProceso(requisition.lider_proceso);
    } else {
      setLiderProceso('');
    }
  }, [requisition?.lider_proceso]);

  if (!requisitionId) return null;

  const handleSubmit = async () => {
    if (requisition) {
      if (!requisition.autoriza) {
        toast({
          title: 'Campo requerido',
          description: 'Debe seleccionar quién autoriza antes de enviar la requisición.',
          variant: 'destructive',
        });
        return;
      }
      // Save lider_proceso before submitting if changed
      const currentLider = liderProceso.trim();
      if (!currentLider) {
        toast({
          title: 'Campo requerido',
          description: 'Debe ingresar el Líder del Proceso antes de enviar la requisición.',
          variant: 'destructive',
        });
        return;
      }
      if (currentLider !== (requisition.lider_proceso || '')) {
        await updateRequisition.mutateAsync({ id: requisition.id, lider_proceso: currentLider } as any);
      }
      await submitRequisition.mutateAsync(requisition.id);
    }
  };

  const handleAutorizaChange = async (value: string) => {
    if (requisition) {
      await updateRequisition.mutateAsync({ id: requisition.id, autoriza: value } as any);
    }
  };

  const handleExportPDF = async () => {
    if (!requisition) return;
    
    setIsExporting(true);
    try {
      await exportRequisitionToPDF(requisition, currentCompany?.name || 'Empresa');
      toast({
        title: 'PDF generado',
        description: 'La requisición se ha exportado correctamente.',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const status = requisition?.estado_requisicion as RequisitionStatus;
  const statusConfig = status ? requisitionStatusConfig[status] : null;
  const canEdit = status === 'borrador';
  const canSubmit = status === 'borrador';
  const canCreateVacancy = status === 'aprobada' || status === 'en_seleccion';

  const { hasPermission } = useAuth();
  
  const getApprovalAction = () => {
    if (!requisition) return null;
    
    switch (status) {
      case 'en_rrhh':
        if (hasPermission('req_approve_rh', 'approve')) {
          return { step: 'rrhh' as const, label: 'Aprobar RRHH' };
        }
        break;
      case 'en_juridico':
        if (hasPermission('req_approve_juridica', 'approve')) {
          return { step: 'juridico' as const, label: 'Aprobar Jurídico' };
        }
        break;
      case 'en_operaciones':
        if (hasPermission('req_approve_ger_op', 'approve')) {
          return { step: 'operaciones' as const, label: 'Aprobar Operaciones' };
        }
        break;
      case 'en_gerencia':
        if (hasPermission('req_approve_ger_adm', 'approve')) {
          return { step: 'gerencia' as const, label: 'Aprobar Gerencia' };
        }
        break;
      case 'en_seleccion':
        if (hasPermission('req_approve_seleccion', 'approve')) {
          return { step: 'seleccion' as const, label: 'Aprobar Selección' };
        }
        break;
    }
    return null;
  };

  const approvalAction = getApprovalAction();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-4xl overflow-y-auto p-4 sm:p-6 [&_input]:min-h-11 sm:[&_input]:min-h-10 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-10">
        <DialogHeader>
          <div className="flex flex-col items-start gap-2 pr-8 sm:flex-row sm:items-center sm:justify-between sm:pr-0">
            <DialogTitle className="w-full text-center text-lg leading-tight sm:w-auto sm:text-left sm:text-xl">
              Detalle de Requisición
            </DialogTitle>
            {statusConfig && (
              <Badge
                variant="outline"
                className={cn('max-w-full self-start truncate px-3 sm:self-auto', statusConfig.bg, statusConfig.text, statusConfig.border)}
              >
                {requisitionStatusLabels[status]}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : requisition ? (
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid h-10 w-full grid-cols-2 overflow-hidden">
              <TabsTrigger value="timeline" className="h-8 min-w-0">Timeline</TabsTrigger>
              <TabsTrigger value="details" className="h-8 min-w-0">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4 space-y-4">
              {/* Autoriza field */}
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Autoriza</p>
                      {canEdit ? (
                        <Select
                          value={requisition.autoriza || ''}
                          onValueChange={handleAutorizaChange}
                        >
                          <SelectTrigger className="w-full sm:max-w-xs">
                            <SelectValue placeholder="Seleccionar quién autoriza..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gerencia_administrativa">Gerencia Administrativa</SelectItem>
                            <SelectItem value="gerencia_operaciones">Gerencia de Operaciones</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {requisition.autoriza ? autorizaLabels[requisition.autoriza as AutorizaType] : 'No seleccionado'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Líder del Proceso - only in borrador */}
              {requisition && canEdit && (
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <UserCheck className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Líder del Proceso <span className="text-destructive">*</span></p>
                        <Select
                          value={liderProceso}
                          onValueChange={(value) => {
                            setLiderProceso(value);
                            if (value !== (requisition.lider_proceso || '')) {
                              updateRequisition.mutate({ id: requisition.id, lider_proceso: value } as any);
                            }
                          }}
                          disabled={loadingPsychology}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={loadingPsychology ? "Cargando líderes..." : "Seleccionar líder del proceso..."} />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {psychologyUsers.map((user) => (
                              <SelectItem key={user.id} value={user.full_name}>
                                {user.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Show líder del proceso when not in borrador */}
              {requisition && !canEdit && requisition.lider_proceso && (
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <UserCheck className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Líder del Proceso</p>
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          {requisition.lider_proceso}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <RequisitionTimeline 
                requisition={requisition} 
                vacancies={requisition.vacancies}
              />
            </TabsContent>

            <TabsContent value="details" className="mt-4 space-y-4">
              {/* General Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo Solicitado</p>
                    <p className="font-medium">{requisition.cargo_solicitado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cantidad de Vacantes</p>
                    <p className="font-medium">{requisition.cantidad_vacantes_requeridas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Requisición</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(requisition.fecha_requisicion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Ingreso Estimada</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {requisition.fecha_ingreso_estimada
                        ? format(new Date(requisition.fecha_ingreso_estimada), "dd 'de' MMMM 'de' yyyy", { locale: es })
                        : 'No especificada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {requisition.areas?.name || 'No especificada'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Centro de Operación</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {requisition.operation_centers?.name || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horario de Trabajo</p>
                    <p className="font-medium">{requisition.horario_trabajo || 'No especificado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Día de Descanso</p>
                    <p className="font-medium">
                      {requisition.dia_descanso_obligatorio
                        ? dayOfWeekLabels[requisition.dia_descanso_obligatorio as DayOfWeek]
                        : 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Contrato Sugerido</p>
                    <p className="font-medium flex items-center gap-1">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      {requisition.tipo_contrato_solicitado || 'No especificado'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Motivo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Motivo de la Solicitud</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <Badge variant="outline">
                      {requisitionReasonLabels[requisition.motivo_solicitud as RequisitionReason]}
                    </Badge>
                  </div>
                  {requisition.observaciones_motivo_solicitud && (
                    <div>
                      <p className="text-sm text-muted-foreground">Observaciones</p>
                      <p className="text-sm">{requisition.observaciones_motivo_solicitud}</p>
                    </div>
                  )}
                  {requisition.cargo_a_reemplazar && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cargo a Reemplazar</p>
                      <p className="font-medium">{requisition.cargo_a_reemplazar}</p>
                    </div>
                  )}
                  {requisition.persona_a_reemplazar && (
                    <div>
                      <p className="text-sm text-muted-foreground">Persona a Reemplazar</p>
                      <p className="font-medium">{requisition.persona_a_reemplazar}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Solicitante */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Solicitante
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{requisition.solicitante_nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-medium">{requisition.cargo_solicitante || 'No especificado'}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No se encontró la requisición.
          </p>
        )}



        {/* Actions */}
        {requisition && (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            
            <div className="flex flex-col gap-3 sm:flex-row">
              {canEdit && onEdit && (
                <Button variant="outline" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
              {canSubmit && (
                <Button onClick={handleSubmit} disabled={submitRequisition.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar para Aprobación
                </Button>
              )}
              {canCreateVacancy && onCreateVacancy && (
                <Button onClick={onCreateVacancy}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Vacante
                </Button>
              )}
              {approvalAction && (
                <Button 
                  onClick={() => {
                    setApprovalStep(approvalAction.step);
                    setShowApprovalDialog(true);
                  }}
                  className="gradient-primary"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {approvalAction.label}
                </Button>
              )}
            </div>
          </div>
        )}

        <RequisitionApprovalDialog
          open={showApprovalDialog}
          onOpenChange={setShowApprovalDialog}
          requisition={requisition || null}
          step={approvalStep || 'rrhh'}
        />
      </DialogContent>
    </Dialog>
  );
}
