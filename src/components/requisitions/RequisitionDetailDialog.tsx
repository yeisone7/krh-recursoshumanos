import { useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useRequisitionWithVacancies, useSubmitRequisition } from '@/hooks/useRequisitions';
import { useAuth } from '@/contexts/AuthContext';
import { RequisitionTimeline } from './RequisitionTimeline';
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
  const submitRequisition = useSubmitRequisition();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  if (!requisitionId) return null;

  const handleSubmit = async () => {
    if (requisition) {
      await submitRequisition.mutateAsync(requisition.id);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Detalle de Requisición
            </DialogTitle>
            {statusConfig && (
              <Badge
                variant="outline"
                className={cn(statusConfig.bg, statusConfig.text, statusConfig.border)}
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
            <TabsList className="w-full justify-start">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Detalles</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
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
                <CardContent className="grid grid-cols-2 gap-4">
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
                    <p className="text-sm text-muted-foreground">Salario Propuesto</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      {requisition.salario_propuesto
                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(requisition.salario_propuesto)
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
                <CardContent className="grid grid-cols-2 gap-4">
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
          <div className="flex justify-between items-center gap-3 pt-4 border-t">
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
            
            <div className="flex gap-3">
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
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
