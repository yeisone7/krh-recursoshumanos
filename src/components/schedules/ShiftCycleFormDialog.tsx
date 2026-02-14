import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, GripVertical } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateShiftCycle, useUpdateShiftCycle, useShifts } from '@/hooks/useSchedules';
import type { ShiftCycle, Shift } from '@/types/schedule';

const cycleSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(100),
  code: z.string().max(10).optional(),
  description: z.string().optional(),
  is_active: z.boolean(),
});

type CycleFormData = z.infer<typeof cycleSchema>;

interface CycleDay {
  day_number: number;
  shift_id: string;
}

interface ShiftCycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle?: ShiftCycle | null;
}

export function ShiftCycleFormDialog({
  open,
  onOpenChange,
  cycle,
}: ShiftCycleFormDialogProps) {
  const createCycle = useCreateShiftCycle();
  const updateCycle = useUpdateShiftCycle();
  const { data: shifts = [] } = useShifts();
  const isEditing = !!cycle;

  const [cycleDays, setCycleDays] = useState<CycleDay[]>([]);

  const form = useForm<CycleFormData>({
    resolver: zodResolver(cycleSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (cycle) {
      form.reset({
        name: cycle.name,
        code: cycle.code || '',
        description: cycle.description || '',
        is_active: cycle.is_active,
      });
      // Load cycle days
      if (cycle.cycle_days) {
        setCycleDays(
          cycle.cycle_days
            .sort((a, b) => a.day_number - b.day_number)
            .map(d => ({ day_number: d.day_number, shift_id: d.shift_id }))
        );
      }
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        is_active: true,
      });
      setCycleDays([]);
    }
  }, [cycle, form]);

  const activeShifts = shifts.filter(s => s.is_active);

  const addDay = () => {
    if (activeShifts.length === 0) {
      toast.error('Primero debe crear turnos');
      return;
    }
    setCycleDays(prev => [
      ...prev,
      { day_number: prev.length + 1, shift_id: activeShifts[0].id }
    ]);
  };

  const removeDay = (index: number) => {
    setCycleDays(prev => 
      prev
        .filter((_, i) => i !== index)
        .map((day, i) => ({ ...day, day_number: i + 1 }))
    );
  };

  const updateDay = (index: number, shiftId: string) => {
    setCycleDays(prev => 
      prev.map((day, i) => i === index ? { ...day, shift_id: shiftId } : day)
    );
  };

  const getShiftById = (id: string): Shift | undefined => {
    return shifts.find(s => s.id === id);
  };

  const onSubmit = async (data: CycleFormData) => {
    if (cycleDays.length === 0) {
      toast.error('Agregue al menos un día al ciclo');
      return;
    }

    try {
      if (isEditing) {
        await updateCycle.mutateAsync({
          id: cycle.id,
          cycle: { 
            name: data.name,
            code: data.code,
            description: data.description,
            is_active: data.is_active,
            total_days: cycleDays.length 
          },
          days: cycleDays,
        });
        toast.success('Ciclo actualizado');
      } else {
        await createCycle.mutateAsync({
          cycle: { 
            name: data.name,
            code: data.code,
            description: data.description,
            is_active: data.is_active,
            total_days: cycleDays.length 
          },
          days: cycleDays,
        });
        toast.success('Ciclo creado');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el ciclo',
      });
    }
  };

  const isPending = createCycle.isPending || updateCycle.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Ciclo de Rotación' : 'Nuevo Ciclo de Rotación'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-4 flex-shrink-0">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Ciclo 4x2" {...field} />
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
                        <Input placeholder="4x2" maxLength={10} {...field} />
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
                        placeholder="Descripción del ciclo..."
                        className="min-h-[50px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cycle Days */}
            <div className="mt-4 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <FormLabel>Días del Ciclo ({cycleDays.length} días)</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDay}
                  disabled={activeShifts.length === 0}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Día
                </Button>
              </div>

              {activeShifts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-md">
                  <p>No hay turnos activos disponibles.</p>
                  <p className="text-sm">Cree turnos primero para poder configurar el ciclo.</p>
                </div>
              ) : cycleDays.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-md">
                  <p>No hay días configurados.</p>
                  <p className="text-sm">Agregue días para definir el ciclo de rotación.</p>
                </div>
              ) : (
                <div className="border rounded-md overflow-y-auto max-h-[240px]">
                  <div className="p-2 space-y-2">
                    {cycleDays.map((day, index) => {
                      const shift = getShiftById(day.shift_id);
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-md"
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <Badge variant="outline" className="w-16 justify-center">
                            Día {day.day_number}
                          </Badge>
                          <Select
                            value={day.shift_id}
                            onValueChange={(value) => updateDay(index, value)}
                          >
                            <SelectTrigger className="flex-1 bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background">
                              {activeShifts.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: s.color }}
                                    />
                                    <span>{s.name}</span>
                                    {s.is_rest_day && (
                                      <Badge variant="secondary" className="text-xs">
                                        Descanso
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {shift && (
                            <span className="text-xs text-muted-foreground w-24 text-center">
                              {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                            </span>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeDay(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 mt-4 space-y-4">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>
                        El ciclo está disponible para asignar
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

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? 'Guardar Cambios' : 'Crear Ciclo'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
