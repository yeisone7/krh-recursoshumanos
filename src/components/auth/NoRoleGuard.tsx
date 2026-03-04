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
                className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4"
              >
                <ShieldAlert className="w-10 h-10 text-amber-500" />
              </motion.div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Cuenta Pendiente de Activación
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Tu cuenta ha sido creada exitosamente, pero aún no tienes roles asignados en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">¿Qué significa esto?</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Un administrador debe asignarte al menos un rol para que puedas acceder a las funcionalidades del sistema. 
                      Este proceso garantiza la seguridad y el control de acceso adecuado.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Sesión activa como:</span>{' '}
                  <span className="text-primary">{user?.email}</span>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => signOut()}
                  className="w-full gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Contacta a un administrador si necesitas acceso inmediato.
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
