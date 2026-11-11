import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
      <DialogContent className="leave-type-config-dialog max-w-[52rem]">
        <header className="shrink-0 border-b border-border px-5 py-4 pr-12 sm:px-6 sm:pr-14">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Tipos de permiso</p>
          <DialogTitle className="break-words text-xl leading-snug sm:text-2xl">
            {isEditing ? config?.display_name : 'Crear tipo de permiso'}
          </DialogTitle>
          <DialogDescription className="sr-only">Datos, límites y condiciones del tipo de permiso.</DialogDescription>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="leave-type-config-body min-h-0 overflow-y-auto overscroll-contain md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
              <section aria-labelledby="leave-type-details" className="min-w-0 space-y-4 px-5 py-5 sm:px-6">
                <h3 id="leave-type-details" className="text-sm font-semibold text-foreground">Datos del permiso</h3>
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre visible</FormLabel>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
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
                      <FormLabel>Identificador</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isEditing} placeholder="permiso_especial" />
                      </FormControl>
                      <FormDescription>
                        No se puede editar después de crear el tipo.
                      </FormDescription>
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
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          aria-label="Elegir color"
                          value={field.value}
                          onChange={field.onChange}
                          className="leave-type-color-picker w-11 shrink-0 cursor-pointer"
                        />
                        <FormControl>
                          <Input {...field} placeholder="#3B82F6" className="min-w-0 flex-1 font-mono" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section aria-labelledby="leave-type-rules" className="min-w-0 space-y-4 border-t border-border bg-muted/25 px-5 py-5 sm:px-6 md:border-l md:border-t-0">
                <h3 id="leave-type-rules" className="text-sm font-semibold text-foreground">Reglas de solicitud</h3>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="max_days_per_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Máximo anual (días)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Sin límite"
                            {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_days_advance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anticipación (días)</FormLabel>
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

                <fieldset aria-label="Opciones del permiso" className="min-w-0 divide-y divide-border border-y border-border">
                  {([
                    ['is_paid', 'Remunerado', 'El empleado recibe salario durante el permiso.'],
                    ['allows_half_day', 'Permite medio día', 'Admite solicitudes de medio día.'],
                    ['allows_hours', 'Permite horas', 'Admite solicitudes por horas.'],
                    ['is_active', 'Activo', 'Disponible para nuevas solicitudes.'],
                    ['requires_document', 'Requiere documento', 'El soporte se puede adjuntar al solicitarlo o después.'],
                  ] as const).map(([name, label, description]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0 py-2.5">
                          <div>
                            <FormLabel className="cursor-pointer text-sm font-medium">{label}</FormLabel>
                            <FormDescription className="text-xs leading-relaxed">{description}</FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </fieldset>
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
              </section>
            </div>

            <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-background px-5 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear tipo'}
              </Button>
            </footer>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
