import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useHiringReversalPreview, useRevertCandidateHiring } from '@/hooks/useHiringReversal';

interface Props {
  candidateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mount only while open so confirmations never carry over to another review.
export function HiringReversalDialog({ candidateId, open, onOpenChange }: Props) {
  return open ? <HiringReversalReview key={candidateId} candidateId={candidateId} onOpenChange={onOpenChange} /> : null;
}

function HiringReversalReview({ candidateId, onOpenChange }: Omit<Props, 'open'>) {
  const [reason, setReason] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const preview = useHiringReversalPreview(candidateId, true);
  const reversal = useRevertCandidateHiring();
  const ready = preview.data && !preview.isFetching && !preview.error && !failure && confirmed
    && reason.trim().length >= 10 && reason.trim().length <= 2000
    && documentNumber.trim() === preview.data.document_number.trim();

  async function submit() {
    if (!ready || !preview.data || reversal.isPending) return;
    try {
      await reversal.mutateAsync({ candidateId, preview: preview.data, reason, documentNumber });
      toast.success('Contratación revertida', { description: 'El candidato quedó Retirado. Se conservaron sus documentos y el historial.' });
      onOpenChange(false);
    } catch (error) {
      // Require a new review after any server rejection; never silently retry a deletion.
      setFailure(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo completar la reversión.');
    }
  }

  return (
    <Dialog open onOpenChange={value => { if (!reversal.isPending) onOpenChange(value); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" onEscapeKeyDown={event => { if (reversal.isPending) event.preventDefault(); }} onInteractOutside={event => { if (reversal.isPending) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>No ingresó / Revertir contratación</DialogTitle>
          <DialogDescription>Úsalo únicamente cuando el candidato no inició labores. El servidor revisará los vínculos antes de realizar cualquier cambio.</DialogDescription>
        </DialogHeader>
        {preview.isFetching && <p role="status">Verificando documentos, contrato y actividad laboral…</p>}
        {(preview.error || failure) && <div role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {failure || preview.error?.message}
          <p className="mt-2">{failure ? 'No se pudo confirmar el resultado. Cierra esta ventana y actualiza la ficha para comprobar el estado antes de intentarlo de nuevo.' : 'No se realizó la reversión. Cierra esta ventana y vuelve a revisar el proceso.'}</p>
        </div>}
        {preview.data && !preview.isFetching && !preview.error && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-semibold">{preview.data.candidate_name}</p>
              <p>{preview.data.document_number} · {preview.data.position_title}</p>
            </div>
            <ul className="list-disc space-y-1 pl-5">
              <li>El candidato quedará Retirado con el motivo «No ingresó».</li>
              <li>Se eliminará su registro provisional de Empleados{preview.data.contract_numbers.length ? ` y el contrato sin aprobar ${preview.data.contract_numbers.join(', ')}` : ''}.</li>
              <li>Se conservarán {preview.data.documents_to_preserve} documentos, las etapas de selección y una copia de los registros revertidos.</li>
              <li>{preview.data.vacancy_status_after === 'in_process' ? 'La vacante volverá a En Proceso.' : 'La vacante conservará su estado porque tiene otra contratación.'}</li>
              <li>Quedarán registrados el responsable, la fecha y el motivo de la reversión.</li>
            </ul>
            <div className="space-y-2">
              <label htmlFor="reversal-reason" className="font-medium">Motivo del no ingreso *</label>
              <Textarea id="reversal-reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} placeholder="Explica por qué el candidato no ingresó (mínimo 10 caracteres)" disabled={reversal.isPending || !!failure} />
            </div>
            <div className="space-y-2">
              <label htmlFor="reversal-document" className="font-medium">Escribe el documento del candidato para confirmar *</label>
              <Input id="reversal-document" value={documentNumber} onChange={event => setDocumentNumber(event.target.value)} autoComplete="off" disabled={reversal.isPending || !!failure} />
            </div>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={reversal.isPending || !!failure} />
              <span>Confirmo que no inició labores y que revisé los cambios y el candidato indicado.</span>
            </label>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={reversal.isPending} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={!ready || reversal.isPending} onClick={submit}>{reversal.isPending ? 'Revirtiendo…' : 'Confirmar reversión'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
