import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useRolesPermissions';

const inviteSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
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

  const activeRoles = roles.filter(r => r.is_active);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      roles: [],
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    if (!currentCompanyId) return;

    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: data.email,
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
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación por correo electrónico para unirse a la empresa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input placeholder="usuario@empresa.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    El usuario recibirá un enlace para crear su cuenta.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roles"
              render={() => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>
                  <FormDescription>
                    Selecciona los roles que tendrá el usuario.
                  </FormDescription>
                  <div className="space-y-2 mt-2">
                    {rolesLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-40" />
                      ))
                    ) : activeRoles.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay roles activos configurados.</p>
                    ) : (
                      activeRoles.map(role => (
                        <FormField
                          key={role.id}
                          control={form.control}
                          name="roles"
                          render={({ field }) => (
                            <FormItem className="flex min-w-0 items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked) => {
                                    const updated = checked
                                      ? [...field.value, role.id]
                                      : field.value.filter(v => v !== role.id);
                                    field.onChange(updated);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="min-w-0 cursor-pointer break-words font-normal">
                                {role.name}
                                {role.description && (
                                  <span className="ml-0 block text-xs text-muted-foreground sm:ml-2 sm:inline">
                                    — {role.description}
                                  </span>
                                )}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || activeRoles.length === 0} className="w-full sm:w-auto">
                {isLoading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
