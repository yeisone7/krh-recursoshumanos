import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown, ChevronUp, Briefcase, Calendar, MoreHorizontal,
  PlayCircle, Download, Edit, Trash2, ClipboardCheck,
} from 'lucide-react';
import type { PerformanceEvaluation } from '@/types/evaluation';
import { EVALUATION_TYPE_LABELS, EVALUATION_STATUS_LABELS } from '@/types/evaluation';

interface Props {
  centerNames: string[];
  grouped: Record<string, Record<string, any[]>>;
  statusColors: Record<string, string>;
  onApply: (ev: PerformanceEvaluation) => void;
  onDownloadPdf: (ev: PerformanceEvaluation) => void;
  onEdit: (ev: PerformanceEvaluation) => void;
  onDelete: (ev: PerformanceEvaluation) => void;
}

export function EvaluationTreeView({
  centerNames, grouped, statusColors, onApply, onDownloadPdf, onEdit, onDelete,
}: Props) {
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());

  const toggleCenter = (name: string) => {
    setExpandedCenters(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleCycle = (key: string) => {
    setExpandedCycles(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalForCenter = (centerName: string) =>
    Object.values(grouped[centerName]).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-3">
      {centerNames.map(centerName => {
        const isOpen = expandedCenters.has(centerName);
        const cycleGroups = grouped[centerName];
        const cycleNames = Object.keys(cycleGroups).sort();
        const total = totalForCenter(centerName);

        return (
          <div
            key={centerName}
            className="border rounded-xl bg-card overflow-hidden"
          >
            {/* Center Header */}
            <button
              onClick={() => toggleCenter(centerName)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wide">{centerName}</span>
                <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-[20px] justify-center rounded-full">
                  {total}
                </Badge>
              </div>
              {isOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </button>

            {/* Center Children */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {cycleNames.map(cycleName => {
                      const cycleKey = `${centerName}::${cycleName}`;
                      const isCycleOpen = expandedCycles.has(cycleKey);
                      const evals = cycleGroups[cycleName];

                      return (
                        <div
                          key={cycleName}
                          className="border rounded-lg overflow-hidden"
                        >
                          {/* Cycle Header */}
                          <button
                            onClick={() => toggleCycle(cycleKey)}
                            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{cycleName}</span>
                              <Badge variant="secondary" className="text-[10px] rounded-full">{evals.length}</Badge>
                            </div>
                            {isCycleOpen
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>

                          {/* Cycle Children */}
                          <AnimatePresence initial={false}>
                            {isCycleOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3">
                                  <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Empleado</TableHead>
                                          <TableHead>Tipo</TableHead>
                                          <TableHead>Estado</TableHead>
                                          <TableHead>Puntaje</TableHead>
                                          <TableHead>Calificación</TableHead>
                                          <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {evals.map((evaluation: PerformanceEvaluation) => (
                                          <TableRow key={evaluation.id}>
                                            <TableCell className="font-medium">
                                              {evaluation.employee?.first_name} {evaluation.employee?.last_name}
                                            </TableCell>
                                            <TableCell>{EVALUATION_TYPE_LABELS[evaluation.evaluation_type]}</TableCell>
                                            <TableCell>
                                              <Badge className={`${statusColors[evaluation.status]} rounded-full`}>
                                                {EVALUATION_STATUS_LABELS[evaluation.status]}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              {evaluation.overall_score != null ? (
                                                <span className="font-medium">{evaluation.overall_score}/100</span>
                                              ) : '-'}
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
                                                  <DropdownMenuItem onClick={() => onApply(evaluation)}>
                                                    <PlayCircle className="h-4 w-4 mr-2" /> Evaluar
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => onDownloadPdf(evaluation)}>
                                                    <Download className="h-4 w-4 mr-2" /> Descargar PDF
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => onEdit(evaluation)}>
                                                    <Edit className="h-4 w-4 mr-2" /> Editar
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem className="text-destructive" onClick={() => onDelete(evaluation)}>
                                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
