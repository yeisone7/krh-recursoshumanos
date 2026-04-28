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
import type { EvaluationCycle, EvaluationTemplate, EvaluationCycleStatus } from '@/types/evaluation';
import { CYCLE_STATUS_LABELS } from '@/types/evaluation';

const formSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  template_id: z.string().optional(),
  start_date: z.string().min(1, 'Fecha inicio requerida'),
  end_date: z.string().min(1, 'Fecha fin requerida'),
  self_evaluation_deadline: z.string().optional(),
  manager_evaluation_deadline: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
});

type FormData = z.infer<typeof formSchema>;

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: EvaluationCycle | null;
  templates: EvaluationTemplate[];
  onSubmit: (data: FormData) => void;
  isLoading?: boolean;
}

export function CycleFormDialog({
  open,
  onOpenChange,
  cycle,
  templates,
  onSubmit,
  isLoading,
}: CycleFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      template_id: '',
      start_date: '',
      end_date: '',
      self_evaluation_deadline: '',
      manager_evaluation_deadline: '',
      status: 'draft',
    },
  });

  useEffect(() => {
    if (cycle) {
      form.reset({
        name: cycle.name,
        description: cycle.description || '',
        template_id: cycle.template_id || '',
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        self_evaluation_deadline: cycle.self_evaluation_deadline || '',
        manager_evaluation_deadline: cycle.manager_evaluation_deadline || '',
        status: cycle.status,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        template_id: '',
        start_date: '',
        end_date: '',
        self_evaluation_deadline: '',
        manager_evaluation_deadline: '',
        status: 'draft',
      });
    }
  }, [cycle, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      template_id: data.template_id || undefined,
      self_evaluation_deadline: data.self_evaluation_deadline || undefined,
      manager_evaluation_deadline: data.manager_evaluation_deadline || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 sm:px-6 sm:pt-6">
          <DialogTitle>
            {cycle ? 'Editar Ciclo' : 'Nuevo Ciclo de Evaluación'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
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
              name="template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plantilla</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar plantilla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.filter(t => t.is_active).map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del ciclo..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Inicio *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Fin *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="self_evaluation_deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite Autoevaluación</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manager_evaluation_deadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Límite Evaluación Jefe</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                      {Object.entries(CYCLE_STATUS_LABELS).map(([value, label]) => (
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
            <div className="grid grid-cols-2 gap-2 border-t bg-background p-4 sm:flex sm:justify-end sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {cycle ? 'Actualizar' : 'Crear'} Ciclo
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
