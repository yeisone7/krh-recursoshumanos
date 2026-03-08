import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useOnboardingTasks,
  useToggleOnboardingTask,
  useCreateOnboardingTasks,
  useAddCustomOnboardingTask,
  useDeleteOnboardingTask,
} from '@/hooks/useOnboardingTasks';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OnboardingChecklistProps {
  employeeId: string;
}

export function OnboardingChecklist({ employeeId }: OnboardingChecklistProps) {
  const { data: tasks, isLoading } = useOnboardingTasks(employeeId);
  const toggleTask = useToggleOnboardingTask();
  const createTasks = useCreateOnboardingTasks();
  const addCustomTask = useAddCustomOnboardingTask();
  const deleteTask = useDeleteOnboardingTask();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');

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

  const handleAddTask = () => {
    if (!newLabel.trim()) return;
    addCustomTask.mutate(
      { employeeId, label: newLabel.trim(), description: newDescription.trim() || undefined },
      {
        onSuccess: () => {
          setNewLabel('');
          setNewDescription('');
          setShowAddForm(false);
          toast.success('Tarea agregada');
        },
        onError: (err) => toast.error('Error', { description: err.message }),
      }
    );
  };

  const handleDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask.mutate(
      { taskId, employeeId },
      { onSuccess: () => toast.success('Tarea eliminada') }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Onboarding</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{completed}/{tasks.length}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar
          </Button>
        </div>
      </div>

      <Progress value={percentage} className="h-2" />

      {showAddForm && (
        <div className="p-3 rounded-lg border border-dashed border-primary/30 bg-primary-light/30 space-y-2">
          <Input
            placeholder="Nombre de la tarea *"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Descripción (opcional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setNewLabel(''); setNewDescription(''); }}>
              Cancelar
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAddTask} disabled={!newLabel.trim() || addCustomTask.isPending}>
              {addCustomTask.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
              Agregar
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={cn(
              "group w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
              task.is_completed && "opacity-60"
            )}
          >
            <button
              onClick={() => toggleTask.mutate({ taskId: task.id, isCompleted: !task.is_completed, employeeId })}
              disabled={toggleTask.isPending}
              className="flex-shrink-0 mt-0.5"
            >
              {task.is_completed ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", task.is_completed && "line-through text-muted-foreground")}>
                {task.task_label}
              </p>
              {task.task_description && (
                <p className="text-xs text-muted-foreground mt-0.5">{task.task_description}</p>
              )}
            </div>
            {task.task_key?.startsWith('custom_') && (
              <button
                onClick={(e) => handleDelete(task.id, e)}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 text-muted-foreground hover:text-destructive"
                title="Eliminar tarea"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
