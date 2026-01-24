import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCreateShiftType, useUpdateShiftType } from '@/hooks/useShifts';
import type { ShiftType } from '@/types/config';

const shiftTypeSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido').max(10, 'Máximo 10 caracteres'),
  description: z.string().optional(),
  start_time: z.string().min(1, 'La hora de inicio es requerida'),
  end_time: z.string().min(1, 'La hora de fin es requerida'),
  break_duration_minutes: z.number().min(0).max(120).default(60),
  is_night_shift: z.boolean().default(false),
  is_rotating: z.boolean().default(false),
  rotation_days: z.number().min(1).optional(),
});

type ShiftTypeFormData = z.infer<typeof shiftTypeSchema>;

interface ShiftTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftType?: ShiftType | null;
}

export function ShiftTypeFormDialog({ 
  open, 
  onOpenChange, 
  shiftType 
}: ShiftTypeFormDialogProps) {
  const isEditing = !!shiftType;
  const createShiftType = useCreateShiftType();
  const updateShiftType = useUpdateShiftType();

  const form = useForm<ShiftTypeFormData>({
    resolver: zodResolver(shiftTypeSchema),
    defaultValues: shiftType ? {
      name: shiftType.name,
      code: shiftType.code,
      description: shiftType.description || '',
      start_time: shiftType.start_time,
      end_time: shiftType.end_time,
      break_duration_minutes: shiftType.break_duration_minutes,
      is_night_shift: shiftType.is_night_shift,
      is_rotating: shiftType.is_rotating,
      rotation_days: shiftType.rotation_days || undefined,
    } : {
      name: '',
      code: '',
      description: '',
      start_time: '08:00',
      end_time: '17:00',
      break_duration_minutes: 60,
      is_night_shift: false,
      is_rotating: false,
    },
  });

  const isRotating = form.watch('is_rotating');

  const onSubmit = async (data: ShiftTypeFormData) => {
    try {
      if (isEditing) {
        await updateShiftType.mutateAsync({ id: shiftType.id, ...data });
        toast.success('Jornada actualizada');
      } else {
        await createShiftType.mutateAsync({
          name: data.name,
          code: data.code,
          description: data.description,
          start_time: data.start_time,
          end_time: data.end_time,
          break_duration_minutes: data.break_duration_minutes,
          is_night_shift: data.is_night_shift,
          is_rotating: data.is_rotating,
          rotation_days: data.rotation_days,
        });
        toast.success('Jornada creada');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar la jornada',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Jornada' : 'Nueva Jornada'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Jornada Diurna" {...field} />
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
                      <Input placeholder="JD" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="break_duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descanso (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0} 
                        max={120}
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
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicio</FormLabel>
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
                    <FormLabel>Hora Fin</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción de la jornada..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_night_shift"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Jornada Nocturna</FormLabel>
                      <FormDescription>
                        Aplica recargos nocturnos según legislación
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
                name="is_rotating"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Turno Rotativo</FormLabel>
                      <FormDescription>
                        El horario cambia periódicamente
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

              {isRotating && (
                <FormField
                  control={form.control}
                  name="rotation_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días de Rotación</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1}
                          placeholder="7"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Cada cuántos días cambia el turno
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createShiftType.isPending || updateShiftType.isPending}
              >
                {(createShiftType.isPending || updateShiftType.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar Cambios' : 'Crear Jornada'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
