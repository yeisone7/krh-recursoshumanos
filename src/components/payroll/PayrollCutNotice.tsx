import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { usePayrollCutStatus } from '@/hooks/usePayrollControlCuts';
import { useAuth } from '@/contexts/AuthContext';
import { effectiveCut } from '@/lib/payrollControlCuts';

export function PayrollCutNotice() {
  const { data = [], isError } = usePayrollCutStatus();
  const { canView } = useAuth();
  if (isError) return <p role="alert" className="mb-4 rounded-xl border p-3 text-sm">No fue posible consultar los cortes. El servidor verificará las fechas al guardar.</p>;
  if (!data.length) return null;
  const centers = [...new Set(data.map(c => c.operation_center_id))];
  return <details className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
    <summary className="cursor-pointer font-medium"><ShieldCheck className="mr-2 inline h-4 w-4" />Cortes de control activos en {centers.length} centro(s)</summary>
    <ul className="mt-2 space-y-1">{centers.map(id => {
      const c = effectiveCut(data.filter(row => row.operation_center_id === id))!;
      return <li key={id}>{c.center_name} · Nivel {c.level} · Hasta {c.cutoff_date} inclusive. {c.reason}</li>;
    })}</ul>
    <p className="mt-2">Las fechas cerradas se pueden consultar. Modificarlas requiere reabrir el corte correspondiente.</p>
    {canView('cortes_control') && <Link className="mt-2 inline-block underline" to="/cortes-control">Administrar cortes</Link>}
  </details>;
}
