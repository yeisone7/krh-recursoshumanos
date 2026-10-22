import { useState } from 'react';
import { CheckCircle2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { callDotationSignature, DotationSignatureError, DOTATION_ACCEPTANCE_TEXT, DOTATION_ACCEPTANCE_VERSION } from '@/lib/dotationSignature';
import { formatDateOnly } from '@/lib/dateOnly';

interface Review {
  review_hash: string;
  delivery: {
    company_name: string; employee_name: string; delivery_date: string; observations: string | null;
    items: { id: string; item_name: string; quantity: number; size: string | null }[];
  };
}

export default function PublicDotationSignature() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [documentNumber, setDocumentNumber] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [terminal, setTerminal] = useState(!token);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const handleError = (reason: unknown) => {
    setError(reason instanceof Error ? reason.message : 'No fue posible conectar. Revisa tu conexión e intenta nuevamente.');
    if (reason instanceof DotationSignatureError) {
      if (['invalid_link', 'expired', 'already_signed'].includes(reason.code || '')) { setTerminal(true); setReview(null); }
      if (reason.code === 'changed') { setReview(null); setAccepted(false); }
    }
  };
  const identify = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      setReview(await callDotationSignature<Review>({ action: 'identify', token, document: documentNumber.trim() }, true));
    } catch (reason) { handleError(reason); }
    finally { setBusy(false); }
  };
  const submit = async (signature: string) => {
    if (!review || !accepted || busy) return;
    setBusy(true); setError('');
    try {
      const result = await callDotationSignature<{ signed_at: string }>({ action: 'submit', token,
        document: documentNumber.trim(), review_hash: review.review_hash, signature,
        accepted: true, acceptance_version: DOTATION_ACCEPTANCE_VERSION }, true);
      setSignedAt(result.signed_at); setReview(null); setDocumentNumber('');
    } catch (reason) { handleError(reason); }
    finally { setBusy(false); }
  };
  return <main className="min-h-dvh bg-muted/30 px-4 py-6 sm:py-10">
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border bg-background shadow-sm">
      <header className="flex items-start gap-3 border-b p-5 sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Package className="size-6" /></span>
        <div className="min-w-0"><h1 className="text-xl font-bold leading-tight">Recibido de dotación</h1>
          <p className="mt-1 text-sm text-muted-foreground">{review?.delivery.company_name || 'Firma de entrega'}</p></div>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        {signedAt ? <div role="status" className="space-y-3 py-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-primary" /><h2 className="text-xl font-semibold">Firma registrada</h2>
          <p>Tu aceptación de recibido se guardó correctamente.</p>
          <p className="text-sm text-muted-foreground">{new Date(signedAt).toLocaleString('es-CO')}</p><p className="text-sm">Puedes cerrar esta página.</p>
        </div> : <>
          {(error || !token) && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error || 'El enlace no es válido. Solicita uno nuevo a Recursos Humanos.'}</p>}
          {!terminal && (!review ? <form onSubmit={identify} className="space-y-4">
            <p className="text-sm text-muted-foreground">Ingresa tu cédula para revisar la entrega y registrar tu firma. No necesitas iniciar sesión.</p>
            <div className="space-y-2"><Label htmlFor="employee-document">Número de cédula</Label>
              <Input id="employee-document" inputMode="numeric" autoComplete="off" maxLength={30} required value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} disabled={busy} /></div>
            <Button className="w-full" disabled={busy || !documentNumber.trim()}>{busy && <Loader2 className="mr-2 size-4 animate-spin" />}Ver mi entrega</Button>
          </form> : <>
            <div><h2 className="break-words text-lg font-semibold">{review.delivery.employee_name}</h2>
              <p className="text-sm text-muted-foreground">Entrega del {formatDateOnly(review.delivery.delivery_date, 'dd/MM/yyyy')}</p></div>
            <ul className="divide-y rounded-xl border px-4">{review.delivery.items.map(item => <li key={item.id} className="py-3">
              <p className="break-words font-medium">{item.item_name}</p><p className="mt-1 text-sm text-muted-foreground">Cantidad: {item.quantity}{item.size ? ` · Talla: ${item.size}` : ''}</p>
            </li>)}</ul>
            {review.delivery.observations && <p className="whitespace-pre-wrap break-words text-sm">{review.delivery.observations}</p>}
            <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-5 shrink-0 accent-primary" checked={accepted} onChange={e => setAccepted(e.target.checked)} disabled={busy} />{DOTATION_ACCEPTANCE_TEXT}</label>
            <div className="space-y-3"><h3 className="font-semibold">Tu firma</h3>
              <SignatureCanvas onSave={submit} width={600} height={240} disabled={busy} saveDisabled={!accepted} saving={busy} />
              <p className="text-xs text-muted-foreground">Al confirmar, se guardarán tu firma y la fecha de aceptación de esta entrega.</p>
            </div>
          </>)}
        </>}
      </div>
    </div>
  </main>;
}
