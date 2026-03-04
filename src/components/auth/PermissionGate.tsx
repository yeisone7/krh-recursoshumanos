import { useAuth } from '@/contexts/AuthContext';

interface PermissionGateProps {
  module: string;
  action?: 'view' | 'create' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ module, action = 'view', children, fallback = null }: PermissionGateProps) {
  const { hasPermission } = useAuth();

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
