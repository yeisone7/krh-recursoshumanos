import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  SelectionStepType,
  SelectionStepStatus,
  selectionStepTypeLabels,
  selectionStepStatusLabels,
} from '@/types/vacancy';
import { useCreateSelectionStep, useUpdateSelectionStep } from '@/hooks/useCandidates';
import type { Database } from '@/integrations/supabase/types';

type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];

const stepFormSchema = z.object({
  stepType: z.string().min(1, 'El tipo de etapa es requerido'),
  status: z.string().default('pending'),
  scheduledDate: z.date().optional(),
  completedDate: z.date().optional(),
  evaluatorName: z.string().optional(),
  score: z.string().optional(),
  result: z.string().optional(),
  notes: z.string().optional(),
});

type StepFormData = z.infer<typeof stepFormSchema>;

interface SelectionStepFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  step?: SelectionStep;
  defaultStepType?: SelectionStepType;
  existingStepOrder?: number;
}

export function SelectionStepFormDialog({
  open,
  onOpenChange,
  candidateId,
  step,
  defaultStepType,
  existingStepOrder = 0,
}: SelectionStepFormDialogProps) {
  const createStep = useCreateSelectionStep();
  const updateStep = useUpdateSelectionStep();
  const isEditing = !!step;

  const form = useForm<StepFormData>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      stepType: step?.step_type || defaultStepType || '',
      status: step?.status || 'pending',
      scheduledDate: step?.scheduled_date ? new Date(step.scheduled_date) : undefined,
      completedDate: step?.completed_date ? new Date(step.completed_date) : undefined,
      evaluatorName: step?.evaluator_name || '',
      score: step?.score?.toString() || '',
      result: step?.result || '',
      notes: step?.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        stepType: step?.step_type || defaultStepType || '',
        status: step?.status || 'pending',
        scheduledDate: step?.scheduled_date ? new Date(step.scheduled_date) : undefined,
        completedDate: step?.completed_date ? new Date(step.completed_date) : undefined,
        evaluatorName: step?.evaluator_name || '',
        score: step?.score?.toString() || '',
        result: step?.result || '',
        notes: step?.notes || '',
      });
    }
  }, [open, step, defaultStepType]);

  const handleSubmit = async (data: StepFormData) => {
    try {
      const stepData = {
        step_type: data.stepType as SelectionStepType,
        status: data.status as SelectionStepStatus,
        scheduled_date: data.scheduledDate?.toISOString() || null,
        completed_date: data.completedDate?.toISOString() || null,
        evaluator_name: data.evaluatorName || null,
        score: data.score ? parseFloat(data.score) : null,
        result: data.result || null,
        notes: data.notes || null,
      };

      if (isEditing && step) {
        await updateStep.mutateAsync({
          id: step.id,
          ...stepData,
        });
        toast.success('Etapa actualizada');
      } else {
        await createStep.mutateAsync({
          candidate_id: candidateId,
          step_order: existingStepOrder + 1,
          ...stepData,
        });
        toast.success('Etapa agregada');
      }

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      console.error('Error saving step:', error);
      toast.error('Error al guardar etapa', {
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Etapa' : 'Nueva Etapa de Selección'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información de la etapa de selección.'
              : 'Agrega una nueva etapa al proceso de selección.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stepType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Etapa *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing || !!defaultStepType}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {Object.entries(selectionStepTypeLabels).map(([value, label]) => (
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
                      <SelectContent className="bg-background">
                        {Object.entries(selectionStepStatusLabels).map(([value, label]) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Programada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="completedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Completada</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="evaluatorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evaluador</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del evaluador" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puntuación (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" placeholder="85" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resultado</FormLabel>
                  <FormControl>
                    <Input placeholder="Resumen del resultado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createStep.isPending || updateStep.isPending}>
                {isEditing ? 'Actualizar' : 'Agregar Etapa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
