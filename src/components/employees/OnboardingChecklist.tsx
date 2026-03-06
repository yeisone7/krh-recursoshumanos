import { CheckCircle2, Circle, Loader2, ListChecks } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useOnboardingTasks, useToggleOnboardingTask } from '@/hooks/useOnboardingTasks';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  employeeId: string;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const { data: tasks, isLoading } = useOnboardingTasks(employeeId);
  const toggleTask = useToggleOnboardingTask();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) return null;

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
