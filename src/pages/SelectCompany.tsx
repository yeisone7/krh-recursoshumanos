import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SelectCompany() {
  const { companies, currentCompanyId, setCurrentCompanyId, isLoading, user } = useAuth();
  const navigate = useNavigate();

  // If only 1 company, auto-select and skip
  useEffect(() => {
    if (!isLoading && companies.length === 1) {
      setCurrentCompanyId(companies[0].id);
      navigate('/', { replace: true });
    }
  }, [isLoading, companies, navigate, setCurrentCompanyId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If 0 companies, don't render (OnboardingGuard handles this)
  if (companies.length <= 1) return null;

  const handleSelect = (companyId: string) => {
    setCurrentCompanyId(companyId);
    localStorage.setItem(`last_company_${user?.id}`, companyId);
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Seleccionar Empresa</h1>
          <p className="text-muted-foreground text-sm">
            Tienes acceso a varias empresas. Elige con cuál deseas trabajar.
          </p>
        </div>

        <div className="space-y-3">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer transition-all hover:border-border 0 hover:shadow-md group"
              onClick={() => handleSelect(company.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{company.name}</p>
                    <p className="text-xs text-muted-foreground">NIT: {company.nit}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Podrás cambiar de empresa en cualquier momento desde el menú superior.
        </p>
      </div>
    </div>
  );
}
