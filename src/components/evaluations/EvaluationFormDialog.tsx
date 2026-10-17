import { templateAppliesToPosition } from '@/lib/evaluationScoring';
import type { EvaluationTemplate } from '@/types/evaluation';
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

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  work_info?: { position_id?: string | null } | null;
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
  templates: EvaluationTemplate[];
  onSubmit: (data: Pick<FormData, 'cycle_id' | 'employee_id' | 'evaluation_type'>) => Promise<unknown>;
  isLoading?: boolean;
}

export function EvaluationFormDialog({
  open,
  onOpenChange,
  evaluation,
  cycles,
  employees,
  templates,
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

  const selectedCycleId = form.watch('cycle_id');
  const selectedCycle = cycles.find(c => c.id === selectedCycleId);
  const selectedTemplate = templates.find(t => t.id === selectedCycle?.template_id);
  const eligibleEmployees = employees.filter(emp => templateAppliesToPosition(selectedTemplate, emp.work_info?.position_id));
  const handleSubmit = async (data: FormData) => {
    if (!evaluation && !eligibleEmployees.some(emp => emp.id === data.employee_id)) {
      form.setError('employee_id', { message: 'El cargo del empleado no corresponde a esta plantilla' });
      return;
    }
    try {
      await onSubmit({ cycle_id: data.cycle_id, employee_id: data.employee_id, evaluation_type: data.evaluation_type });
      onOpenChange(false);
    } catch { /* Keep the form on error. */ }
  };
  const activeCycles = cycles.filter(c => c.status === 'active' || c.status === 'draft' || c.id === evaluation?.cycle_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>
            {evaluation ? 'Editar Evaluación' : 'Nueva Evaluación de Desempeño'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="cycle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Evaluación *</FormLabel>
                    <Select disabled={!!evaluation} onValueChange={value => { field.onChange(value); form.setValue("employee_id", ""); }} value={field.value}>
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
                    <Select disabled={!!evaluation || !selectedTemplate} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(evaluation ? employees : eligibleEmployees).map((emp) => (
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

            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
              {selectedTemplate ? <><strong>{selectedTemplate.name}</strong><p>{selectedTemplate.criteria?.length || 0} criterios · Escala de 1 a 4</p><p>{eligibleEmployees.length} empleados con un cargo aplicable.</p></> : 'Selecciona un ciclo para ver su plantilla y los empleados que pueden evaluarse.'}
              <p className="mt-2">La calificación y el estado final se obtienen al aplicar la evaluación. Usa el formulario de evaluación para registrar las respuestas y las firmas.</p>
            </div>

            </div>
            <div className="grid grid-cols-1 gap-2 border-t bg-background p-4 sm:flex sm:justify-end sm:px-6">
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
