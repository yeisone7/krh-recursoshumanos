import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  BarChart3,
  Check,
  ClipboardList,
  Info,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CriteriaRubricItem } from './CriteriaRubricItem';
import { usePositions } from '@/hooks/useSystemConfig';
import type { EvaluationTemplate } from '@/types/evaluation';
import {
  DEFAULT_QUALITATIVE_QUESTIONS as defaultQuestions,
  DEFAULT_RATING_SCALE as defaultScale,
} from '@/types/evaluation';

const criteriaSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  category: z.string().optional(),
  weight: z.number().min(0).default(1),
  max_score: z.number().min(1).default(4),
  level_4_description: z.string().optional(),
  level_3_description: z.string().optional(),
  level_2_description: z.string().optional(),
  level_1_description: z.string().optional(),
});

const ratingScaleItemSchema = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  description: z.string(),
});

const formSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  position_ids: z.array(z.string()).default([]),
  criteria: z.array(criteriaSchema).min(1, 'Debe agregar al menos un criterio'),
  qualitative_questions: z.array(z.string()),
  rating_scale: z.array(ratingScaleItemSchema),
});

export type FormData = z.infer<typeof formSchema>;

const emptyCriteria = { name: '', description: '', category: 'general', weight: 1, max_score: 4, level_4_description: '', level_3_description: '', level_2_description: '', level_1_description: '' };

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: EvaluationTemplate | null;
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isLoading,
}: TemplateFormDialogProps) {
  const { data: positions = [] } = usePositions();
  const [posSearch, setPosSearch] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
      position_ids: [],
      criteria: [{ ...emptyCriteria }],
      qualitative_questions: [...defaultQuestions],
      rating_scale: [...defaultScale],
    },
  });

  const { fields: criteriaFields, append: appendCriteria, remove: removeCriteria } = useFieldArray({
    control: form.control,
    name: 'criteria',
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        is_active: template.is_active ?? true,
        position_ids: template.positions?.map(p => p.id) || [],
        criteria: template.criteria?.length
          ? template.criteria.map(c => ({
              name: c.name,
              description: c.description || '',
              category: c.category || 'general',
              weight: c.weight || 1,
              max_score: c.max_score || 4,
              level_4_description: c.level_4_description || '',
              level_3_description: c.level_3_description || '',
              level_2_description: c.level_2_description || '',
              level_1_description: c.level_1_description || '',
            }))
          : [{ ...emptyCriteria }],
        qualitative_questions: (template.qualitative_questions as string[]) || [...defaultQuestions],
        rating_scale: (template.rating_scale as FormData['rating_scale']) || [...defaultScale],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        is_active: true,
        position_ids: [],
        criteria: [{ ...emptyCriteria }],
        qualitative_questions: [...defaultQuestions],
        rating_scale: [...defaultScale],
      });
    }
  }, [template, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  const positionOptions = useMemo(() => positions.map(p => ({
    value: p.id,
    label: p.name,
  })), [positions]);
  const filteredPositionOptions = useMemo(() => {
    if (!posSearch) return positionOptions;
    const normalizedSearch = posSearch.toLowerCase();
    return positionOptions.filter(option => option.label.toLowerCase().includes(normalizedSearch));
  }, [posSearch, positionOptions]);

  const qualitativeQuestions = form.watch('qualitative_questions');
  const ratingScale = form.watch('rating_scale');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden border-primary/15 bg-muted/20 p-0 shadow-2xl shadow-primary/10 sm:h-auto sm:max-h-[92vh]">
        <DialogHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-background px-4 pb-4 pr-12 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/20">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl tracking-tight">
                {template ? 'Editar Plantilla' : 'Nueva Plantilla de Evaluación'}
              </DialogTitle>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Configura la información general, los criterios y la escala que se usará al evaluar.
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 scrollbar-themed sm:px-6">
            {/* Row 1: Name + Active toggle + Positions */}
            <section className="rounded-xl border border-primary/10 bg-background p-4 shadow-sm shadow-primary/5 sm:p-5">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Información de la plantilla</h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Define el nombre, el estado y los cargos a los que aplica.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Evaluación Anual 2024" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="!mt-0 whitespace-nowrap">Plantilla activa</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Descripción de la plantilla..." rows={4} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="position_ids"
                render={({ field }) => {
                  const selectedCount = field.value?.length || 0;

                  return (
                    <FormItem>
                      <FormLabel className="flex items-center justify-between gap-2">
                        <span>Cargos que aplican</span>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                          {selectedCount} seleccionados
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {selectedCount > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {field.value.map((id: string) => {
                                const opt = positionOptions.find(o => o.value === id);
                                if (!opt) return null;
                                return (
                                  <Badge key={id} variant="default" className="text-xs gap-1 pr-1 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                                    {opt.label}
                                    <button
                                      type="button"
                                      onClick={() => field.onChange(field.value.filter((v: string) => v !== id))}
                                      className="ml-0.5 rounded-full hover:bg-secondary-foreground/20 p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar cargo..."
                              value={posSearch}
                              onChange={(e) => setPosSearch(e.target.value)}
                              className="pl-8 h-9"
                            />
                          </div>
                          <div className="max-h-[168px] space-y-0.5 overflow-y-auto rounded-lg border border-primary/10 bg-muted/20 p-1 scrollbar-themed">
                            {filteredPositionOptions.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
                            ) : (
                              filteredPositionOptions.map((opt) => {
                                const checked = field.value?.includes(opt.value);
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      const newVal = checked
                                        ? field.value.filter((v: string) => v !== opt.value)
                                        : [...(field.value || []), opt.value];
                                      field.onChange(newVal);
                                    }}
                                    className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-colors ${checked ? 'bg-secondary/10 text-foreground' : ''}`}
                                  >
                                    <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-secondary border-secondary' : 'border-input'}`}>
                                      {checked && <Check className="h-3 w-3 text-secondary-foreground" />}
                                    </div>
                                    <span className="truncate">{opt.label}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                          {positionOptions.length === 0 && (
                            <p className="text-xs text-muted-foreground">No hay cargos configurados</p>
                          )}
                        </div>
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
              </div>
            </section>

            {/* Criteria */}
            <section className="space-y-4 rounded-xl border border-primary/15 bg-primary/[0.035] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Competencias y criterios</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Define qué se evaluará y cuánto pesa cada criterio.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => appendCriteria({ ...emptyCriteria })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>

              <p className="rounded-lg border border-primary/10 bg-background/80 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Escala 1-4: (4) Ampliamente Desarrollada, (3) Bueno dentro del Estándar, (2) Competencia en Desarrollo, (1) Competencia No Desarrollada
              </p>

              <div className="space-y-3">
                {criteriaFields.map((field, index) => (
                  <CriteriaRubricItem
                    key={field.id}
                    index={index}
                    form={form}
                    onRemove={() => removeCriteria(index)}
                    canRemove={criteriaFields.length > 1}
                  />
                ))}
              </div>
            </section>

            {/* Qualitative Questions */}
            <section className="space-y-3 rounded-xl border border-primary/10 bg-background p-4 shadow-sm shadow-primary/5 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Preguntas cualitativas</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Añade preguntas abiertas para complementar la calificación.</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    const current = form.getValues('qualitative_questions');
                    form.setValue('qualitative_questions', [...current, '']);
                  }}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>
              {qualitativeQuestions.map((_, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <Input
                    value={qualitativeQuestions[idx]}
                    onChange={(e) => {
                      const updated = [...qualitativeQuestions];
                      updated[idx] = e.target.value;
                      form.setValue('qualitative_questions', updated);
                    }}
                    placeholder="Escribe una pregunta abierta..."
                    className="flex-1 bg-background"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const updated = qualitativeQuestions.filter((_, i) => i !== idx);
                      form.setValue('qualitative_questions', updated);
                    }}
                    disabled={qualitativeQuestions.length <= 1}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </section>

            {/* Rating Scale */}
            <section className="space-y-3 rounded-xl border border-primary/10 bg-background p-4 shadow-sm shadow-primary/5 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold">Tabla de calificación</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Establece los rangos y la acción esperada para cada resultado.</p>
                </div>
              </div>
              <div className="w-full overflow-x-auto rounded-lg border border-primary/10">
                <table className="min-w-[680px] w-full table-fixed text-sm sm:table-auto">
                  <thead className="bg-primary/[0.07] text-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Nivel</th>
                      <th className="px-3 py-2 text-left">Mín %</th>
                      <th className="px-3 py-2 text-left">Máx %</th>
                      <th className="px-3 py-2 text-left">Acción Requerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingScale.map((item, idx) => (
                      <tr key={idx} className="border-t border-primary/10 transition-colors hover:bg-primary/[0.025]">
                        <td className="px-3 py-2 w-[170px]">
                          <Input
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...ratingScale];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              form.setValue('rating_scale', updated);
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2 w-20">
                          <Input
                            type="number"
                            value={item.min}
                            onChange={(e) => {
                              const updated = [...ratingScale];
                              updated[idx] = { ...updated[idx], min: parseInt(e.target.value) || 0 };
                              form.setValue('rating_scale', updated);
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2 w-20">
                          <Input
                            type="number"
                            value={item.max}
                            onChange={(e) => {
                              const updated = [...ratingScale];
                              updated[idx] = { ...updated[idx], max: parseInt(e.target.value) || 0 };
                              form.setValue('rating_scale', updated);
                            }}
                            className="h-8"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...ratingScale];
                              updated[idx] = { ...updated[idx], description: e.target.value };
                              form.setValue('rating_scale', updated);
                            }}
                            className="h-8"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            </div>
            <div className="grid grid-cols-1 gap-2 border-t border-primary/10 bg-background/95 p-4 shadow-[0_-8px_24px_-20px_hsl(var(--primary))] backdrop-blur sm:flex sm:justify-end sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {template ? 'Actualizar' : 'Crear'} Plantilla
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
