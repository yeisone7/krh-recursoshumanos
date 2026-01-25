import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  FileText,
  Gavel,
  History,
  Plus,
  Scale,
  User,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useDisciplinaryProcess, useAdvanceStatus } from '@/hooks/useDisciplinaryProcesses';
import {
  disciplinaryStatusLabels,
  faultTypeLabels,
  sanctionTypeLabels,
  getStatusColor,
  getFaultColor,
  canAdvanceStatus,
  getNextStatusAction,
  DisciplinaryStatus,
} from '@/types/disciplinary';
import { EvidenceFormDialog } from './EvidenceFormDialog';
import { DefenseFormDialog } from './DefenseFormDialog';
import { DecisionFormDialog } from './DecisionFormDialog';
import { DocumentSection } from '@/components/documents/DocumentSection';

interface DisciplinaryDetailDialogProps {
  processId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisciplinaryDetailDialog({
  processId,
  open,
  onOpenChange,
}: DisciplinaryDetailDialogProps) {
  const { data: process, isLoading } = useDisciplinaryProcess(processId);
  const advanceStatus = useAdvanceStatus();
  
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showDefenseForm, setShowDefenseForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);

  if (!process || isLoading) {
    return null;
  }

  const nextStatus = canAdvanceStatus(process.status);
  const nextAction = getNextStatusAction(process.status);

