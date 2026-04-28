import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EvaluationCycle, PerformanceGoal } from '@/types/evaluation';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

const formSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  cycle_id: z.string().optional(),
  title: z.string().min(1, 'Título requerido'),
  description: z.string().optional(),
  target_value: z.string().optional(),
  achieved_value: z.string().optional(),
  weight: z.number().min(0).default(1),
  due_date: z.string().optional(),
  status: z.string().default('pending'),
  progress_percentage: z.number().min(0).max(100).default(0),
  manager_feedback: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: PerformanceGoal | null;
  cycles: EvaluationCycle[];
  employees: Employee[];
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

const GOAL_STATUS = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export function GoalFormDialog({
  open,
  onOpenChange,
  goal,
  cycles,
  employees,
  onSubmit,
  isLoading,
}: GoalFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      cycle_id: '',
      title: '',
      description: '',
      target_value: '',
      achieved_value: '',
      weight: 1,
      due_date: '',
      status: 'pending',
      progress_percentage: 0,
      manager_feedback: '',
    },
  });

  useEffect(() => {
    if (goal) {
      form.reset({
        employee_id: goal.employee_id,
        cycle_id: goal.cycle_id || '',
        title: goal.title,
        description: goal.description || '',
        target_value: goal.target_value || '',
        achieved_value: goal.achieved_value || '',
        weight: goal.weight || 1,
        due_date: goal.due_date || '',
        status: goal.status || 'pending',
        progress_percentage: goal.progress_percentage || 0,
        manager_feedback: goal.manager_feedback || '',
      });
    } else {
      form.reset({
        employee_id: '',
        cycle_id: '',
        title: '',
        description: '',
        target_value: '',
        achieved_value: '',
        weight: 1,
        due_date: '',
        status: 'pending',
        progress_percentage: 0,
        manager_feedback: '',
      });
    }
  }, [goal, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      cycle_id: data.cycle_id || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>
            {goal ? 'Editar Objetivo' : 'Nuevo Objetivo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cycle_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciclo de Evaluación</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Asociar a ciclo (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id}>
                          {cycle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Objetivo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Incrementar ventas en 20%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción detallada del objetivo..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: $100,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="achieved_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logrado</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: $85,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(GOAL_STATUS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="progress_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progreso: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                      max={100}
                      step={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="manager_feedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Retroalimentación del Jefe</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios sobre el avance..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>
            <div className="grid grid-cols-2 gap-2 border-t bg-background p-4 sm:flex sm:justify-end sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {goal ? 'Actualizar' : 'Crear'} Objetivo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
