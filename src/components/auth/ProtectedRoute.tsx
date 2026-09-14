import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowForcedPasswordChange?: boolean;
}

export function ProtectedRoute({ children, allowForcedPasswordChange = false }: ProtectedRouteProps) {
  const { user, isLoading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowForcedPasswordChange && !mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  if (mustChangePassword && !allowForcedPasswordChange) {
    return <Navigate to="/change-password-required" replace />;
  }

  return <>{children}</>;
}
