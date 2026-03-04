import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PermissionRouteProps {
  children: React.ReactNode;
  moduleCode: string;
  action?: string;
  fallback?: 'deny' | 'redirect';
}

export function PermissionRoute({ children, moduleCode, action = 'view', fallback = 'deny' }: PermissionRouteProps) {
  const { isAdmin, permissionsLoaded, hasPermission } = useAuth();

  // Admin always has access
  if (isAdmin) return <>{children}</>;

  // Wait until permissions are loaded
  if (!permissionsLoaded) return null;

  const hasAccess = hasPermission(moduleCode, action);

  if (!hasAccess) {
    if (fallback === 'redirect') {
      return <Navigate to="/" replace />;
    }

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="border-destructive/30">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4"
              >
                <ShieldX className="w-8 h-8 text-destructive" />
              </motion.div>
              <CardTitle className="text-xl">Acceso Denegado</CardTitle>
              <CardDescription>
                No tienes permisos para acceder a este módulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Contacta a un administrador si necesitas acceso a esta funcionalidad.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Volver
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
