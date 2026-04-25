import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
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
import { Loader2, Users, Shield, Building2, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import petrocasinosIcon from '@/assets/petrocasinos-login-icon.png';
import krhLoginHeroLogo from '@/assets/krh-login-hero-logo-horizontal.png';
import krhLoginHeroLogoOptimized from '@/assets/krh-login-hero-logo-horizontal.webp';

const loginSchema = z.object({
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

const recoverySchema = z.object({
  email: z.string().email('Ingrese un correo válido')
});

const registerSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  document_number: z.string().min(5, 'Ingrese un número de identificación válido'),
  email: z.string().email('Ingrese un correo válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'Confirme su contraseña')
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password']
});

type LoginFormData = z.infer<typeof loginSchema>;
type RecoveryFormData = z.infer<typeof recoverySchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const features = [
{ icon: Shield, title: 'Seguridad basada en roles', desc: 'Control de acceso granular por rol y centro' },
{ icon: Building2, title: 'Multi-empresa', desc: 'Administra múltiples centros de operación' },
{ icon: Users, title: 'Gestión integral', desc: 'Empleados, contratos, nómina y más' }];

const AuthFormSkeleton = () => (
  <div className="space-y-4" aria-hidden="true">
    <div className="space-y-2">
      <div className="h-3 w-28 rounded bg-muted animate-pulse" />
      <div className="h-10 w-full rounded bg-muted/70 animate-pulse" />
    </div>
    <div className="space-y-2">
      <div className="h-3 w-20 rounded bg-muted animate-pulse" />
      <div className="h-10 w-full rounded bg-muted/70 animate-pulse" />
    </div>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-3 w-28 rounded bg-muted animate-pulse" />
    </div>
    <div className="h-10 w-full rounded bg-primary/20 animate-pulse" />
  </div>
);

const prefetchPostLoginRoute = (path: string) => {
  if (typeof window === 'undefined') return;

  const href = path || '/';
  if (!document.querySelector(`link[data-route-prefetch="${href}"]`)) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.setAttribute('as', 'document');
    link.setAttribute('data-route-prefetch', href);
    document.head.appendChild(link);
  }

  void import('./Dashboard');
  void import('@/components/layout/AppLayout');
  void import('@/components/dashboard/AlertsPanel');
  void import('@/components/dashboard/QuickActionsPanel');
  void import('@/hooks/useEmployeeKPIs');
  void import('@/hooks/useDashboardAlerts');
};

const preloadHeroLogo = () => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-hero-logo-preload="krh-login"]')) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = krhLoginHeroLogoOptimized;
  link.type = 'image/webp';
  link.setAttribute('fetchpriority', 'high');
  link.setAttribute('data-hero-logo-preload', 'krh-login');
  document.head.appendChild(link);
};


