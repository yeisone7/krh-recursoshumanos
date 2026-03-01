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

import { Plus, Trash2, Search, X, Check } from 'lucide-react';
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

type FormData = z.infer<typeof formSchema>;

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

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: 'qualitative_questions' as any,
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
        rating_scale: (template.rating_scale as any[]) || [...defaultScale],
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

  const positionOptions = positions.map((p: any) => ({
    value: p.id,
    label: p.name,
  }));

  const qualitativeQuestions = form.watch('qualitative_questions');
  const ratingScale = form.watch('rating_scale');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-themed">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Editar Plantilla' : 'Nueva Plantilla de Evaluación'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Row 1: Name + Active toggle + Positions */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-end gap-4">
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
                      <FormItem className="flex items-center gap-2 pb-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="!mt-0">Activa</FormLabel>
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
                  const [posSearch, setPosSearch] = useState('');
                  const filtered = useMemo(() => {
                    if (!posSearch) return positionOptions;
                    const s = posSearch.toLowerCase();
                    return positionOptions.filter(o => o.label.toLowerCase().includes(s));
                  }, [posSearch, positionOptions]);
                  const selectedCount = field.value?.length || 0;

                  return (
                    <FormItem>
                      <FormLabel>Cargos que aplican ({selectedCount})</FormLabel>
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
                          <div className="max-h-[168px] overflow-y-auto border rounded-lg p-1 space-y-0.5 scrollbar-themed">
                            {filtered.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
                            ) : (
                              filtered.map((opt) => {
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

            {/* Criteria */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Competencias / Criterios</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendCriteria({ ...emptyCriteria })}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
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
            </div>

            {/* Qualitative Questions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Preguntas Cualitativas</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
                <div key={idx} className="flex gap-2">
                  <Input
                    value={qualitativeQuestions[idx]}
                    onChange={(e) => {
                      const updated = [...qualitativeQuestions];
                      updated[idx] = e.target.value;
                      form.setValue('qualitative_questions', updated);
                    }}
                    placeholder="Pregunta..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
            </div>

            {/* Rating Scale */}
            <div className="space-y-3">
              <h4 className="font-medium">Tabla de Calificación</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Nivel</th>
                      <th className="px-3 py-2 text-left">Mín %</th>
                      <th className="px-3 py-2 text-left">Máx %</th>
                      <th className="px-3 py-2 text-left">Acción Requerida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratingScale.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
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
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {template ? 'Actualizar' : 'Crear'} Plantilla
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
