import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreateWorkSchedule, useUpdateWorkSchedule } from '@/hooks/useSchedules';
import type { WorkSchedule } from '@/types/schedule';
import { DAY_NAMES } from '@/types/schedule';
import { cn } from '@/lib/utils';

const workScheduleSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  description: z.string().optional(),
  days_of_week: z.array(z.number()).min(1, 'Seleccione al menos un día'),
  start_time: z.string().min(1, 'Hora de inicio requerida'),
  end_time: z.string().min(1, 'Hora de fin requerida'),
  break_minutes: z.number().min(0).max(180),
  is_active: z.boolean(),
});

type WorkScheduleFormData = z.infer<typeof workScheduleSchema>;

interface WorkScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: WorkSchedule | null;
}

export function WorkScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
}: WorkScheduleFormDialogProps) {
  const createSchedule = useCreateWorkSchedule();
  const updateSchedule = useUpdateWorkSchedule();
  const isEditing = !!schedule;

  const [activeTab, setActiveTab] = useState('detalles');

  const form = useForm<WorkScheduleFormData>({
    resolver: zodResolver(workScheduleSchema),
    defaultValues: {
      name: '',
      description: '',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 60,
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (schedule) {
        form.reset({
          name: schedule.name,
          description: schedule.description || '',
          days_of_week: schedule.days_of_week,
          start_time: schedule.start_time.slice(0, 5),
          end_time: schedule.end_time.slice(0, 5),
          break_minutes: schedule.break_minutes,
          is_active: schedule.is_active,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          days_of_week: [1, 2, 3, 4, 5],
          start_time: '08:00',
          end_time: '17:00',
          break_minutes: 60,
          is_active: true,
        });
      }
      setActiveTab('detalles');
    }
  }, [open, schedule, form]);

  const onSubmit = async (data: WorkScheduleFormData) => {
    try {
      if (isEditing) {
        await updateSchedule.mutateAsync({ id: schedule.id, ...data });
        toast.success('Horario actualizado');
      } else {
        await createSchedule.mutateAsync({
          name: data.name,
          description: data.description,
          days_of_week: data.days_of_week,
          start_time: data.start_time,
          end_time: data.end_time,
          break_minutes: data.break_minutes,
          is_active: data.is_active,
        });
        toast.success('Horario creado');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el horario',
      });
    }
  };

  const isPending = createSchedule.isPending || updateSchedule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isEditing ? 'Editar Horario' : 'Nuevo Horario'}
          </DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-border ">
          
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              HA
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'Edición' : 'Nuevo'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  Administrativo
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Horario' : 'Nuevo Horario'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  Jornadas
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary/60" />
                  {form.watch('start_time') || '00:00'} - {form.watch('end_time') || '00:00'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 pt-4 border-b border-border/50 bg-background">
            <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="detalles" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <FileText className={cn("w-4 h-4 transition-colors", activeTab === 'detalles' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'detalles' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Detalles
                  </span>
                </div>
                {activeTab === 'detalles' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="horario" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <Clock className={cn("w-4 h-4 transition-colors", activeTab === 'horario' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'horario' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Configuración
                  </span>
                </div>
                {activeTab === 'horario' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <Form {...form}>
            <form id="workScheduleForm" onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 overflow-y-auto">
              <TabsContent value="detalles" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre del Horario *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Administrativo estándar" {...field} className="h-12 rounded-2xl bg-background border-border focus:bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción del horario..."
                          className="min-h-[100px] rounded-2xl bg-background border-border focus:bg-background p-4 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-border p-4">
                      <div className="min-w-0 space-y-1">
                        <FormLabel className="text-sm font-black text-foreground">Estado Activo</FormLabel>
                        <FormDescription className="text-xs">
                          El horario estará disponible para ser asignado a los empleados
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="horario" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FormField
                  control={form.control}
                  name="days_of_week"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Días laborables *</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(DAY_NAMES).map(([num, name]) => {
                          const dayNum = parseInt(num);
                          const isChecked = field.value.includes(dayNum);
                          return (
                            <label
                              key={dayNum}
                              className={`
                                flex items-center gap-1.5 px-4 py-2 rounded-2xl border cursor-pointer text-sm transition-colors font-medium
                                ${isChecked 
                                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' 
                                  : 'bg-background border-border hover:bg-background text-muted-foreground'
                                }
                              `}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, dayNum].sort());
                                  } else {
                                    field.onChange(field.value.filter(d => d !== dayNum));
                                  }
                                }}
                                className="hidden"
                              />
                              {name.slice(0, 3)}
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora de inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="h-12 rounded-2xl bg-background border-border focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora de fin</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="h-12 rounded-2xl bg-background border-border focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="break_minutes"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descanso (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            max={180}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </form>
          </Form>
        </Tabs>

        <div className="p-6 border-t border-border/50 bg-background /10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="workScheduleForm" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Horario'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
