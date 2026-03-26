import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ThankYouPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  alreadySent: boolean;
  onSent: () => void;
}

export function ThankYouPreviewDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  candidateEmail,
  alreadySent,
  onSent,
}: ThankYouPreviewDialogProps) {
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!candidateEmail) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-candidate-thanks', {
        body: { candidateId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Mensaje de agradecimiento enviado exitosamente');
      onSent();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Error al enviar el mensaje', {
        description: err.message || 'Intente nuevamente',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Enviar Agradecimiento
          </DialogTitle>
          <DialogDescription>
            Vista previa del mensaje que se enviará a {candidateName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image preview */}
          <div className="rounded-lg overflow-hidden border">
            <img
              src="/images/IMAGEN_AGRADECIMIENTO.png"
              alt="Mensaje de agradecimiento"
              className="w-full h-auto object-cover"
            />
          </div>

          {/* Info */}
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Destinatario:</span>{' '}
              {candidateEmail || 'Sin email registrado'}
            </p>
          </div>

          {/* Warnings */}
          {!candidateEmail && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              El candidato no tiene email registrado. No es posible enviar el mensaje.
            </div>
          )}
          {alreadySent && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Ya se envió un mensaje de agradecimiento a este candidato.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !candidateEmail || alreadySent}
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Mail className="w-4 h-4 mr-2" /> Enviar Agradecimiento</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
