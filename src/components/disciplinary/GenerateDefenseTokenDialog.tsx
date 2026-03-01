import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GenerateDefenseTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  employeeId: string;
}

export function GenerateDefenseTokenDialog({
  open,
  onOpenChange,
  processId,
  employeeId,
}: GenerateDefenseTokenDialogProps) {
  const { user, currentCompanyId } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentCompanyId || !user) return;
    setGenerating(true);

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 72);

      const { data, error } = await supabase
        .from('disciplinary_defense_tokens' as any)
        .insert({
          process_id: processId,
          company_id: currentCompanyId,
          employee_id: employeeId,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select('token')
        .single();

      if (error) throw error;

      const token = (data as any).token;
      const url = `${window.location.origin}/descargos?token=${token}`;
      setGeneratedUrl(url);
    } catch (err: any) {
      toast.error(err.message || 'Error al generar el enlace');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('defense-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = 'qr-descargos.png';
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setGeneratedUrl(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Enlace de Descargos</DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="flex flex-col items-center space-y-4 py-4">
            <Link className="h-12 w-12 text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Se generará un enlace de un solo uso válido por 72 horas para que el empleado presente sus descargos.
            </p>
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" /> Generar Enlace
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Comparta este enlace con el empleado
            </p>
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                id="defense-qr-code"
                value={generatedUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-xs text-muted-foreground break-all text-center max-w-[250px]">
              {generatedUrl}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                <Download className="h-4 w-4 mr-1" /> QR
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Válido por 72 horas · Un solo uso
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
