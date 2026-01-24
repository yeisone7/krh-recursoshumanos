import { useState } from 'react';
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

import { useVacancy, useUpdateVacancy } from '@/hooks/useVacancies';
import { useUpdateCandidate, useConvertToEmployee } from '@/hooks/useCandidates';
import { CandidateFormDialog } from './CandidateFormDialog';
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
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  
  const { data: vacancy, isLoading } = useVacancy(vacancyId);
  const updateVacancy = useUpdateVacancy();
  const updateCandidate = useUpdateCandidate();
  const convertToEmployee = useConvertToEmployee();

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
      await convertToEmployee.mutateAsync({
        candidateId,
        operationCenterId: vacancy.operation_center_id || undefined,
      });
      toast.success('Candidato contratado y registrado como empleado');
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <div className="px-6 pt-2 border-b">
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

            <ScrollArea className="h-[calc(90vh-220px)]">
              {/* Info Tab */}
              <TabsContent value="info" className="p-6 mt-0 space-y-6">
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

                {/* Publication Platforms */}
                {vacancy.publication_platforms && vacancy.publication_platforms.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Plataformas de Publicación</h3>
                      <div className="flex flex-wrap gap-2">
                        {vacancy.publication_platforms.map((platform) => (
                          <Badge key={platform} variant="outline">{platform}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Candidates Tab */}
              <TabsContent value="candidates" className="p-6 mt-0 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {candidates.length} Candidato{candidates.length !== 1 && 's'}
                  </h3>
                  <Button size="sm" onClick={() => setShowCandidateForm(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar Candidato
                  </Button>
                </div>

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
                ) : (
                  <div className="space-y-3">
                    {candidates.map((candidate: any) => {
                      const candidateStatus = candidate.status as CandidateStatus;
                      const statusStyle = candidateStatusConfig[candidateStatus];

                      return (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-medium text-primary">
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
                                onClick={() => handleConvertToEmployee(candidate.id)}
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
                                    onClick={() => handleCandidateStatusChange(candidate.id, 'selected')}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleCandidateStatusChange(candidate.id, 'not_selected')}
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
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
            <div className="flex gap-2">
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
    </>
  );
}
