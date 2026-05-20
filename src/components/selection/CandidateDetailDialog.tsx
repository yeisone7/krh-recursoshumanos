import { useState, useCallback, useEffect, useRef } from 'react';
import { ThankYouPreviewDialog } from './ThankYouPreviewDialog';
import { useCandidateBackground } from '@/hooks/useCandidateBackground';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  DollarSign,
  Calendar,
  FileText,
  Heart,
  CheckCircle,
  XCircle,
  UserX,
  RefreshCw,
  ArrowRight,
  Clock,
  Upload,
  Loader2,
  Trash2,
  Download,
  Eye,
  Paperclip,
  FolderOpen,
  FileDown,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  Folder,
  ExternalLink,
  Plus,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { 
  useCandidate, 
  useUpdateCandidate, 
  useConvertToEmployee, 
  useUpdateSelectionStep,
  useCandidateDocuments,
  useDeleteCandidateDocument 
} from '@/hooks/useCandidates';
import { useEmployeeDocuments } from '@/hooks/useEmployeeHealth';
import { DocumentFormDialog } from '@/components/employees/DocumentFormDialog';
import { SelectionTimeline } from './SelectionTimeline';
import { SelectionStepFormDialog } from './SelectionStepFormDialog';
import { CandidateReasonDialog } from './CandidateReasonDialog';
import { FamilyMembersSection } from './FamilyMembersSection';
import { generateCandidatePdf } from '@/lib/candidatePdf';
import { generateExamOrderPdf } from '@/lib/examOrderPdf';
import { CandidateBackgroundAlerts } from './CandidateBackgroundAlerts';
import {
  CandidateStatus,
  candidateStatusLabels,
  candidateStatusConfig,
  SelectionStepType,
  SelectionStepStatus,
} from '@/types/vacancy';
import { 
  employeeDocumentFolderOrder, 
  employeeDocumentTypeLabels, 
  normalizeEmployeeDocumentFolder 
} from '@/types/employee';
import type { Database } from '@/integrations/supabase/types';

type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];

