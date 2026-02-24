import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function QRCodeDialog({ open, onOpenChange, url, title }: QRCodeDialogProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleDownload = () => {
    const svg = document.getElementById('training-qr-code');
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
      link.download = `qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Código QR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <p className="text-sm text-muted-foreground text-center">{title}</p>
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG
              id="training-qr-code"
              value={url}
              size={220}
              level="H"
              includeMargin
            />
          </div>
          <p className="text-xs text-muted-foreground break-all text-center max-w-[250px]">
            {url}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4 mr-1" /> Copiar Enlace
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" /> Descargar QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
