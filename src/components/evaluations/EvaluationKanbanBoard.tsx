import { useMemo, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Loader2,
  Send,
  Eye,
  CheckCircle2,
  MoreVertical,
  PlayCircle,
  Download,
  Edit,
  Trash2,
  Filter,
  User,
  GripVertical,
} from 'lucide-react';
import type { PerformanceEvaluation, EvaluationStatus, EvaluationCycle } from '@/types/evaluation';
import { EVALUATION_STATUS_LABELS, EVALUATION_TYPE_LABELS } from '@/types/evaluation';

interface KanbanColumn {
  status: EvaluationStatus;
  label: string;
  icon: React.ReactNode;
  accent: string;
  headerBg: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    status: 'pending',
    label: 'Pendiente',
    icon: <Clock className="h-4 w-4" />,
    accent: 'border-t-yellow-500',
    headerBg: 'bg-yellow-50 dark:bg-yellow-950/30',
  },
  {
    status: 'in_progress',
    label: 'En Progreso',
    icon: <Loader2 className="h-4 w-4" />,
    accent: 'border-t-blue-500',
    headerBg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    status: 'submitted',
    label: 'Enviada',
    icon: <Send className="h-4 w-4" />,
    accent: 'border-t-purple-500',
    headerBg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    status: 'reviewed',
    label: 'Revisada',
    icon: <Eye className="h-4 w-4" />,
    accent: 'border-t-indigo-500',
    headerBg: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
  {
    status: 'approved',
    label: 'Aprobada',
    icon: <CheckCircle2 className="h-4 w-4" />,
    accent: 'border-t-green-500',
    headerBg: 'bg-green-50 dark:bg-green-950/30',
  },
];

interface Props {
  evaluations: PerformanceEvaluation[];
  cycles: EvaluationCycle[];
  loading: boolean;
  onApply: (evaluation: PerformanceEvaluation) => void;
  onDownloadPdf: (evaluation: PerformanceEvaluation) => void;
  onEdit: (evaluation: PerformanceEvaluation) => void;
  onDelete: (evaluation: PerformanceEvaluation) => void;
  onStatusChange?: (evaluationId: string, newStatus: EvaluationStatus) => void;
  showCycleFilter?: boolean;
}

export function EvaluationKanbanBoard({
  evaluations,
  cycles,
  loading,
  onApply,
  onDownloadPdf,
  onEdit,
  onDelete,
  onStatusChange,
  showCycleFilter = true,
}: Props) {
  const [cycleFilter, setCycleFilter] = useState<string>('all');

  const filtered = useMemo(
    () => showCycleFilter ? (cycleFilter === 'all' ? evaluations : evaluations.filter(e => e.cycle_id === cycleFilter)) : evaluations,
    [evaluations, cycleFilter, showCycleFilter],
  );

  const grouped = useMemo(() => {
    const map: Record<EvaluationStatus, PerformanceEvaluation[]> = {
      pending: [],
      in_progress: [],
      submitted: [],
      reviewed: [],
      approved: [],
    };
    filtered.forEach(ev => {
      if (map[ev.status]) map[ev.status].push(ev);
    });
    return map;
  }, [filtered]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !onStatusChange) return;
    const newStatus = result.destination.droppableId as EvaluationStatus;
    const evalId = result.draggableId;
    // Only fire if status actually changed
    if (result.source.droppableId !== newStatus) {
      onStatusChange(evalId, newStatus);
    }
  }, [onStatusChange]);

  if (loading) {
    return <p className="text-muted-foreground text-center py-8">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      {showCycleFilter && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Filtrar por ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los ciclos</SelectItem>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid min-h-[500px] grid-cols-[repeat(5,minmax(240px,1fr))] gap-3 overflow-x-auto overscroll-x-contain pb-2 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = grouped[col.status] || [];
            return (
              <div key={col.status} className="flex flex-col">
                {/* Column Header */}
                <div className={`rounded-t-lg px-3 py-2.5 border-t-4 ${col.accent} ${col.headerBg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {col.icon}
                      <span>{col.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs h-5 min-w-[20px] justify-center">
                      {items.length}
                    </Badge>
                  </div>
                </div>

                {/* Column Body (Droppable) */}
                <Droppable droppableId={col.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-b-lg border border-t-0 p-2 transition-colors min-h-[400px] ${
                        snapshot.isDraggingOver
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-muted/30'
                      }`}
                    >
                      <div className="space-y-2">
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <p className="text-xs text-muted-foreground text-center py-8">Sin evaluaciones</p>
                        )}
                        {items.map((ev, i) => (
                          <Draggable key={ev.id} draggableId={ev.id} index={i}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={`${dragSnapshot.isDragging ? 'opacity-90' : ''}`}
                              >
                                <Card className={`shadow-sm transition-shadow ${
                                  dragSnapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'
                                }`}>
                                  <CardContent className="p-3 space-y-2">
                                    {/* Employee + Drag Handle */}
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <div
                                          {...dragProvided.dragHandleProps}
                                          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-muted-foreground hover:text-foreground"
                                        >
                                          <GripVertical className="h-3.5 w-3.5" />
                                        </div>
                                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-sm font-medium truncate">
                                          {ev.employee?.first_name} {ev.employee?.last_name}
                                        </span>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                            <MoreVertical className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => onApply(ev)}>
                                            <PlayCircle className="h-4 w-4 mr-2" />
                                            Evaluar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => onDownloadPdf(ev)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Descargar PDF
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => onEdit(ev)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(ev)}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Eliminar
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>

                                    {/* Cycle & Type */}
                                    <div className="flex flex-wrap gap-1">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {ev.cycle?.name || '-'}
                                      </Badge>
                                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {EVALUATION_TYPE_LABELS[ev.evaluation_type]}
                                      </Badge>
                                    </div>

                                    {/* Score */}
                                    {ev.overall_score != null && (
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all ${
                                              ev.overall_score >= 75 ? 'bg-green-500' :
                                              ev.overall_score >= 50 ? 'bg-blue-500' :
                                              ev.overall_score >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${ev.overall_score}%` }}
                                          />
                                        </div>
                                        <span className="text-xs font-medium tabular-nums">{ev.overall_score}</span>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
