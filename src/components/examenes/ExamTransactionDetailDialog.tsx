import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Stethoscope, Calendar, FileText, CheckCircle, AlertTriangle, PenTool, MapPin, User, Upload, Paperclip, ExternalLink, Trash2, FileDown, Loader2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { toast } from 'sonner';
import type { ExamTransaction } from '@/hooks/useExamTransactions';
import { examTypeLabels } from '@/types/medicalExam';
import type { ExamType } from '@/types/medicalExam';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { generateExamOrderPdf } from '@/lib/examPdfGenerator';

const resultLabels: Record<string, string> = {
  apto: 'Apto',
  apto_restricciones: 'Apto con Recomendaciones',
  no_apto: 'No Apto',
  pendiente: 'Pendiente',
};

const resultStyles: Record<string, { bg: string; text: string }> = {
  apto: { bg: 'bg-success-light', text: 'text-success' },
  apto_restricciones: { bg: 'bg-warning-light', text: 'text-warning-foreground' },
  no_apto: { bg: 'bg-destructive-light', text: 'text-destructive' },
  pendiente: { bg: 'bg-background ', text: 'text-muted-foreground' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ExamTransaction | null;
}

export function ExamTransactionDetailDialog({ open, onOpenChange, transaction }: Props) {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();
  const { data: companies = [] } = useCompanies();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportPdf = async () => {
    if (!transaction) return;
    try {
      await generateExamOrderPdf({
        companyName: currentCompany?.name || '',
        companyNit: currentCompany?.nit || '',
        logoUrl: currentCompany?.horizontal_logo_url || currentCompany?.logo_url,
        transaction,
        signatureDataUrl,
      });
      toast.success('Orden exportada');
    } catch {
      toast.error('Error al exportar');
    }
  };

  useEffect(() => {
    if (transaction?.signature_url) {
      setSignatureDataUrl(transaction.signature_url);
    } else {
      setSignatureDataUrl(null);
    }
    setDocumentUrl(transaction?.document_url || null);
    setShowSignature(false);
  }, [transaction?.id, transaction?.signature_url, transaction?.document_url]);

  if (!transaction) return null;

  const employeeName = [
    transaction.employees?.first_name,
    transaction.employees?.middle_name,
    transaction.employees?.last_name,
    transaction.employees?.second_last_name,
  ].filter(Boolean).join(' ');

  const handleSaveSignature = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setIsSavingSignature(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `exam-signatures/${transaction.id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('dotation-images')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('dotation-images').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('exam_delivery_transactions' as any)
        .update({ signature_url: urlData.publicUrl } as any)
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      setSignatureDataUrl(urlData.publicUrl);
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
      toast.success('Firma guardada correctamente');
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Error al guardar la firma');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Solo se permiten archivos PDF'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('El archivo no debe superar 10 MB'); return; }

    setIsUploadingPdf(true);
    try {
      const fileName = `exam-documents/${transaction.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('dotation-images')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('dotation-images').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('exam_delivery_transactions' as any)
        .update({ document_url: urlData.publicUrl } as any)
        .eq('id', transaction.id);
      if (updateError) throw updateError;

      setDocumentUrl(urlData.publicUrl);
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
      toast.success('Documento adjuntado correctamente');
    } catch (error) {
      toast.error('Error al subir el documento');
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = async () => {
    try {
      const { error } = await supabase
        .from('exam_delivery_transactions' as any)
        .update({ document_url: null } as any)
        .eq('id', transaction.id);
      if (error) throw error;
      setDocumentUrl(null);
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
      toast.success('Documento eliminado');
    } catch {
      toast.error('Error al eliminar el documento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-0 sm:w-full rounded-[2rem] border shadow-2xl bg-background overflow-hidden">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border relative overflow-hidden">
          
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <Stethoscope className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="h-5 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                    {transaction.items.length} Procedimientos
                  </Badge>
                  <Badge variant="outline" className="h-5 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest bg-secondary/10 text-secondary border-secondary/20">
                    {examTypeLabels[transaction.exam_type as ExamType] || transaction.exam_type}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tighter">
                  {employeeName}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> C.C. {transaction.employees?.document_number}
                  </p>
                  <span className="text-muted-foreground/30">·</span>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> {formatDateOnly(transaction.exam_date, 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleExportPdf}
              className="h-10 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[9px] bg-background border-border/50 hover:bg-background transition-all shadow-sm"
            >
              <FileDown className="w-4 h-4" /> Exportar Orden
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Procedimientos Realizados</h4>
              <Stethoscope className="w-4 h-4 text-primary/30" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {transaction.items.map((item) => {
                const rs = resultStyles[item.result] || resultStyles.pendiente;
                return (
                  <div key={item.id} className="group relative overflow-hidden flex flex-col gap-4 rounded-2xl border border-border/50 bg-background p-5 transition-all hover:bg-background hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black tracking-tight text-foreground truncate">{item.exam_name}</p>
                        {item.expiration_date && (
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3 h-3 text-primary/40" />
                            Vence: {formatDateOnly(item.expiration_date, 'dd MMM yyyy', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('h-7 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest border-0 shadow-sm', rs.bg, rs.text)}>
                      {resultLabels[item.result] || item.result}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <FileText className="w-4 h-4 text-primary/40" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Información General</h4>
              </div>
              <div className="bg-primary/[0.02] border border-border rounded-[2rem] p-6 space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Centro de Operación</p>
                  <p className="font-black tracking-tight text-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/40" />
                    {transaction.employees?.operation_centers?.name || 'Sin centro asignado'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Proveedor / IPS</p>
                  <p className="font-black tracking-tight text-foreground flex items-center gap-2">
                    <User className="w-4 h-4 text-primary/40" />
                    {transaction.provider || 'No especificado'}
                  </p>
                </div>
                {transaction.doctor_name && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Médico Especialista</p>
                    <p className="font-black tracking-tight text-foreground">{transaction.doctor_name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Paperclip className="w-4 h-4 text-primary/40" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Soportes y Notas</h4>
              </div>
              <div className="bg-background border border-border/50 rounded-[2rem] p-6 space-y-6">
                {transaction.observations ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observaciones</p>
                    <p className="text-sm font-medium text-foreground leading-relaxed italic">"{transaction.observations}"</p>
                  </div>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 italic">Sin observaciones adicionales</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Document Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary/40" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Expediente Médico Digital</h4>
              </div>
              {documentUrl && (
                <Badge variant="outline" className="h-5 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20 animate-pulse">
                  <CheckCircle className="w-2.5 h-2.5 mr-1" /> Archivo Adjunto
                </Badge>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} />

            {documentUrl ? (
              <div className="relative overflow-hidden group bg-background border border-border/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:bg-background hover:shadow-md">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black tracking-tight text-foreground truncate">Resultados Médicos Ocupacionales.pdf</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Documento PDF Oficial</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 font-black uppercase tracking-widest text-[9px] bg-background " asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver PDF
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf} className="h-9 w-9 rounded-xl p-0 bg-background ">
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveDocument} className="h-9 w-9 rounded-xl p-0 text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-16 rounded-2xl border-dashed border-2 gap-3 hover:hover:border-primary/30 transition-all group" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploadingPdf}
              >
                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase tracking-widest text-foreground">Adjuntar Reporte Médico</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{isUploadingPdf ? 'Subiendo archivo...' : 'Formato PDF (Máx. 10MB)'}</p>
                </div>
              </Button>
            )}
          </div>

          {/* Signature Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-primary/40" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Firma Digital de Recibido</h4>
              </div>
              {signatureDataUrl && !showSignature && (
                <Badge variant="outline" className="h-5 px-2 rounded-lg text-[8px] font-black uppercase tracking-widest bg-success/10 text-success border-success/20">
                  <CheckCircle className="w-2.5 h-2.5 mr-1" /> Firma Registrada
                </Badge>
              )}
            </div>

            <div className="bg-background border border-border/50 rounded-[2rem] p-8">
              {signatureDataUrl && !showSignature ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="bg-white/80 rounded-2xl p-6 border border-border/50 w-full flex items-center justify-center min-h-[150px] shadow-inner">
                    <img src={signatureDataUrl} alt="Firma" className="max-h-[100px] object-contain filter drop-shadow-sm" />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-6 rounded-xl gap-2 font-black uppercase tracking-widest text-[9px] bg-background " 
                    onClick={() => { setSignatureDataUrl(null); setShowSignature(true); }}
                  >
                    Actualizar Firma
                  </Button>
                </div>
              ) : showSignature || !signatureDataUrl ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-border/50 overflow-hidden shadow-inner">
                    <SignatureCanvas
                      onSave={handleSaveSignature}
                      width={600}
                      height={180}
                    />
                  </div>
                  <p className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Firma utilizando tu mouse o pantalla táctil</p>
                </div>
              ) : null}
              
              {isSavingSignature && (
                <div className="flex items-center justify-center gap-2 mt-4 text-primary animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando firma...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