export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isBrandPanelOpen, setIsBrandPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoverySent, setIsRecoverySent] = useState(false);
  const [loginErrorSummary, setLoginErrorSummary] = useState<string | null>(null);
  const [isHeroLogoLoaded, setIsHeroLogoLoaded] = useState(false);
  const [isFormReady, setIsFormReady] = useState(false);
  const loginErrorSummaryRef = useRef<HTMLDivElement>(null);
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, dismiss } = useToast();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsFormReady(true));
    const fallbackTimeout = window.setTimeout(() => setIsFormReady(true), 1200);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallbackTimeout);
    };
  }, []);

  useEffect(() => {
    preloadHeroLogo();
    const fallbackTimeout = window.setTimeout(() => setIsHeroLogoLoaded(true), 1800);
    return () => window.clearTimeout(fallbackTimeout);
  }, []);

  useEffect(() => {
    const schedulePrefetch = () => prefetchPostLoginRoute(from);
    const browserWindow = window as Window & typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (browserWindow.requestIdleCallback && browserWindow.cancelIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(schedulePrefetch, { timeout: 1500 });
      return () => browserWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = browserWindow.setTimeout(schedulePrefetch, 600);
    return () => browserWindow.clearTimeout(timeoutId);
  }, [from]);

  useEffect(() => {
    if (loginErrorSummary) {
      loginErrorSummaryRef.current?.focus();
    }
  }, [loginErrorSummary]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' }
  });

  const recoveryForm = useForm<RecoveryFormData>({
    resolver: zodResolver(recoverySchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { email: '' }
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: { first_name: '', last_name: '', document_number: '', email: '', password: '', confirm_password: '' }
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoginErrorSummary(null);
    prefetchPostLoginRoute(from);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) {
        const message = error.message.includes('Invalid login credentials') ?
          'Correo o contraseña incorrectos.' :
          error.message;

        setLoginErrorSummary(message);
        toast({
          variant: 'destructive',
          title: 'Error de autenticación',
          description: message
        });
        return;
      }
      toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Escape') {
      loginForm.clearErrors();
      recoveryForm.clearErrors();
      setLoginErrorSummary(null);
      dismiss();
      return;
    }

    if (event.key === 'Enter' && !isSubmitting) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  const onRecoverySubmit = async (data: RecoveryFormData) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsRecoverySent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'No fue posible enviar el enlace',
          description: error.message,
        });
        return;
      }

      setIsRecoverySent(true);
      toast({ title: 'Enlace enviado', description: 'Revisa tu correo para restablecer la contraseña.' });
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
          description: error.message.includes('already registered') ?
          'Este correo ya está registrado. Intenta iniciar sesión.' :
          error.message
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
      <div className="hidden md:flex md:w-[42%] lg:w-[50%] xl:w-[55%] md:min-w-[320px] relative overflow-hidden bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] bg-[size:28px_28px] opacity-15" />
        
        {/* Decorative geometric shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-20 -right-24 lg:-top-32 lg:-right-32 w-64 h-64 lg:w-96 lg:h-96 rounded-full border border-primary/35" />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
            className="absolute -bottom-28 -left-20 lg:-bottom-48 lg:-left-24 w-80 h-80 lg:w-[500px] lg:h-[500px] rounded-full border border-primary/25 bg-primary/5" />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/3 right-6 lg:right-12 w-40 h-40 lg:w-64 lg:h-64 rounded-full border border-primary/30" />

          <div className="absolute inset-y-0 right-0 w-1/3 bg-primary/10" />
          <div className="absolute bottom-0 left-0 h-28 w-full bg-gradient-to-t from-primary/15 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between gap-8 p-5 lg:p-8 w-full min-h-screen">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex justify-center pt-2 lg:pt-4">
            <div className="relative h-24 w-full max-w-[220px] lg:h-32 lg:max-w-[320px] mx-auto">
            {!isHeroLogoLoaded && <div className="absolute inset-0 rounded bg-secondary/15 animate-pulse" aria-hidden="true" />}
            <picture className={cn("block origin-center transition-[opacity,transform] duration-500 ease-out", isHeroLogoLoaded ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0")}>
              <source srcSet={krhLoginHeroLogoOptimized} type="image/webp" />
              <img
                src={krhLoginHeroLogo}
                alt="Logo horizontal de Gestión de Recursos Humanos"
                className="h-full max-w-full object-contain"
                width={480}
                height={240}
                decoding="async"
                loading="eager"
                fetchPriority="high"
                onLoad={() => setIsHeroLogoLoaded(true)}
                onError={() => setIsHeroLogoLoaded(true)}
              />
            </picture>
            </div>
          </motion.div>
          
          <div className="space-y-5">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/25 text-primary text-xs lg:text-sm font-medium mb-3 lg:mb-4">
                <Sparkles className="w-4 h-4 shrink-0" />
                Plataforma KRH
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground leading-tight tracking-tight">
                Gestión de<br />
                <span className="text-primary">
                  Recursos Humanos
                </span>
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground mt-3 max-w-md leading-relaxed">
                Plataforma integral para la administración de empleados, contratos, dotación y exámenes médicos.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="space-y-2">
              {features.map((feat, i) =>
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2.5 lg:gap-3 p-2 lg:p-2.5 bg-primary/5 backdrop-blur-sm border border-primary/15 hover:bg-primary/10 transition-colors group cursor-default">

                  <div className="w-8 h-8 lg:w-9 lg:h-9 bg-primary/10 flex items-center justify-center shrink-0">
                    <feat.icon className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs lg:text-sm font-semibold text-foreground">{feat.title}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{feat.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary/35 group-hover:text-primary transition-colors" />
                </motion.div>
              )}
            </motion.div>
          </div>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-sm text-muted-foreground/70">
            © 2025 KRH. Todos los derechos reservados Petrocasinos s.a.
          </motion.p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(224,18%,88%)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10">

          <div className="md:hidden mb-4 overflow-hidden border border-primary/15 bg-card shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={isBrandPanelOpen}
              aria-controls="mobile-brand-panel"
              onClick={() => setIsBrandPanelOpen((open) => !open)}
            >
              <span className="flex items-center gap-3 min-w-0">
                <img src={petrocasinosIcon} alt="KRH" className="h-11 w-11 shrink-0 object-contain" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-foreground">Gestión de Recursos Humanos</span>
                  <span className="block text-xs text-muted-foreground">Plataforma KRH</span>
                </span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-primary transition-transform", isBrandPanelOpen && "rotate-180")} aria-hidden="true" />
            </button>
            <AnimatePresence initial={false}>
              {isBrandPanelOpen && (
                <motion.div
                  id="mobile-brand-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative border-t border-primary/10 px-4 py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] bg-[size:20px_20px] opacity-10" aria-hidden="true" />
                    <div className="relative space-y-3">
                      <img src={krhLoginHeroLogoOptimized} alt="Logo horizontal de Gestión de Recursos Humanos" className="h-14 max-w-full object-contain sm:h-16" />
                      <p className="text-sm font-semibold text-foreground">Gestión de Recursos Humanos</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Administra empleados, contratos, dotación y exámenes médicos en una sola plataforma.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-card border border-border p-8 shadow-xl">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="hidden lg:flex flex-col items-center mb-3">
                <img src={petrocasinosIcon} alt="KRH" className="w-16 h-16 object-contain" style={{ borderRadius: '10%' }} />
                
                <span className="text-xs font-semibold text-primary/80 leading-tight text-center">Gestión de<br />Talento Humano</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={isLogin ? 'login' : 'register'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}>

                  <h2 className="text-xl font-bold text-foreground">
                    {isRecoveryMode ? 'Recuperar contraseña' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                  </h2>
                  <p className="text-muted-foreground text-xs mt-1">
                    {isRecoveryMode ?
                    'Te enviaremos un enlace seguro a tu correo' :
                    isLogin ?
                      'Ingresa tus credenciales para acceder' :
                      'Completa el formulario para registrarte'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Forms */}
            {!isFormReady ? <AuthFormSkeleton /> : isRecoveryMode ?
            <Form {...recoveryForm}>
                <form onSubmit={recoveryForm.handleSubmit(onRecoverySubmit)} onKeyDown={handleLoginKeyDown} className="space-y-4">
                  <FormField
                    control={recoveryForm.control}
                    name="email"
                    render={({ field }) =>
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="correo@ejemplo.com" autoComplete="email" className="h-10 bg-muted/50 border-border focus:bg-background transition-colors text-sm" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                    } />

                  {isRecoverySent && <p className="text-xs text-muted-foreground" role="status" aria-live="polite">Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.</p>}

                  <Button
                    type="submit"
                    className="w-full h-10 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all text-sm mt-2"
                    disabled={isSubmitting || !recoveryForm.formState.isValid}
                    aria-busy={isSubmitting}
                    aria-live="polite"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    <span>{isSubmitting ? 'Enviando enlace...' : 'Enviar enlace'}</span>
                  </Button>
                  <span className="sr-only" role="status" aria-live="polite">
                    {isSubmitting ? 'Enviando enlace de recuperación, por favor espera.' : ''}
                  </span>
                </form>
              </Form> : isLogin ?
            <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} onKeyDown={handleLoginKeyDown} className="space-y-4">
                  {loginErrorSummary && (
                    <div
                      ref={loginErrorSummaryRef}
                      tabIndex={-1}
                      role="alert"
                      aria-live="assertive"
                      className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                    >
                      <p className="font-semibold">No pudimos iniciar sesión</p>
                      <p>{loginErrorSummary}</p>
                    </div>
                  )}

                  <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" autoComplete="email" className="h-10 bg-muted/50 border-border focus:bg-background transition-colors text-sm" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-sm font-semibold">Contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="current-password" className="h-10 bg-muted/50 border-border focus:bg-background transition-colors text-sm" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 text-muted-foreground">
                      <input type="checkbox" className="h-4 w-4 rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting} />
                      Recordar sesión
                    </label>
                    <button type="button" className="font-semibold text-secondary hover:text-secondary/80 transition-colors disabled:cursor-not-allowed disabled:opacity-50" disabled={isSubmitting} onClick={() => {
                      setIsRecoveryMode(true);
                      setIsRecoverySent(false);
                      recoveryForm.setValue('email', loginForm.getValues('email'));
                    }}>
                      Recuperar contraseña
                    </button>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-10 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all text-sm mt-2"
                    disabled={isSubmitting || !loginForm.formState.isValid}
                    aria-busy={isSubmitting}
                    aria-live="polite"
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                    <span>{isSubmitting ? 'Ingresando...' : 'Iniciar Sesión'}</span>
                  </Button>
                  <span className="sr-only" role="status" aria-live="polite">
                    {isSubmitting ? 'Autenticando credenciales, por favor espera.' : ''}
                  </span>
                </form>
              </Form> :

            <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <FormField
                    control={registerForm.control}
                    name="first_name"
                    render={({ field }) =>
                    <FormItem>
                          <FormLabel className="text-xs font-semibold">Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Juan" autoComplete="given-name" className="h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    } />

                    <FormField
                    control={registerForm.control}
                    name="last_name"
                    render={({ field }) =>
                    <FormItem>
                          <FormLabel className="text-xs font-semibold">Apellido</FormLabel>
                          <FormControl>
                            <Input placeholder="Pérez" autoComplete="family-name" className="h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                    } />

                  </div>
                  <FormField
                  control={registerForm.control}
                  name="document_number"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-xs font-semibold">Número de identificación</FormLabel>
                        <FormControl>
                          <Input placeholder="1234567890" className="h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-sm font-semibold">Correo electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" autoComplete="email" className="h-11 bg-muted/50 border-border focus:bg-background transition-colors" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-xs font-semibold">Contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <FormField
                  control={registerForm.control}
                  name="confirm_password"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel className="text-xs font-semibold">Confirmar contraseña</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="••••••••" autoComplete="new-password" className="h-9 bg-muted/50 border-border focus:bg-background transition-colors text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  } />

                  <Button type="submit" className="w-full h-9 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all text-sm" disabled={isSubmitting || !registerForm.formState.isValid}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Cuenta
                  </Button>
                </form>
              </Form>
            }

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
            </div>

            {/* Toggle */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">
                {isRecoveryMode ? '¿Recordaste tu contraseña?' : isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
              </span>{' '}
              <button
                type="button"
                className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
                onClick={() => {
                  if (isRecoveryMode) {
                    setIsRecoveryMode(false);
                    setIsLogin(true);
                    setIsRecoverySent(false);
                    recoveryForm.reset();
                  } else {
                    setIsLogin(!isLogin);
                  }
                  loginForm.reset();
                  registerForm.reset();
                }}>

                {isRecoveryMode ? 'Inicia sesión' : isLogin ? 'Regístrate' : 'Inicia sesión'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-6">
            Protegido con encriptación de extremo a extremo
          </p>
        </motion.div>
      </div>
    </div>);

}