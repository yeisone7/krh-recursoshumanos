import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAreas, usePositions, useCreatePosition, useUpdatePosition } from '@/hooks/useSystemConfig';
import type { Position } from '@/types/config';

const positionSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  area_id: z.string().optional(),
  parent_position_id: z.string().optional(),
  level: z.number().min(1).max(10).default(1),
  min_salary: z.string().optional(),
  max_salary: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
});

type PositionFormData = z.infer<typeof positionSchema>;

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
}

export function PositionFormDialog({ open, onOpenChange, position }: PositionFormDialogProps) {
  const isEditing = !!position;
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();

  const parentPositionOptions = positions.filter(p => p.id !== position?.id && p.is_active !== false);

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      name: '',
      code: '',
      area_id: '',
      parent_position_id: '',
      level: 1,
      min_salary: '',
      max_salary: '',
      description: '',
      requirements: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (position) {
        form.reset({
          name: position.name,
          code: position.code || '',
          area_id: position.area_id || '',
          parent_position_id: position.parent_position_id || '',
          level: position.level ?? 1,
          min_salary: position.min_salary?.toString() || '',
          max_salary: position.max_salary?.toString() || '',
          description: position.description || '',
          requirements: position.requirements || '',
        });
      } else {
        form.reset({
          name: '',
          code: '',
          area_id: '',
          parent_position_id: '',
          level: 1,
          min_salary: '',
          max_salary: '',
          description: '',
          requirements: '',
        });
      }
    }
  }, [open, position, form]);

  const onSubmit = async (data: PositionFormData) => {
    try {
      const payload = {
        name: data.name,
        code: data.code || undefined,
        area_id: data.area_id || undefined,
        parent_position_id: data.parent_position_id || null,
        level: data.level,
        min_salary: data.min_salary ? parseFloat(data.min_salary) : undefined,
        max_salary: data.max_salary ? parseFloat(data.max_salary) : undefined,
        description: data.description || undefined,
        requirements: data.requirements || undefined,
      };

      if (isEditing) {
        await updatePosition.mutateAsync({ id: position.id, ...payload });
        toast.success('Cargo actualizado');
      } else {
        await createPosition.mutateAsync(payload);
        toast.success('Cargo creado');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el cargo',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-xl border-none bg-transparent shadow-none">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border-2 border-border bg-background -2xl shadow-2xl">
          {/* Modal Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border-b border-border shrink-0">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Briefcase className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground leading-tight">
                  {isEditing ? 'Editar' : 'Nuevo'} <span className="text-primary">Cargo</span>
                </DialogTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {isEditing ? 'Ajusta los detalles de la posición.' : 'Crea una nueva posición jerárquica.'}
                </p>
              </div>
            </div>
            {/* Decorative blurs */}
            
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col p-8">
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Cargo</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej. Desarrollador Senior" 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                            {...field} 
                          />
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="DES-001" 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nivel (1-10)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold text-center"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Área</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold">
                              <SelectValue placeholder="Seleccione área" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border bg-background">
                            <SelectItem value="__none__" className="font-bold">Sin área</SelectItem>
                            {areas.map((area) => (
                              <SelectItem key={area.id} value={area.id} className="font-bold">{area.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parent_position_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cargo Superior</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} value={field.value || "__none__"}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold">
                              <SelectValue placeholder="Cargo superior" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border bg-background">
                            <SelectItem value="__none__" className="font-bold">Sin superior</SelectItem>
                            {parentPositionOptions.map((pos) => (
                              <SelectItem key={pos.id} value={pos.id} className="font-bold">{pos.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sueldo Base Mínimo</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_salary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Sueldo Base Máximo</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold"
                            {...field} 
                          />
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción del Cargo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Breve resumen de responsabilidades..."
                          className="min-h-[80px] rounded-2xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-bold resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-8 mt-4 border-t border-border ">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-background "
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPosition.isPending || updatePosition.isPending}
                  className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  {(createPosition.isPending || updatePosition.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isEditing ? 'Guardar Cambios' : 'Crear Cargo'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
