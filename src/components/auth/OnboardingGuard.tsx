import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, companies, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // El Onboarding ha sido desactivado a petición del usuario.
  // Ahora el flujo pasará directamente al NoRoleGuard para esperar asignación de roles.
  /*
  if (user && companies.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }
  */

  return <>{children}</>;
}
