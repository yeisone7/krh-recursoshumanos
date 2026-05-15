import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, Plus, Trash2, GripVertical, FileText, Calendar, RotateCw } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCreateShiftCycle, useUpdateShiftCycle, useShifts } from '@/hooks/useSchedules';
import type { ShiftCycle, Shift } from '@/types/schedule';
import { cn } from '@/lib/utils';

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

  const [activeTab, setActiveTab] = useState('detalles');
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
    if (open) {
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
      setActiveTab('detalles');
    }
  }, [open, cycle, form]);

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
      setActiveTab('ciclo');
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
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isEditing ? 'Editar Ciclo de Rotación' : 'Nuevo Ciclo de Rotación'}
          </DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-border ">
          
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              NC
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'Edición' : 'Nuevo'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  Rotación
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Ciclo' : 'Nuevo Ciclo'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  Jornadas
                </div>
                <div className="flex items-center gap-1.5">
                  <RotateCw className="w-4 h-4 text-primary/60" />
                  {cycleDays.length} días configurados
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
              <TabsTrigger value="ciclo" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <RotateCw className={cn("w-4 h-4 transition-colors", activeTab === 'ciclo' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'ciclo' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Configuración de Días
                  </span>
                </div>
                {activeTab === 'ciclo' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <Form {...form}>
            <form id="cycleForm" onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 overflow-y-auto">
              <TabsContent value="detalles" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre del Ciclo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ciclo 4x2" {...field} className="h-12 rounded-2xl bg-background border-border focus:bg-background" />
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
                          <Input placeholder="4x2" maxLength={10} {...field} className="h-12 rounded-2xl bg-background border-border focus:bg-background" />
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
                          placeholder="Descripción del ciclo..."
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
                          El ciclo estará disponible para ser asignado
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

              <TabsContent value="ciclo" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col min-h-[12rem] sm:min-h-0">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Secuencia del Ciclo</h3>
                      <p className="text-xs text-muted-foreground mt-1">Defina el orden de los turnos para este ciclo de rotación.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDay}
                      disabled={activeShifts.length === 0}
                      className="rounded-xl h-10 border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <Plus className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Agregar Día</span>
                    </Button>
                  </div>

                  {activeShifts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border border-dashed rounded-2xl bg-background /10">
                      <p className="font-medium text-foreground">No hay turnos activos disponibles.</p>
                      <p className="text-sm mt-1">Debe crear turnos operativos primero antes de configurar un ciclo.</p>
                    </div>
                  ) : cycleDays.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border border-dashed rounded-2xl bg-background /10">
                      <p className="font-medium text-foreground">No hay días configurados.</p>
                      <p className="text-sm mt-1">Agregue días para comenzar a definir el ciclo de rotación.</p>
                    </div>
                  ) : (
                    <div className="border rounded-2xl overflow-y-auto max-h-[50vh] bg-background /5 border-border ">
                      <div className="p-3 space-y-3">
                        {cycleDays.map((day, index) => {
                          const shift = getShiftById(day.shift_id);
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-[auto_1fr_auto] sm:flex sm:items-center gap-3 p-3 bg-background rounded-xl border border-border/50 shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
                            >
                              <GripVertical className="w-5 h-5 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />
                              <Badge variant="outline" className="w-16 sm:w-20 justify-center h-8 rounded-lg bg-background border-border text-primary font-bold">
                                Día {day.day_number}
                              </Badge>
                              <Select
                                value={day.shift_id}
                                onValueChange={(value) => updateDay(index, value)}
                              >
                                <SelectTrigger className="min-w-0 sm:flex-1 h-10 rounded-xl bg-background /10 border-transparent hover:bg-background focus:bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border ">
                                  {activeShifts.map((s) => (
                                    <SelectItem key={s.id} value={s.id} className="py-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3.5 h-3.5 rounded-md shadow-sm border border-black/10"
                                          style={{ backgroundColor: s.color !== 'transparent' ? s.color : '#e5e7eb' }}
                                        />
                                        <span className="font-medium">{s.name}</span>
                                        {s.is_rest_day && (
                                          <Badge variant="secondary" className="text-[10px] ml-2 tracking-wider">
                                            DESCANSO
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {shift && (
                                <span className="hidden sm:inline text-xs font-bold text-muted-foreground/70 w-32 text-center bg-background rounded-md py-1">
                                  {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
              </TabsContent>
            </form>
          </Form>
        </Tabs>

        <div className="p-6 border-t border-border/50 bg-background /10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="cycleForm" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Ciclo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
