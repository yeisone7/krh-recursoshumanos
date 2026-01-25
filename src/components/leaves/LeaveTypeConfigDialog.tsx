import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LeaveTypeConfig } from '@/types/leave';
import { useUpdateLeaveTypeConfig } from '@/hooks/useLeaves';
import { toast } from 'sonner';
import { useEffect } from 'react';

const formSchema = z.object({
  display_name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  max_days_per_year: z.number().optional().nullable(),
  is_paid: z.boolean(),
  requires_document: z.boolean(),
  document_description: z.string().optional(),
  min_days_advance: z.number().min(0),
  allows_half_day: z.boolean(),
  allows_hours: z.boolean(),
  is_active: z.boolean(),
  color: z.string(),
});

interface LeaveTypeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: LeaveTypeConfig | null;
}

export function LeaveTypeConfigDialog({
  open,
  onOpenChange,
  config,
}: LeaveTypeConfigDialogProps) {
  const updateConfig = useUpdateLeaveTypeConfig();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      display_name: '',
      description: '',
      max_days_per_year: null,
      is_paid: true,
      requires_document: false,
      document_description: '',
      min_days_advance: 0,
      allows_half_day: true,
      allows_hours: false,
      is_active: true,
      color: '#3B82F6',
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        display_name: config.display_name,
        description: config.description || '',
        max_days_per_year: config.max_days_per_year || null,
        is_paid: config.is_paid,
        requires_document: config.requires_document,
        document_description: config.document_description || '',
        min_days_advance: config.min_days_advance,
        allows_half_day: config.allows_half_day,
        allows_hours: config.allows_hours,
        is_active: config.is_active,
        color: config.color,
      });
    }
  }, [config, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!config) return;

    try {
      await updateConfig.mutateAsync({
        id: config.id,
        ...values,
        max_days_per_year: values.max_days_per_year || undefined,
      });
      toast.success('Configuración actualizada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar');
    }
  }

  if (!config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar: {config.display_name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre a Mostrar</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="max_days_per_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Máximo días/año</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Sin límite"
                        {...field}
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormDescription>Dejar vacío para sin límite</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_days_advance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de anticipación</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="color" {...field} className="w-16 h-10 p-1" />
                      <Input {...field} placeholder="#3B82F6" className="flex-1" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="is_paid"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Remunerado</FormLabel>
                      <FormDescription>El empleado recibe salario durante el permiso</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requires_document"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Requiere Documento</FormLabel>
                      <FormDescription>Se debe adjuntar soporte</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('requires_document') && (
                <FormField
                  control={form.control}
                  name="document_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del documento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Certificado médico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="allows_half_day"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Permite Medio Día</FormLabel>
                      <FormDescription>Se puede solicitar solo medio día</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allows_hours"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Permite Horas</FormLabel>
                      <FormDescription>Se puede solicitar por horas</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Activo</FormLabel>
                      <FormDescription>Disponible para nuevas solicitudes</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateConfig.isPending}>
                {updateConfig.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
