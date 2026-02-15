import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Shield, Building2, ChevronRight, Sparkles } from 'lucide-react';
import petrocasinosLogo from '@/assets/petrocasinos-logo-white.png';
import petrocasinosIcon from '@/assets/petrocasinos-profile-icon.png';

const authSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type AuthFormData = z.infer<typeof authSchema>;

const features = [
  { icon: Shield, title: 'Seguridad basada en roles', desc: 'Control de acceso granular por rol y centro' },
  { icon: Building2, title: 'Multi-empresa', desc: 'Administra múltiples centros de operación' },
  { icon: Users, title: 'Gestión integral', desc: 'Empleados, contratos, nómina y más' },
];

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
    defaultValues: { email: '', password: '' },
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
    <div className="min-h-screen flex bg-background">
      {/* Left side - Hero Branding */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(224,45%,12%)] via-[hsl(224,42%,22%)] to-[hsl(224,38%,30%)]" />
        
        {/* Decorative geometric shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full border border-white/5"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-48 -left-24 w-[500px] h-[500px] rounded-full border border-white/5"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/3 right-12 w-64 h-64 rounded-full border border-secondary/10"
          />
          {/* Glowing orbs */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-secondary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-16 w-56 h-56 bg-primary/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img 
              src={petrocasinosLogo} 
              alt="Petrocasinos Logo" 
              className="h-20 object-contain"
            />
          </motion.div>
          
          {/* Main text */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/15 border border-secondary/25 text-secondary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Plataforma KRH
              </div>
              <h1 className="text-5xl font-bold text-white leading-tight tracking-tight">
                Gestión de<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-[hsl(30,90%,60%)]">
                  Recursos Humanos
                </span>
              </h1>
              <p className="text-lg text-white/60 mt-4 max-w-md leading-relaxed">
                Plataforma integral para la administración de empleados, contratos, dotación y exámenes médicos.
              </p>
            </motion.div>
            
            {/* Feature cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="space-y-3"
            >
              {features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-4 p-3 bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group cursor-default"
                >
                  <div className="w-10 h-10 bg-secondary/15 flex items-center justify-center shrink-0">
                    <feat.icon className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{feat.title}</p>
                    <p className="text-xs text-white/50">{feat.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-secondary/60 transition-colors" />
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-white/30"
          >
            © 2025 KRH. Todos los derechos reservados.
          </motion.p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(hsl(224,18%,88%)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img src={petrocasinosIcon} alt="KRH" className="h-14 object-contain" />
          </div>

          <div className="bg-card border border-border p-8 shadow-xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="hidden lg:flex justify-center mb-5">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg"
                >
                  <img src={petrocasinosIcon} alt="KRH" className="w-10 h-10 object-contain" />
                </motion.div>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-2xl font-bold text-foreground">
                    {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1.5">
                    {isLogin
                      ? 'Ingresa tus credenciales para acceder'
                      : 'Completa el formulario para registrarte'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          autoComplete="email"
                          className="h-11 bg-muted/50 border-border focus:bg-background transition-colors"
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
                      <FormLabel className="text-sm font-semibold">Contraseña</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="••••••••"
                          autoComplete={isLogin ? 'current-password' : 'new-password'}
                          className="h-11 bg-muted/50 border-border focus:bg-background transition-colors"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
            </div>

            {/* Toggle */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </span>{' '}
              <button
                type="button"
                className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
                onClick={() => {
                  setIsLogin(!isLogin);
                  form.reset();
                }}
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </div>

          {/* Extra info below card */}
          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Protegido con encriptación de extremo a extremo
          </p>
        </motion.div>
      </div>
    </div>
  );
}
