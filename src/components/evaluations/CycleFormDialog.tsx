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
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10">
            {cycle ? 'Editar Ciclo' : 'Nuevo Ciclo de Evaluación'}
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Configura los parámetros del ciclo de desempeño
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Ciclo *</FormLabel>
                      <FormControl>
                        <Input className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="Evaluación Anual 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="template_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Plantilla de Evaluación</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccionar plantilla" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {templates.filter(t => t.is_active).map((template) => (
                            <SelectItem key={template.id} value={template.id} className="rounded-lg py-3">
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
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3" placeholder="Describe el propósito de este ciclo..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Inicio *</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium" {...field} />
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
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Fin *</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <FormField
                    control={form.control}
                    name="self_evaluation_deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Límite Autoevaluación</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium" {...field} />
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
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Límite Evaluación Jefe</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium" {...field} />
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
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Estado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {Object.entries(CYCLE_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value} className="rounded-lg py-3">
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
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 bg-background/80 backdrop-blur-md p-6">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:bg-muted/50 transition-all">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                {cycle ? 'Actualizar Ciclo' : 'Crear Ciclo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
