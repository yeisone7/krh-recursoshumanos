import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Plus,
  FileText,
  Calendar,
  PlayCircle,
  Target,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  TrendingUp,
  Award,
  Clock,
  Copy,
  Layers,
  Briefcase,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  CycleFormDialog,
  EvaluationFormDialog,
  GoalFormDialog,
  ApplyEvaluationDialog,
} from '@/components/evaluations';
import {
  CYCLE_STATUS_LABELS,
  EVALUATION_TYPE_LABELS,
  EVALUATION_STATUS_LABELS,
  type EvaluationTemplate,
  type EvaluationCycle,
  type PerformanceEvaluation,
  type PerformanceGoal,
} from '@/types/evaluation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false);
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EvaluationTemplate | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<EvaluationCycle | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<PerformanceEvaluation | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<PerformanceGoal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: string; id: string } | null>(null);
  const [templatePositionFilter, setTemplatePositionFilter] = useState<string>('');
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [evaluationToApply, setEvaluationToApply] = useState<PerformanceEvaluation | null>(null);
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
    goals,
    loadingGoals,
    createGoal,
    updateGoal,
    deleteGoal,
  } = useEvaluations();

  const employeesQuery = useEmployees();
  const employees = employeesQuery.data || [];

  // Stats
  const activeCycles = cycles.filter(c => c.status === 'active').length;
  const pendingEvaluations = evaluations.filter(e => e.status === 'pending' || e.status === 'in_progress').length;
  const completedEvaluations = evaluations.filter(e => e.status === 'approved').length;
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goals.length)
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
      case 'goal':
        deleteGoal.mutate(itemToDelete.id);
        break;
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Evaluación de Desempeño</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de evaluaciones, objetivos y desarrollo profesional
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ciclos Activos</p>
                  <p className="text-2xl font-bold">{activeCycles}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Evaluaciones Pendientes</p>
                  <p className="text-2xl font-bold">{pendingEvaluations}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Evaluaciones Completadas</p>
                  <p className="text-2xl font-bold">{completedEvaluations}</p>
                </div>
                <Award className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Progreso Objetivos</p>
                  <p className="text-2xl font-bold">{avgProgress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <Progress value={avgProgress} className="mt-2" />
            </CardContent>
          </Card>
        </motion.div>
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
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              Objetivos
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
              } else if (activeTab === 'goals') {
                setSelectedGoal(null);
                setGoalDialogOpen(true);
              }
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            {activeTab === 'templates' && 'Nueva Plantilla'}
            {activeTab === 'cycles' && 'Nuevo Ciclo'}
            {activeTab === 'evaluations' && 'Nueva Evaluación'}
            {activeTab === 'goals' && 'Nuevo Objetivo'}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Plantilla</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell className="font-medium">{cycle.name}</TableCell>
                        <TableCell>{cycle.template?.name || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(cycle.start_date), 'dd MMM', { locale: es })} -{' '}
                          {format(new Date(cycle.end_date), 'dd MMM yyyy', { locale: es })}
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evaluations Tab */}
        <TabsContent value="evaluations">
          <Card>
            <CardHeader>
              <CardTitle>Evaluaciones de Desempeño</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvaluations ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay evaluaciones registradas
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Ciclo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((evaluation) => (
                      <TableRow key={evaluation.id}>
                        <TableCell className="font-medium">
                          {evaluation.employee?.first_name} {evaluation.employee?.last_name}
                        </TableCell>
                        <TableCell>{evaluation.cycle?.name || '-'}</TableCell>
                        <TableCell>{EVALUATION_TYPE_LABELS[evaluation.evaluation_type]}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[evaluation.status]}>
                            {EVALUATION_STATUS_LABELS[evaluation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{evaluation.overall_rating || '-'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEvaluationToApply(evaluation);
                                  setApplyDialogOpen(true);
                                }}
                              >
                                <PlayCircle className="h-4 w-4 mr-2" />
                                Evaluar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedEvaluation(evaluation);
                                  setEvaluationDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setItemToDelete({ type: 'evaluation', id: evaluation.id });
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Objetivos y Metas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGoals ? (
                <p className="text-muted-foreground">Cargando...</p>
              ) : goals.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay objetivos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Objetivo</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {goals.map((goal) => (
                      <TableRow key={goal.id}>
                        <TableCell className="font-medium">
                          {goal.employee?.first_name} {goal.employee?.last_name}
                        </TableCell>
                        <TableCell>{goal.title}</TableCell>
                        <TableCell>
                          {goal.due_date
                            ? format(new Date(goal.due_date), 'dd MMM yyyy', { locale: es })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={goal.progress_percentage || 0} className="w-16" />
                            <span className="text-sm">{goal.progress_percentage || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[goal.status || 'pending']}>
                            {goal.status === 'pending' && 'Pendiente'}
                            {goal.status === 'in_progress' && 'En Progreso'}
                            {goal.status === 'completed' && 'Completado'}
                            {goal.status === 'cancelled' && 'Cancelado'}
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
                                onClick={() => {
                                  setSelectedGoal(goal);
                                  setGoalDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setItemToDelete({ type: 'goal', id: goal.id });
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
                    ))}
                  </TableBody>
                </Table>
              )}
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
                      <Card className="relative overflow-hidden border shadow-card hover:shadow-card-hover transition-shadow bg-card">
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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

      <GoalFormDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={selectedGoal}
        cycles={cycles}
        employees={employees}
        onSubmit={(data) => {
          if (selectedGoal) {
            updateGoal.mutate({ id: selectedGoal.id, ...data });
          } else {
            createGoal.mutate(data);
          }
        }}
        isLoading={createGoal.isPending || updateGoal.isPending}
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
            cycles.find((c) => c.id === evaluationToApply.cycle_id)?.template || null
          }
          onSave={(data) => {
            updateEvaluation.mutate(data as any);
          }}
        />
      )}
    </div>
  );
}
