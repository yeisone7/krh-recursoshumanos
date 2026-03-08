import { CheckCircle2, Circle, Loader2, ListChecks, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useOnboardingTasks, useToggleOnboardingTask, useCreateOnboardingTasks } from '@/hooks/useOnboardingTasks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OnboardingChecklistProps {
  employeeId: string;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const { data: tasks, isLoading } = useOnboardingTasks(employeeId);
  const toggleTask = useToggleOnboardingTask();
  const createTasks = useCreateOnboardingTasks();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ListChecks className="w-12 h-12 text-muted-foreground mb-3" />
        <h3 className="font-semibold text-foreground mb-1">Sin checklist de onboarding</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
          Este empleado no tiene tareas de onboarding asignadas. Puedes generar el checklist predeterminado de 8 tareas.
        </p>
        <Button
          onClick={() => {
            createTasks.mutate(employeeId, {
              onSuccess: () => toast.success('Checklist de onboarding creado'),
              onError: (err) => toast.error('Error al crear checklist', { description: err.message }),
            });
          }}
          disabled={createTasks.isPending}
          className="gap-2"
        >
          {createTasks.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Generar Checklist
        </Button>
      </div>
    );
  }

  const completed = tasks.filter(t => t.is_completed).length;
  const percentage = Math.round((completed / tasks.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Onboarding</h3>
        </div>
        <span className="text-sm font-medium text-muted-foreground">{completed}/{tasks.length}</span>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="space-y-1">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask.mutate({ taskId: task.id, isCompleted: !task.is_completed, employeeId })}
            disabled={toggleTask.isPending}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
              task.is_completed && "opacity-60"
            )}
          >
            {task.is_completed ? (
              <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn("text-sm font-medium", task.is_completed && "line-through text-muted-foreground")}>
                {task.task_label}
              </p>
              {task.task_description && (
                <p className="text-xs text-muted-foreground mt-0.5">{task.task_description}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
