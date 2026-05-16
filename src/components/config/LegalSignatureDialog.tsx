import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, ShieldCheck, CheckCircle2, Loader2, User, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSystemConfig, useUpdateSystemConfig } from '@/hooks/useSystemConfig';
import { useToast } from '@/hooks/use-toast';

interface LegalSignatureConfig {
  signature_url: string;
  signer_name: string;
  signer_position: string;
}

interface LegalSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LegalSignatureDialog({ open, onOpenChange }: LegalSignatureDialogProps) {
  const { data: config } = useSystemConfig();
  const { mutateAsync: updateConfig } = useUpdateSystemConfig();
  const { toast } = useToast();

  const [signerName, setSignerName] = useState('');
  const [signerPosition, setSignerPosition] = useState('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && config?.legal_signature_config) {
      const data = config.legal_signature_config as LegalSignatureConfig;
      setSignerName(data.signer_name || '');
      setSignerPosition(data.signer_position || '');
      setSignatureUrl(data.signature_url || null);
    } else if (!open) {
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [open, config]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        toast({ title: 'Error', description: 'El archivo debe ser una imagen.', variant: 'destructive' });
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !signerPosition.trim()) {
      toast({ title: 'Error', description: 'Completa los campos obligatorios.', variant: 'destructive' });
      return;
    }

    try {
      setIsUploading(true);
      let finalUrl = signatureUrl;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}_${Date.now()}.${fileExt}`;
        const filePath = `signatures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('training-media') // Using existing public bucket
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('training-media')
          .getPublicUrl(filePath);

        finalUrl = publicUrl;
      }

      if (!finalUrl) {
        toast({ title: 'Error', description: 'Debes cargar una imagen de firma.', variant: 'destructive' });
        setIsUploading(false);
        return;
      }

      await updateConfig({
        key: 'legal_signature_config',
        value: {
          signer_name: signerName,
          signer_position: signerPosition,
          signature_url: finalUrl
        },
        description: 'Firma autorizada para contratos y certificaciones laborales'
      });

      toast({ title: 'Éxito', description: 'Configuración guardada correctamente.' });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-slate-100 bg-background">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1">
                Firma Digital Legal
              </DialogTitle>
              <p className="text-xs font-medium text-muted-foreground">Configura la firma para contratos y certificados</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-8 py-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Nombre del Firmante *
              </Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="ej: Juan Pérez"
                required
                className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" /> Cargo del Firmante *
              </Label>
              <Input
                value={signerPosition}
                onChange={(e) => setSignerPosition(e.target.value)}
                placeholder="ej: Gerente de Recursos Humanos"
                required
                className="h-12 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Imagen de la Firma *</Label>
              <AnimatePresence mode="wait">
                {previewUrl || signatureUrl ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative group rounded-3xl border-2 border-border overflow-hidden bg-white flex items-center justify-center p-4 min-h-[150px]"
                  >
                    <img 
                      src={previewUrl || signatureUrl || ''} 
                      alt="Firma" 
                      className="max-w-full max-h-[120px] object-contain mix-blend-multiply" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleRemoveFile}
                        className="rounded-xl h-10 w-10 shadow-xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {(previewUrl || file) && (
                      <div className="absolute top-3 left-3 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> NUEVO
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group relative"
                  >
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center py-10 rounded-[2rem] border-2 border-dashed border-border bg-white hover:border-primary/50 transition-all cursor-pointer"
                    >
                      <div className="mb-3 p-3 rounded-2xl bg-primary/5 text-primary group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-primary">Subir Firma</p>
                      <p className="text-[10px] font-medium text-muted-foreground mt-1">PNG transparente recomendado</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

          </div>

          <div className="px-8 py-6 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-4 rounded-b-[2.5rem]">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isUploading || (!signatureUrl && !file)}
              className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isUploading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