function SectionCard({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card className="border border-border shadow-none">
      <CardContent className="p-3 sm:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Icon className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="min-w-0 break-words">{title}</span>
          </h3>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

interface CandidateDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
}

export function CandidateDetailDialog({
  open,
  onOpenChange,
  candidateId,
}: CandidateDetailDialogProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showStepForm, setShowStepForm] = useState(false);
  const [showSharedDocForm, setShowSharedDocForm] = useState(false);
  const [isDocFormOpen, setIsDocFormOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const { user, currentCompanyId, hasPermission } = useAuth();
  const [selectedStep, setSelectedStep] = useState<SelectionStep | undefined>();
  const [defaultStepType, setDefaultStepType] = useState<SelectionStepType | undefined>();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showThanksDialog, setShowThanksDialog] = useState(false);

  const { data: candidate, isLoading } = useCandidate(candidateId);
  const updateCandidate = useUpdateCandidate();
  const convertToEmployee = useConvertToEmployee();
  const updateStep = useUpdateSelectionStep();

  const candidateEmployeeId = candidate?.employee_id || undefined;
  const { data: sharedDocs = [], isLoading: loadingSharedDocs } = useEmployeeDocuments(candidateEmployeeId);
  const { data: candidateDocs = [], isLoading: loadingDocs } = useCandidateDocuments(candidateId);
  const deleteCandidateDoc = useDeleteCandidateDocument();
  const { background, loading: bgLoading, checkBackground } = useCandidateBackground();

  // Auto-check background when candidate loads
  useEffect(() => {
    if (candidate?.document_number && open) {
      checkBackground(candidate.document_number, currentCompanyId);
    }
  }, [candidate?.document_number, open, currentCompanyId]);


  if (isLoading || !candidate) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Cargando candidato</DialogTitle>
          <DialogDescription className="sr-only">Por favor espere mientras se carga la información del candidato.</DialogDescription>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const status = candidate.status as CandidateStatus;
  const statusStyle = candidateStatusConfig[status];
  const steps = (candidate as any).selection_steps || [];
  const vacancy = (candidate as any).vacancies;

  const handleAddStep = (stepType: SelectionStepType) => {
    setSelectedStep(undefined);
    setDefaultStepType(stepType);
    setShowStepForm(true);
  };

  const handleEditStep = (step: SelectionStep) => {
    setSelectedStep(step);
    setDefaultStepType(undefined);
    setShowStepForm(true);
  };

  const handleStepFormOpenChange = (nextOpen: boolean) => {
    setShowStepForm(nextOpen);

    if (!nextOpen) {
      setSelectedStep(undefined);
      setDefaultStepType(undefined);
    }
  };

  const handleUpdateStepStatus = async (stepId: string, newStatus: SelectionStepStatus) => {
    try {
      await updateStep.mutateAsync({
        id: stepId,
        status: newStatus,
        completed_date: newStatus === 'passed' || newStatus === 'failed' ? new Date().toISOString() : null,
      });
      toast.success('Estado de etapa actualizado');
    } catch (error) {
      toast.error('Error al actualizar etapa');
    }
  };

  const handleStatusChange = async (newStatus: CandidateStatus, extra?: { rejection_reason?: string; general_notes?: string; withdrawal_reason?: string }) => {
    try {
      await updateCandidate.mutateAsync({
        id: candidate.id,
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
    handleStatusChange('not_selected', {
      rejection_reason: reason,
      general_notes: observations || candidate.general_notes || null,
    });
    setShowRejectDialog(false);
  };

  const handleWithdraw = (reason: string, observations: string) => {
    handleStatusChange('withdrawn', {
      withdrawal_reason: reason,
      general_notes: observations || candidate.general_notes || null,
    });
    setShowWithdrawDialog(false);
  };

  // Check if medical exam is approved (required for hiring)
  const hasApprovedMedicalExam = steps.some(
    (s: any) => s.step_type === 'examenes_medicos' && s.status === 'passed' && ['apto', 'apto_restricciones', 'favorable'].includes(s.result)
  );

  const handleConvert = async () => {
    if (!hasApprovedMedicalExam) {
      toast.error('Se requiere examen médico de ingreso aprobado', {
        description: 'Registre la etapa de Exámenes Médicos con concepto "Apto" o "Favorable" antes de contratar.',
      });
      return;
    }
    try {
      const result = await convertToEmployee.mutateAsync({
        candidateId: candidate.id,
        operationCenterId: vacancy?.operation_center_id,
        createEntryExam: true,
      });
      toast.success('Candidato contratado exitosamente', {
        description: `Se creó el empleado, contrato y examen de ingreso para ${result.employee.first_name} ${result.employee.last_name}.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error al contratar candidato:', error);
      toast.error('Error al contratar candidato', {
        description: error?.message || 'Error desconocido',
      });
    }
  };



  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden sm:w-full">
          <DialogTitle className="sr-only">Detalles del Candidato</DialogTitle>
          <DialogDescription className="sr-only">Información detallada del candidato {candidate.first_name} {candidate.last_name}</DialogDescription>
          <DialogHeader className="px-4 pt-5 pb-4 border-b border-border sm:px-6 sm:pt-6">
            <div className="flex flex-col items-start gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between sm:pr-0">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center sm:h-12 sm:w-12">
                  <span className="font-semibold text-primary text-lg">
                    {candidate.first_name[0]}{candidate.last_name[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <DialogTitle className="font-display text-lg leading-tight sm:text-xl">
                    {candidate.first_name} {candidate.last_name}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground break-words">
                    {vacancy?.position_title || 'Vacante'}
                    {vacancy?.operation_centers?.name && ` • ${vacancy.operation_centers.name}`}
                  </p>
                </div>
              </div>
              <Badge className={cn('max-w-full self-start truncate', statusStyle.bg, statusStyle.text)}>
                {candidateStatusLabels[status]}
              </Badge>
            </div>
          </DialogHeader>

          {/* Background alerts */}
          <div className="px-4 sm:px-6">
            <CandidateBackgroundAlerts background={background} loading={bgLoading} compact />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-4 pt-2 border-b sm:px-6">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-background p-1 sm:inline-flex sm:h-10 sm:w-auto sm:gap-0">
                <TabsTrigger value="timeline" className="h-9 min-w-0 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="truncate">Proceso</span>
                </TabsTrigger>
                <TabsTrigger value="info" className="h-9 min-w-0 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                  <User className="w-4 h-4" />
                  <span className="truncate">Información</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="h-9 min-w-0 gap-1 px-2 text-xs sm:gap-2 sm:text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span className="truncate">Documentos</span>
                </TabsTrigger>
                {candidate.employee_id && (
                  <TabsTrigger value="shared_docs" className="col-span-3 h-9 min-w-0 gap-1 px-2 text-xs sm:col-span-1 sm:gap-2 sm:text-sm">
                    <FolderOpen className="w-4 h-4" />
                    <span className="truncate">Docs Compartidos</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="overflow-y-auto scrollbar-themed" style={{ maxHeight: 'calc(92dvh - 280px)' }}>
              {/* Timeline Tab */}
              <TabsContent value="timeline" className="p-4 mt-0 sm:p-6">
                <SelectionTimeline
                  steps={steps}
                  candidateId={candidate.id}
                  onAddStep={handleAddStep}
                  onEditStep={handleEditStep}
                  onUpdateStepStatus={handleUpdateStepStatus}
                  onGenerateExamOrder={async (step) => {
                    try {
                      await generateExamOrderPdf({
                        candidate: {
                          first_name: candidate.first_name,
                          last_name: candidate.last_name,
                          document_type: candidate.document_type,
                          document_type_name: (candidate as any).identification_types?.name,
                          document_number: candidate.document_number,
                          birth_date: candidate.birth_date,
                          gender: candidate.gender,
                          email: candidate.email,
                          mobile: candidate.mobile,
                          phone: candidate.phone,
                          address: candidate.address,
                          city: candidate.city,
                          department: candidate.department,
                        },
                        vacancy: {
                          position_title: vacancy?.position_title || 'N/A',
                          operation_center_id: vacancy?.operation_center_id,
                          operation_centers: vacancy?.operation_centers,
                        },
                        step: {
                          provider: step.provider,
                          doctor_name: step.doctor_name,
                          scheduled_date: step.scheduled_date,
                          exam_profesiograma_items: (step as any).exam_profesiograma_items,
                          notes: step.notes,
                        },
                        companyId: currentCompanyId!,
                      });
                      toast.success('Orden de examen generada');
                    } catch (err) {
                      console.error('Error generating exam order:', err);
                      toast.error('Error al generar la orden de examen');
                    }
                  }}
                />
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="p-4 mt-0 space-y-6 sm:p-6">
                {/* Personal Info */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Documento</p>
                      <p className="font-medium">
                        {(candidate as any).identification_types?.name || candidate.document_type || 'Documento'} {candidate.document_number}
                      </p>
                    </div>
                    {(candidate as any).document_issue_date && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Expedición</p>
                        <p className="font-medium">
                          {format(new Date((candidate as any).document_issue_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                    {(candidate as any).document_issue_city && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Lugar Expedición</p>
                        <p className="font-medium">{(candidate as any).document_issue_city}</p>
                      </div>
                    )}
                    {candidate.birth_date && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Nacimiento</p>
                        <p className="font-medium">
                          {format(new Date(candidate.birth_date), 'dd MMM yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                    {candidate.gender && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo Biológico</p>
                        <p className="font-medium capitalize">{candidate.gender}</p>
                      </div>
                    )}
                    {(candidate as any).gender_identity && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo de Identificación</p>
                        <p className="font-medium capitalize">
                          {(candidate as any).gender_identity === 'otro'
                            ? `Otro: ${(candidate as any).gender_identity_other || ''}`
                            : (candidate as any).gender_identity}
                        </p>
                      </div>
                    )}
                    {(candidate as any).blood_type && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Sangre</p>
                        <p className="font-medium">{(candidate as any).blood_type}</p>
                      </div>
                    )}
                    {(candidate as any).marital_status && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado Civil</p>
                        <p className="font-medium capitalize">{(candidate as any).marital_status}</p>
                      </div>
                    )}
                    {(candidate as any).ethnic_group && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Grupo Étnico</p>
                        <p className="font-medium capitalize">{(candidate as any).ethnic_group}</p>
                      </div>
                    )}
                    {(candidate as any).disability_type && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Discapacidad</p>
                        <p className="font-medium capitalize">{(candidate as any).disability_type}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Especificaciones */}
                {((candidate as any).is_first_job || (candidate as any).is_head_of_household || (candidate as any).is_conflict_victim || (candidate as any).is_demobilized) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Especificaciones de la Persona
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(candidate as any).is_first_job && (
                          <Badge variant="outline" className="bg-info/10 text-info border-info/20">Primer Empleo</Badge>
                        )}
                        {(candidate as any).is_head_of_household && (
                          <Badge variant="outline" className="bg-violet-light text-violet border-violet/20">Madre/Padre Cabeza de Familia</Badge>
                        )}
                        {(candidate as any).is_conflict_victim && (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Víctima del Conflicto</Badge>
                        )}
                        {(candidate as any).is_demobilized && (
                          <Badge variant="outline" className="bg-tertiary/10 text-tertiary border-tertiary/20">Desmovilizado</Badge>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Contact & Address */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Contacto y Ubicación
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {candidate.email && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                        <p className="font-medium">{candidate.email}</p>
                      </div>
                    )}
                    {candidate.mobile && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Celular</p>
                        <p className="font-medium">{candidate.mobile}</p>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Teléfono</p>
                        <p className="font-medium">{candidate.phone}</p>
                      </div>
                    )}
                    {candidate.address && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Dirección</p>
                        <p className="font-medium">{candidate.address}</p>
                      </div>
                    )}
                    {(candidate as any).neighborhood && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Barrio, Vereda u Otro</p>
                        <p className="font-medium">{(candidate as any).neighborhood}</p>
                      </div>
                    )}
                    {(candidate.city || candidate.department) && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Ciudad / Departamento</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {[candidate.city, candidate.department].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                {((candidate as any).emergency_contact_name || (candidate as any).emergency_contact_phone) && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        Contacto de Emergencia
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {(candidate as any).emergency_contact_name && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</p>
                            <p className="font-medium">{(candidate as any).emergency_contact_name}</p>
                          </div>
                        )}
                        {(candidate as any).emergency_contact_phone && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Teléfono</p>
                            <p className="font-medium">{(candidate as any).emergency_contact_phone}</p>
                          </div>
                        )}
                        {(candidate as any).emergency_contact_relationship && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">Parentesco</p>
                            <p className="font-medium">{(candidate as any).emergency_contact_relationship}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Professional */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Experiencia Profesional
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {((candidate as any).education_levels?.name || (candidate as any).education_level) && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Nivel Educativo</p>
                        <p className="font-medium capitalize">{((candidate as any).education_levels?.name || (candidate as any).education_level)}</p>
                      </div>
                    )}
                    {((candidate as any).professions?.name || (candidate as any).profession) && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Profesión</p>
                        <p className="font-medium">{((candidate as any).professions?.name || (candidate as any).profession)}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Años Experiencia</p>
                      <p className="font-medium">{candidate.experience_years || 0}</p>
                    </div>
                    {candidate.current_company && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Empresa Actual</p>
                        <p className="font-medium">{candidate.current_company}</p>
                      </div>
                    )}
                    {candidate.current_position && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Cargo Actual</p>
                        <p className="font-medium">{candidate.current_position}</p>
                      </div>
                    )}
                    {candidate.salary_expectation && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Aspiración Salarial</p>
                        <p className="font-medium">{formatSalary(candidate.salary_expectation)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recruitment Info */}
                <Separator />
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    Información de Postulación
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Postulación</p>
                      <p className="font-medium">
                        {format(new Date(candidate.application_date), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    {candidate.source && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Fuente</p>
                        <p className="font-medium capitalize">{candidate.source}</p>
                      </div>
                    )}
                    {candidate.final_score != null && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Puntaje Final</p>
                        <p className="font-medium">{candidate.final_score}</p>
                      </div>
                    )}
                    {candidate.final_concept && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Concepto Final</p>
                        <p className="font-medium">{candidate.final_concept}</p>
                      </div>
                    )}
                    {candidate.rejection_reason && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Motivo de Rechazo</p>
                        <p className="font-medium text-destructive">{candidate.rejection_reason}</p>
                      </div>
                    )}
                    {(candidate as any).withdrawal_reason && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Motivo de Retiro</p>
                        <p className="font-medium text-warning">{(candidate as any).withdrawal_reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Family Members */}
                <FamilyMembersSection candidateId={candidate.id} />

                {/* Notes */}
                {(candidate.general_notes || candidate.strengths || candidate.weaknesses) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Observaciones
                      </h3>
                      {candidate.strengths && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Fortalezas</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.strengths}</p>
                        </div>
                      )}
                      {candidate.weaknesses && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Áreas de Mejora</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.weaknesses}</p>
                        </div>
                      )}
                      {candidate.general_notes && (
                        <div>
                          <h4 className="text-sm font-medium text-foreground mb-2">Notas Generales</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{candidate.general_notes}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="p-0 mt-0">
                <div className="p-4 sm:p-6 space-y-4">
                  {loadingDocs ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <SectionCard 
                      title="Documentos del Candidato" 
                      icon={FileText}
                      action={
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDocFormOpen(true)}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Cargar
                        </Button>
                      }
                    >
                      <div className="space-y-1">
                        {employeeDocumentFolderOrder.map((folder) => {
                          const folderDocs = candidateDocs.filter(
                            (d) => normalizeEmployeeDocumentFolder(d.document_type as any) === folder
                          );
                          const isExpanded = expandedFolders.includes(folder);

                          return (
                            <div key={folder} className="relative">
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background /60 group"
                                onClick={() =>
                                  setExpandedFolders((prev) =>
                                    isExpanded ? prev.filter((f) => f !== folder) : [...prev, folder]
                                  )
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                <Folder className="h-4 w-4 shrink-0 text-warning" />
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                  {employeeDocumentTypeLabels[folder]}
                                </span>
                                <Badge 
                                  variant="secondary" 
                                  className="h-5 min-w-[20px] justify-center text-[10px] bg-[#004269] text-white hover:bg-[#004269]/90"
                                >
                                  {folderDocs.length}
                                </Badge>
                              </button>

                              {isExpanded && (
                                <div className="ml-5 border-l border-border pl-3">
                                  {folderDocs.length > 0 ? (
                                    folderDocs.map((doc) => (
                                      <div 
                                        key={doc.id} 
                                        className="group relative py-1.5 before:absolute before:-left-3 before:top-5 before:h-px before:w-3 before:bg-border"
                                      >
                                        <div className="flex flex-col gap-2 rounded-lg bg-background p-2.5 transition-colors hover:bg-background sm:flex-row sm:items-center sm:justify-between">
                                          <div className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium">
                                              {doc.document_name}
                                            </span>
                                            <span className="block truncate text-[10px] text-muted-foreground mt-0.5">
                                              {formatFileSize(doc.file_size)} • {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                          </div>
                                          <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                                            {doc.expiry_date && (
                                              <Badge 
                                                variant={new Date(doc.expiry_date) < new Date() ? 'destructive' : 'outline'} 
                                                className="text-[10px] h-5"
                                              >
                                                Vence: {format(new Date(doc.expiry_date), 'dd MMM yyyy', { locale: es })}
                                              </Badge>
                                            )}
                                            <div className="flex items-center gap-1">
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8" 
                                                asChild
                                              >
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                  <ExternalLink className="h-4 w-4" />
                                                </a>
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => deleteCandidateDoc.mutate({ id: doc.id, candidateId })}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="relative py-2 pl-1 text-xs text-muted-foreground before:absolute before:-left-3 before:top-4 before:h-px before:w-3 before:bg-border">
                                      Sin documentos
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Otro folder for uncategorized docs */}
                        {candidateDocs.some(d => !d.document_type || !employeeDocumentFolderOrder.includes(normalizeEmployeeDocumentFolder(d.document_type as any))) && (
                          <div className="relative">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-background /60 group"
                              onClick={() =>
                                setExpandedFolders((prev) =>
                                  expandedFolders.includes('otro') ? prev.filter((f) => f !== 'otro') : [...prev, 'otro']
                                )
                              }
                            >
                              {expandedFolders.includes('otro') ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-sm font-medium">Otros documentos</span>
                              <Badge variant="secondary" className="h-5 text-[10px]">
                                {candidateDocs.filter(d => !d.document_type || !employeeDocumentFolderOrder.includes(normalizeEmployeeDocumentFolder(d.document_type as any))).length}
                              </Badge>
                            </button>

                            {expandedFolders.includes('otro') && (
                              <div className="ml-5 border-l border-border pl-3">
                                {candidateDocs
                                  .filter(d => !d.document_type || !employeeDocumentFolderOrder.includes(normalizeEmployeeDocumentFolder(d.document_type as any)))
                                  .map((doc) => (
                                    <div 
                                      key={doc.id} 
                                      className="group relative py-1.5 before:absolute before:-left-3 before:top-5 before:h-px before:w-3 before:bg-border"
                                    >
                                      <div className="flex items-center justify-between p-2 rounded-lg bg-background transition-colors hover:bg-background px-3">
                                        <span className="text-xs truncate max-w-[200px]">{doc.document_name}</span>
                                        <div className="flex items-center gap-1">
                                           <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                                             <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                               <ExternalLink className="h-3.5 w-3.5" />
                                             </a>
                                           </Button>
                                           <Button 
                                             size="icon" 
                                             variant="ghost" 
                                             className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                             onClick={() => deleteCandidateDoc.mutate({ id: doc.id, candidateId })}
                                           >
                                             <Trash2 className="h-3.5 w-3.5" />
                                           </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  )}
                </div>
              </TabsContent>

              {/* Shared Docs Tab */}
              {candidate.employee_id && (
                <TabsContent value="shared_docs" className="p-6 mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      Documentos Compartidos del Empleado
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSharedDocForm(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir documento
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estos documentos están vinculados al expediente del empleado y son visibles tanto aquí como en la vista de Empleados.
                  </p>

                  {loadingSharedDocs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : sharedDocs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No hay documentos compartidos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sharedDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {doc.document_name || doc.file_name || 'Documento'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {doc.document_type && <Badge variant="secondary" className="text-xs mr-2">{doc.document_type}</Badge>}
                                {formatFileSize(doc.file_size)}
                                {doc.upload_date && ` • ${format(new Date(doc.upload_date), 'dd MMM yyyy', { locale: es })}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                if (!doc.file_url) return;
                                try {
                                  const path = doc.file_url.includes('storage/v1/object/public/documents/')
                                    ? doc.file_url.split('storage/v1/object/public/documents/')[1]
                                    : doc.file_url.includes('storage/v1/object/documents/')
                                    ? doc.file_url.split('storage/v1/object/documents/')[1]
                                    : doc.file_url.startsWith('documents/')
                                    ? doc.file_url.replace('documents/', '')
                                    : doc.file_url;
                                  const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
                                  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                                } catch {
                                  toast.error('Error al acceder al documento');
                                }
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>

          {/* Footer Actions */}
          <div className="px-4 py-4 border-t border-border bg-background flex flex-col gap-3 sm:flex-row sm:justify-between sm:px-6">
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap" role="group" aria-label="Acciones del candidato">
              {status === 'selected' && (
                <>
                  <Button 
                    onClick={handleConvert} 
                    disabled={convertToEmployee.isPending || !hasApprovedMedicalExam}
                    aria-label={`Contratar a ${candidate.first_name} ${candidate.last_name}`}
                    data-testid="hire-candidate-button"
                    title={!hasApprovedMedicalExam ? 'Se requiere examen médico de ingreso aprobado para contratar' : ''}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {convertToEmployee.isPending ? 'Procesando...' : 'Contratar'}
                  </Button>
                  {!hasApprovedMedicalExam && (
                    <Button
                      variant="outline"
                      className="text-primary hover:text-primary border-primary/30 hover:border-primary hover:bg-primary/10"
                      onClick={() => handleAddStep('examenes_medicos' as SelectionStepType)}
                    >
                      <Stethoscope className="w-4 h-4 mr-2" />
                      Registrar Examen Médico
                    </Button>
                  )}
                </>
              )}
               {status !== 'hired' && status !== 'selected' && status !== 'not_selected' && status !== 'withdrawn' && (
                <>
                  <Button
                    variant="outline"
                    className="text-success hover:text-success border-success/30 hover:border-success hover:bg-success/10"
                    onClick={() => handleStatusChange('selected')}
                    aria-label={`Marcar a ${candidate.first_name} ${candidate.last_name} como seleccionado`}
                    data-testid="select-candidate-button"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Seleccionar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                    onClick={() => setShowRejectDialog(true)}
                    aria-label={`Marcar a ${candidate.first_name} ${candidate.last_name} como no seleccionado`}
                    data-testid="reject-candidate-button"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    No Seleccionar
                  </Button>
                  <Button
                    variant="outline"
                    className="text-warning hover:text-warning border-warning/30 hover:border-warning hover:bg-warning/10"
                    onClick={() => setShowWithdrawDialog(true)}
                    aria-label={`Registrar retiro de ${candidate.first_name} ${candidate.last_name}`}
                    data-testid="withdraw-candidate-button"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Retirar
                  </Button>
                </>
              )}
              {(status === 'not_selected' || status === 'withdrawn') && (
                <>
                  <Button
                    variant="outline"
                    className="text-primary hover:text-primary border-primary/30 hover:border-primary hover:bg-primary/10"
                    onClick={() => handleStatusChange('applied', {
                      rejection_reason: null,
                      withdrawal_reason: null,
                    } as any)}
                    disabled={updateCandidate.isPending}
                    aria-label={`Reactivar a ${candidate.first_name} ${candidate.last_name}`}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reactivar
                  </Button>
                  {status === 'not_selected' && (
                    <Button
                      variant="outline"
                      className="text-accent hover:text-accent border-accent/30 hover:border-accent hover:bg-accent/10"
                      onClick={() => setShowThanksDialog(true)}
                      disabled={!!(candidate as any).thanks_sent_at}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {(candidate as any).thanks_sent_at ? 'Agradecimiento Enviado' : 'Enviar Agradecimiento'}
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            {(hasPermission('seleccion', 'view') || hasPermission('reportes', 'view')) && (
              <Button
                variant="outline"
                onClick={() => generateCandidatePdf(candidate as any)}
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                Ficha PDF
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar diálogo de candidato"
              data-testid="close-candidate-dialog"
            >
              Cerrar
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step Form Dialog */}
      <SelectionStepFormDialog
        key={`${selectedStep?.id ?? 'new'}-${defaultStepType ?? 'none'}-${showStepForm ? 'open' : 'closed'}`}
        open={showStepForm}
        onOpenChange={handleStepFormOpenChange}
        candidateId={candidateId}
        step={selectedStep}
        defaultStepType={defaultStepType}
        existingStepOrder={steps.length}
        vacancyOperationCenterId={vacancy?.operation_center_id}
        vacancyPositionId={vacancy?.position_id}
      />

      {/* Document Form Dialog */}
      <DocumentFormDialog
        open={isDocFormOpen}
        onOpenChange={setIsDocFormOpen}
        entityId={candidate.id}
        entityType="candidate"
        companyId={currentCompanyId!}
        entityName={`${candidate.first_name} ${candidate.last_name}`}
      />

      {/* Shared Document Form Dialog */}
      {candidate?.employee_id && currentCompanyId && (
        <DocumentFormDialog
          open={showSharedDocForm}
          onOpenChange={setShowSharedDocForm}
          entityId={candidate.employee_id}
          entityType="employee"
          companyId={currentCompanyId}
          entityName={`${candidate.first_name} ${candidate.last_name}`}
        />
      )}

      {/* Rejection Reason Dialog */}
      <CandidateReasonDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        type="rejection"
        onConfirm={handleReject}
        isPending={updateCandidate.isPending}
        candidateName={`${candidate.first_name} ${candidate.last_name}`}
      />

      {/* Withdrawal Reason Dialog */}
      <CandidateReasonDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        type="withdrawal"
        onConfirm={handleWithdraw}
        isPending={updateCandidate.isPending}
        candidateName={`${candidate.first_name} ${candidate.last_name}`}
      />

      {/* Thank You Dialog */}
      <ThankYouPreviewDialog
        open={showThanksDialog}
        onOpenChange={setShowThanksDialog}
        candidateId={candidate.id}
        candidateName={`${candidate.first_name} ${candidate.last_name}`}
        candidateEmail={candidate.email}
        alreadySent={!!(candidate as any).thanks_sent_at}
        onSent={() => {
          // Invalidate query to refresh candidate data
        }}
      />
    </>
  );
}
