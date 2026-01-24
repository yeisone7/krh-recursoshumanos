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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const AVAILABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'rrhh', label: 'RRHH' },
  { value: 'psicologo', label: 'Psicólogo' },
  { value: 'jefe_area', label: 'Jefe de Área' },
  { value: 'auditor', label: 'Auditor' },
];

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
      // Call edge function to invite user
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar Usuario</DialogTitle>
          <DialogDescription>
            Envía una invitación por correo electrónico para unirse a la empresa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
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
                    {AVAILABLE_ROLES.map(role => (
                      <FormField
                        key={role.value}
                        control={form.control}
                        name="roles"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(role.value)}
                                onCheckedChange={(checked) => {
                                  const updated = checked
                                    ? [...field.value, role.value]
                                    : field.value.filter(v => v !== role.value);
                                  field.onChange(updated);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {role.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar Invitación'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
