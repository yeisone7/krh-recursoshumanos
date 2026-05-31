import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge';
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
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[2rem] border-border/70 bg-background p-0 shadow-2xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/70 bg-muted/30 px-6 py-5 text-left sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <UserPlus className="h-7 w-7" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                Invitar usuario
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Envía una invitación por correo electrónico para que la persona cree su cuenta y quede lista para operar dentro de la empresa.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              <section className="rounded-2xl border border-border/70 bg-muted/25 p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-primary" />
                          <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Correo electrónico
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="usuario@empresa.com"
                            {...field}
                            className="h-12 rounded-xl border-border/70 bg-background px-4 text-sm shadow-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10"
                          />
                        </FormControl>
                        <FormDescription className="text-sm leading-relaxed text-muted-foreground">
                          El usuario recibirá un enlace para crear su cuenta.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Número de celular
                          </FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+57 300 123 4567"
                            {...field}
                            className="h-12 rounded-xl border-border/70 bg-background px-4 text-sm shadow-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10"
                          />
                        </FormControl>
                        <FormDescription className="text-sm leading-relaxed text-muted-foreground">
                          Usa un celular colombiano válido. Acepta 300 123 4567 o +57 300 123 4567.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-border/70 bg-muted/20 p-4 shadow-sm sm:p-5">
                <FormField
                  control={form.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <FormLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Roles
                            </FormLabel>
                          </div>
                          <FormDescription className="text-sm leading-relaxed text-muted-foreground">
                            Selecciona uno o varios roles para definir el nivel de acceso inicial.
                          </FormDescription>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                        >
                          {selectedCount} seleccionados
                        </Badge>
                      </div>

                      {rolesLoading ? (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                          ))}
                        </div>
                      ) : activeRoles.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 bg-background px-4 py-8 text-center">
                          <p className="text-sm font-medium text-muted-foreground">
                            No hay roles activos configurados.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {activeRoles.map(role => {
                            const checked = field.value?.includes(role.id);

                            return (
                              <div
                                key={role.id}
                                className={cn(
                                  'rounded-2xl border p-4 shadow-sm transition-all',
                                  checked
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-border/70 bg-background hover:border-primary/25 hover:bg-primary/5',
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={value => {
                                      const next = value
                                        ? [...(field.value || []), role.id]
                                        : (field.value || []).filter(selected => selected !== role.id);
                                      field.onChange(next);
                                    }}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex items-start justify-between gap-3">
                                      <p className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-foreground">
                                        {role.name}
                                      </p>
                                      {checked && (
                                        <Badge className="rounded-full bg-primary text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                                          Activo
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                      {role.description || 'Rol base para la operación del sistema.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </div>

            <DialogFooter className="border-t border-border/70 bg-muted/30 px-6 py-4 sm:px-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-11 w-full rounded-xl px-6 sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || activeRoles.length === 0}
                className="h-11 w-full rounded-xl bg-primary px-6 text-white shadow-sm transition-transform hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
