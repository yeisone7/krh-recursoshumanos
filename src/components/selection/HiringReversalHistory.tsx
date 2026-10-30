import { useHiringReversalHistory } from '@/hooks/useHiringReversal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function HiringReversalHistory({ candidateId }: { candidateId: string }) {
  const { data, error } = useHiringReversalHistory(candidateId);
  if (error) return <p role="alert" className="text-sm text-destructive">No se pudo cargar el historial de reversiones.</p>;
  if (!data?.length) return null;
  return <section aria-label="Historial de reversiones" className="space-y-3 rounded-md border p-4">
    <h3 className="font-semibold">Historial de reversiones por no ingreso</h3>
    {data.map(item => <article key={item.id} className="space-y-1 text-sm">
      <p className="font-medium">{format(new Date(item.created_at), 'dd MMM yyyy HH:mm', { locale: es })} · {item.performed_by_name}</p>
      <p className="whitespace-pre-wrap break-words">{item.reason}</p>
      <p className="text-muted-foreground">{item.documents_preserved} documentos conservados{item.contract_numbers.length ? ` · Contrato sin aprobar: ${item.contract_numbers.join(', ')}` : ''}.</p>
    </article>)}
  </section>;
}
