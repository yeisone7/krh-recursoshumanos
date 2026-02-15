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
import petrocasinosIcon from '@/assets/petrocasinos-login-icon.png';

const loginSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const registerSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  document_number: z.string().min(5, 'Ingrese un número de identificación válido'),
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'Confirme su contraseña'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

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

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: '', last_name: '', document_number: '', email: '', password: '', confirm_password: '' },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error de autenticación',
          description: error.message.includes('Invalid login credentials')
            ? 'Correo o contraseña incorrectos.'
            : error.message,
        });
        return;
      }
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await signUp(data.email, data.password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error de registro',
          description: error.message.includes('already registered')
            ? 'Este correo ya está registrado. Intenta iniciar sesión.'
            : error.message,
        });
        return;
      }
      toast({ title: '¡Cuenta creada!', description: 'Revisa tu correo para confirmar tu cuenta.' });
      setIsLogin(true);
      loginForm.reset();
      registerForm.reset();
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
          <div className="absolute top-20 right-20 w-72 h-72 bg-secondary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-32 left-16 w-56 h-56 bg-primary/20 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src={petrocasinosLogo} alt="Petrocasinos Logo" className="h-20 object-contain" />
          </motion.div>
          
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
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
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="space-y-3">
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
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-sm text-white/30">
            © 2025 KRH. Todos los derechos reservados.
          </motion.p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
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
                  className="w-18 h-18 flex items-center justify-center shadow-lg" style={{ backgroundColor: '#3b3a59' }}
                >
                  <img src={petrocasinosIcon} alt="KRH" className="w-12 h-12 object-contain" />
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

            {/* Forms */}
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" autoComplete="email" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="current-password" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={registerForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" autoComplete="given-name" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="Pérez" autoComplete="family-name" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="document_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Número de identificación</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" autoComplete="email" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">Confirmar contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full h-11 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </form>
              </Form>
            )}

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
                  loginForm.reset();
                  registerForm.reset();
                }}
              >
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Protegido con encriptación de extremo a extremo
          </p>
        </motion.div>
      </div>
    </div>
  );
}
