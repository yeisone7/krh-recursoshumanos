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
import { useCreateShift, useUpdateShift } from '@/hooks/useSchedules';
import type { Shift } from '@/types/schedule';
import { SHIFT_COLORS, SHIFT_COLOR_TRANSPARENT } from '@/types/schedule';
import { cn } from '@/lib/utils';

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

  const [activeTab, setActiveTab] = useState('detalles');

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
    if (open) {
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
      setActiveTab('detalles');
    }
  }, [open, shift, form]);

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
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isEditing ? 'Editar Turno' : 'Nuevo Turno'}
          </DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-primary/5">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              NT
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'Edición' : 'Nuevo'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  Operativo
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Turno' : 'Nuevo Turno'}
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
          <div className="px-6 sm:px-8 pt-4 border-b border-border/50 bg-muted/20">
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
            <form id="shiftForm" onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 overflow-y-auto">
              <TabsContent value="detalles" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre del Turno *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Turno mañana" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Código</FormLabel>
                        <FormControl>
                          <Input placeholder="TM" maxLength={10} {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descripción (opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descripción del turno..."
                          className="min-h-[100px] rounded-2xl bg-muted/20 border-primary/5 focus:bg-background p-4 resize-none"
                          {...field} 
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Color Identificador</FormLabel>
                      <div className="flex gap-2 flex-wrap p-2 rounded-2xl bg-muted/20 border border-primary/5">
                        {SHIFT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={`
                              w-8 h-8 rounded-[0.6rem] transition-all border
                              ${field.value === color 
                                ? 'ring-2 ring-offset-2 ring-primary scale-110 shadow-md' 
                                : 'hover:scale-105 border-primary/10 opacity-70 hover:opacity-100'
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
              </TabsContent>

              <TabsContent value="horario" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora de inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
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
                          <Input type="time" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
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
                            className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <FormField
                    control={form.control}
                    name="crosses_midnight"
                    render={({ field }) => (
                      <FormItem className="flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-muted/10 p-4">
                        <div className="min-w-0 space-y-1">
                          <FormLabel className="text-sm font-black text-foreground">Cruza Medianoche</FormLabel>
                          <FormDescription className="text-xs">
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
                      <FormItem className="flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-muted/10 p-4">
                        <div className="min-w-0 space-y-1">
                          <FormLabel className="text-sm font-black text-foreground">Día de Descanso</FormLabel>
                          <FormDescription className="text-xs">
                            Marcar como día libre o de descanso en los ciclos
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
                      <FormItem className="flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4">
                        <div className="min-w-0 space-y-1">
                          <FormLabel className="text-sm font-black text-foreground">Estado Activo</FormLabel>
                          <FormDescription className="text-xs">
                            El turno estará disponible para ser usado en ciclos o asignaciones
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
              </TabsContent>
            </form>
          </Form>
        </Tabs>

        <div className="p-6 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-primary/10" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="shiftForm" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Turno'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
