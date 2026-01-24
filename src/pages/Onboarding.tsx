import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Building2, Users, CheckCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const onboardingSchema = z.object({
  companyName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  companyNit: z.string().min(9, 'El NIT debe tener al menos 9 caracteres').regex(/^[0-9-]+$/, 'NIT inválido'),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email('Correo inválido').optional().or(z.literal('')),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { user, companies, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if user already has a company
  useEffect(() => {
    if (!isLoading && companies.length > 0) {
      navigate('/', { replace: true });
    }
  }, [isLoading, companies, navigate]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, user, navigate]);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: '',
      companyNit: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
    },
  });

  const onSubmit = async (data: OnboardingFormData) => {
    setIsSubmitting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('complete-onboarding', {
        body: data,
      });

      if (error) {
        throw new Error(error.message || 'Error al completar el onboarding');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      setIsComplete(true);
      toast({
        title: '¡Empresa creada!',
        description: 'Tu empresa ha sido configurada correctamente.',
      });

      // Wait a moment for animation, then redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo completar el onboarding',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-success-light flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 text-success" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2">¡Todo listo!</h1>
          <p className="text-muted-foreground mb-4">
            Tu empresa ha sido configurada correctamente.
          </p>
          <p className="text-sm text-muted-foreground">
            Redirigiendo al dashboard...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">KRH</span>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Bienvenido a KRH</h1>
          </div>
          <p className="text-lg text-white/80">
            Configura tu empresa para comenzar a gestionar tus recursos humanos de manera eficiente.
          </p>
          
          <div className="grid gap-4 mt-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">1</div>
              <span>Crea tu empresa</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">2</div>
              <span>Serás asignado como administrador</span>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 text-white/90"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">3</div>
              <span>Comienza a gestionar tu equipo</span>
            </motion.div>
          </div>
        </div>
        
        <p className="text-sm text-white/60">
          © 2024 KRH. Todos los derechos reservados.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Building2 className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Configura tu Empresa</CardTitle>
            <CardDescription>
              Ingresa la información de tu empresa para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mi Empresa S.A.S" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyNit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT *</FormLabel>
                      <FormControl>
                        <Input placeholder="900123456-7" {...field} />
                      </FormControl>
                      <FormDescription>
                        Número de Identificación Tributaria
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+57 300 123 4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="empresa@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="companyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Calle 123 #45-67, Bogotá" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Configurando...
                      </>
                    ) : (
                      <>
                        Crear Empresa
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Al crear la empresa, serás asignado automáticamente como administrador
                  con acceso completo al sistema.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
