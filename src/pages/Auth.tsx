import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield, Building2 } from 'lucide-react';
import petrocasinosLogo from '@/assets/petrocasinos-logo-white.png';

const authSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: AuthFormData) => {
    setIsSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Error de autenticación',
              description: 'Correo o contraseña incorrectos.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: error.message,
            });
          }
          return;
        }
        toast({
          title: '¡Bienvenido!',
          description: 'Has iniciado sesión correctamente.',
        });
      } else {
        const { error } = await signUp(data.email, data.password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              variant: 'destructive',
              title: 'Error de registro',
              description: 'Este correo ya está registrado. Intenta iniciar sesión.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: error.message,
            });
          }
          return;
        }
        toast({
          title: '¡Cuenta creada!',
          description: 'Tu cuenta ha sido creada. Ahora puedes iniciar sesión.',
        });
        setIsLogin(true);
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img 
              src={petrocasinosLogo} 
              alt="Petrocasinos Logo" 
              className="h-10 object-contain"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Gestión de Recursos Humanos
          </h1>
          <p className="text-lg text-white/80">
            Plataforma integral para la administración de empleados, contratos, dotación y exámenes médicos.
          </p>
          
          <div className="grid gap-4 mt-8">
            <div className="flex items-center gap-3 text-white/90">
              <Shield className="h-5 w-5" />
              <span>Seguridad basada en roles</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Building2 className="h-5 w-5" />
              <span>Arquitectura multi-empresa</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Users className="h-5 w-5" />
              <span>Gestión completa de personal</span>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-white/60">
          © 2024 KRH. Todos los derechos reservados.
        </p>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Ingresa tus credenciales para acceder'
                : 'Completa el formulario para registrarte'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </span>{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setIsLogin(!isLogin);
                  form.reset();
                }}
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
