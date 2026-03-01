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

interface CriteriaRubricItemProps {
  index: number;
  form: UseFormReturn<any>;
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
    <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
      <div className="flex gap-2 items-start">
        <GripVertical className="w-4 h-4 mt-2 text-muted-foreground cursor-grab shrink-0" />

        <div className="flex-1 grid grid-cols-4 gap-2">
          <FormField
            control={form.control}
            name={`criteria.${index}.name`}
            render={({ field }) => (
              <FormItem className="col-span-2">
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
          <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 ml-6">
            {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Rúbricas por nivel
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 space-y-2 pt-2">
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
