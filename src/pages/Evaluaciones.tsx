import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  FileText,
  Calendar,
  PlayCircle,
  Download,
  UsersRound,
  
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  
  Award,
  Clock,
  Copy,
  Layers,
  Briefcase,
  Filter,
  BarChart3,
  FileSpreadsheet,
  Columns3,
  List,
  ChevronRight,
  FolderOpen,
  Folder,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEvaluations } from '@/hooks/useEvaluations';
import { useEmployees } from '@/hooks/useEmployees';
import {
  TemplateFormDialog,
  TemplatePreviewDialog,
  CycleFormDialog,
  EvaluationFormDialog,
  
  ApplyEvaluationDialog,
  BulkGeneratePreviewDialog,
  EvaluationKanbanBoard,
  EvaluationTreeView,
} from '@/components/evaluations';
import {
  CYCLE_STATUS_LABELS,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS,
  type EvaluationTemplate,
  type EvaluationCycle,
  type PerformanceEvaluation,
  
} from '@/types/evaluation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { generateEvaluationPdf } from '@/lib/evaluationPdfGenerator';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import type { EvaluationScore } from '@/types/evaluation';
const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  submitted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  reviewed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function Evaluaciones() {
  const [activeTab, setActiveTab] = useState('cycles');
  const [evalViewMode, setEvalViewMode] = useState<'table' | 'kanban'>('table');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<EvaluationCycle | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PerformanceEvaluation | null>(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);
  const [templatePositionFilter, setTemplatePositionFilter] = useState<string>('');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [evaluationToApply, setEvaluationToApply] = useState<PerformanceEvaluation | null>(null);
  const [evaluationCycleFilter, setEvaluationCycleFilter] = useState<string>('all');
  const [compareCycleId, setCompareCycleId] = useState<string>('');
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EvaluationTemplate | null>(null);
  const [bulkPreviewData, setBulkPreviewData] = useState<{
    cycleId: string;
    cycleName: string;
    templateName: string;
    newEmployees: any[];
    alreadyAssigned: number;
  } | null>(null);
  const { currentCompanyId } = useAuth();
  const {
    templates,
    loadingTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cycles,
    loadingCycles,
    createCycle,
    updateCycle,
    deleteCycle,
    evaluations,
    loadingEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
  } = useEvaluations();

  const employeesQuery = useEmployees();
  const employees = employeesQuery.data || [];

  // Stats
  const activeCyclesCount = cycles.filter(c => c.status === 'active').length;
  const pendingEvaluations = evaluations.filter(e => e.status === 'pending' || e.status === 'in_progress').length;
  const completedEvaluations = evaluations.filter(e => e.status === 'approved').length;

  // Cycle evaluation stats helper
  const getCycleStats = (cycleId: string) => {
    const cycleEvals = evaluations.filter(e => e.cycle_id === cycleId);
    const total = cycleEvals.length;
    const completed = cycleEvals.filter(e => e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved').length;
    return { total, completed, pending: total - completed };
  };

  // Filtered evaluations
  const filteredEvaluations = evaluationCycleFilter === 'all'
    ? evaluations
    : evaluations.filter(e => e.cycle_id === evaluationCycleFilter);

  // Comparison data
  const compareEvaluations = compareCycleId
    ? evaluations
        .filter(e => e.cycle_id === compareCycleId && e.overall_score !== null)
        .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    : [];
  const compareAvg = compareEvaluations.length > 0
    ? Math.round(compareEvaluations.reduce((s, e) => s + (e.overall_score || 0), 0) / compareEvaluations.length)
    : 0;

  const handleDelete = () => {
    if (!itemToDelete) return;
    
    switch (itemToDelete.type) {
      case 'template':
        deleteTemplate.mutate(itemToDelete.id);
        break;
      case 'cycle':
        deleteCycle.mutate(itemToDelete.id);
        break;
      case 'evaluation':
        deleteEvaluation.mutate(itemToDelete.id);
        break;
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDownloadPdf = async (evaluation: PerformanceEvaluation) => {
    const cycle = cycles.find(c => c.id === evaluation.cycle_id);
    const tpl = (cycle?.template_id ? templates.find(t => t.id === cycle.template_id) : cycle?.template) || null;
    const { data: scores } = await supabase
      .from('evaluation_scores')
      .select('*')
      .eq('evaluation_id', evaluation.id);
    generateEvaluationPdf({
      evaluation,
      template: tpl,
      scores: (scores || []) as EvaluationScore[],
    });
  };

  const handleBulkPreview = (cycleId: string) => {
    const cycle = cycles.find(c => c.id === cycleId);
    if (!cycle?.template_id) {
      toast.error('El ciclo no tiene una plantilla asociada');
      return;
    }
    const tpl = templates.find(t => t.id === cycle.template_id);
    const positionIds = tpl?.positions?.map(p => p.id) || [];

    let targetEmployees = employees;
    if (positionIds.length > 0) {
      targetEmployees = employees.filter(emp =>
        emp.work_info?.position_id && positionIds.includes(emp.work_info.position_id)
      );
    }

    if (targetEmployees.length === 0) {
      toast.error('No se encontraron empleados para los cargos de la plantilla');
      return;
    }

    const existingIds = new Set(
      evaluations.filter(e => e.cycle_id === cycleId).map(e => e.employee_id)
    );
    const newEmployees = targetEmployees.filter(e => !existingIds.has(e.id));

    setBulkPreviewData({
      cycleId,
      cycleName: cycle.name,
      templateName: tpl?.name || '-',
      newEmployees,
      alreadyAssigned: targetEmployees.length - newEmployees.length,
    });
    setBulkPreviewOpen(true);
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreviewData) return;
    const { cycleId, newEmployees } = bulkPreviewData;

    if (newEmployees.length === 0) return;

    const inserts = newEmployees.map(emp => ({
      cycle_id: cycleId,
      employee_id: emp.id,
      evaluation_type: 'manager' as const,
      status: 'pending' as const,
    }));

    const { error } = await supabase
      .from('performance_evaluations')
      .insert(inserts);

    if (error) {
      toast.error('Error al generar evaluaciones: ' + error.message);
      return;
    }

    // Send in-app notifications to linked users
    if (currentCompanyId) {
      try {
        const { data: links } = await supabase
          .from('employee_user_links')
          .select('user_id, employee_id')
          .in('employee_id', newEmployees.map(e => e.id))
          .eq('is_active', true);

        if (links && links.length > 0) {
          const cycle = cycles.find(c => c.id === cycleId);
          const notifs = links.map(link => ({
            user_id: link.user_id,
            company_id: currentCompanyId,
            title: 'Nueva evaluación de desempeño',
            message: `Se te ha asignado una evaluación en el ciclo "${cycle?.name || ''}"`,
            type: 'info' as const,
            category: 'evaluaciones',
            entity_type: 'evaluation_cycle',
            entity_id: cycleId,
            action_url: '/evaluaciones',
          }));
          await supabase.from('notifications').insert(notifs);
        }
      } catch (err) {
        console.error('Error sending notifications:', err);
      }
    }

    toast.success(`${newEmployees.length} evaluaciones generadas exitosamente`);
    window.location.reload();
  };

  const handleExportComparative = () => {
    if (compareEvaluations.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const cycleName = cycles.find(c => c.id === compareCycleId)?.name || 'Comparativo';
    const data = compareEvaluations.map((ev, idx) => ({
      '#': idx + 1,
      'Empleado': `${ev.employee?.first_name || ''} ${ev.employee?.last_name || ''}`,
      'Documento': ev.employee?.document_number || '',
      'Puntaje': ev.overall_score || 0,
      'Calificación': ev.overall_rating || '-',
      'Estado': EVALUATION_STATUS_LABELS[ev.status] || ev.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    XLSX.writeFile(wb, `Comparativo_${cycleName.replace(/\s/g, '_')}.xlsx`);
    toast.success('Archivo Excel descargado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Evaluación de Desempeño</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de evaluaciones y desarrollo profesional
          </p>
        </div>
      </div>


      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="cycles" className="gap-2">
              <Calendar className="h-4 w-4" />
              Ciclos
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Plantillas
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={() => {
              if (activeTab === 'templates') {
                setSelectedTemplate(null);
                setTemplateDialogOpen(true);
              } else if (activeTab === 'cycles') {
                setSelectedCycle(null);
                setCycleDialogOpen(true);
              } else if (activeTab === 'evaluations') {
                setSelectedEvaluation(null);
                setEvaluationDialogOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'templates' && 'Nueva Plantilla'}
            {activeTab === 'cycles' && 'Nuevo Ciclo'}
            {activeTab === 'evaluations' && 'Nueva Evaluación'}
            
          </Button>
        </div>

        {/* Cycles Tab */}
        <TabsContent value="cycles">
          <Card>
            <CardHeader>
              <CardTitle>Ciclos de Evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCycles ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : cycles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay ciclos de evaluación configurados
                </p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="hidden sm:table-cell">Plantilla</TableHead>
                      <TableHead className="hidden md:table-cell">Periodo</TableHead>
                      <TableHead className="hidden sm:table-cell">Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map((cycle) => {
                      const stats = getCycleStats(cycle.id);
                      const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
                      return (
                      <TableRow key={cycle.id}>
                        <TableCell className="font-medium">{cycle.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{cycle.template?.name || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(cycle.start_date), 'dd MMM', { locale: es })} -{' '}
                          {format(new Date(cycle.end_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {stats.total > 0 ? (
                            <div className="space-y-1 min-w-[100px]">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{stats.completed}/{stats.total}</span>
                                <span>{pct}%</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin evaluaciones</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[cycle.status]}>
                            {CYCLE_STATUS_LABELS[cycle.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleBulkPreview(cycle.id)}
                              >
                                <UsersRound className="h-4 w-4 mr-2" />
                                Generar Evaluaciones
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCycle(cycle);
                                  setCycleDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setItemToDelete({ type: 'cycle', id: cycle.id });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Evaluaciones de Desempeño</CardTitle>
              <div className="flex items-center gap-3">
                <Select value={evaluationCycleFilter} onValueChange={setEvaluationCycleFilter}>
                  <SelectTrigger className="w-[220px]">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Filtrar por ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los ciclos</SelectItem>
                    {cycles.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* View mode toggle */}
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-r-none ${evalViewMode === 'kanban' ? 'bg-muted' : ''}`}
                    onClick={() => setEvalViewMode('kanban')}
                    title="Vista Kanban"
                  >
                    <Columns3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-l-none ${evalViewMode === 'table' ? 'bg-muted' : ''}`}
                    onClick={() => setEvalViewMode('table')}
                    title="Vista Lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {evalViewMode === 'kanban' ? (
                <EvaluationKanbanBoard
                  evaluations={filteredEvaluations}
                  cycles={cycles}
                  loading={loadingEvaluations}
                  onApply={(ev) => {
                    setEvaluationToApply(ev);
                    setApplyDialogOpen(true);
                  }}
                  onDownloadPdf={handleDownloadPdf}
                  onEdit={(ev) => {
                    setSelectedEvaluation(ev);
                    setEvaluationDialogOpen(true);
                  }}
                  onDelete={(ev) => {
                    setItemToDelete({ type: 'evaluation', id: ev.id });
                    setDeleteDialogOpen(true);
                  }}
                  onStatusChange={(evalId, newStatus) => {
                    updateEvaluation.mutate({ id: evalId, status: newStatus });
                  }}
                  showCycleFilter={false}
                />
              ) : loadingEvaluations ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : filteredEvaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay evaluaciones registradas
                </p>
              ) : (() => {
                type EvalWithCenter = typeof filteredEvaluations[number] & { operation_center_name?: string | null };
                const grouped: Record<string, Record<string, EvalWithCenter[]>> = {};
                (filteredEvaluations as EvalWithCenter[]).forEach(ev => {
                  const center = (ev as any).operation_center_name || 'Sin Centro';
                  const cycle = ev.cycle?.name || 'Sin Ciclo';
                  if (!grouped[center]) grouped[center] = {};
                  if (!grouped[center][cycle]) grouped[center][cycle] = [];
                  grouped[center][cycle].push(ev);
                });
                const centerNames = Object.keys(grouped).sort((a, b) =>
                  a === 'Sin Centro' ? 1 : b === 'Sin Centro' ? -1 : a.localeCompare(b)
                );
                return <EvaluationTreeView
                  centerNames={centerNames}
                  grouped={grouped}
                  statusColors={statusColors}
                  onApply={(ev) => { setEvaluationToApply(ev); setApplyDialogOpen(true); }}
                  onDownloadPdf={handleDownloadPdf}
                  onEdit={(ev) => { setSelectedEvaluation(ev); setEvaluationDialogOpen(true); }}
                  onDelete={(ev) => { setItemToDelete({ type: 'evaluation', id: ev.id }); setDeleteDialogOpen(true); }}
                />;
              })()}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Templates Tab */}
        <TabsContent value="templates">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Plantillas de Evaluación</h3>
              {(() => {
                const allPositions = Array.from(
                  new Map(
                    templates.flatMap(t => t.positions || []).map(p => [p.id, p])
                  ).values()
                );
                if (allPositions.length === 0) return null;
                return (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={templatePositionFilter}
                      onChange={(e) => setTemplatePositionFilter(e.target.value)}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Todos los cargos</option>
                      {allPositions.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                );
              })()}
            </div>
            {loadingTemplates ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : templates.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No hay plantillas configuradas
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {templates
                  .filter(t => !templatePositionFilter || t.positions?.some(p => p.id === templatePositionFilter))
                  .map((template, idx) => {
                  const criteriaCount = template.criteria?.length || 0;
                  const questionsCount = (template.qualitative_questions as string[] | null)?.length || 0;
                  const gradientColors = [
                    'from-orange-500/10 to-amber-500/5',
                    'from-orange-600/10 to-orange-400/5',
                    'from-amber-500/10 to-orange-500/5',
                    'from-orange-500/10 to-yellow-500/5',
                    'from-amber-600/10 to-orange-400/5',
                    'from-orange-400/10 to-amber-300/5',
                  ];
                  const iconColors = [
                    'text-[#e65a0a] bg-orange-100 dark:bg-orange-900/40',
                    'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/40',
                    'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/40',
                    'text-[#e65a0a] bg-orange-100 dark:bg-orange-900/40',
                    'text-orange-500 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/40',
                    'text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/40',
                  ];
                  const gradient = gradientColors[idx % gradientColors.length];
                  const iconColor = iconColors[idx % iconColors.length];

                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="relative overflow-hidden border shadow-card hover:shadow-card-hover transition-shadow bg-card cursor-pointer" onClick={() => setPreviewTemplate(template)}>
                        {/* Decorative top bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-[#3b3a59] to-[#5a587a]" />

                        <CardHeader className="pb-3 pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-lg shrink-0 ${iconColor}`}>
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base font-semibold leading-tight truncate">
                                  {template.name}
                                </CardTitle>
                                {template.positions && template.positions.length > 0 ? (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    {template.positions.map(p => (
                                      <Badge key={p.id} variant="outline" className="text-xs font-medium">
                                        {p.name}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Todos los cargos</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setTemplateDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const duplicated: any = {
                                      name: `${template.name} (copia)`,
                                      description: template.description,
                                      is_active: template.is_active,
                                      position_ids: template.positions?.map(p => p.id) || [],
                                      qualitative_questions: template.qualitative_questions,
                                      rating_scale: template.rating_scale,
                                      criteria: template.criteria?.map(c => ({
                                        name: c.name,
                                        description: c.description,
                                        category: c.category,
                                        weight: c.weight,
                                        max_score: c.max_score,
                                        level_4_description: c.level_4_description,
                                        level_3_description: c.level_3_description,
                                        level_2_description: c.level_2_description,
                                        level_1_description: c.level_1_description,
                                      })) || [],
                                    };
                                    createTemplate.mutate(duplicated);
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setItemToDelete({ type: 'template', id: template.id });
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0 space-y-3">
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5 text-teal" />
                              <span>{criteriaCount} criterios</span>
                            </div>
                            {questionsCount > 0 && (
                              <div className="flex items-center gap-1">
                                <ClipboardCheck className="h-3.5 w-3.5 text-violet" />
                                <span>{questionsCount} preguntas</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-end">
                            <Badge
                              variant={template.is_active ? 'default' : 'secondary'}
                              className={template.is_active ? 'bg-[#e65a0a] hover:bg-[#cf5109] text-white' : ''}
                            >
                              {template.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialogs */}
      <TemplateFormDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={selectedTemplate}
        onSubmit={(data) => {
          if (selectedTemplate) {
            updateTemplate.mutate({ id: selectedTemplate.id, ...data } as any);
          } else {
            createTemplate.mutate(data as any);
          }
        }}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      <CycleFormDialog
        open={cycleDialogOpen}
        onOpenChange={setCycleDialogOpen}
        cycle={selectedCycle}
        templates={templates}
        onSubmit={(data) => {
          if (selectedCycle) {
            updateCycle.mutate({ id: selectedCycle.id, ...data });
          } else {
            createCycle.mutate(data);
          }
        }}
        isLoading={createCycle.isPending || updateCycle.isPending}
      />

      <EvaluationFormDialog
        open={evaluationDialogOpen}
        onOpenChange={setEvaluationDialogOpen}
        evaluation={selectedEvaluation}
        cycles={cycles}
        employees={employees}
        onSubmit={(data) => {
          if (selectedEvaluation) {
            updateEvaluation.mutate({ id: selectedEvaluation.id, ...data });
          } else {
            createEvaluation.mutate(data);
          }
        }}
        isLoading={createEvaluation.isPending || updateEvaluation.isPending}
      />


      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El elemento será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {evaluationToApply && (
        <ApplyEvaluationDialog
          open={applyDialogOpen}
          onOpenChange={(open) => {
            setApplyDialogOpen(open);
            if (!open) setEvaluationToApply(null);
          }}
          evaluation={evaluationToApply}
          template={
            templates.find((t) => t.id === cycles.find((c) => c.id === evaluationToApply.cycle_id)?.template_id) || null
          }
          onSave={(data) => {
            updateEvaluation.mutate(data as any);
          }}
        />
      )}

      {bulkPreviewData && (
        <BulkGeneratePreviewDialog
          open={bulkPreviewOpen}
          onOpenChange={(open) => {
            setBulkPreviewOpen(open);
            if (!open) setBulkPreviewData(null);
          }}
          cycleName={bulkPreviewData.cycleName}
          templateName={bulkPreviewData.templateName}
          newEmployees={bulkPreviewData.newEmployees}
          alreadyAssigned={bulkPreviewData.alreadyAssigned}
          onConfirm={handleBulkConfirm}
        />
      )}

      <TemplatePreviewDialog
        open={!!previewTemplate}
        onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
        template={previewTemplate}
        onDuplicate={(tpl) => {
          createTemplate.mutate({
            name: `${tpl.name} (copia)`,
            description: tpl.description,
            is_active: tpl.is_active,
            position_ids: tpl.positions?.map(p => p.id) || [],
            qualitative_questions: tpl.qualitative_questions,
            rating_scale: tpl.rating_scale,
            criteria: tpl.criteria?.map(c => ({
              name: c.name,
              description: c.description,
              category: c.category,
              weight: c.weight,
              max_score: c.max_score,
              level_4_description: c.level_4_description,
              level_3_description: c.level_3_description,
              level_2_description: c.level_2_description,
              level_1_description: c.level_1_description,
            })) as any || [],
          });
        }}
      />
    </div>
  );
}
