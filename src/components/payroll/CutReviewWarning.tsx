import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { correctionClient } from '@/lib/payrollCorrections';

export function CutReviewWarning({ centerId, end }: { centerId: string; end: string }) {
  const { currentCompanyId } = useAuth();
  const summary = useQuery({ queryKey: ['schedule-reviews', 'cut-summary', currentCompanyId, centerId, end], enabled: !!currentCompanyId && !!end,
    queryFn: async () => {
      const r = await correctionClient.rpc('payroll_schedule_cut_summary', { p_company_id: currentCompanyId!, p_center_id: centerId, p_end: end });
      if (r.error) throw r.error; return r.data as { pending: number; rejected: number; historical: number; approved: number };
    } });
  return <div role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
    {summary.isLoading ? 'Consultando revisión de jornadas…' : summary.error ? 'No fue posible consultar los pendientes. Esto no impide aplicar el corte.' : <>{summary.data?.pending || 0} pendientes · {summary.data?.rejected || 0} rechazadas · {summary.data?.historical || 0} sin revisión histórica, hasta {end}.<p className="mt-1">Esta advertencia no bloquea el cierre.</p></>}
  </div>;
}
