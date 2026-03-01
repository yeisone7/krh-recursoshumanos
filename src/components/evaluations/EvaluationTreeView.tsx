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
  ChevronRight, Briefcase, Calendar, MoreHorizontal,
  PlayCircle, Download, Edit, Trash2, FolderOpen, Folder,
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
    <div className="space-y-1">
      {centerNames.map(centerName => {
        const isOpen = expandedCenters.has(centerName);
        const cycleGroups = grouped[centerName];
        const cycleNames = Object.keys(cycleGroups).sort();
        const total = totalForCenter(centerName);

        return (
          <div key={centerName}>
            {/* Center Node */}
            <button
              onClick={() => toggleCenter(centerName)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/60 transition-colors text-left group"
            >
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
              {isOpen
                ? <FolderOpen className="h-4 w-4 text-yellow-500" />
                : <Folder className="h-4 w-4 text-yellow-500" />
              }
              <span className="text-sm font-semibold flex-1">{centerName}</span>
              <Badge variant="secondary" className="text-[10px]">{total}</Badge>
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
                  <div className="ml-4 border-l border-border pl-2 space-y-1">
                    {cycleNames.map(cycleName => {
                      const cycleKey = `${centerName}::${cycleName}`;
                      const isCycleOpen = expandedCycles.has(cycleKey);
                      const evals = cycleGroups[cycleName];

                      return (
                        <div key={cycleName}>
                          {/* Cycle Node */}
                          <button
                            onClick={() => toggleCycle(cycleKey)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left group"
                          >
                            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isCycleOpen ? 'rotate-90' : ''}`} />
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium flex-1">{cycleName}</span>
                            <Badge variant="secondary" className="text-[10px]">{evals.length}</Badge>
                          </button>

                          {/* Cycle Children (Table) */}
                          <AnimatePresence initial={false}>
                            {isCycleOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-5 border-l border-border pl-2 mt-1 mb-2">
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
                                            <Badge className={statusColors[evaluation.status]}>
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
