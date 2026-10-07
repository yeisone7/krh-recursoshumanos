import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { prepareCycleGeneration, saveCycleAssignments } from '@/lib/cycleGenerationApi';
import type { CycleGenerationRequest, CyclePreview } from '@/lib/cycleGeneration';

export function useCycleGeneration(request: CycleGenerationRequest, open: boolean) {
  const [preview, setPreview] = useState<CyclePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);
  const savedRequest = useRef<string>('');
  const client = useQueryClient();
  const requestKey = JSON.stringify(request);
  const latest = useRef({ requestKey, open });
  latest.current = { requestKey, open };
  useEffect(() => { setPreview(null); }, [requestKey, open]);
  const run = async (confirm: boolean) => {
    if (inflight.current) return false;
    inflight.current = true; setBusy(true);
    try {
      const fresh = await prepareCycleGeneration(request);
      if (!latest.current.open || latest.current.requestKey !== requestKey) return false;
      if (confirm) {
        if (!preview || savedRequest.current !== requestKey || JSON.stringify(fresh.assignments) !== JSON.stringify(preview.assignments)) {
          setPreview(null);
          throw new Error('La programación cambió. Actualiza la vista previa antes de confirmar. No se reemplazaron jornadas existentes.');
        }
        if (!fresh.assignments.length) return false;
        await saveCycleAssignments(request.companyId, fresh.assignments);
        await Promise.all(['schedule-reviews', 'shift_assignments'].map(key => client.invalidateQueries({ queryKey: [key] })));
        toast.success(`${fresh.assignments.length} asignación(es) generada(s) correctamente`);
        setPreview(null);
      } else {
        savedRequest.current = requestKey;
        setPreview(fresh);
      }
      return true;
    } catch (error) {
      if (!confirm) setPreview(null);
      toast.error(confirm ? 'No se pudo generar' : 'No se pudo preparar la vista previa', { description: error instanceof Error ? error.message : 'No se pudieron consultar las jornadas o novedades. Intenta nuevamente.' });
      return false;
    } finally { inflight.current = false; setBusy(false); }
  };
  return { preview, busy, prepare: () => run(false), confirm: () => run(true), reset: () => setPreview(null) };
}
