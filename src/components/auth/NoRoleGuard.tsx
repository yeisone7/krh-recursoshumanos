import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert, LogOut, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface NoRoleGuardProps {
  children: React.ReactNode;
}

export function NoRoleGuard({ children }: NoRoleGuardProps) {
  const { user, isLoading, permissionsLoaded, hasAnyRole, isAdmin, signOut } = useAuth();

  if (isLoading || !permissionsLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Admin always has access (legacy role bypass)
  if (isAdmin) {
    return <>{children}</>;
  }

  // If user has no dynamic roles assigned, block access
  if (user && !hasAnyRole) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg"
        >
          <Card className="border-border shadow-xl">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6"
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <CardTitle className="text-3xl font-bold text-foreground tracking-tight">
                ¡Bienvenido a EmpatiQ!
              </CardTitle>
              <CardDescription className="text-lg mt-3 leading-relaxed">
                Tu cuenta ha sido creada exitosamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Estamos preparando tu acceso</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Por seguridad, un administrador debe validar tu perfil y asignarte los permisos necesarios antes de que puedas comenzar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sesión iniciada como</p>
                <p className="text-sm font-bold text-primary bg-primary/5 py-2 px-4 rounded-full inline-block border border-primary/10">
                  {user?.email}
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => signOut()}
                  className="w-full h-12 gap-2 rounded-xl border-border hover:bg-muted transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </Button>
                <p className="text-[11px] text-center text-muted-foreground/80 italic">
                  Te notificaremos una vez tu acceso esté habilitado.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
