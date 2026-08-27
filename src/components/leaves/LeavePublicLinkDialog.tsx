import { useEffect, useMemo, useState } from 'react';
import { addYears, format } from 'date-fns';
import { Check, Copy, ExternalLink, Link2, Loader2, RefreshCw, ShieldCheck, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useLeavePublicLinkStatus,
  useRevokeLeavePublicLink,
  useRotateLeavePublicLink,
} from '@/hooks/useLeavePublicLink';

interface LeavePublicLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function LeavePublicLinkDialog({ open, onOpenChange }: LeavePublicLinkDialogProps) {
  const defaultExpiry = useMemo(() => format(addYears(new Date(), 1), 'yyyy-MM-dd'), []);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry);
  const [neverExpires, setNeverExpires] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'regenerate' | 'revoke' | null>(null);
  const status = useLeavePublicLinkStatus(open);
  const rotate = useRotateLeavePublicLink();
  const revoke = useRevokeLeavePublicLink();

  const savedLink = useMemo(() => {
    if (!status.data?.token) return null;
    const url = new URL('/solicitud-permiso', window.location.origin);
    url.searchParams.set('token', status.data.token);
    return url.toString();
  }, [status.data?.token]);

  const visibleLink = generatedLink ?? savedLink;

  useEffect(() => {
    if (!open) {
      setGeneratedLink(null);
      setCopied(false);
      setConfirmAction(null);
    }
  }, [open]);

  const generate = async () => {
    try {
      const expiresAt = neverExpires ? null : new Date(`${expiryDate}T23:59:59`).toISOString();
      const result = await rotate.mutateAsync(expiresAt);
      const url = new URL('/solicitud-permiso', window.location.origin);
      url.searchParams.set('token', result.token);
      setGeneratedLink(url.toString());
      setCopied(false);
      toast.success(status.data?.active ? 'Enlace regenerado' : 'Enlace creado');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'No fue posible crear el enlace'));
    }
  };

  const copyLink = async () => {
    if (!visibleLink) return;
    await navigator.clipboard.writeText(visibleLink);
    setCopied(true);
    toast.success('Enlace copiado');
  };

  const handleRevoke = async () => {
    try {
      const wasRevoked = await revoke.mutateAsync();
      setGeneratedLink(null);
      if (wasRevoked) toast.success('Enlace revocado');
      else toast.info('El enlace ya estaba inactivo');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'No fue posible revocar el enlace'));
    }
  };

  const isBusy = rotate.isPending || revoke.isPending;
  const isActive = Boolean(status.data?.active && !status.data.expired);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Link2 className="size-5" />
            </div>
            <DialogTitle>Enlace público de permisos</DialogTitle>
            <DialogDescription>
              Permite que empleados sin acceso a la app registren una solicitud verificando su identidad.
            </DialogDescription>
          </DialogHeader>

          {status.isLoading ? (
            <div className="flex min-h-32 items-center justify-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">Estado del enlace</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {status.data?.active
                      ? status.data.expired
                        ? 'El enlace venció y ya no admite solicitudes.'
                        : status.data.expires_at
                          ? `Vence el ${new Date(status.data.expires_at).toLocaleDateString('es-CO')}.`
                          : 'Activo sin fecha de vencimiento.'
                      : 'Aún no existe un enlace activo.'}
                  </p>
                </div>
                <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Activo' : status.data?.expired ? 'Vencido' : 'Inactivo'}</Badge>
              </div>

              {visibleLink && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
                  <ShieldCheck className="size-4" />
                  <AlertDescription className="space-y-3">
                    <p><strong>Enlace listo para compartir.</strong> Podrás volver a consultarlo mientras permanezca activo.</p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input value={visibleLink} readOnly className="bg-white font-mono text-xs" aria-label="Enlace público generado" />
                      <Button type="button" onClick={copyLink} className="shrink-0">
                        {copied ? <Check className="mr-2 size-4" /> : <Copy className="mr-2 size-4" />}
                        {copied ? 'Copiado' : 'Copiar'}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!visibleLink && status.data?.active && (
                <Alert>
                  <ShieldCheck className="size-4" />
                  <AlertDescription>
                    Este enlace fue creado antes de habilitar la consulta permanente. Regénéralo una sola vez para poder verlo y copiarlo en futuras visitas.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
                  <div>
                    <Label htmlFor="never-expires" className="font-semibold">Sin vencimiento</Label>
                    <p className="mt-1 text-xs text-muted-foreground">El enlace seguirá activo hasta que lo revoques o regeneres.</p>
                  </div>
                  <Switch id="never-expires" checked={neverExpires} onCheckedChange={setNeverExpires} />
                </div>
                {!neverExpires && (
                  <div className="space-y-2">
                    <Label htmlFor="public-link-expiry">Fecha de vencimiento</Label>
                    <Input
                      id="public-link-expiry"
                      type="date"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={expiryDate}
                      onChange={(event) => setExpiryDate(event.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                {status.data?.active && (
                  <Button type="button" variant="outline" className="text-destructive" disabled={isBusy} onClick={() => setConfirmAction('revoke')}>
                    <Unlink className="mr-2 size-4" /> Revocar
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={isBusy || (!neverExpires && !expiryDate)}
                  onClick={() => status.data?.active ? setConfirmAction('regenerate') : void generate()}
                >
                  {rotate.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : status.data?.active ? <RefreshCw className="mr-2 size-4" /> : <ExternalLink className="mr-2 size-4" />}
                  {status.data?.active ? 'Regenerar enlace' : 'Crear enlace'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAction !== null} onOpenChange={(next) => !next && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction === 'revoke' ? '¿Revocar el enlace?' : '¿Regenerar el enlace?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'revoke'
                ? 'El enlace dejará de funcionar inmediatamente.'
                : 'El enlace actual dejará de funcionar inmediatamente y se generará uno nuevo.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction === 'revoke' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              onClick={(event) => {
                event.preventDefault();
                const action = confirmAction;
                setConfirmAction(null);
                if (action === 'revoke') void handleRevoke();
                if (action === 'regenerate') void generate();
              }}
            >
              {confirmAction === 'revoke' ? 'Revocar' : 'Regenerar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
