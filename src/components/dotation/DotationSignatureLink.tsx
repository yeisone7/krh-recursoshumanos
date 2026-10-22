import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { callDotationSignature } from '@/lib/dotationSignature';
import { useWorkspaceActive } from '@/components/workspace/WorkspacePaneContext';

export function DotationSignatureLink({ transactionId, open }: { transactionId: string; open: boolean }) {
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pageVisible, setPageVisible] = useState(document.visibilityState === 'visible');
  const generation = useRef(0);
  const active = useWorkspaceActive();
  const queryClient = useQueryClient();
  useEffect(() => {
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (!open) { generation.current++; setLink(null); setBusy(false); }
    const requestGeneration = generation;
    return () => { requestGeneration.current++; };
  }, [open, transactionId]);
  const status = useQuery({
    queryKey: ['dotation-signature-status', transactionId],
    enabled: open && active && pageVisible && Boolean(link),
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('dotation_delivery_transactions')
        .select('signature_url,signature_path,signed_at').eq('id', transactionId).single();
      if (error) throw error;
      return Boolean(data.signature_url || data.signature_path || data.signed_at);
    },
    refetchInterval: query => query.state.data ? false : 15000,
  });
  useEffect(() => {
    if (!status.data) return;
    setLink(null);
    void queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
  }, [status.data, queryClient]);
  const generate = async () => {
    const request = ++generation.current;
    setBusy(true);
    try {
      const data = await callDotationSignature<{ token: string; expires_at: string }>({ action: 'generate', transaction_id: transactionId });
      if (request !== generation.current) return;
      const url = new URL('/dotacion/firma', window.location.origin);
      url.hash = `token=${data.token}`;
      setLink({ url: url.toString(), expiresAt: data.expires_at });
    } catch (error) {
      if (request === generation.current) toast.error(error instanceof Error ? error.message : 'No fue posible generar el enlace.');
    } finally { if (request === generation.current) setBusy(false); }
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link.url); toast.success('Enlace copiado'); }
    catch { toast.error('No se pudo copiar. Selecciona el enlace y cópialo manualmente.'); }
  };
  if (status.data) return <p className="text-sm text-primary" role="status">Firma recibida. Actualizando entrega…</p>;
  return <div className="space-y-3 rounded-xl border bg-primary/5 p-4">
    <p className="text-sm font-semibold">Firma desde el móvil</p>
    <p className="text-xs text-muted-foreground">El empleado ingresa su cédula, revisa la entrega y firma. El enlace dura 24 horas y no se guarda.</p>
    <Button type="button" variant="outline" onClick={generate} disabled={busy} className="w-full whitespace-normal">
      {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Link2 className="mr-2 size-4" />}
      {link ? 'Generar otro enlace' : 'Generar enlace de firma'}
    </Button>
    {link && <div className="space-y-2">
      <Input aria-label="Enlace de firma" readOnly value={link.url} onFocus={event => event.target.select()} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Vence: {new Date(link.expiresAt).toLocaleString('es-CO')}</span>
        <Button type="button" size="sm" onClick={copy}><Copy className="mr-2 size-4" />Copiar enlace</Button>
      </div>
      {status.isError && <p role="status" className="text-xs text-muted-foreground">No se pudo consultar la firma. Se reintentará automáticamente.</p>}
    </div>}
  </div>;
}
