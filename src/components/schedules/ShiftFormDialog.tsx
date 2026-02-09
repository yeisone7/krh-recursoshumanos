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
import { useCreateShift, useUpdateShift } from '@/hooks/useSchedules';
import type { Shift } from '@/types/schedule';
import { SHIFT_COLORS, SHIFT_COLOR_TRANSPARENT } from '@/types/schedule';

const shiftSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  code: z.string().max(10).optional(),
  description: z.string().optional(),
  start_time: z.string().min(1, 'Hora de inicio requerida'),
  end_time: z.string().min(1, 'Hora de fin requerida'),
  break_minutes: z.number().min(0).max(180),
  crosses_midnight: z.boolean(),
  color: z.string(),
  is_rest_day: z.boolean(),
  is_active: z.boolean(),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface ShiftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: Shift | null;
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  shift,
}: ShiftFormDialogProps) {
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const isEditing = !!shift;

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      start_time: '06:00',
      end_time: '14:00',
      break_minutes: 0,
      crosses_midnight: false,
      color: SHIFT_COLOR_TRANSPARENT,
      is_rest_day: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (shift) {
      form.reset({
        name: shift.name,
        code: shift.code || '',
        description: shift.description || '',
        start_time: shift.start_time.slice(0, 5),
        end_time: shift.end_time.slice(0, 5),
        break_minutes: shift.break_minutes,
        crosses_midnight: shift.crosses_midnight,
        color: shift.color,
        is_rest_day: shift.is_rest_day,
        is_active: shift.is_active,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        start_time: '06:00',
        end_time: '14:00',
        break_minutes: 0,
        crosses_midnight: false,
        color: SHIFT_COLOR_TRANSPARENT,
        is_rest_day: false,
        is_active: true,
      });
    }
  }, [shift, form]);

  const onSubmit = async (data: ShiftFormData) => {
    try {
      if (isEditing) {
        await updateShift.mutateAsync({ id: shift.id, ...data });
        toast.success('Turno actualizado');
      } else {
        await createShift.mutateAsync({
          name: data.name,
          code: data.code,
          description: data.description,
          start_time: data.start_time,
          end_time: data.end_time,
          break_minutes: data.break_minutes,
          crosses_midnight: data.crosses_midnight,
          color: data.color,
          is_rest_day: data.is_rest_day,
          is_active: data.is_active,
        });
        toast.success('Turno creado');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el turno',
      });
    }
  };

  const isPending = createShift.isPending || updateShift.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? 'Editar Turno' : 'Nuevo Turno Operativo'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto space-y-4 px-2">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Turno mañana" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="TM" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción del turno..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex gap-2 flex-wrap p-1">
                    {SHIFT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => field.onChange(color)}
                        className={`
                          w-8 h-8 rounded-md transition-all border
                          ${field.value === color 
                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                            : 'hover:scale-105'
                          }
                          ${color === SHIFT_COLOR_TRANSPARENT 
                            ? 'bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-[length:8px_8px]' 
                            : ''
                          }
                        `}
                        style={color !== SHIFT_COLOR_TRANSPARENT ? { backgroundColor: color } : undefined}
                        title={color === SHIFT_COLOR_TRANSPARENT ? 'Sin color' : color}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="crosses_midnight"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Cruza medianoche</FormLabel>
                      <FormDescription>
                        El turno termina al día siguiente
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

              <FormField
                control={form.control}
                name="is_rest_day"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Es día de descanso</FormLabel>
                      <FormDescription>
                        Marcar como día libre en ciclos
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

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>
                        El turno está disponible para asignar
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
            </div>

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
                {isEditing ? 'Guardar Cambios' : 'Crear Turno'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
