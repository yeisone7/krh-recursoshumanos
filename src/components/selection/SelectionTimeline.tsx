import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  SkipForward,
  MessageSquare,
  FileText,
  Stethoscope,
  UserCheck,
  GraduationCap,
  Phone,
  Award,
  Calendar,
  Plus,
  Filter,
  Ban,
  Brain,
  BookOpen,
  FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SelectionStepType,
  SelectionStepStatus,
  selectionStepTypeLabels,
  selectionStepStatusLabels,
  stepsWithConcepto,
} from '@/types/vacancy';
import type { Database } from '@/integrations/supabase/types';

type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];

interface SelectionTimelineProps {
  steps: SelectionStep[];
  candidateId: string;
  onAddStep?: (stepType: SelectionStepType) => void;
  onEditStep?: (step: SelectionStep) => void;
  onUpdateStepStatus?: (stepId: string, status: SelectionStepStatus) => void;
  onGenerateExamOrder?: (step: SelectionStep) => void;
  readOnly?: boolean;
}

const stepIcons: Record<SelectionStepType, React.ElementType> = {
  prefiltro: Filter,
  entrevista_seleccion: MessageSquare,
  entrevista_jefe: UserCheck,
  validacion_antecedentes: UserCheck,
  pruebas_psicotecnicas: Brain,
  pruebas_conocimiento: BookOpen,
  validacion_academica: GraduationCap,
  validacion_referencias: Phone,
  examenes_medicos: Stethoscope,
};

const statusStyles: Record<SelectionStepStatus, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted' },
  scheduled: { icon: Calendar, color: 'text-info', bg: 'bg-info/10' },
  completed: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  passed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  not_applicable: { icon: Ban, color: 'text-muted-foreground', bg: 'bg-muted/30' },
};

// Standard selection flow order
const standardStepOrder: SelectionStepType[] = [
  'prefiltro',
  'entrevista_seleccion',
  'entrevista_jefe',
  'validacion_antecedentes',
  'pruebas_psicotecnicas',
  'pruebas_conocimiento',
  'validacion_academica',
  'validacion_referencias',
  'examenes_medicos',
];

export function SelectionTimeline({
  steps,
  candidateId,
  onAddStep,
  onEditStep,
  onUpdateStepStatus,
  onGenerateExamOrder,
  readOnly = false,
}: SelectionTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  // Sort steps by step_order
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);

  // Find missing steps from standard flow
  const existingStepTypes = new Set(steps.map((s) => s.step_type));
  const missingSteps = standardStepOrder.filter((st) => !existingStepTypes.has(st as any));

  const getStepProgress = () => {
    if (steps.length === 0) return 0;
    const completedOrPassed = steps.filter((s) => s.status === 'passed' || s.status === 'completed').length;
    return (completedOrPassed / steps.length) * 100;
  };

  const getResultLabel = (step: SelectionStep) => {
    const stepType = step.step_type as SelectionStepType;
    if (stepsWithConcepto.includes(stepType)) {
      if (step.result === 'apto') return 'Apto';
      if (step.result === 'no_apto') return 'No Apto';
    }
    return step.result;
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-success transition-all duration-500"
            style={{ width: `${getStepProgress()}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {steps.filter((s) => s.status === 'passed').length}/{steps.length} etapas
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedSteps.map((step, index) => {
            const stepType = step.step_type as SelectionStepType;
            const StepIcon = stepIcons[stepType] || FileText;
            const statusStyle = statusStyles[step.status as SelectionStepStatus] || statusStyles.pending;
            const StatusIcon = statusStyle.icon;
            const isExpanded = expandedStep === step.id;
            const isLast = index === sortedSteps.length - 1;

            return (
              <div
                key={step.id}
                className={cn(
                  'relative pl-12 transition-all',
                  !isLast && 'pb-4'
                )}
              >
                {/* Icon circle */}
                <div
                  className={cn(
                    'absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background z-10 transition-all',
                    statusStyle.bg,
                    isExpanded && 'ring-2 ring-primary/20'
                  )}
                >
                  <StatusIcon className={cn('w-5 h-5', statusStyle.color)} />
                </div>

                {/* Content card */}
                <div
                  className={cn(
                    'p-4 rounded-lg border bg-card cursor-pointer transition-all hover:border-primary/30',
                    isExpanded && 'border-primary/50 shadow-sm'
                  )}
                  onClick={() => {
                    if (!readOnly && onEditStep) {
                      onEditStep(step);
                    } else {
                      setExpandedStep(isExpanded ? null : step.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <StepIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm">
                          {selectionStepTypeLabels[stepType] || stepType}
                        </p>
                        {step.scheduled_date && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(step.scheduled_date), 'PPP', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-xs', statusStyle.bg, statusStyle.color)}>
                        {selectionStepStatusLabels[step.status as SelectionStepStatus] || step.status}
                      </Badge>
                      {step.score !== null && (
                        <Badge variant="secondary" className="text-xs">
                          {step.score}%
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {step.evaluator_name && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Evaluador:</span>{' '}
                          <span className="font-medium">{step.evaluator_name}</span>
                        </div>
                      )}
                      {step.result && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            {stepsWithConcepto.includes(stepType) ? 'Concepto:' : 'Resultado:'}
                          </span>{' '}
                          <span className="font-medium">{getResultLabel(step)}</span>
                        </div>
                      )}
                      {step.notes && (
                        <div className="text-sm">
                          <span className="text-muted-foreground block mb-1">Observaciones:</span>
                          <p className="text-foreground whitespace-pre-wrap">{step.notes}</p>
                        </div>
                      )}
                      {step.completed_date && (
                        <div className="text-sm text-muted-foreground">
                          Completado: {format(new Date(step.completed_date), 'PPP', { locale: es })}
                        </div>
                      )}

                      {/* Quick status actions */}
                      {!readOnly && onUpdateStepStatus && step.status !== 'passed' && step.status !== 'failed' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success hover:text-success hover:border-success"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStepStatus(step.id, 'passed');
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            {stepsWithConcepto.includes(stepType) ? 'Apto' : 'Aprobar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive hover:border-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStepStatus(step.id, 'failed');
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {stepsWithConcepto.includes(stepType) ? 'No Apto' : 'No Aprobar'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add step button */}
          {!readOnly && onAddStep && missingSteps.length > 0 && (
            <div className="relative pl-12">
              <div className="absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 z-10">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="p-4 rounded-lg border border-dashed hover:border-primary/50 transition-colors">
                <p className="text-sm text-muted-foreground mb-2">Agregar etapa</p>
                <div className="flex flex-wrap gap-2">
                  {missingSteps.map((stepType) => {
                    const Icon = stepIcons[stepType];
                    return (
                      <Button
                        key={stepType}
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => onAddStep(stepType)}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {selectionStepTypeLabels[stepType]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
