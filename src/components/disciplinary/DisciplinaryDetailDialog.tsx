import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  Gavel,
  History,
  Link,
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
import { Label } from '@/components/ui/label';
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
import { AppealFormDialog } from './AppealFormDialog';
import { GenerateDefenseTokenDialog } from './GenerateDefenseTokenDialog';
import { DocumentSection } from '@/components/documents/DocumentSection';
import { generateDisciplinaryPdf } from '@/lib/disciplinaryPdfGenerator';
import { useCompanies } from '@/hooks/useCompanies';
import { toast } from '@/hooks/use-toast';

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
  const { data: companies } = useCompanies();
  
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [showDefenseForm, setShowDefenseForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!process || isLoading) {
    return null;
  }

  const isClosed = process.status === 'cerrado';
  const nextStatus = canAdvanceStatus(process.status);
  const nextAction = getNextStatusAction(process.status);

  const handleAdvanceStatus = () => {
    if (process.status === 'analisis') {
      setShowDecisionForm(true);
    } else if (process.status === 'decision') {
      setShowAppealForm(true);
    } else if (nextStatus) {
      advanceStatus.mutate({
        processId: process.id,
        currentStatus: process.status,
        newStatus: nextStatus,
      });
    }
  };

  const handleExportPdf = async () => {
    if (!process) return;
    setIsExporting(true);
    try {
      const companyName = companies?.[0]?.name;
      await generateDisciplinaryPdf({ process, companyName });
      toast({ title: 'PDF generado', description: 'El informe ha sido descargado exitosamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: es });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-4xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-lg bg-background ">
          {/* Header con gradiente */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
            
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20">
                  <Scale className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="h-5 rounded-lg px-2 bg-background border-border/50 font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                      Expediente {process.case_number}
                    </Badge>
                    <Badge className={cn('h-5 rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest border-0 shadow-sm', getFaultColor(process.fault_type))}>
                      {faultTypeLabels[process.fault_type]}
                    </Badge>
                    <Badge className={cn('h-5 rounded-lg px-2 text-[9px] font-bold uppercase tracking-widest border-0 shadow-sm', getStatusColor(process.status))}>
                      {disciplinaryStatusLabels[process.status]}
                    </Badge>
                  </div>
                  <DialogTitle className="font-black text-xl tracking-tighter sm:text-2xl truncate text-foreground">
                    {process.employee?.first_name} {process.employee?.last_name}
                  </DialogTitle>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    C.C. {process.employee?.document_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest bg-background border-border/50 hover:bg-background transition-all"
                  onClick={handleExportPdf}
                  disabled={isExporting}
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? 'Exportando...' : 'Exportar PDF'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
            <Tabs defaultValue="general" className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <TabsList className="grid h-14 w-full grid-cols-5 mb-6 bg-background p-1 rounded-2xl border border-border/50">
                <TabsTrigger value="general" className="rounded-xl font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">General</TabsTrigger>
                <TabsTrigger value="evidence" className="rounded-xl font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Evidencias</TabsTrigger>
                <TabsTrigger value="defenses" className="rounded-xl font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Descargos</TabsTrigger>
                <TabsTrigger value="decision" className="rounded-xl font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Decisión</TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-xl font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">Historial</TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {/* TAB: General */}
                <TabsContent value="general" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Action Banner */}
                  {nextAction && process.status !== 'cerrado' && (
                    <div className="relative overflow-hidden border border-primary/20 rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-primary">Acción Requerida</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Siguiente fase: <span className="font-semibold text-foreground">{nextAction}</span>
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={handleAdvanceStatus} 
                        disabled={advanceStatus.isPending}
                        className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                      >
                        {advanceStatus.isPending ? 'Procesando...' : nextAction}
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="bg-background p-5 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <AlertTriangle className="w-3.5 h-3.5 text-primary" /> Información del Caso
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Fecha de hechos:</span>
                          <span className="text-xs font-bold">{formatDate(process.fault_date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Apertura:</span>
                          <span className="text-xs font-bold">{formatDate(process.opening_date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Audiencia:</span>
                          <span className="text-xs font-bold">{process.hearing_date ? format(new Date(process.hearing_date), 'Pp', { locale: es }) : '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background p-5 rounded-2xl border border-border/50 space-y-4">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-primary" /> Responsables
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Investigador:</span>
                          <span className="text-xs font-bold truncate ml-4">{process.investigator_name || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Testigos:</span>
                          <span className="text-xs font-bold truncate ml-4">{process.witnesses || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-muted-foreground">Normativa:</span>
                          <span className="text-xs font-bold truncate ml-4">{process.article_violated || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Relato de los Hechos</Label>
                    <div className="bg-background p-5 rounded-2xl border border-border/50">
                      <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{process.facts_description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Documentos de Respaldo</Label>
                    <div className="grid grid-cols-1 gap-3">
                      <DocumentSection
                        entityId={process.id}
                        entityType="disciplinary_opening"
                        title="Documento de Apertura"
                        allowUpload={!isClosed}
                        compact
                        className="rounded-xl border-border/40"
                      />
                      <DocumentSection
                        entityId={process.id}
                        entityType="disciplinary_notification"
                        title="Notificación al Empleado"
                        allowUpload={!isClosed}
                        compact
                        className="rounded-xl border-border/40"
                      />
                      <DocumentSection
                        entityId={process.id}
                        entityType="disciplinary_hearing"
                        title="Acta de Audiencia"
                        allowUpload={!isClosed}
                        compact
                        className="rounded-xl border-border/40"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: Evidence */}
                <TabsContent value="evidence" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Material Probatorio</Label>
                      <p className="text-[10px] text-muted-foreground">Evidencias recolectadas para el caso</p>
                    </div>
                    {!isClosed && (
                      <Button size="sm" onClick={() => setShowEvidenceForm(true)} className="h-9 rounded-xl gap-2 font-bold text-xs bg-primary text-primary-foreground">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    )}
                  </div>

                  {process.evidence && process.evidence.length > 0 ? (
                    <div className="space-y-3">
                      {process.evidence.map((ev) => (
                        <div key={ev.id} className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background p-4 transition-all duration-300 hover:bg-primary/[0.02] hover:border-primary/20">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-background border-border/50 rounded-lg">
                                {ev.evidence_type}
                              </Badge>
                              <p className="text-sm font-medium text-foreground">{ev.description}</p>
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                Recolectada: {formatDate(ev.collected_date)} {ev.collected_by && `· Por ${ev.collected_by}`}
                              </p>
                            </div>
                            {ev.file_url && (
                              <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase tracking-widest border-border/50 bg-background " asChild>
                                <a href={ev.file_url} target="_blank" rel="noopener noreferrer">Ver Archivo</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
                      <div className="p-4 rounded-full bg-background shadow-sm">
                        <FileText className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No hay evidencias registradas</p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB: Defenses */}
                <TabsContent value="defenses" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Versión del Empleado</Label>
                      <p className="text-[10px] text-muted-foreground">Descargos y justificaciones presentadas</p>
                    </div>
                    {!isClosed && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowTokenDialog(true)} className="h-9 rounded-xl gap-2 font-bold text-xs border-border/50 bg-background ">
                          <Link className="h-3.5 w-3.5" /> Enlace
                        </Button>
                        <Button size="sm" onClick={() => setShowDefenseForm(true)} className="h-9 rounded-xl gap-2 font-bold text-xs bg-primary text-primary-foreground">
                          <Plus className="h-3.5 w-3.5" /> Registrar
                        </Button>
                      </div>
                    )}
                  </div>

                  {process.defenses && process.defenses.length > 0 ? (
                    <div className="space-y-3">
                      {process.defenses.map((def) => (
                        <div key={def.id} className="relative overflow-hidden rounded-2xl border border-border/50 bg-background p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[9px] uppercase tracking-widest text-primary border-primary/20 rounded-lg">
                                {def.defense_type === 'escrito' ? 'Escrito' : 'Oral'}
                              </Badge>
                              {(def as any).submitted_via_token && (
                                <Badge className="text-[9px] uppercase tracking-widest bg-green-500/10 text-green-600 border-0 rounded-lg">Vía Enlace</Badge>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              {formatDate(def.defense_date)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{def.content}</p>
                          {def.received_by && (
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-t border-border/30 pt-3">
                              Recibido por: {def.received_by}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
                      <div className="p-4 rounded-full bg-background shadow-sm">
                        <Scale className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No hay descargos registrados</p>
                    </div>
                  )}
                </TabsContent>

                {/* TAB: Decision */}
                <TabsContent value="decision" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {process.sanction_type ? (
                    <div className="space-y-6">
                      <div className="bg-background p-6 rounded-2xl border border-border/50 space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-primary shadow-lg shadow-primary/20 text-primary-foreground">
                            <Gavel className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fallo del Proceso</p>
                            <h4 className="font-black text-lg text-foreground uppercase tracking-tight">{sanctionTypeLabels[process.sanction_type]}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha Decisión</p>
                            <p className="text-sm font-bold">{formatDate(process.decision_date)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable</p>
                            <p className="text-sm font-bold">{process.decision_maker_name || '—'}</p>
                          </div>
                          {process.sanction_days && process.sanction_days > 0 && (
                            <div className="col-span-2 grid grid-cols-2 gap-6 p-4 rounded-xl bg-background border border-border/50">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Suspensión</p>
                                <p className="text-sm font-black">{process.sanction_days} Días</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Vigencia</p>
                                <p className="text-[11px] font-bold">{formatDate(process.sanction_start_date)} - {formatDate(process.sanction_end_date)}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resumen de la Decisión</Label>
                          <p className="text-sm font-medium text-foreground leading-relaxed p-4 rounded-xl bg-background border border-border/30 whitespace-pre-wrap">{process.decision_summary}</p>
                        </div>

                        {/* Appeal if exists */}
                        {process.has_appeal && (
                          <div className="border border-primary/20 rounded-xl p-5 space-y-4">
                            <h5 className="font-black text-[10px] uppercase tracking-widest text-primary flex items-center gap-2">
                              <Scale className="w-4 h-4" /> Recurso de Apelación
                            </h5>
                            <div className="grid grid-cols-2 gap-4 text-[11px]">
                              <div className="space-y-1">
                                <p className="font-bold text-muted-foreground/60 uppercase">Interpuesto</p>
                                <p className="font-black">{formatDate(process.appeal_date)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="font-bold text-muted-foreground/60 uppercase">Resolución</p>
                                <p className="font-black">{formatDate(process.appeal_decision_date)}</p>
                              </div>
                              <div className="col-span-2 space-y-1 mt-1">
                                <p className="font-bold text-muted-foreground/60 uppercase">Resultado</p>
                                <p className="font-medium bg-background p-2.5 rounded-lg border border-border ">{process.appeal_resolution}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <DocumentSection
                          entityId={process.id}
                          entityType="disciplinary_decision"
                          title="Documento de Fallo Oficial"
                          allowUpload={!isClosed}
                          compact
                          className="rounded-xl border-border/40"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
                      <div className="p-4 rounded-full bg-background shadow-sm">
                        <Gavel className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Fallo pendiente de registro</p>
                        {process.status === 'analisis' && !isClosed && (
                          <Button className="h-9 rounded-xl gap-2 font-bold text-xs bg-primary text-primary-foreground" onClick={() => setShowDecisionForm(true)}>
                            Registrar Decisión
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* TAB: Timeline */}
                <TabsContent value="timeline" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="px-1 space-y-0.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Historial del Proceso</Label>
                    <p className="text-[10px] text-muted-foreground">Trazabilidad completa del expediente</p>
                  </div>

                  {process.timeline && process.timeline.length > 0 ? (
                    <div className="relative pl-4 space-y-6 border-l-2 border-muted">
                      {process.timeline.map((item) => (
                        <div key={item.id} className="relative pl-8">
                          <div className="absolute left-[-25px] top-1.5 w-4 h-4 rounded-full bg-background border-2 border-primary shadow-sm" />
                          <div className="bg-background p-4 rounded-2xl border border-border/50 space-y-2">
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-bold text-sm text-foreground">{item.description}</p>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase whitespace-nowrap">
                                {format(new Date(item.action_date), 'dd MMM, HH:mm', { locale: es })}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              {item.new_status && (
                                <Badge variant="outline" className={cn('text-[9px] uppercase tracking-widest border-0 rounded-lg', getStatusColor(item.new_status))}>
                                  {disciplinaryStatusLabels[item.new_status]}
                                </Badge>
                              )}
                              {item.performed_by_name && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 italic">Por: {item.performed_by_name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
                      <div className="p-4 rounded-full bg-background shadow-sm">
                        <History className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No hay historial disponible</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
          
          <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-background /10 sm:flex-row sm:items-center sm:justify-end">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-12 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
            >
              Cerrar Expediente
            </Button>
          </div>
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

      <AppealFormDialog
        open={showAppealForm}
        onOpenChange={setShowAppealForm}
        processId={process.id}
      />

      <GenerateDefenseTokenDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        processId={process.id}
        employeeId={process.employee_id}
      />
    </>
  );
}
