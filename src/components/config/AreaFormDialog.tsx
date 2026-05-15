import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Users } from 'lucide-react';
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
  FormDescription,
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
import { useAreas, useCreateArea, useUpdateArea } from '@/hooks/useSystemConfig';
import type { Area } from '@/types/config';

const areaSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  parent_id: z.string().optional(),
  description: z.string().optional(),
});

type AreaFormData = z.infer<typeof areaSchema>;

interface AreaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area | null;
}

export function AreaFormDialog({ open, onOpenChange, area }: AreaFormDialogProps) {
  const isEditing = !!area;
  const { data: areas = [] } = useAreas();
  const createArea = useCreateArea();
  const updateArea = useUpdateArea();

  const form = useForm<AreaFormData>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: '',
      code: '',
      parent_id: '',
      description: '',
    },
  });

  // Reset form when dialog opens or area changes
  useEffect(() => {
    if (open) {
      if (area) {
        form.reset({
          name: area.name,
          code: area.code || '',
          parent_id: area.parent_id || '',
          description: area.description || '',
        });
      } else {
        form.reset({
          name: '',
          code: '',
          parent_id: '',
          description: '',
        });
      }
    }
  }, [open, area, form]);

  const onSubmit = async (data: AreaFormData) => {
    try {
      if (isEditing) {
        await updateArea.mutateAsync({ 
          id: area.id, 
          name: data.name,
          code: data.code || null,
          parent_id: data.parent_id || null,
          description: data.description || null,
        });
        toast.success('Área actualizada');
      } else {
        await createArea.mutateAsync({
          name: data.name,
          code: data.code || undefined,
          parent_id: data.parent_id || undefined,
          description: data.description || undefined,
        });
        toast.success('Área creada');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el área',
      });
    }
  };

  // Filter out current area from parent options to avoid circular reference
  const parentOptions = areas.filter(a => a.id !== area?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg border-none bg-transparent shadow-none">
        <div className="flex h-full flex-col overflow-hidden rounded-[2.5rem] border-2 border-border bg-background -2xl shadow-2xl">
          {/* Modal Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border-b border-border ">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">
                  {isEditing ? 'Editar' : 'Nueva'} <span className="text-primary">Área</span>
                </DialogTitle>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {isEditing ? 'Actualiza los detalles del departamento.' : 'Define una nueva área en la organización.'}
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre del Área</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej. Recursos Humanos" 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-medium"
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
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Código Interno</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="RRHH-01" 
                            maxLength={10} 
                            className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-medium"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parent_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reporta a (Opcional)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                          value={field.value || "__none__"}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-medium">
                              <SelectValue placeholder="Sin área superior" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border bg-background">
                            <SelectItem value="__none__" className="font-medium">Sin área superior</SelectItem>
                            {parentOptions.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="font-medium">
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Propósito o detalles adicionales del área..."
                          className="min-h-[100px] rounded-2xl bg-background border-none shadow-none focus-visible:ring-2 ring-primary/20 transition-all font-medium resize-none"
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
                  disabled={createArea.isPending || updateArea.isPending}
                  className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                >
                  {(createArea.isPending || updateArea.isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    isEditing ? 'Guardar Cambios' : 'Crear Área'
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
