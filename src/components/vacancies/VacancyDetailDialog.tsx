import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { useUpdateCandidate, useConvertToEmployee } from '@/hooks/useCandidates';
import { CandidateFormDialog } from './CandidateFormDialog';
import { CandidateDetailDialog } from '@/components/selection/CandidateDetailDialog';
import { CandidateKanban } from '@/components/selection/CandidateKanban';
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
  const navigate = useNavigate();
  
  const { data: vacancy, isLoading } = useVacancy(vacancyId);
  const updateVacancy = useUpdateVacancy();
  const updateCandidate = useUpdateCandidate();
  const convertToEmployee = useConvertToEmployee();
  
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-display text-xl">{vacancy.position_title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {(vacancy as any).operation_centers?.name || 'General'}
                    {vacancy.department_area && ` • ${vacancy.department_area}`}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn('gap-1', statusStyle.bg, statusStyle.text, statusStyle.border)}
              >
                <StatusIcon className="w-3 h-3" />
                {vacancyStatusLabels[status]}
              </Badge>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="px-6 pt-2 border-b flex-shrink-0">
              <TabsList className="h-10">
                <TabsTrigger value="info" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="candidates" className="gap-2">
                  <Users className="w-4 h-4" />
                  Candidatos ({candidates.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Info Tab */}
              <TabsContent value="info" className="p-6 mt-0 space-y-6">
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
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
              <TabsContent value="candidates" className="mt-0 p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-violet-light flex items-center justify-center">
                      <Users className="w-4 h-4 text-violet" />
                    </div>
                    {candidates.length} Candidato{candidates.length !== 1 && 's'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <ToggleGroup
                      type="single"
                      value={candidateViewMode}
                      onValueChange={(v) => v && setCandidateViewMode(v as 'table' | 'kanban')}
                      className="border rounded-lg p-1"
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
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => openCandidateDetail(candidate.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-violet-light flex items-center justify-center">
                                <span className="font-medium text-violet">
                                  {candidate.first_name[0]}{candidate.last_name[0]}
                                </span>
                              </div>
                              <div>
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

                            <div className="flex items-center gap-2">
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
              </TabsContent>
            </div>
          </Tabs>


          {/* Footer Actions */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
