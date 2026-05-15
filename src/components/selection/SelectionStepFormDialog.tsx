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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  selectionStepTypeLabels,
  stepsWithNotApplicable,
  stepsWithObservation,
  stepsWithConcepto,
} from '@/types/vacancy';
import { useCreateSelectionStep, useUpdateSelectionStep } from '@/hooks/useCandidates';
import { useExamProfesiogramaByVacancy } from '@/hooks/useExamProfesiogramaByVacancy';
import type { Database } from '@/integrations/supabase/types';

type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];

const stepFormSchema = z.object({
  stepType: z.string().min(1, 'El tipo de etapa es requerido'),
  status: z.string().default('pending'),
  completedDate: z.date().optional(),
  notes: z.string().optional(),
  // Medical exam fields
  provider: z.string().optional(),
  doctorName: z.string().optional(),
  medicalConcept: z.string().optional(),
  result: z.string().optional(),
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

/** Returns result options based on step type */
function getResultOptions(stepType: string) {
  const opts = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'passed', label: 'Aprobó' },
    { value: 'failed', label: 'No aprobó' },
  ];
  if (stepsWithNotApplicable.includes(stepType as SelectionStepType)) {
    opts.push({ value: 'not_applicable', label: 'No aplica' });
  }
  return opts;
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
      completedDate: step?.completed_date ? new Date(step.completed_date) : undefined,
      notes: step?.notes || '',
      provider: (step as any)?.provider || '',
      doctorName: (step as any)?.doctor_name || '',
      medicalConcept: (step as any)?.medical_concept || '',
      result: step?.result || '',
    },
  });

  const currentStepType = form.watch('stepType');
  const isMedicalExam = currentStepType === 'examenes_medicos';
  const isConcepto = stepsWithConcepto.includes(currentStepType as SelectionStepType);
  const showObservation = stepsWithObservation.includes(currentStepType as SelectionStepType);

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
        setSelectedExams(profesiograma.items.filter(i => i.is_required).map(i => i.exam_catalog_id));
      }

      form.reset({
        stepType: step?.step_type || defaultStepType || '',
        status: step?.status || 'pending',
        completedDate: step?.completed_date ? new Date(step.completed_date) : undefined,
        notes: step?.notes || '',
        provider: (step as any)?.provider || '',
        doctorName: (step as any)?.doctor_name || '',
        medicalConcept: (step as any)?.medical_concept || '',
        result: step?.result || '',
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
        completed_date: data.completedDate?.toISOString() || null,
        notes: data.notes || null,
        result: data.result || null,
        // Keep unused fields null for clean data
        scheduled_date: null,
        evaluator_name: null,
        score: null,
      };

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
        await updateStep.mutateAsync({ id: step.id, ...stepData });
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
      toast.error('Error al guardar etapa', { description: error.message });
    }
  };

  const stepLabel = currentStepType
    ? selectionStepTypeLabels[currentStepType as SelectionStepType] || currentStepType
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar: ${stepLabel}` : stepLabel || 'Nueva Etapa de Selección'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la información de la etapa.'
              : 'Registra el resultado de esta etapa del proceso.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">

            {/* Step type selector — only visible when no default is pre-set */}
            {!defaultStepType && !isEditing && (
              <FormField
                control={form.control}
                name="stepType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Etapa *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {Object.entries(selectionStepTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── FECHA ── */}
            <FormField
              control={form.control}
              name="completedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar fecha</span>}
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

            {/* ── RESULTADO (Aprobó / No aprobó / No aplica) — standard steps ── */}
            {!isMedicalExam && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {getResultOptions(currentStepType).map(({ value, label }) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* ── MEDICAL EXAM SPECIFIC ── */}
            {isMedicalExam && (
              <div className="space-y-4 rounded-lg border border-primary/20 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Stethoscope className="w-4 h-4" />
                  Datos del Examen Médico de Ingreso
                </div>

                {/* Concepto médico (status) */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concepto</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="passed">Apto</SelectItem>
                          <SelectItem value="failed">No Apto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Concepto médico detallado */}
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
                          className="flex items-center gap-3 p-2 rounded-md border bg-background hover:bg-background transition-colors"
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

            {/* ── OBSERVACIÓN — only for steps that require it ── */}
            {showObservation && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Escribe una observación..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={createStep.isPending || updateStep.isPending}
              >
                {isEditing ? 'Actualizar' : 'Guardar Etapa'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
