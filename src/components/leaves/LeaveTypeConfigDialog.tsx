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
import { createLeaveTypeKey, LeaveTypeConfig } from '@/types/leave';
import { CreateLeaveTypeConfigInput, useCreateLeaveTypeConfig, useUpdateLeaveTypeConfig } from '@/hooks/useLeaves';
import { toast } from 'sonner';
import { useEffect } from 'react';

const formSchema = z.object({
  leave_type: z.string()
    .min(2, 'El identificador debe tener al menos 2 caracteres')
    .max(60, 'El identificador no puede superar 60 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Usa únicamente letras minúsculas, números y guion bajo'),
  display_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
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
}).superRefine((values, context) => {
  if (values.requires_document && !values.document_description?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['document_description'],
      message: 'Especifica el documento que quedará pendiente si no se adjunta',
    });
  }
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
  const createConfig = useCreateLeaveTypeConfig();
  const isEditing = Boolean(config);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type: '',
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
        leave_type: config.leave_type,
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
    } else if (open) {
      form.reset({
        leave_type: '',
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
      });
    }
  }, [config, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (config) {
        const { leave_type: _leaveType, ...updates } = values;
        await updateConfig.mutateAsync({
          id: config.id,
          ...updates,
          max_days_per_year: values.max_days_per_year || undefined,
        });
        toast.success('Configuración actualizada');
      } else {
        await createConfig.mutateAsync({
          leave_type: values.leave_type,
          display_name: values.display_name,
          description: values.description,
          max_days_per_year: values.max_days_per_year || undefined,
          is_paid: values.is_paid,
          requires_document: values.requires_document,
          document_description: values.document_description,
          min_days_advance: values.min_days_advance,
          allows_half_day: values.allows_half_day,
          allows_hours: values.allows_hours,
          is_active: values.is_active,
          color: values.color,
        } as CreateLeaveTypeConfigInput);
        toast.success('Tipo de permiso creado');
      }
      onOpenChange(false);
    } catch (error: unknown) {
      const dbError = error as { code?: string; message?: string };
      if (dbError.code === '23505') {
        toast.error('Ya existe un tipo de permiso con ese identificador.');
      } else {
        toast.error(dbError.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el tipo de permiso`);
      }
    }
  }

  const isSaving = updateConfig.isPending || createConfig.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Configurar: ${config?.display_name}` : 'Crear tipo de permiso'}</DialogTitle>
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
                    <Input
                      {...field}
                      onChange={(event) => {
                        field.onChange(event);
                        if (!isEditing && !form.formState.dirtyFields.leave_type) {
                          form.setValue('leave_type', createLeaveTypeKey(event.target.value), { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="leave_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID técnico</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isEditing} placeholder="permiso_especial" />
                  </FormControl>
                  <FormDescription>
                    Identificador único. Después de crear el tipo no se puede modificar.
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      <Input {...field} placeholder="#3B82F6" className="min-w-0 flex-1" />
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
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
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
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <FormLabel>Requiere Documento</FormLabel>
                      <FormDescription>Permite adjuntarlo al crear o dejarlo pendiente para cargar después</FormDescription>
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
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
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
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
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
                  <FormItem className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
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

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>
                {isSaving ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear tipo'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
