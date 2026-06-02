import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useRequisitionWithVacancies, useSubmitRequisition, useUpdateRequisition } from '@/hooks/useRequisitions';
import { useAuth } from '@/contexts/AuthContext';
import { usePsychologyUsers } from '@/hooks/usePsychologyUsers';
import { RequisitionTimeline } from './RequisitionTimeline';
import { RequisitionApprovalDialog } from './RequisitionApprovalDialog';
import { exportRequisitionToPDF } from '@/lib/requisitionPdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { useVacancyPlatforms } from '@/hooks/useVacancyPlatforms';
import { supabase } from '@/integrations/supabase/client';
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
  onRequestDelete?: (requisition: NonNullable<ReturnType<typeof useRequisitionWithVacancies>['data']>) => void;
}

interface VacancyCodeEntry {
  id?: string;
  platformId: string;
  code: string;
  fechaCreacion: string;
  fechaCierre: string;
}

export function RequisitionDetailDialog({
  open,
  onOpenChange,
  requisitionId,
  onEdit,
  onCreateVacancy,
  onRequestDelete,
}: RequisitionDetailDialogProps) {
  const { data: requisition, isLoading } = useRequisitionWithVacancies(requisitionId || undefined);
  const { companies, currentCompanyId, user, hasPermission, isAdmin, isRRHH, isSuperAdmin, canCreate, canUpdate } = useAuth();
  const queryClient = useQueryClient();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const updateRequisition = useUpdateRequisition();
  const submitRequisition = useSubmitRequisition();
  const { data: psychologyUsers = [], isLoading: loadingPsychology } = usePsychologyUsers();
  const { data: platforms = [] } = useVacancyPlatforms();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [liderProceso, setLiderProceso] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalStep, setApprovalStep] = useState<'coordinadores' | 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia' | null>(null);
  const [newVacancyCodes, setNewVacancyCodes] = useState<VacancyCodeEntry[]>([]);

  const { data: vacancyCodes = [], isLoading: loadingVacancyCodes } = useQuery({
    queryKey: ['requisition-vacancy-codes', requisitionId],
    queryFn: async () => {
      if (!requisitionId) return [];
      const { data, error } = await supabase
        .from('requisition_vacancy_codes')
        .select('id, platform_id, codigo_vacante_externa, fecha_creacion, fecha_cierre, entidad_origen')
        .eq('requisition_id', requisitionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!requisitionId,
  });

  useEffect(() => {
    if (requisition?.lider_proceso) {
      setLiderProceso(requisition.lider_proceso);
    } else {
      setLiderProceso('');
    }
  }, [requisition?.lider_proceso]);

  useEffect(() => {
    if (!open) {
      setNewVacancyCodes([]);
    }
  }, [open]);

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
        await updateRequisition.mutateAsync({ id: requisition.id, lider_proceso: currentLider });
      }
      await submitRequisition.mutateAsync(requisition.id);
    }
  };

  const handleAutorizaChange = async (value: string) => {
    if (requisition) {
      await updateRequisition.mutateAsync({ id: requisition.id, autoriza: value });
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
  const canManageDraft = !!requisition && (
    isAdmin ||
    isRRHH ||
    isSuperAdmin ||
    canCreate('requisiciones') ||
    canUpdate('requisiciones') ||
    hasPermission('req_approve_coordinadores', 'approve') ||
    requisition.created_by === user?.id
  );
  const canEdit = status === 'borrador' && canManageDraft;
  const canSubmit = status === 'borrador' && canManageDraft;
  const canCreateVacancy = status === 'aprobada' || status === 'en_seleccion';
  const canDeleteRequisition = hasPermission('requisiciones', 'delete');
  const canManageVacancyCodes = hasPermission('req_approve_seleccion', 'approve') || isAdmin || isRRHH || isSuperAdmin || canUpdate('requisiciones');
  const activePlatforms = platforms.filter((p) => p.is_active);

  const addVacancyCodeDraft = () => {
    setNewVacancyCodes((prev) => [
      ...prev,
      { platformId: '', code: '', fechaCreacion: '', fechaCierre: '' },
    ]);
  };

  const removeVacancyCodeDraft = (index: number) => {
    setNewVacancyCodes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVacancyCodeDraft = (index: number, field: keyof VacancyCodeEntry, value: string) => {
    setNewVacancyCodes((prev) => prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  };

  const saveVacancyCodes = async () => {
    if (!requisition?.id) return;
    const validCodes = newVacancyCodes.filter((vc) => vc.platformId && vc.code.trim());

    if (validCodes.length === 0) {
      toast({
        title: 'Sin cambios',
        description: 'Agrega al menos un código con plataforma y valor.',
      });
      return;
    }

    const invalidDates = validCodes.some((vc) => vc.fechaCreacion && vc.fechaCierre && vc.fechaCierre < vc.fechaCreacion);
    if (invalidDates) {
      toast({
        title: 'Fechas inválidas',
        description: 'La fecha de cierre no puede ser anterior a la fecha de creación.',
        variant: 'destructive',
      });
      return;
    }

    const payload = validCodes.map((vc) => ({
      requisition_id: requisition.id,
      company_id: requisition.company_id,
      platform_id: vc.platformId,
      codigo_vacante_externa: vc.code.trim(),
      entidad_origen: platforms.find((p) => p.id === vc.platformId)?.name || '',
      fecha_creacion: vc.fechaCreacion || null,
      fecha_cierre: vc.fechaCierre || null,
    }));

    const { error } = await (supabase as any).from('requisition_vacancy_codes').insert(payload);
    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron guardar los códigos de vacante.',
        variant: 'destructive',
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['requisition-vacancy-codes', requisitionId] });
    setNewVacancyCodes([]);
    toast({
      title: 'Guardado',
      description: 'Códigos de vacante agregados correctamente.',
    });
  };

  const removeExistingVacancyCode = async (codeId: string) => {
    const { error } = await supabase.from('requisition_vacancy_codes').delete().eq('id', codeId);
    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el código de vacante.',
        variant: 'destructive',
      });
      return;
    }

    await queryClient.invalidateQueries({ queryKey: ['requisition-vacancy-codes', requisitionId] });
    toast({
      title: 'Eliminado',
      description: 'Código de vacante eliminado.',
    });
  };
  
  const getApprovalAction = () => {
    if (!requisition) return null;
    
    switch (status) {
      case 'en_coordinadores':
        if (hasPermission('req_approve_coordinadores', 'approve')) {
          return { step: 'coordinadores' as const, label: 'Aprobar Coordinadores' };
        }
        break;
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
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-xl sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-4xl sm:rounded-lg sm:border [&_input]:min-h-11 sm:[&_input]:min-h-10 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-10">
        <DialogHeader className="shrink-0 border-b border-border bg-background px-4 py-4 sm:px-6">
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
          <div className="min-h-0 flex-1 space-y-4 overflow-hidden p-4 sm:p-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : requisition ? (
          <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border/70 bg-muted/30 px-3 py-2 sm:px-6 sm:py-3">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/60 bg-background p-1 shadow-sm">
                <TabsTrigger
                  value="timeline"
                  className="h-10 min-w-0 gap-2 rounded-lg px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-none transition-colors data-[state=active]:bg-[#19a9e5] data-[state=active]:text-white data-[state=active]:shadow-none sm:text-[11px] sm:tracking-[0.18em]"
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Timeline</span>
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="h-10 min-w-0 gap-2 rounded-lg px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground shadow-none transition-colors data-[state=active]:bg-[#19a9e5] data-[state=active]:text-white data-[state=active]:shadow-none sm:text-[11px] sm:tracking-[0.18em]"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>Detalles</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-4 py-4 sm:px-6 sm:py-5">
            <TabsContent value="timeline" className="mt-0 space-y-4">
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
                              updateRequisition.mutate({ id: requisition.id, lider_proceso: value });
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
                    <p className="text-sm text-muted-foreground">Codigo de Requisicion</p>
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 font-semibold text-primary">
                      {requisition.requisition_code || 'RQ-PEND'}
                    </Badge>
                  </div>
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

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-base">Códigos de la Vacante</CardTitle>
                    {canManageVacancyCodes && (
                      <Button type="button" variant="outline" size="sm" onClick={addVacancyCodeDraft}>
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loadingVacancyCodes ? (
                    <p className="text-sm text-muted-foreground">Cargando códigos...</p>
                  ) : vacancyCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin códigos de vacante agregados.</p>
                  ) : (
                    <div className="space-y-2">
                      {vacancyCodes.map((entry: any) => (
                        <div key={entry.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 text-sm">
                              <p className="font-semibold">{entry.codigo_vacante_externa}</p>
                              <p className="text-muted-foreground">{entry.entidad_origen || 'Plataforma no definida'}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.fecha_creacion ? `Creación: ${entry.fecha_creacion}` : 'Creación: -'} | {entry.fecha_cierre ? `Cierre: ${entry.fecha_cierre}` : 'Cierre: -'}
                              </p>
                            </div>
                            {canManageVacancyCodes && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeExistingVacancyCode(entry.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {newVacancyCodes.map((entry, index) => (
                    <div key={`new-${index}`} className="space-y-2 rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nuevo código</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeVacancyCodeDraft(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <Select value={entry.platformId} onValueChange={(val) => updateVacancyCodeDraft(index, 'platformId', val)}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Plataforma" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {activePlatforms.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-9 text-sm"
                          placeholder="Código"
                          value={entry.code}
                          onChange={(e) => updateVacancyCodeDraft(index, 'code', e.target.value)}
                        />
                        <Input
                          type="date"
                          className="h-9 text-sm"
                          value={entry.fechaCreacion}
                          onChange={(e) => updateVacancyCodeDraft(index, 'fechaCreacion', e.target.value)}
                        />
                        <Input
                          type="date"
                          className={cn('h-9 text-sm', entry.fechaCreacion && entry.fechaCierre && entry.fechaCierre < entry.fechaCreacion && 'border-destructive')}
                          value={entry.fechaCierre}
                          min={entry.fechaCreacion || undefined}
                          onChange={(e) => updateVacancyCodeDraft(index, 'fechaCierre', e.target.value)}
                        />
                      </div>
                      {entry.fechaCreacion && entry.fechaCierre && entry.fechaCierre < entry.fechaCreacion && (
                        <p className="text-[11px] text-destructive">La fecha de cierre no puede ser anterior a la de creación.</p>
                      )}
                    </div>
                  ))}

                  {canManageVacancyCodes && newVacancyCodes.length > 0 && (
                    <div className="flex justify-end">
                      <Button type="button" onClick={saveVacancyCodes}>
                        Guardar códigos
                      </Button>
                    </div>
                  )}

                  {activePlatforms.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No hay plataformas configuradas. Agrégalas desde el catálogo de Plataformas de Publicación.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : (
          <p className="flex min-h-0 flex-1 items-center justify-center px-4 py-8 text-center text-muted-foreground">
            No se encontró la requisición.
          </p>
        )}



        {/* Actions */}
        {requisition && (
          <div className="shrink-0 border-t border-border bg-background px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              {canDeleteRequisition && onRequestDelete && (
                <Button variant="destructive" onClick={() => onRequestDelete(requisition)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
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
