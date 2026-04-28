import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? 'Editar Área' : 'Nueva Área'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Recursos Humanos" {...field} />
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
                  <FormLabel>Código (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="RRHH" maxLength={10} {...field} />
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
                  <FormLabel>Área Superior (opcional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin área superior" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      <SelectItem value="__none__">Sin área superior</SelectItem>
                      {parentOptions.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Para crear una jerarquía de áreas
                  </FormDescription>
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
                      placeholder="Descripción del área..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={createArea.isPending || updateArea.isPending} className="w-full sm:w-auto">
                {(createArea.isPending || updateArea.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
