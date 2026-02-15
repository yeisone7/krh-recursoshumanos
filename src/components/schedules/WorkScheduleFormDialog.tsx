import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { useCreateWorkSchedule, useUpdateWorkSchedule } from '@/hooks/useSchedules';
import type { WorkSchedule } from '@/types/schedule';
import { DAY_NAMES } from '@/types/schedule';

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

  const form = useForm<WorkScheduleFormData>({
    resolver: zodResolver(workScheduleSchema),
    defaultValues: {
      name: '',
      description: '',
      days_of_week: [1, 2, 3, 4, 5], // Lun-Vie por defecto
      start_time: '08:00',
      end_time: '17:00',
      break_minutes: 60,
      is_active: true,
    },
  });

  useEffect(() => {
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
  }, [schedule, form]);

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
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Horario Administrativo' : 'Nuevo Horario Administrativo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Administrativo estándar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción del horario..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="days_of_week"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días laborables</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(DAY_NAMES).map(([num, name]) => {
                      const dayNum = parseInt(num);
                      const isChecked = field.value.includes(dayNum);
                      return (
                        <label
                          key={dayNum}
                          className={`
                            flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer text-sm
                            ${isChecked 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-background border-input hover:bg-muted'
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="break_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descanso (minutos)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={0} 
                      max={180}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>Tiempo de almuerzo/descanso</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Activo</FormLabel>
                    <FormDescription>
                      El horario está disponible para asignar
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Horario'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
