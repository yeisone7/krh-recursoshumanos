import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Briefcase,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  UserPlus,
  ArrowRight,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  FileText,
  GraduationCap,
  FileCheck,
  Building2,
  User,
  ExternalLink,
  LayoutGrid,
  LayoutList,
  Upload,
  Trash2,
  Paperclip,
  Link2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useVacancy, useUpdateVacancy } from '@/hooks/useVacancies';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateCandidate, useConvertToEmployee } from '@/hooks/useCandidates';
import { CandidateFormDialog } from './CandidateFormDialog';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import { CandidateKanban } from '@/components/selection/CandidateKanban';
import { GenerateRegistrationLinkDialog } from '@/components/registration/GenerateRegistrationLinkDialog';
import { RegistrationTokensList } from '@/components/registration/RegistrationTokensList';
import {
  VacancyStatus,
  vacancyStatusLabels,
  vacancyStatusConfig,
  vacancyTypeLabels,
  vacancyReasonLabels,
  candidateStatusLabels,
  candidateStatusConfig,
  CandidateStatus,
} from '@/types/vacancy';
import { requisitionStatusLabels, requisitionStatusConfig } from '@/types/requisition';

interface VacancyDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
}

const statusIcons: Record<VacancyStatus, React.ElementType> = {
  open: CheckCircle,
  in_process: Clock,
  closed: CheckCircle,
  cancelled: XCircle,
};

