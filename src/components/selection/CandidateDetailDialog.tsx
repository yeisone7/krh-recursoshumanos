import { useState, useCallback, useEffect, useRef } from 'react';
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
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock,
  Upload,
  Loader2,
  Trash2,
  Download,
  Eye,
  Paperclip,
  FolderOpen,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { useCandidate, useUpdateCandidate, useConvertToEmployee, useUpdateSelectionStep } from '@/hooks/useCandidates';
import { useEmployeeDocuments } from '@/hooks/useEmployeeHealth';
import { DocumentFormDialog } from '@/components/employees/DocumentFormDialog';
import { SelectionTimeline } from './SelectionTimeline';
import { SelectionStepFormDialog } from './SelectionStepFormDialog';
import {
  CandidateStatus,
  candidateStatusLabels,
  candidateStatusConfig,
  SelectionStepType,
  SelectionStepStatus,
} from '@/types/vacancy';
import type { Database } from '@/integrations/supabase/types';

type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];

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
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showSharedDocForm, setShowSharedDocForm] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const { user, currentCompanyId } = useAuth();
  const [selectedStep, setSelectedStep] = useState<SelectionStep | undefined>();
  const [defaultStepType, setDefaultStepType] = useState<SelectionStepType | undefined>();

  const { data: candidate, isLoading } = useCandidate(candidateId);
  const updateCandidate = useUpdateCandidate();
  const convertToEmployee = useConvertToEmployee();
  const updateStep = useUpdateSelectionStep();

  const candidateEmployeeId = candidate?.employee_id || undefined;
  const { data: sharedDocs = [], isLoading: loadingSharedDocs } = useEmployeeDocuments(candidateEmployeeId);

  const fetchCandidateDocs = useCallback(async () => {
    if (!candidateId) return;
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocuments(data || []);
    } catch {
      // silent
    } finally {
      setLoadingDocs(false);
    }
  }, [candidateId]);

  useEffect(() => {
    if (open && candidateId) {
      fetchCandidateDocs();
    }
  }, [open, candidateId, fetchCandidateDocs]);

  if (isLoading || !candidate) {
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

  const handleStatusChange = async (newStatus: CandidateStatus) => {
    try {
      await updateCandidate.mutateAsync({
        id: candidate.id,
        status: newStatus,
        is_selected: newStatus === 'selected',
      });
      toast.success('Estado del candidato actualizado');
    } catch (error) {
      toast.error('Error al actualizar candidato');
    }
  };

  const handleConvert = async () => {
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


  const handleCandidateDocUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !currentCompanyId) return;
    setUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede 10MB`);
          continue;
        }
        const ext = file.name.split('.').pop();
        const filePath = `candidates/docs_${candidateId}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

        const { error: insertError } = await supabase.from('candidate_documents').insert({
          candidate_id: candidateId,
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
      fetchCandidateDocs();
    } catch {
      toast.error('Error al subir documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteCandidateDoc = async (docId: string) => {
    try {
      const { error } = await supabase.from('candidate_documents').delete().eq('id', docId);
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary text-lg">
                    {candidate.first_name[0]}{candidate.last_name[0]}
                  </span>
                </div>
                <div>
                  <DialogTitle className="font-display text-xl">
                    {candidate.first_name} {candidate.last_name}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {vacancy?.position_title || 'Vacante'}
                    {vacancy?.operation_centers?.name && ` • ${vacancy.operation_centers.name}`}
                  </p>
                </div>
              </div>
              <Badge className={cn('gap-1', statusStyle.bg, statusStyle.text)}>
                {candidateStatusLabels[status]}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-6 pt-2 border-b">
              <TabsList className="h-10">
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Proceso
                </TabsTrigger>
                <TabsTrigger value="info" className="gap-2">
                  <User className="w-4 h-4" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="documents" className="gap-2">
                  <Paperclip className="w-4 h-4" />
                  Documentos
                </TabsTrigger>
                {candidate.employee_id && (
                  <TabsTrigger value="shared_docs" className="gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Docs Compartidos
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(90vh-260px)]">
              {/* Timeline Tab */}
              <TabsContent value="timeline" className="p-6 mt-0">
                <SelectionTimeline
                  steps={steps}
                  candidateId={candidate.id}
                  onAddStep={handleAddStep}
                  onEditStep={handleEditStep}
                  onUpdateStepStatus={handleUpdateStepStatus}
                />
              </TabsContent>

              {/* Info Tab */}
              <TabsContent value="info" className="p-6 mt-0 space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Documento</p>
                      <p className="font-medium">{candidate.document_type} {candidate.document_number}</p>
                    </div>
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
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo biológico</p>
                        <p className="font-medium capitalize">{candidate.gender}</p>
                      </div>
                    )}
                    {(candidate as any).gender_identity && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sexo de identificación</p>
                        <p className="font-medium capitalize">
                          {(candidate as any).gender_identity === 'otro'
                            ? `Otro: ${(candidate as any).gender_identity_other || ''}`
                            : (candidate as any).gender_identity}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Contact */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Contacto
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    {(candidate.city || candidate.department) && (
                      <div className="space-y-1 col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Ubicación</p>
                        <p className="font-medium flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {[candidate.city, candidate.department].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Professional */}
                <div>
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Experiencia Profesional
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {candidate.education_level && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Nivel Educativo</p>
                        <p className="font-medium capitalize">{candidate.education_level}</p>
                      </div>
                    )}
                    {candidate.profession && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Profesión</p>
                        <p className="font-medium">{candidate.profession}</p>
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

                {/* Notes */}
                {(candidate.general_notes || candidate.strengths || candidate.weaknesses) && (
                  <>
                    <Separator />
                    <div className="space-y-4">
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
              <TabsContent value="documents" className="p-6 mt-0 space-y-4">
                {/* Upload */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-primary" />
                    Documentos del Candidato
                  </h3>
                  <div>
                    <input
                      ref={docInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      multiple
                      onChange={(e) => handleCandidateDocUpload(e.target.files)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => docInputRef.current?.click()}
                      disabled={uploadingDoc}
                    >
                      {uploadingDoc ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Subir documento
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, imágenes, Word o Excel (máx. 10MB por archivo)
                </p>

                {loadingDocs ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay documentos adjuntos</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-5 h-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.document_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                              {doc.created_at && ` • ${format(new Date(doc.created_at), 'dd MMM yyyy', { locale: es })}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(doc.file_url, '_blank')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCandidateDoc(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
            <div className="flex gap-2" role="group" aria-label="Acciones del candidato">
              {status === 'selected' && (
                <Button 
                  onClick={handleConvert} 
                  disabled={convertToEmployee.isPending}
                  aria-label={`Contratar a ${candidate.first_name} ${candidate.last_name}`}
                  data-testid="hire-candidate-button"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {convertToEmployee.isPending ? 'Procesando...' : 'Contratar'}
                </Button>
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
                    onClick={() => handleStatusChange('not_selected')}
                    aria-label={`Marcar a ${candidate.first_name} ${candidate.last_name} como no seleccionado`}
                    data-testid="reject-candidate-button"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    No Seleccionar
                  </Button>
                </>
              )}
            </div>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar diálogo de candidato"
              data-testid="close-candidate-dialog"
            >
              Cerrar
            </Button>
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
      />
    </>
  );
}
