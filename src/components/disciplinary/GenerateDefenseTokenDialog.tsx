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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-sm overflow-hidden p-0 rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-xl font-black tracking-tight text-foreground relative z-10 flex items-center justify-center gap-2">
            <Link className="w-5 h-5 text-primary" />
            Enlace de Descargos
          </DialogTitle>
        </DialogHeader>

        <div className="p-8 bg-card/30">
          {!generatedUrl ? (
            <div className="flex flex-col items-center space-y-6">
              <div className="p-4 rounded-full bg-primary/10 text-primary animate-pulse">
                <Link className="h-12 w-12" />
              </div>
              <p className="text-sm text-muted-foreground text-center font-medium leading-relaxed">
                Se generará un enlace de un solo uso válido por <span className="text-foreground font-bold">72 horas</span> para que el empleado presente sus descargos de forma remota.
              </p>
              <Button 
                onClick={handleGenerate} 
                disabled={generating} 
                className="w-full h-12 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 transition-all"
              >
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
            <div className="flex flex-col items-center space-y-6 animate-in fade-in zoom-in duration-500">
              <p className="text-sm text-muted-foreground text-center font-medium">
                Comparta este código o enlace con el colaborador
              </p>
              <div className="bg-white p-6 rounded-[1.5rem] shadow-inner border border-border/50 relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-[1.5rem] scale-105 opacity-0 group-hover:opacity-100 transition-all -z-10" />
                <QRCodeSVG
                  id="defense-qr-code"
                  value={generatedUrl}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>
              
              <div className="w-full space-y-3">
                <div className="bg-muted/50 p-3 rounded-xl border border-border/50 overflow-hidden">
                  <p className="text-[10px] text-muted-foreground break-all text-center font-mono">
                    {generatedUrl}
                  </p>
                </div>
                
                <div className="grid w-full grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCopy} 
                    className="h-11 rounded-xl font-bold hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Copiar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadQR} 
                    className="h-11 rounded-xl font-bold hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    <Download className="h-4 w-4 mr-2" /> Descargar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Válido por 72h · Un solo uso
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
