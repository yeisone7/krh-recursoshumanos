import { useState, useMemo } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  UserCheck,
  UserX,
  MessageSquare,
  Brain,
  FileSearch,
  Stethoscope,
  CheckCircle2,
  Clock,
  GripVertical,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useUpdateCandidate } from '@/hooks/useCandidates';
import type { CandidateStatus } from '@/types/vacancy';

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  status: string;
  application_date: string;
  email?: string;
  phone?: string;
  vacancies?: {
    position_title: string;
    operation_centers?: { name: string };
  };
  selection_steps?: Array<{
    step_type: string;
    status: string;
  }>;
}

interface KanbanColumn {
  id: CandidateStatus;
  title: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  borderColor: string;
}

const columns: KanbanColumn[] = [
  {
    id: 'applied',
    title: 'Postulados',
    icon: Users,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted-foreground/20',
  },
  {
    id: 'in_interview',
    title: 'Entrevista',
    icon: MessageSquare,
    color: 'text-info',
    bgColor: 'bg-info/10',
    borderColor: 'border-info/20',
  },
  {
    id: 'in_psycho_test',
    title: 'Prueba Psico',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  {
    id: 'in_validation',
    title: 'Validación',
    icon: FileSearch,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'in_medical',
    title: 'Examen Médico',
    icon: Stethoscope,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    id: 'selected',
    title: 'Seleccionados',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success-light',
    borderColor: 'border-success/20',
  },
];

interface CandidateKanbanProps {
  candidates: Candidate[];
  onCandidateClick: (candidateId: string) => void;
}

export function CandidateKanban({ candidates, onCandidateClick }: CandidateKanbanProps) {
  const [draggedCandidate, setDraggedCandidate] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<CandidateStatus | null>(null);
  
  const updateCandidate = useUpdateCandidate();

  // Group candidates by status
  const candidatesByStatus = useMemo(() => {
    const grouped: Record<string, Candidate[]> = {};
    columns.forEach(col => {
      grouped[col.id] = candidates.filter(c => c.status === col.id);
    });
    return grouped;
  }, [candidates]);

  const handleDragStart = (candidateId: string) => {
    setDraggedCandidate(candidateId);
  };

  const handleDragEnd = () => {
    setDraggedCandidate(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: CandidateStatus) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: CandidateStatus) => {
    e.preventDefault();
    
    if (!draggedCandidate) return;
    
    const candidate = candidates.find(c => c.id === draggedCandidate);
    if (!candidate || candidate.status === targetStatus) {
      handleDragEnd();
      return;
    }

    // Validate transition rules
    const currentIndex = columns.findIndex(c => c.id === candidate.status);
    const targetIndex = columns.findIndex(c => c.id === targetStatus);
    
    // Only allow moving forward one step or backward
    if (targetIndex > currentIndex + 1) {
      toast.error('Movimiento no permitido', {
        description: 'Los candidatos deben pasar por cada etapa en orden.',
      });
      handleDragEnd();
      return;
    }

    try {
      await updateCandidate.mutateAsync({
        id: draggedCandidate,
        status: targetStatus,
        current_step: getStepTypeFromStatus(targetStatus),
      });

      toast.success('Candidato actualizado', {
        description: `${candidate.first_name} ${candidate.last_name} movido a ${columns.find(c => c.id === targetStatus)?.title}`,
      });
    } catch (error) {
      console.error('Error updating candidate:', error);
      toast.error('Error', {
        description: 'No se pudo actualizar el candidato.',
      });
    }

    handleDragEnd();
  };

  const getStepTypeFromStatus = (status: CandidateStatus): 'initial_interview' | 'psycho_test' | 'background_check' | 'medical_exam' | null => {
    const stepMap: Record<string, 'initial_interview' | 'psycho_test' | 'background_check' | 'medical_exam' | null> = {
      applied: null,
      in_interview: 'initial_interview',
      in_psycho_test: 'psycho_test',
      in_validation: 'background_check',
      in_medical: 'medical_exam',
      selected: null,
    };
    return stepMap[status] || null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnCandidates = candidatesByStatus[column.id] || [];
        const Icon = column.icon;
        const isDropTarget = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <Card
              className={cn(
                'h-full transition-all duration-200',
                isDropTarget && 'ring-2 ring-primary ring-offset-2',
                column.borderColor
              )}
            >
              <CardHeader className={cn('py-3 px-4', column.bgColor)}>
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <div className={cn('flex items-center gap-2', column.color)}>
                    <Icon className="w-4 h-4" />
                    {column.title}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {columnCandidates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[calc(100vh-380px)] min-h-[300px]">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence mode="popLayout">
                      {columnCandidates.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          Sin candidatos
                        </motion.div>
                      ) : (
                        columnCandidates.map((candidate) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            isDragging={draggedCandidate === candidate.id}
                            onDragStart={() => handleDragStart(candidate.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => onCandidateClick(candidate.id)}
                          />
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

interface CandidateCardProps {
  candidate: Candidate;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}

function CandidateCard({ 
  candidate, 
  isDragging, 
  onDragStart, 
  onDragEnd,
  onClick,
}: CandidateCardProps) {
  const passedSteps = candidate.selection_steps?.filter(s => s.status === 'passed').length || 0;
  const totalSteps = candidate.selection_steps?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'p-3 rounded-lg border bg-card shadow-sm cursor-grab active:cursor-grabbing transition-all',
        'hover:shadow-md hover:border-primary/30',
        isDragging && 'shadow-lg border-primary'
      )}
    >
      <div className="flex items-start gap-2">
        <div className="p-1 text-muted-foreground hover:text-foreground cursor-grab">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-primary">
                  {candidate.first_name[0]}{candidate.last_name[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {candidate.first_name} {candidate.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {candidate.vacancies?.position_title || 'Sin vacante'}
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(candidate.application_date), 'dd MMM', { locale: es })}
            </div>
            {totalSteps > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success transition-all"
                    style={{ width: `${(passedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <span>{passedSteps}/{totalSteps}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
