import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import petrocasinosIcon from '@/assets/petrocasinos-login-icon.png';

const passwordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirme la contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ForcedPasswordChange() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const onSubmit = async ({ password }: PasswordFormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('complete-forced-password-change', {
        body: { password },
      });
      if (error || data?.error) {
        toast({
          variant: 'destructive',
          title: 'No fue posible cambiar la contraseña',
          description: data?.error || error?.message || 'Intenta nuevamente.',
        });
        return;
      }

      await signOut();
      toast({ title: 'Contraseña actualizada', description: 'Ingresa nuevamente con tu contraseña definitiva.' });
      navigate('/auth', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary)/0.18)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
      <div className="relative z-10 w-full max-w-md border border-border bg-card p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={petrocasinosIcon} alt="EmpatiQ" className="h-16 w-16 object-contain" />
          <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-foreground">Cambio de contraseña requerido</h1>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            La contraseña con la que ingresaste es temporal. Crea una contraseña definitiva para continuar.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid} aria-busy={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {isSubmitting ? 'Actualizando...' : 'Guardar contraseña definitiva'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={handleSignOut} disabled={isSubmitting}>
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Cerrar sesión
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
