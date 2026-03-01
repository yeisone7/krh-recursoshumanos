import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

export function EvaluationKanbanBoard({
  evaluations,
  cycles,
  loading,
  onApply,
  onDownloadPdf,
  onEdit,
  onDelete,
}: Props) {
  const [cycleFilter, setCycleFilter] = useState<string>('all');

  const filtered = useMemo(
    () => (cycleFilter === 'all' ? evaluations : evaluations.filter(e => e.cycle_id === cycleFilter)),
    [evaluations, cycleFilter],
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

  if (loading) {
    return <p className="text-muted-foreground text-center py-8">Cargando...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={cycleFilter} onValueChange={setCycleFilter}>
          <SelectTrigger className="w-[240px]">
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

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-3 min-h-[500px]">
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

              {/* Column Body */}
              <ScrollArea className="flex-1 rounded-b-lg border border-t-0 bg-muted/30 p-2">
                <div className="space-y-2 min-h-[400px]">
                  {items.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">Sin evaluaciones</p>
                  )}
                  {items.map((ev, i) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card className="shadow-sm hover:shadow-md transition-shadow cursor-default">
                        <CardContent className="p-3 space-y-2">
                          {/* Employee */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
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
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    </div>
  );
}
