import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';
import type { FormData } from './TemplateFormDialog';

interface CriteriaRubricItemProps {
  index: number;
  form: UseFormReturn<FormData>;
  onRemove: () => void;
  canRemove: boolean;
}

const LEVEL_LABELS = [
  { level: 4, label: '4 - Ampliamente Desarrollada' },
  { level: 3, label: '3 - Bueno dentro del Estándar' },
  { level: 2, label: '2 - Competencia en Desarrollo' },
  { level: 1, label: '1 - Competencia No Desarrollada' },
];

export function CriteriaRubricItem({ index, form, onRemove, canRemove }: CriteriaRubricItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-primary/10 bg-background p-3 shadow-sm shadow-primary/5">
      <div className="flex gap-2 items-start">
        <div className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <GripVertical className="h-4 w-4 cursor-grab" />
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-4">
          <FormField
            control={form.control}
            name={`criteria.${index}.name`}
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs">Competencia o criterio</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Trabajo en Equipo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`criteria.${index}.category`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Categoría</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Organizacional" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`criteria.${index}.weight`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Peso</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Peso (1-5)"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="ml-9 gap-1 text-xs text-primary hover:bg-primary/10 hover:text-primary">
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Rúbricas por nivel
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2 sm:ml-6">
          {LEVEL_LABELS.map(({ level, label }) => (
            <FormField
              key={level}
              control={form.control}
              name={`criteria.${index}.level_${level}_description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-normal text-muted-foreground">
                    {label}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Descripción para nivel ${level}...`}
                      className="min-h-[60px] text-sm"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
