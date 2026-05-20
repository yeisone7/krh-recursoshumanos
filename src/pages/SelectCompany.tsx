import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Loader2, Building, Flame, CookingPot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function SelectCompany() {
  const { companies, currentCompanyId, setCurrentCompanyId, isLoading, user, signOut } = useAuth();
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
      <div className="flex h-screen w-full items-center justify-center bg-[#f3f6f9]">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
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

  const getCompanyVisuals = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('petro')) {
      return {
        bgColor: 'bg-[#2b2d42]',
        icon: <Flame className="w-6 h-6 text-orange-500" />,
        initial: 'P',
      };
    }
    if (lower.includes('cosech')) {
      return {
        bgColor: 'bg-[#ff8c00]',
        icon: <CookingPot className="w-6 h-6 text-white" />,
        initial: 'C',
      };
    }
    return {
      bgColor: 'bg-sky-500',
      icon: <Building className="w-6 h-6 text-white" />,
      initial: name.charAt(0).toUpperCase(),
    };
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f6f9] p-6 sm:p-12 select-none">
      <div className="w-full max-w-4xl space-y-12 text-center">
        
        {/* Logo and SentiQ Branding */}
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
            <div className="relative w-14 h-14 rounded-full bg-sky-500 flex items-center justify-center text-white">
              {/* Smiling talking Q speech bubble logo */}
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                <path d="M8.5 11.5c.3 1.2 1.8 2.2 3.5 2.2s3.2-1 3.5-2.2" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-4xl font-extrabold text-[#111827] tracking-tight">SentiQ</h1>
          <p className="text-[#64748b] font-medium text-sm">
            Elige la instancia a la cual deseas ingresar
          </p>
        </div>

        {/* Company/Instance Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {companies.map((company) => {
            const visuals = getCompanyVisuals(company.name);
            return (
              <Card
                key={company.id}
                className="cursor-pointer bg-white border border-slate-100 hover:border-slate-200 transition-all rounded-[1.5rem] shadow-none flex items-center group active:scale-[0.98] duration-150"
                onClick={() => handleSelect(company.id)}
              >
                <CardContent className="flex items-center gap-5 p-6 w-full text-left">
                  {/* Square colored container for the dynamic logo */}
                  <div className={`w-14 h-14 rounded-2xl ${visuals.bgColor} flex items-center justify-center shrink-0 border border-slate-100/10`}>
                    {visuals.icon}
                  </div>
                  
                  <div className="space-y-1.5">
                    <p className="font-bold text-[#1e293b] text-base group-hover:text-sky-500 transition-colors duration-150 leading-tight">
                      {company.name}
                    </p>
                    <span className="inline-block px-3 py-0.5 rounded-full text-xs font-semibold bg-[#f1f5f9] text-[#64748b]">
                      Administrador
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Cerrar Sesión Button */}
        <div className="pt-6">
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 font-semibold text-[#8b9bb4] hover:text-[#475569] active:scale-95 transition-all text-sm leading-none bg-transparent border-none outline-none py-2 px-4 rounded-xl cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  );
}
