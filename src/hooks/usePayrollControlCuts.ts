import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { payrollClient } from '@/lib/payrollControlCuts';

export function usePayrollCutStatus() {
  const { currentCompanyId, hasPermission } = useAuth();
  const allowed = ['cortes_control', 'jornadas', 'novedades', 'reloj_checador', 'prestamos', 'descuentos'].some(m => hasPermission(m, 'view'));
  return useQuery({
    queryKey: ['payroll-cut-status', currentCompanyId], enabled: !!currentCompanyId && allowed,
    staleTime: 0, refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await payrollClient.rpc('payroll_cut_status', { p_company_id: currentCompanyId! });
      if (error) throw error;
      return data || [];
    },
  });
}
