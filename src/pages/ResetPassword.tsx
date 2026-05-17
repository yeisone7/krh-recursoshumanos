import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import petrocasinosIcon from '@/assets/petrocasinos-login-icon.png';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'Confirme su contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });

      if (error) {
        toast({ variant: 'destructive', title: 'No fue posible actualizar la contraseña', description: error.message });
        return;
      }

      toast({ title: 'Contraseña actualizada', description: 'Ya puedes iniciar sesión con tu nueva contraseña.' });
      navigate('/auth', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--muted))_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
      <div className="w-full max-w-md relative z-10 bg-card border border-border p-8 shadow-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <img src={petrocasinosIcon} alt="EmpatiQ" className="w-16 h-16 object-contain" style={{ borderRadius: '10%' }} />
          <h1 className="text-xl font-bold text-foreground mt-3">Crear nueva contraseña</h1>
          <p className="text-muted-foreground text-xs mt-1">Ingresa y confirma tu nueva contraseña</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) =>
              <FormItem>
                <FormLabel className="text-sm font-semibold">Nueva contraseña</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-10 bg-background border-border focus:bg-background transition-colors text-sm" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              } />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) =>
              <FormItem>
                <FormLabel className="text-sm font-semibold">Confirmar contraseña</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-10 bg-background border-border focus:bg-background transition-colors text-sm" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
              } />

            <Button type="submit" className="w-full h-10 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all text-sm" disabled={isSubmitting || !form.formState.isValid} aria-busy={isSubmitting} aria-live="polite">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              <span>{isSubmitting ? 'Actualizando...' : 'Actualizar contraseña'}</span>
            </Button>
            <span className="sr-only" role="status" aria-live="polite">
              {isSubmitting ? 'Actualizando contraseña, por favor espera.' : ''}
            </span>
          </form>
        </Form>
      </div>
    </div>
  );
}