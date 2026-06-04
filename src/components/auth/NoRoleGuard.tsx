import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert, LogOut, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface NoRoleGuardProps {
  children: React.ReactNode;
}

export function NoRoleGuard({ children }: NoRoleGuardProps) {
  const { user, isLoading, permissionsLoaded, hasAnyRole, isAdmin, signOut, refreshPermissions } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.assign('/auth');
  };

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
          <Card className="border-border/40 shadow-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary/80 via-primary to-primary/80" />
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 shadow-inner"
              >
                <Sparkles className="w-12 h-12 text-primary drop-shadow-sm" />
              </motion.div>
              <CardTitle className="text-3xl font-extrabold text-foreground tracking-tight">
                ¡Cuenta creada con éxito!
              </CardTitle>
              <CardDescription className="text-lg mt-3 leading-relaxed font-medium text-foreground/70">
                Estamos muy emocionados de tenerte con nosotros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-5 rounded-2xl bg-background /40 border border-border/60 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Clock className="w-12 h-12 text-primary" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border border-border/40">
                    <Clock className="w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <p className="text-base font-bold text-foreground">Asignación de rol pendiente</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Por motivos de seguridad, un administrador debe validar tu perfil y asignarte los permisos necesarios antes de que puedas explorar la plataforma.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Identidad de acceso</p>
                <div className="bg-background py-2.5 px-5 rounded-full inline-flex items-center gap-2 border border-border/40">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-semibold text-foreground">{user?.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-4 pt-2">
                <Button
                  variant="secondary"
                  onClick={refreshPermissions}
                  className="w-full h-12 gap-2 rounded-xl transition-all shadow-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar Acceso
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full h-12 gap-2 rounded-xl border-border/60 hover:bg-background hover:text-foreground transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión Segura
                </Button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground/90 font-medium">
                    Te enviaremos un correo electrónico cuando tu acceso esté habilitado.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
