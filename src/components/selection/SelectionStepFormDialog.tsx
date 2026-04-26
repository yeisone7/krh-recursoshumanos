import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Stethoscope, ClipboardList } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
  stepsWithNotApplicable,
  stepsWithScore,
  stepsWithConcepto,
} from '@/types/vacancy';
import { useCreateSelectionStep, useUpdateSelectionStep } from '@/hooks/useCandidates';
import { useExamProfesiogramaByVacancy } from '@/hooks/useExamProfesiogramaByVacancy';
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
  // Medical exam fields
  provider: z.string().optional(),
  doctorName: z.string().optional(),
  medicalConcept: z.string().optional(),
});

type StepFormData = z.infer<typeof stepFormSchema>;

interface SelectionStepFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  step?: SelectionStep;
  defaultStepType?: SelectionStepType;
  existingStepOrder?: number;
  vacancyOperationCenterId?: string;
  vacancyPositionId?: string;
}

// Get available status options based on step type
function getStatusOptions(stepType: string) {
  const base = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'passed', label: stepsWithConcepto.includes(stepType as SelectionStepType) ? 'Apto' : 'Aprobó' },
    { value: 'failed', label: stepsWithConcepto.includes(stepType as SelectionStepType) ? 'No Apto' : 'No Aprobó' },
  ];

  if (stepsWithNotApplicable.includes(stepType as SelectionStepType)) {
    base.push({ value: 'not_applicable', label: 'No Aplica' });
  }

  return base;
}

export function SelectionStepFormDialog({
  open,
  onOpenChange,
  candidateId,
  step,
  defaultStepType,
  existingStepOrder = 0,
  vacancyOperationCenterId,
  vacancyPositionId,
}: SelectionStepFormDialogProps) {
  const createStep = useCreateSelectionStep();
  const updateStep = useUpdateSelectionStep();
  const isEditing = !!step;
  const [selectedExams, setSelectedExams] = useState<string[]>([]);

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
      provider: (step as any)?.provider || '',
      doctorName: (step as any)?.doctor_name || '',
      medicalConcept: (step as any)?.medical_concept || '',
    },
  });

  const currentStepType = form.watch('stepType');
  const showScore = stepsWithScore.includes(currentStepType as SelectionStepType);
  const isConcepto = stepsWithConcepto.includes(currentStepType as SelectionStepType);
  const isMedicalExam = currentStepType === 'examenes_medicos';

  // Load profesiograma for medical exams
  const { data: profesiograma } = useExamProfesiogramaByVacancy(
    isMedicalExam ? vacancyOperationCenterId : undefined,
    isMedicalExam ? vacancyPositionId : undefined,
  );

  useEffect(() => {
    if (open) {
      const existingExams = (step as any)?.exam_profesiograma_items;
      if (existingExams && Array.isArray(existingExams)) {
        setSelectedExams(existingExams.map((e: any) => e.exam_catalog_id));
      } else if (profesiograma?.items) {
        // Pre-select all required exams
        setSelectedExams(profesiograma.items.filter(i => i.is_required).map(i => i.exam_catalog_id));
      }

      form.reset({
        stepType: step?.step_type || defaultStepType || '',
        status: step?.status || 'pending',
        scheduledDate: step?.scheduled_date ? new Date(step.scheduled_date) : undefined,
        completedDate: step?.completed_date ? new Date(step.completed_date) : undefined,
        evaluatorName: step?.evaluator_name || '',
        score: step?.score?.toString() || '',
        result: step?.result || '',
        notes: step?.notes || '',
        provider: (step as any)?.provider || '',
        doctorName: (step as any)?.doctor_name || '',
        medicalConcept: (step as any)?.medical_concept || '',
      });
    }
  }, [open, step, defaultStepType, profesiograma]);

  const toggleExam = (examCatalogId: string) => {
    setSelectedExams(prev =>
      prev.includes(examCatalogId)
        ? prev.filter(id => id !== examCatalogId)
        : [...prev, examCatalogId]
    );
  };

  const handleSubmit = async (data: StepFormData) => {
    try {
      const stepData: any = {
        step_type: data.stepType,
        status: data.status,
        scheduled_date: data.scheduledDate?.toISOString() || null,
        completed_date: data.completedDate?.toISOString() || null,
        evaluator_name: data.evaluatorName || null,
        score: data.score ? parseFloat(data.score) : null,
        result: data.result || null,
        notes: data.notes || null,
      };

      // Add medical exam fields
      if (isMedicalExam) {
        stepData.provider = data.provider || null;
        stepData.doctor_name = data.doctorName || null;
        stepData.medical_concept = data.medicalConcept || null;
        stepData.exam_profesiograma_items = selectedExams.length > 0
          ? selectedExams.map(id => {
              const item = profesiograma?.items?.find(i => i.exam_catalog_id === id);
              return {
                exam_catalog_id: id,
                name: item?.exam_catalog?.name || 'Examen',
                is_required: item?.is_required ?? true,
              };
            })
          : null;
      }

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
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto sm:w-full">
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    <FormLabel>{isConcepto ? 'Concepto' : 'Estado'}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {getStatusOptions(currentStepType).map(({ value, label }) => (
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              {showScore && (
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calificación (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" placeholder="85" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {isConcepto && (
              <FormField
                control={form.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concepto Médico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar concepto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        <SelectItem value="apto">Apto</SelectItem>
                        <SelectItem value="apto_restricciones">Apto con Restricciones</SelectItem>
                        <SelectItem value="no_apto">No Apto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Medical Exam Specific Fields */}
            {isMedicalExam && (
              <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Stethoscope className="w-4 h-4" />
                  Datos del Examen Médico de Ingreso
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proveedor / IPS</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre de la IPS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="doctorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Médico</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del médico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="medicalConcept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concepto / Restricciones</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Detalle del concepto médico, restricciones o recomendaciones..."
                          className="min-h-[60px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profesiograma Exams */}
                {profesiograma && profesiograma.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      Exámenes del Profesiograma
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {profesiograma.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md border bg-background hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedExams.includes(item.exam_catalog_id)}
                            onCheckedChange={() => toggleExam(item.exam_catalog_id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.exam_catalog?.name || 'Examen'}
                            </p>
                            {item.exam_catalog?.code && (
                              <p className="text-xs text-muted-foreground">{item.exam_catalog.code}</p>
                            )}
                          </div>
                          {item.is_required && (
                            <Badge variant="outline" className="text-xs shrink-0 text-warning border-warning/30">
                              Obligatorio
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profesiograma === null && vacancyOperationCenterId && vacancyPositionId && (
                  <p className="text-xs text-muted-foreground italic">
                    No se encontró profesiograma de exámenes para este centro de operación y cargo.
                  </p>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
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

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createStep.isPending || updateStep.isPending}>
                {isEditing ? 'Actualizar' : 'Agregar Etapa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
