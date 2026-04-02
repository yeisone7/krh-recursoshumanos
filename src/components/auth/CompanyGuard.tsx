import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface CompanyGuardProps {
  children: React.ReactNode;
}

/**
 * Redirects to /select-company when the user has 2+ companies
 * and hasn't chosen one yet (or hasn't explicitly selected).
 * If they have 1 company, it auto-selects in the SelectCompany page.
 */
export function CompanyGuard({ children }: CompanyGuardProps) {
  const { user, companies, currentCompanyId, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user has multiple companies and no company was explicitly selected yet
  // We check localStorage to see if user already picked in this session
  if (user && companies.length > 1) {
    const lastCompany = localStorage.getItem(`last_company_${user.id}`);
    if (!lastCompany || !companies.some(c => c.id === lastCompany)) {
      return <Navigate to="/select-company" replace />;
    }
  }

  return <>{children}</>;
}