  const handleAdvanceStatus = () => {
    if (process.status === 'analisis') {
      setShowDecisionForm(true);
    } else if (nextStatus) {
      advanceStatus.mutate({
        processId: process.id,
        currentStatus: process.status,
        newStatus: nextStatus,
      });
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">
                  Proceso {process.case_number}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {process.employee?.first_name} {process.employee?.last_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getFaultColor(process.fault_type)}>
                  {faultTypeLabels[process.fault_type]}
                </Badge>
                <Badge className={getStatusColor(process.status)}>
                  {disciplinaryStatusLabels[process.status]}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="evidence">Evidencias</TabsTrigger>
                <TabsTrigger value="defenses">Descargos</TabsTrigger>
                <TabsTrigger value="decision">Decisión</TabsTrigger>
                <TabsTrigger value="timeline">Historial</TabsTrigger>
              </TabsList>

              {/* TAB: General */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Action Button */}
                {nextAction && process.status !== 'cerrado' && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-5 w-5 text-primary" />
                          <span className="font-medium">Siguiente paso:</span>
                          <span className="text-muted-foreground">{nextAction}</span>
                        </div>
                        <Button onClick={handleAdvanceStatus} disabled={advanceStatus.isPending}>
                          {advanceStatus.isPending ? 'Procesando...' : nextAction}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Información del Caso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fecha de los hechos:</span>
                        <span>{formatDate(process.fault_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Apertura:</span>
                        <span>{formatDate(process.opening_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Notificación:</span>
                        <span>{formatDate(process.notification_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Audiencia:</span>
                        <span>{process.hearing_date ? format(new Date(process.hearing_date), 'Pp', { locale: es }) : '-'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Responsables
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Investigador:</span>
                        <span>{process.investigator_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Decisor:</span>
                        <span>{process.decision_maker_name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Testigos:</span>
                        <span>{process.witnesses || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Facts Description */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Descripción de los Hechos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{process.facts_description}</p>
                    {process.article_violated && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-sm text-muted-foreground">Artículos violados: </span>
                        <span className="text-sm font-medium">{process.article_violated}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Documentos del Proceso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DocumentSection
                      entityId={process.id}
                      entityType="disciplinary_opening"
                      title="Documento de Apertura"
                      compact
                    />
                    <DocumentSection
                      entityId={process.id}
                      entityType="disciplinary_notification"
                      title="Notificación al Empleado"
                      compact
                    />
                    <DocumentSection
                      entityId={process.id}
                      entityType="disciplinary_hearing"
                      title="Acta de Audiencia"
                      compact
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Evidence */}
              <TabsContent value="evidence" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Evidencias del Proceso</h3>
                  <Button size="sm" onClick={() => setShowEvidenceForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Evidencia
                  </Button>
                </div>

                {process.evidence && process.evidence.length > 0 ? (
                  <div className="space-y-3">
                    {process.evidence.map((ev) => (
                      <Card key={ev.id}>
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="mb-2">
                                {ev.evidence_type}
                              </Badge>
                              <p className="text-sm">{ev.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Recolectada: {formatDate(ev.collected_date)}
                                {ev.collected_by && ` por ${ev.collected_by}`}
                              </p>
                            </div>
                            {ev.file_url && (
                              <Button size="sm" variant="outline" asChild>
                                <a href={ev.file_url} target="_blank" rel="noopener noreferrer">
                                  Ver Archivo
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay evidencias registradas
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Defenses */}
              <TabsContent value="defenses" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Descargos del Empleado</h3>
                  <Button size="sm" onClick={() => setShowDefenseForm(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar Descargos
                  </Button>
                </div>

                {process.defenses && process.defenses.length > 0 ? (
                  <div className="space-y-3">
                    {process.defenses.map((def) => (
                      <Card key={def.id}>
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline">{def.defense_type === 'escrito' ? 'Escrito' : 'Oral'}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(def.defense_date)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{def.content}</p>
                          {def.received_by && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Recibido por: {def.received_by}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay descargos registrados
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Decision */}
              <TabsContent value="decision" className="space-y-4 mt-4">
                {process.sanction_type ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Gavel className="h-5 w-5" />
                        Decisión del Proceso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Sanción:</span>
                          <p className="font-medium">{sanctionTypeLabels[process.sanction_type]}</p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Fecha de Decisión:</span>
                          <p className="font-medium">{formatDate(process.decision_date)}</p>
                        </div>
                        {process.sanction_days && process.sanction_days > 0 && (
                          <>
                            <div>
                              <span className="text-sm text-muted-foreground">Días de Suspensión:</span>
                              <p className="font-medium">{process.sanction_days} días</p>
                            </div>
                            <div>
                              <span className="text-sm text-muted-foreground">Período:</span>
                              <p className="font-medium">
                                {formatDate(process.sanction_start_date)} - {formatDate(process.sanction_end_date)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                      <Separator />
                      <div>
                        <span className="text-sm text-muted-foreground">Resumen de la Decisión:</span>
                        <p className="mt-1 whitespace-pre-wrap">{process.decision_summary}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Decidido por:</span>
                        <p className="font-medium">{process.decision_maker_name || '-'}</p>
                      </div>

                      {/* Appeal section */}
                      {process.has_appeal && (
                        <>
                          <Separator />
                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-medium flex items-center gap-2 mb-2">
                              <Scale className="h-4 w-4" />
                              Apelación
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Fecha:</span>
                                <p>{formatDate(process.appeal_date)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Decisión:</span>
                                <p>{formatDate(process.appeal_decision_date)}</p>
                              </div>
                            </div>
                            {process.appeal_resolution && (
                              <div className="mt-2">
                                <span className="text-sm text-muted-foreground">Resolución:</span>
                                <p className="text-sm mt-1">{process.appeal_resolution}</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Decision Document */}
                      <DocumentSection
                        entityId={process.id}
                        entityType="disciplinary_decision"
                        title="Documento de Decisión"
                        compact
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Aún no se ha tomado una decisión en este proceso</p>
                      {process.status === 'analisis' && (
                        <Button className="mt-4" onClick={() => setShowDecisionForm(true)}>
                          Registrar Decisión
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Timeline */}
              <TabsContent value="timeline" className="space-y-4 mt-4">
                <h3 className="font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historial del Proceso
                </h3>

                {process.timeline && process.timeline.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {process.timeline.map((item, index) => (
                        <div key={item.id} className="relative pl-10">
                          <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                          <Card>
                            <CardContent className="py-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">{item.description}</p>
                                  {item.new_status && (
                                    <Badge variant="outline" className="mt-1">
                                      {disciplinaryStatusLabels[item.new_status]}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p>{format(new Date(item.action_date), 'Pp', { locale: es })}</p>
                                  {item.performed_by_name && <p>{item.performed_by_name}</p>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No hay historial disponible
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <EvidenceFormDialog
        open={showEvidenceForm}
        onOpenChange={setShowEvidenceForm}
        processId={process.id}
      />

      <DefenseFormDialog
        open={showDefenseForm}
        onOpenChange={setShowDefenseForm}
        processId={process.id}
      />

      <DecisionFormDialog
        open={showDecisionForm}
        onOpenChange={setShowDecisionForm}
        processId={process.id}
        currentStatus={process.status}
      />
    </>
  );
}
