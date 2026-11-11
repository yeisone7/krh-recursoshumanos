import { useEffect, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useRolesPermissions';

const normalizeColombianMobile = (value: string) => {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 10 && digits.startsWith('3')) {
    return `+57${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('57') && digits[2] === '3') {
    return `+${digits}`;
  }

  return value.trim();
};

const isValidColombianMobile = (value: string) => {
  const digits = value.replace(/\D/g, '');

  return (
    (digits.length === 10 && digits.startsWith('3')) ||
    (digits.length === 12 && digits.startsWith('57') && digits[2] === '3')
  );
};

const inviteSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  mobile: z
    .string()
    .trim()
    .min(1, 'El número de celular es requerido')
    .refine(isValidColombianMobile, {
      message: 'Ingresa un celular colombiano válido, por ejemplo +57 300 123 4567',
    }),
  roles: z.array(z.string()).min(1, 'Selecciona al menos un rol'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ open, onOpenChange }: InviteUserDialogProps) {
  const roleHeadingId = useId();
  const { currentCompanyId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { data: roles = [], isLoading: rolesLoading } = useCustomRoles();

  const activeRoles = roles.filter(role => role.is_active);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      mobile: '',
      roles: [],
    },
  });

  const selectedRoles = form.watch('roles');
  const selectedCount = selectedRoles?.length ?? 0;

  useEffect(() => {
    if (!open) {
      form.reset();
      setIsLoading(false);
    }
  }, [open, form]);

  const onSubmit = async (data: InviteFormData) => {
    if (!currentCompanyId) {
      toast.error('No se pudo identificar la empresa activa');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: data.email,
          mobile: normalizeColombianMobile(data.mobile),
          roles: data.roles,
          companyId: currentCompanyId,
        },
      });

      if (error) throw error;

      toast.success('Invitación enviada', {
        description: `Se ha enviado una invitación a ${data.email}`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast.error('Error al enviar invitación', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="company-create-dialog invite-user-dialog w-[calc(100vw-1.5rem)] sm:max-w-[800px]">
        <DialogHeader className="company-create-header">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-6 w-6" /></span>
          <div className="min-w-0 space-y-1.5">
            <DialogTitle className="text-xl font-semibold tracking-tight">Invitar usuario</DialogTitle>
            <DialogDescription>Envíe una invitación y defina el acceso del usuario a la empresa.</DialogDescription>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="company-create-form" noValidate>
            <div className="company-create-body scrollbar-themed">
              <section aria-labelledby={`${roleHeadingId}-contact`}>
                <h3 id={`${roleHeadingId}-contact`} className="company-create-section-title"><span>01</span> Datos de contacto</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Correo electrónico <span className="text-primary">*</span></FormLabel>
                      <FormControl><Input type="email" autoComplete="email" placeholder="usuario@empresa.com" {...field} /></FormControl>
                      <FormDescription className="text-xs">Recibirá un enlace para crear su cuenta.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel>Número de celular <span className="text-primary">*</span></FormLabel>
                      <FormControl><Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+57 300 123 4567" {...field} /></FormControl>
                      <FormDescription className="text-xs">Celular colombiano, con o sin el prefijo +57.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>
              <section aria-labelledby={roleHeadingId}>
                <FormField control={form.control} name="roles" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <div>
                      <h3 id={roleHeadingId} className="company-create-section-title invite-roles-heading">
                        <span>02</span> Roles de acceso <span className="text-primary">*</span>
                        <small aria-live="polite">{selectedCount} {selectedCount === 1 ? 'seleccionado' : 'seleccionados'}</small>
                      </h3>
                      <FormDescription id={`${roleHeadingId}-help`} className="text-xs">Seleccione uno o varios roles para definir los permisos iniciales.</FormDescription>
                    </div>
                    {rolesLoading ? (
                      <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Cargando roles">
                        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 w-full rounded-lg" />)}
                      </div>
                    ) : activeRoles.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                        <p className="text-sm font-medium text-foreground">No hay roles activos disponibles</p>
                        <p className="mt-1 text-xs text-muted-foreground">Configure al menos un rol activo para enviar invitaciones.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-labelledby={roleHeadingId} aria-describedby={`${roleHeadingId}-help${form.formState.errors.roles ? ` ${roleHeadingId}-error` : ''}`} aria-invalid={!!form.formState.errors.roles}>
                        {activeRoles.map((role, index) => {
                          const checked = field.value?.includes(role.id);
                          const checkboxId = `${roleHeadingId}-${role.id}`;
                          return (
                            <label key={role.id} htmlFor={checkboxId} className={cn('invite-role-option', checked && 'invite-role-selected')}>
                              <Checkbox
                                id={checkboxId}
                                ref={index === 0 ? field.ref : undefined}
                                checked={checked}
                                onBlur={field.onBlur}
                                aria-describedby={`${checkboxId}-description`}
                                onCheckedChange={value => field.onChange(value === true ? [...(field.value || []), role.id] : (field.value || []).filter(selected => selected !== role.id))}
                                className="mt-0.5 shrink-0"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block break-words text-sm font-medium text-foreground">{role.name}</span>
                                <span id={`${checkboxId}-description`} className="mt-1 block break-words text-xs font-normal leading-relaxed text-muted-foreground">{role.description || 'Acceso a las funciones asignadas a este rol.'}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage id={`${roleHeadingId}-error`} />
                  </FormItem>
                )} />
              </section>
            </div>
            <div className="company-create-footer">
              <span className="mr-auto hidden text-xs text-muted-foreground sm:block"><span className="text-primary">*</span> Campos obligatorios</span>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
              <Button type="submit" disabled={isLoading || rolesLoading || activeRoles.length === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isLoading ? 'Enviando invitación…' : 'Enviar invitación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
