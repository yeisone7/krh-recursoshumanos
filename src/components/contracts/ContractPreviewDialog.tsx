import { useState, useRef, useEffect } from 'react';
import { Download, Loader2, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ContractPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docxBlob: Blob | null;
  filename: string;
}

export function ContractPreviewDialog({
  open,
  onOpenChange,
  docxBlob,
  filename,
}: ContractPreviewDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let frameId: number | undefined;

    if (open && docxBlob) {
      frameId = requestAnimationFrame(() => {
        void renderDocx();
      });
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setRendered(false);
    };
  }, [open, docxBlob]);

  const waitForContainerLayout = async (element: HTMLDivElement, maxFrames = 10) => {
    for (let i = 0; i < maxFrames; i += 1) {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) return true;
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return false;
  };

  const hasRenderedContent = (element: HTMLDivElement) => {
    const structuralNodes = element.querySelectorAll('section, article, .docx, .docx-preview-contract').length;
    const visualNodes = element.querySelectorAll('canvas, svg, img, table, p, span, div').length;
    const textContentLength = element.textContent?.trim().length || 0;

    return structuralNodes > 0 || visualNodes > 0 || textContentLength > 0;
  };

  const renderDocx = async () => {
    if (!docxBlob || !containerRef.current) return;

    setIsRendering(true);
    setRendered(false);

    try {
      const { renderAsync } = await import('docx-preview');
      const arrayBuffer = await docxBlob.arrayBuffer();

      containerRef.current.innerHTML = '';

      const hasLayout = await waitForContainerLayout(containerRef.current);
      if (!hasLayout) {
        throw new Error('El contenedor de vista previa no tiene dimensiones aún');
      }

      let contentRendered = false;
      for (let attempt = 0; attempt < 2 && !contentRendered; attempt += 1) {
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-preview-contract',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          trimXmlDeclaration: true,
          useBase64URL: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        contentRendered = hasRenderedContent(containerRef.current);

        if (!contentRendered) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          containerRef.current.innerHTML = '';
        }
      }

      if (!contentRendered) {
        throw new Error('No se pudo renderizar el contenido del documento');
      }

      setRendered(true);
    } catch (error) {
      console.error('Error rendering DOCX preview:', error);
      toast.error('Error al renderizar la vista previa');
    } finally {
      setIsRendering(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!containerRef.current || !rendered) return;

    setIsDownloading(true);
    setProgress(10);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      setProgress(30);

      const wrapper = containerRef.current.querySelector('.docx-wrapper') || containerRef.current;

      const hasPreviewContent =
        wrapper.querySelectorAll('section, article, .docx, .docx-preview-contract').length > 0 ||
        wrapper.childElementCount > 0 ||
        (wrapper.textContent?.trim().length || 0) > 0;

      if (!hasPreviewContent) {
        throw new Error('No se encontraron páginas renderizadas');
      }

      setProgress(50);

      const pdfOptions: any = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'letter',
          orientation: 'portrait',
        },
        pagebreak: { mode: ['css', 'legacy'], before: 'section.docx' },
      };

      const pdfBlob: Blob = await html2pdf()
        .set(pdfOptions)
        .from(wrapper as HTMLElement)
        .outputPdf('blob');

      setProgress(90);

      // Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgress(100);
      toast.success('PDF descargado exitosamente');

      setTimeout(() => {
        onOpenChange(false);
        setProgress(0);
      }, 500);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF', {
        description: error.message || 'Por favor intente de nuevo',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Vista Previa del Contrato
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto border rounded-lg bg-gray-100 min-h-[400px] relative">
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando vista previa...</p>
              </div>
            </div>
          )}
          <div
            ref={containerRef}
            className="docx-preview-container min-h-[1123px] w-full"
          />
          <style>{`
            .docx-preview-container .docx-wrapper {
              background: #e5e7eb !important;
              padding: 20px !important;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
            }
            .docx-preview-container .docx-wrapper > section.docx {
              box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
              margin: 0 auto !important;
              background: white !important;
            }
          `}</style>
        </div>

        {isDownloading && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Generando PDF... {progress}%
            </p>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            Cerrar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isDownloading || !rendered}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
