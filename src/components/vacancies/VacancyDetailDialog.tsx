import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, todayDateOnlyString } from '@/lib/dateOnly';
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
  Paperclip,
  Link2,
  Building2,
  Target,
  Zap,
  TrendingUp,
  FileCheck,
  ExternalLink,
  LayoutGrid,
  LayoutList,
  Upload,
  Plus,
  User,
  Trash2,
  UserX,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { useVacancy, useUpdateVacancy } from '@/hooks/useVacancies';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateCandidate, useConvertToEmployee } from '@/hooks/useCandidates';
import { CandidateFormDialog } from './CandidateFormDialog';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import { CandidateReasonDialog } from '@/components/selection/CandidateReasonDialog';
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
  paused: Pause,
  pending_placed: Clock,
  closed: CheckCircle,
  cancelled: XCircle,
};

export function VacancyDetailDialog({ open, onOpenChange, vacancyId }: VacancyDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('info');
  const [candidateViewMode, setCandidateViewMode] = useState<'table' | 'kanban'>('table');
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showCandidateDetail, setShowCandidateDetail] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isCanceledDialogOpen, setIsCanceledDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [actingCandidate, setActingCandidate] = useState<{ id: string; name: string } | null>(null);
  const [showGenerateLink, setShowGenerateLink] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingColocadoDocs, setUploadingColocadoDocs] = useState(false);
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
        const filePath = `${currentCompanyId}/vacancies/docs_${vacancyId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        const { error: insertError } = await supabase.from('vacancy_documents').insert({
          vacancy_id: vacancyId,
          company_id: currentCompanyId,
          document_name: file.name,
          document_type: 'otro',
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
    } catch (err: any) {
      toast.error('Error al subir documento', {
        description: err?.message || 'No se pudo cargar el archivo.',
      });
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleColocadoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentCompanyId) return;
    setUploadingColocadoDocs(true);
    try {
      const uploadedDocuments: any[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const documentId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const filePath = `${currentCompanyId}/vacancies/colocado_${vacancyId}_${Date.now()}_${documentId}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        const documentRecord = {
          id: documentId,
          vacancy_id: vacancyId,
          company_id: currentCompanyId,
          document_name: file.name,
          document_type: 'colocado',
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
          observations: null,
          created_at: createdAt,
          updated_at: createdAt,
        };

        const { error: insertError } = await supabase.from('vacancy_documents').insert(documentRecord);
        if (insertError) throw insertError;
        uploadedDocuments.push(documentRecord);
      }

      if (uploadedDocuments.length > 0) {
        setDocuments((prev) => [...uploadedDocuments, ...prev]);
        toast.success('Documento(s) de colocado subido(s)');
      }
    } catch (err: any) {
      toast.error('Error al subir documento de colocado', {
        description: err?.message || 'No se pudo cargar el archivo.',
      });
    } finally {
      setUploadingColocadoDocs(false);
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
          <DialogTitle className="sr-only">Cargando vacante</DialogTitle>
          <DialogDescription className="sr-only">Por favor espere mientras se carga la información de la vacante.</DialogDescription>
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
  const colocadoDocuments = documents.filter((doc) => doc.document_type === 'colocado');
  const generalDocuments = documents.filter((doc) => doc.document_type !== 'colocado');

  const selectedCount = candidates.filter((c: any) => c.status === 'selected' || c.status === 'hired').length;
  const positionsCount = vacancy.positions_count || 1;
  const isSelectionLimitReached = selectedCount >= positionsCount;

  const handleStatusChange = async (newStatus: VacancyStatus) => {
    if (newStatus === 'cancelled') {
      setIsCanceledDialogOpen(true);
      return;
    }
    
    try {
      await updateVacancy.mutateAsync({
        id: vacancy.id,
        status: newStatus,
        actual_close_date: newStatus === 'closed' ? todayDateOnlyString() : null,
      });
      toast.success('Estado actualizado');
    } catch (error: any) {
      toast.error('Error al actualizar estado', {
        description: error?.message || 'Intente nuevamente o revise los permisos de la vacante.',
      });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Debe ingresar una justificación para la cancelación');
      return;
    }

    setIsSubmittingCancellation(true);
    try {
      await updateVacancy.mutateAsync({
        id: vacancy.id,
        status: 'cancelled',
        actual_close_date: todayDateOnlyString(),
        // @ts-ignore - these are new columns
        cancellation_reason: cancellationReason,
        cancelled_by: user?.id,
        cancelled_at: new Date().toISOString(),
      });
      toast.success('Vacante cancelada exitosamente');
      setIsCanceledDialogOpen(false);
      setCancellationReason('');
    } catch (error) {
      toast.error('Error al cancelar la vacante');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const handleCandidateStatusChange = async (
    candidateId: string, 
    newStatus: CandidateStatus,
    extra?: { rejection_reason?: string; withdrawal_reason?: string; general_notes?: string }
  ) => {
    try {
      await updateCandidate.mutateAsync({
        id: candidateId,
        status: newStatus,
        is_selected: newStatus === 'selected',
        ...(extra || {}),
      });
      toast.success('Estado del candidato actualizado');
    } catch (error) {
      toast.error('Error al actualizar candidato');
    }
  };

  const handleReject = (reason: string, observations: string) => {
    if (!actingCandidate) return;
    handleCandidateStatusChange(actingCandidate.id, 'not_selected', {
      rejection_reason: reason,
      general_notes: observations,
    });
    setShowRejectDialog(false);
    setActingCandidate(null);
  };

  const handleWithdraw = (reason: string, observations: string) => {
    if (!actingCandidate) return;
    handleCandidateStatusChange(actingCandidate.id, 'withdrawn', {
      withdrawal_reason: reason,
      general_notes: observations,
    });
    setShowWithdrawDialog(false);
    setActingCandidate(null);
  };

  const handleConvertToEmployee = async (candidateId: string) => {
    // Check if candidate has approved medical exam
    const candidateData = candidates.find((c: any) => c.id === candidateId);
    const candidateSteps = candidateData?.selection_steps || [];
    const hasApprovedExam = candidateSteps.some(
      (s: any) => s.step_type === 'examenes_medicos' && s.status === 'passed' && ['apto', 'apto_restricciones', 'favorable'].includes(s.result)
    );

    if (!hasApprovedExam) {
      toast.error('Se requiere examen médico de ingreso aprobado', {
        description: 'Registre la etapa de Exámenes Médicos con concepto "Apto" o "Favorable" desde el detalle del candidato antes de contratar.',
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
    } catch (error: any) {
      console.error('Error al contratar candidato:', error);
      toast.error('Error al contratar candidato', {
        description: error?.message || 'Error desconocido',
      });
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
        <DialogContent className="flex flex-col max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden sm:w-full border-none shadow-2xl bg-background ">
        <TooltipProvider>
        <DialogTitle className="sr-only">Detalles de la Vacante</DialogTitle>
        <DialogDescription className="sr-only">Información detallada de la vacante para el cargo {vacancy.position_title}</DialogDescription>
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 pt-6 pb-4 sm:px-8 sm:pt-8">
          {/* Decorative patterns */}
          
          
          
          {/* Pattern overlay (dots) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col md:flex-row items-start gap-6">
            {/* Avatar/Initial */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner border border-border transition-transform hover:scale-105 duration-300">
              {vacancy.position_title.substring(0, 2).toUpperCase()}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn('max-w-full gap-1.5 self-start truncate font-bold animate-in fade-in slide-in-from-left-2 duration-500', statusStyle.bg, statusStyle.text, statusStyle.border)}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {vacancyStatusLabels[status]}
                </Badge>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium capitalize">
                  {vacancyTypeLabels[vacancy.vacancy_type as keyof typeof vacancyTypeLabels]}
                </Badge>
              </div>
              
              <h2 className="text-2xl font-display font-bold text-foreground tracking-tight sm:text-3xl">
                {vacancy.position_title}
              </h2>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <Building2 className="w-4 h-4 text-primary/60" />
                  {(vacancy as any).operation_centers?.name || 'General'}
                </div>
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  Abierta desde {formatDateOnly(vacancy.open_date, "dd MMM yyyy", { locale: es })}
                </div>
                {vacancy.department_area && (
                  <div className="flex items-center gap-2 transition-colors hover:text-primary">
                    <Target className="w-4 h-4 text-primary/60" />
                    {vacancy.department_area}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-4 pt-0 flex-shrink-0 sm:px-8 border-b">
              <TabsList className="grid h-11 w-full grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1">
                <TabsTrigger value="info" className="h-9 min-w-0 gap-2 rounded-xl border border-transparent px-2 text-[10px] font-bold normal-case tracking-[0.08em] data-[state=active]:border-primary/20 data-[state=active]:shadow-none">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate font-semibold">Información</span>
                </TabsTrigger>
                <TabsTrigger value="candidates" className="h-9 min-w-0 gap-2 rounded-xl border border-transparent px-2 text-[10px] font-bold normal-case tracking-[0.08em] data-[state=active]:border-primary/20 data-[state=active]:shadow-none">
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="truncate font-semibold">Candidatos</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="h-9 min-w-0 gap-2 rounded-xl border border-transparent px-2 text-[10px] font-bold normal-case tracking-[0.08em] data-[state=active]:border-primary/20 data-[state=active]:shadow-none">
                  <Paperclip className="h-4 w-4 shrink-0" />
                  <span className="truncate font-semibold">Documentos</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Info Tab */}
              <TabsContent value="info" className="p-4 mt-0 space-y-6 sm:p-6">
                {/* Cancellation Info Card */}
                {status === 'cancelled' && (
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-destructive">
                        <XCircle className="w-4 h-4" />
                        Detalles de Cancelación
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cancelado por</p>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {(vacancy as any).cancelled_by_profile?.full_name || 'Sistema'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha de Cancelación</p>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="font-medium text-sm">
                              {(vacancy as any).cancelled_at 
                                ? format(new Date((vacancy as any).cancelled_at), 'dd MMM yyyy, hh:mm a', { locale: es })
                                : 'No registrada'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-destructive/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Justificación</p>
                        <p className="text-sm italic text-foreground/80 leading-relaxed">
                          {(vacancy as any).cancellation_reason || 'Sin justificación registrada'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Requisition Info Card */}
                {requisition && (
                  <Card className="border-primary/20 ">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-primary" />
                        Requisición de Origen
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Codigo</p>
                          <Badge variant="outline" className="border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                            {requisition.requisition_code || 'RQ-PEND'}
                          </Badge>
                        </div>
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
                      <p className="font-medium">{formatDateOnly(vacancy.open_date, 'dd MMM yyyy', { locale: es })}</p>
                    </div>
                  </div>
                  {vacancy.target_close_date && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cierre Objetivo</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="font-medium">{formatDateOnly(vacancy.target_close_date, 'dd MMM yyyy', { locale: es })}</p>
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
                    <div className="mt-3 p-3 bg-background rounded-lg">
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
                        {((vacancy as any).vacancy_education_levels?.length > 0) ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Niveles Educativos:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 ml-6">
                              {(vacancy as any).vacancy_education_levels.map((vel: any) => (
                                <Badge key={vel.education_levels.id} variant="secondary" className="text-[10px] py-0 h-5">
                                  {vel.education_levels.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : vacancy.education_level && (
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Colocado
                    </h3>
                    <ColocadoUpload
                      vacancyId={vacancy.id}
                      uploading={uploadingColocadoDocs}
                      onUpload={handleColocadoUpload}
                    />
                  </div>
                  <div className="space-y-2">
                    {vacancy.colocado_url && (
                      <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
                        <Badge variant="outline" className="shrink-0 text-[10px] font-black uppercase tracking-wider">
                          Colocado
                        </Badge>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">Documento adjunto</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-primary"
                          onClick={() => window.open(vacancy.colocado_url!, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {colocadoDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 rounded-md border bg-muted/30 p-3"
                      >
                        <Badge variant="outline" className="shrink-0 text-[10px] font-black uppercase tracking-wider">
                          Colocado
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{doc.document_name || doc.file_name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {[formatFileSize(doc.file_size), doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es }) : null]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {!vacancy.colocado_url && colocadoDocuments.length === 0 && (
                      <div className="rounded-md border border-dashed bg-muted/20 px-3 py-4 text-center text-sm text-muted-foreground">
                        Sin documentos colocados
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="mt-0 p-3 space-y-3 sm:p-5">
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
                      className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                      onClick={() => setShowGenerateLink(true)}
                      disabled={vacancy?.status !== 'in_process'}
                    >
                      <Link2 className="h-4 w-4 shrink-0 sm:mr-2" />
                      <span className="truncate">Generar Enlace</span>
                    </Button>
                    <Button
                      size="sm"
                      className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                      onClick={() => setShowCandidateForm(true)}
                      disabled={vacancy?.status !== 'in_process'}
                      title={vacancy?.status !== 'in_process' ? 'Solo se pueden agregar candidatos cuando la vacante está En Proceso' : undefined}
                    >
                      <UserPlus className="h-4 w-4 shrink-0 sm:mr-2" />
                      <span className="truncate">Agregar</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {candidates.length === 0 ? (
                    <div className="text-center py-8 bg-background rounded-lg">
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
                      className="-mx-4 overflow-x-auto overflow-y-hidden px-4 pb-4 sm:-mx-6 sm:px-6"
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
                            className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-background transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between"
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
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
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

                            <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-nowrap sm:justify-end">
                              <Badge className={cn('text-xs', statusStyle.bg, statusStyle.text)}>
                                {candidateStatusLabels[candidateStatus]}
                              </Badge>

                              {candidateStatus === 'selected' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConvertToEmployee(candidate.id);
                                      }}
                                      disabled={convertToEmployee.isPending || status === 'cancelled'}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Contratar
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Convertir candidato seleccionado en empleado</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {candidateStatus !== 'hired' && candidateStatus !== 'withdrawn' && candidateStatus !== 'not_selected' && (
                                <div className="flex justify-end gap-1">
                                  {candidateStatus !== 'selected' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="text-success hover:text-success"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCandidateStatusChange(candidate.id, 'selected');
                                          }}
                                          disabled={status === 'cancelled' || isSelectionLimitReached}
                                        >
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Seleccionar
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{isSelectionLimitReached ? `Límite de vacantes alcanzado (${positionsCount})` : 'Seleccionar como finalista'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActingCandidate({ id: candidate.id, name: `${candidate.first_name} ${candidate.last_name}` });
                                          setShowRejectDialog(true);
                                        }}
                                        disabled={status === 'cancelled' || (isSelectionLimitReached && candidateStatus !== 'selected')}
                                      >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Descartar
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{isSelectionLimitReached && candidateStatus !== 'selected' ? `Límite de vacantes alcanzado (${positionsCount})` : 'Descartar candidato del proceso'}</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-warning hover:text-warning"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActingCandidate({ id: candidate.id, name: `${candidate.first_name} ${candidate.last_name}` });
                                          setShowWithdrawDialog(true);
                                        }}
                                        disabled={status === 'cancelled' || (isSelectionLimitReached && candidateStatus !== 'selected')}
                                      >
                                        <UserX className="w-4 h-4 mr-1" />
                                        Desistió
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{isSelectionLimitReached && candidateStatus !== 'selected' ? `Límite de vacantes alcanzado (${positionsCount})` : 'Registrar que el candidato desistió'}</p>
                                    </TooltipContent>
                                  </Tooltip>
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
              <TabsContent value="documents" className="mt-0 space-y-3 p-3 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      onChange={(e) => {
                        handleDocUpload(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
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
                ) : generalDocuments.length === 0 ? (
                  <div
                    className="text-center py-10 bg-background rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => document.getElementById(`vacancy-doc-upload-${vacancyId}`)?.click()}
                  >
                    <Paperclip className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay documentos adjuntos</p>
                    <p className="text-xs text-muted-foreground mt-1">Haz clic para subir archivos (PDF, imágenes, Word, Excel — máx 10MB)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {generalDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-background sm:flex-row sm:items-center"
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
          <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-background flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {status === 'open' && (
                <Button variant="outline" onClick={() => handleStatusChange('in_process')}>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar Proceso
                </Button>
              )}
              {status === 'in_process' && (
                <>
                  <Button variant="outline" onClick={() => handleStatusChange('paused')}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar Vacante
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('pending_placed')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Pendiente Colocado
                  </Button>
                  <Button variant="outline" onClick={() => handleStatusChange('closed')}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Cerrar Vacante
                  </Button>
                </>
              )}
              {status === 'paused' && (
                <Button variant="outline" onClick={() => handleStatusChange('in_process')}>
                  <Play className="w-4 h-4 mr-2" />
                  Reanudar Proceso
                </Button>
              )}
              {status === 'pending_placed' && (
                <Button variant="outline" onClick={() => handleStatusChange('closed')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Cerrar Vacante
                </Button>
              )}
              {(status === 'open' || status === 'in_process' || status === 'paused' || status === 'pending_placed') && (
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
        </TooltipProvider>
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

      {/* Cancellation Justification Dialog */}
      <Dialog open={isCanceledDialogOpen} onOpenChange={setIsCanceledDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Cancelar Vacante
            </DialogTitle>
            <DialogDescription>
              Por favor, ingrese el motivo de la cancelación. Esta acción desactivará las opciones de los candidatos vinculados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Escriba aquí la justificación de la cancelación..."
              className="min-h-[120px] resize-none"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsCanceledDialogOpen(false)}
              disabled={isSubmittingCancellation}
            >
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isSubmittingCancellation || !cancellationReason.trim()}
            >
              {isSubmittingCancellation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelación'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <CandidateReasonDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        type="rejection"
        onConfirm={handleReject}
        isPending={updateCandidate.isPending}
        candidateName={actingCandidate?.name || ''}
      />

      {/* Withdrawal Reason Dialog */}
      <CandidateReasonDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        type="withdrawal"
        onConfirm={handleWithdraw}
        isPending={updateCandidate.isPending}
        candidateName={actingCandidate?.name || ''}
      />
    </>
  );
}

function ColocadoUpload({
  vacancyId,
  uploading,
  onUpload,
}: {
  vacancyId: string;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
}) {
  return (
    <>
      <input
        id={`colocado-detail-${vacancyId}`}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={(e) => {
          onUpload(e.target.files);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-2 rounded-md px-3 text-sm font-medium"
        onClick={() => document.getElementById(`colocado-detail-${vacancyId}`)?.click()}
        disabled={uploading}
      >
        {uploading ? <Upload className="h-4 w-4 animate-pulse" /> : <Plus className="h-4 w-4" />}
        {uploading ? 'Subiendo...' : 'Cargar'}
      </Button>
    </>
  );
}
