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
import { Textarea } from '@/components/ui/textarea';
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
import type { EvaluationCycle, PerformanceEvaluation } from '@/types/evaluation';
import { EVALUATION_TYPE_LABELS, EVALUATION_STATUS_LABELS } from '@/types/evaluation';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
}

const formSchema = z.object({
  cycle_id: z.string().min(1, 'Ciclo requerido'),
  employee_id: z.string().min(1, 'Empleado requerido'),
  evaluation_type: z.enum(['self', 'manager', 'peer', '360']).default('manager'),
  status: z.enum(['pending', 'in_progress', 'submitted', 'reviewed', 'approved']).default('pending'),
  overall_rating: z.string().optional(),
  strengths: z.string().optional(),
  areas_to_improve: z.string().optional(),
  general_comments: z.string().optional(),
  development_plan: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EvaluationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evaluation?: PerformanceEvaluation | null;
  cycles: EvaluationCycle[];
  employees: Employee[];
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function EvaluationFormDialog({
  open,
  onOpenChange,
  evaluation,
  cycles,
  employees,
  onSubmit,
  isLoading,
}: EvaluationFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cycle_id: '',
      employee_id: '',
      evaluation_type: 'manager',
      status: 'pending',
      overall_rating: '',
      strengths: '',
      areas_to_improve: '',
      general_comments: '',
      development_plan: '',
    },
  });

  useEffect(() => {
    if (evaluation) {
      form.reset({
        cycle_id: evaluation.cycle_id,
        employee_id: evaluation.employee_id,
        evaluation_type: evaluation.evaluation_type,
        status: evaluation.status,
        overall_rating: evaluation.overall_rating || '',
        strengths: evaluation.strengths || '',
        areas_to_improve: evaluation.areas_to_improve || '',
        general_comments: evaluation.general_comments || '',
        development_plan: evaluation.development_plan || '',
      });
    } else {
      form.reset({
        cycle_id: '',
        employee_id: '',
        evaluation_type: 'manager',
        status: 'pending',
        overall_rating: '',
        strengths: '',
        areas_to_improve: '',
        general_comments: '',
        development_plan: '',
      });
    }
  }, [evaluation, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  const activeCycles = cycles.filter(c => c.status === 'active' || c.status === 'draft');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {evaluation ? 'Editar Evaluación' : 'Nueva Evaluación de Desempeño'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cycle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Evaluación *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar ciclo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCycles.map((cycle) => (
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="evaluation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evaluación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(EVALUATION_TYPE_LABELS).map(([value, label]) => (
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
                        {Object.entries(EVALUATION_STATUS_LABELS).map(([value, label]) => (
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
              name="overall_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calificación General</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar calificación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="excepcional">Excepcional</SelectItem>
                      <SelectItem value="sobresaliente">Sobresaliente</SelectItem>
                      <SelectItem value="satisfactorio">Satisfactorio</SelectItem>
                      <SelectItem value="en_desarrollo">En Desarrollo</SelectItem>
                      <SelectItem value="insatisfactorio">Insatisfactorio</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strengths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fortalezas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Principales fortalezas del empleado..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="areas_to_improve"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Áreas de Mejora</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Áreas donde el empleado puede mejorar..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="general_comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios Generales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="development_plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan de Desarrollo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Acciones sugeridas para el desarrollo del empleado..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {evaluation ? 'Actualizar' : 'Crear'} Evaluación
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