export function VacancyDetailDialog({ open, onOpenChange, vacancyId }: VacancyDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [candidateViewMode, setCandidateViewMode] = useState<'table' | 'kanban'>('table');
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [showGenerateLink, setShowGenerateLink] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const navigate = useNavigate();
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: vacancy, isLoading } = useVacancy(vacancyId);
  const updateVacancy = useUpdateVacancy();
  const updateCandidate = useUpdateCandidate();
  const convertToEmployee = useConvertToEmployee();

  // Realtime: auto-refresh when a new candidate is added to this vacancy
  useEffect(() => {
    if (!open || !vacancyId) return;
    const channel = supabase
      .channel(`vacancy-candidates-${vacancyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'candidates', filter: `vacancy_id=eq.${vacancyId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['vacancy', vacancyId] });
          queryClient.invalidateQueries({ queryKey: ['registration-tokens'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, vacancyId, queryClient]);

  const fetchDocuments = useCallback(async () => {
    if (!vacancyId) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('vacancy_documents')
        .select('*')
        .eq('vacancy_id', vacancyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch {
      // silent
    } finally {
      setLoadingDocs(false);
    }
  }, [vacancyId]);

  useEffect(() => {
    if (open && vacancyId) {
      fetchDocuments();
    }
  }, [open, vacancyId, fetchDocuments]);

  const handleDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentCompanyId) return;
    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const filePath = `vacancies/docs_${vacancyId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        const { error: insertError } = await supabase.from('vacancy_documents').insert({
          vacancy_id: vacancyId,
          company_id: currentCompanyId,
          document_name: file.name,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        });
        if (insertError) throw insertError;
      }
      toast.success('Documento(s) subido(s) exitosamente');
      fetchDocuments();
    } catch (err) {
      toast.error('Error al subir documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const { error } = await supabase.from('vacancy_documents').delete().eq('id', docId);
      if (error) throw error;
      toast.success('Documento eliminado');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      toast.error('Error al eliminar documento');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const openCandidateDetail = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setShowCandidateDetail(true);
  };

  if (isLoading || !vacancy) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const status = vacancy.status as VacancyStatus;
  const StatusIcon = statusIcons[status];
  const statusStyle = vacancyStatusConfig[status];
  const candidates = (vacancy as any).candidates || [];
  const requisition = (vacancy as any).personnel_requisitions;

  const handleStatusChange = async (newStatus: VacancyStatus) => {
    try {
      await updateVacancy.mutateAsync({
        id: vacancy.id,
        status: newStatus,
        actual_close_date: newStatus === 'closed' ? new Date().toISOString().split('T')[0] : null,
      });
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleCandidateStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    try {
      await updateCandidate.mutateAsync({
        id: candidateId,
        status: newStatus,
        is_selected: newStatus === 'selected',
      });
      toast.success('Estado del candidato actualizado');
    } catch (error) {
      toast.error('Error al actualizar candidato');
    }
  };

  const handleConvertToEmployee = async (candidateId: string) => {
    // Check if candidate has approved medical exam
    const candidateData = candidates.find((c: any) => c.id === candidateId);
    const candidateSteps = candidateData?.selection_steps || [];
    const hasApprovedExam = candidateSteps.some(
      (s: any) => s.step_type === 'examenes_medicos' && s.status === 'passed' && ['apto', 'apto_restricciones'].includes(s.result)
    );

    if (!hasApprovedExam) {
      toast.error('Se requiere examen médico de ingreso aprobado', {
        description: 'Registre la etapa de Exámenes Médicos con concepto "Apto" desde el detalle del candidato antes de contratar.',
      });
      return;
    }

    try {
      const result = await convertToEmployee.mutateAsync({
        candidateId,
        operationCenterId: vacancy.operation_center_id || undefined,
        createEntryExam: true,
      });
      toast.success('Candidato contratado exitosamente', {
        description: `Se creó el empleado, contrato y examen de ingreso para ${result.employee.first_name} ${result.employee.last_name}.`,
      });
    } catch (error) {
      toast.error('Error al contratar candidato');
    }
  };

  const formatSalary = (value: number | null) => {
    if (!value) return 'No especificado';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-4xl p-0 flex flex-col overflow-hidden sm:w-full">
          <DialogHeader className="px-4 pt-5 pb-4 border-b border-border sm:px-6 sm:pt-6">
            <div className="flex flex-col items-start gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between sm:pr-0">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center sm:h-12 sm:w-12">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="font-display text-lg leading-tight sm:text-xl">{vacancy.position_title}</DialogTitle>
                  <p className="text-sm text-muted-foreground break-words">
                    {(vacancy as any).operation_centers?.name || 'General'}
                    {vacancy.department_area && ` • ${vacancy.department_area}`}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn('max-w-full gap-1 self-start truncate', statusStyle.bg, statusStyle.text, statusStyle.border)}
              >
                <StatusIcon className="w-3 h-3" />
                {vacancyStatusLabels[status]}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-2 border-b flex-shrink-0 sm:px-6">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/50 p-1 sm:inline-flex sm:h-10 sm:w-auto sm:gap-0">
                <TabsTrigger value="info" className="h-10 min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">Información</span>
                </TabsTrigger>
                <TabsTrigger value="candidates" className="h-10 min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate">Candidatos</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="h-10 min-w-0 flex-col gap-0.5 px-1 text-[11px] leading-none sm:h-9 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate">Documentos</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Info Tab */}
              <TabsContent value="info" className="p-4 mt-0 space-y-6 sm:p-6">
                {/* Requisition Info Card */}
                {requisition && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-primary" />
                        Requisición de Origen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Cargo Solicitado</p>
                          <p className="font-medium text-sm">{requisition.cargo_solicitado}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Solicitante</p>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="font-medium text-sm">{requisition.solicitante_nombre || 'No especificado'}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Estado Requisición</p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              requisitionStatusConfig[requisition.estado_requisicion as keyof typeof requisitionStatusConfig]?.bg,
                              requisitionStatusConfig[requisition.estado_requisicion as keyof typeof requisitionStatusConfig]?.text
                            )}
                          >
                            {requisitionStatusLabels[requisition.estado_requisicion as keyof typeof requisitionStatusLabels] || requisition.estado_requisicion}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Fecha Requisición</p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {format(new Date(requisition.fecha_requisicion), 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-3 p-0 h-auto text-primary"
                        onClick={() => {
                          onOpenChange(false);
                          navigate(`/requisiciones?id=${requisition.id}`);
                        }}
                      >
                        Ver detalles de la requisición
                        <ExternalLink className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Convocatoria</p>
                    <p className="font-medium">{vacancyTypeLabels[vacancy.vacancy_type as keyof typeof vacancyTypeLabels]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Motivo</p>
                    <p className="font-medium">{vacancyReasonLabels[vacancy.vacancy_reason as keyof typeof vacancyReasonLabels]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Posiciones</p>
                    <p className="font-medium">{vacancy.positions_count}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Jornada</p>
                    <p className="font-medium capitalize">{vacancy.shift_type}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Apertura</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{format(new Date(vacancy.open_date), 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  {vacancy.target_close_date && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cierre Objetivo</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{format(new Date(vacancy.target_close_date), 'dd MMM yyyy', { locale: es })}</p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Compensation */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Compensación
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Rango Salarial</p>
                      <p className="font-medium">
                        {vacancy.salary_range_min || vacancy.salary_range_max
                          ? `${formatSalary(vacancy.salary_range_min)} - ${formatSalary(vacancy.salary_range_max)}`
                          : 'No especificado'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Auxilio de Transporte</p>
                      <p className="font-medium">{vacancy.includes_transport ? 'Incluido' : 'No incluido'}</p>
                    </div>
                  </div>
                  {vacancy.other_benefits && (
                    <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm">{vacancy.other_benefits}</p>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                {(vacancy.job_description || vacancy.requirements) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {vacancy.job_description && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Descripción del Cargo</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vacancy.job_description}</p>
                        </div>
                      )}
                      {vacancy.requirements && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Requisitos</h3>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{vacancy.requirements}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {vacancy.experience_years !== null && vacancy.experience_years > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{vacancy.experience_years} años de experiencia</span>
                          </div>
                        )}
                        {vacancy.education_level && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{vacancy.education_level}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Colocado Document */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Colocado
                  </h3>
                  {vacancy.colocado_url ? (
                    <div className="flex flex-col gap-3 p-3 rounded-lg border bg-card sm:flex-row sm:items-center">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Documento adjunto</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(vacancy.colocado_url!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                    </div>
                  ) : (
                    <ColocadoUpload vacancyId={vacancy.id} />
                  )}
                </div>
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="mt-0 p-4 space-y-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-violet-light flex items-center justify-center">
                      <Users className="w-4 h-4 text-violet" />
                    </div>
                    {candidates.length} Candidato{candidates.length !== 1 && 's'}
                  </h3>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
                    <ToggleGroup
                      type="single"
                      value={candidateViewMode}
                      onValueChange={(v) => v && setCandidateViewMode(v as 'table' | 'kanban')}
                      className="col-span-2 grid grid-cols-2 border rounded-lg p-1 sm:col-span-1 sm:flex"
                    >
                      <ToggleGroupItem value="kanban" aria-label="Vista Kanban" className="gap-1.5 text-xs px-2 h-7">
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Kanban
                      </ToggleGroupItem>
                      <ToggleGroupItem value="table" aria-label="Vista Lista" className="gap-1.5 text-xs px-2 h-7">
                        <LayoutList className="w-3.5 h-3.5" />
                        Lista
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowGenerateLink(true)}
                      disabled={vacancy?.status !== 'in_process'}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Generar Enlace
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowCandidateForm(true)}
                      disabled={vacancy?.status !== 'in_process'}
                      title={vacancy?.status !== 'in_process' ? 'Solo se pueden agregar candidatos cuando la vacante está En Proceso' : undefined}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Agregar Candidato
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg">
                      <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No hay candidatos registrados</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowCandidateForm(true)}
                        disabled={vacancy?.status !== 'in_process'}
                        title={vacancy?.status !== 'in_process' ? 'Solo se pueden agregar candidatos cuando la vacante está En Proceso' : undefined}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Agregar primer candidato
                      </Button>
                    </div>
                  ) : candidateViewMode === 'kanban' ? (
                    <div
                      className="overflow-x-auto overflow-y-hidden pb-4 -mx-6 px-6"
                      onWheel={(e) => {
                        // Permite desplazamiento horizontal con rueda/trackpad
                        if (e.deltaY && !e.shiftKey) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      <CandidateKanban
                        candidates={candidates.map((c: any) => ({
                          ...c,
                          vacancies: { position_title: vacancy.position_title, operation_centers: (vacancy as any).operation_centers },
                        }))}
                        onCandidateClick={openCandidateDetail}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map((candidate: any) => {
                        const candidateStatus = candidate.status as CandidateStatus;
                        const statusStyle = candidateStatusConfig[candidateStatus];

                        return (
                          <div
                            key={candidate.id}
                            className="flex flex-col gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
                            onClick={() => openCandidateDetail(candidate.id)}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-violet-light flex items-center justify-center">
                                <span className="font-medium text-violet">
                                  {candidate.first_name[0]}{candidate.last_name[0]}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium">
                                  {candidate.first_name} {candidate.last_name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{candidate.document_number}</span>
                                  {candidate.mobile && (
                                    <>
                                      <span>•</span>
                                      <span>{candidate.mobile}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                              <Badge className={cn('text-xs', statusStyle.bg, statusStyle.text)}>
                                {candidateStatusLabels[candidateStatus]}
                              </Badge>

                              {candidateStatus === 'selected' && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleConvertToEmployee(candidate.id);
                                  }}
                                  disabled={convertToEmployee.isPending}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Contratar
                                </Button>
                              )}

                              {candidateStatus !== 'hired' && candidateStatus !== 'withdrawn' && candidateStatus !== 'not_selected' && (
                                <div className="flex gap-1">
                                  {candidateStatus !== 'selected' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-success hover:text-success"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCandidateStatusChange(candidate.id, 'selected');
                                      }}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCandidateStatusChange(candidate.id, 'not_selected');
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Generated Links */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    Enlaces de Registro Generados
                  </h4>
                  <RegistrationTokensList vacancyId={vacancyId} />
                </div>
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="mt-0 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-primary" />
                    </div>
                    Documentos de la Vacante
                  </h3>
                  <div>
                    <input
                      id={`vacancy-doc-upload-${vacancyId}`}
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => handleDocUpload(e.target.files)}
                    />
                    <Button
                      size="sm"
                      onClick={() => document.getElementById(`vacancy-doc-upload-${vacancyId}`)?.click()}
                      disabled={uploadingDoc}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                    </Button>
                  </div>
                </div>

                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : documents.length === 0 ? (
                  <div
                    className="text-center py-10 bg-muted/30 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => document.getElementById(`vacancy-doc-upload-${vacancyId}`)?.click()}
                  >
                    <Paperclip className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay documentos adjuntos</p>
                    <p className="text-xs text-muted-foreground mt-1">Haz clic para subir archivos (PDF, imágenes, Word, Excel — máx 10MB)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.document_name || doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.file_size)}
                            {doc.created_at && ` • ${format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>


          {/* Footer Actions */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-muted/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {status === 'open' && (
                <Button variant="outline" onClick={() => handleStatusChange('in_process')}>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Proceso
                </Button>
              )}
              {status === 'in_process' && (
                <Button variant="outline" onClick={() => handleStatusChange('closed')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cerrar Vacante
                </Button>
              )}
              {(status === 'open' || status === 'in_process') && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Form Dialog */}
      <CandidateFormDialog
        open={showCandidateForm}
        onOpenChange={setShowCandidateForm}
        vacancyId={vacancyId}
      />

      {/* Generate Registration Link Dialog */}
      <GenerateRegistrationLinkDialog
        open={showGenerateLink}
        onOpenChange={setShowGenerateLink}
        targetType="candidate"
        vacancyId={vacancyId}
      />

      {/* Candidate Detail Dialog */}
      {selectedCandidateId && (
        <CandidateDetailDialog
          open={showCandidateDetail}
          onOpenChange={(open) => {
            setShowCandidateDetail(open);
            if (!open) {
              setTimeout(() => setSelectedCandidateId(null), 200);
            }
          }}
          candidateId={selectedCandidateId}
        />
      )}
    </>
  );
}

function ColocadoUpload({ vacancyId }: { vacancyId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const updateVacancy = useUpdateVacancy();

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `vacancies/colocado_${vacancyId}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('documents').upload(filePath, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      await updateVacancy.mutateAsync({ id: vacancyId, colocado_url: urlData.publicUrl });
      toast.success('Documento de colocado subido');
      setFile(null);
    } catch (err) {
      toast.error('Error al subir documento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => document.getElementById(`colocado-detail-${vacancyId}`)?.click()}
      >
        <input
          id={`colocado-detail-${vacancyId}`}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <p className="text-sm font-medium text-foreground">{file.name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Haz clic para adjuntar documento</p>
        )}
      </div>
      {file && (
        <Button size="sm" onClick={handleUpload} disabled={uploading}>
          {uploading ? 'Subiendo...' : 'Subir documento'}
        </Button>
      )}
    </div>
  );
}
