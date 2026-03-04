import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Stethoscope, Calendar, FileText, CheckCircle, AlertTriangle, PenTool, MapPin, User, Upload, Paperclip, ExternalLink, Trash2, FileDown } from 'lucide-react';

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

const resultLabels: Record<string, string> = {
  apto: 'Apto',
  apto_restricciones: 'Apto con Restricciones',
  no_apto: 'No Apto',
  pendiente: 'Pendiente',
};

const resultStyles: Record<string, { bg: string; text: string }> = {
  apto: { bg: 'bg-success-light', text: 'text-success' },
  apto_restricciones: { bg: 'bg-warning-light', text: 'text-warning-foreground' },
  no_apto: { bg: 'bg-destructive-light', text: 'text-destructive' },
  pendiente: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ExamTransaction | null;
}

export function ExamTransactionDetailDialog({ open, onOpenChange, transaction }: Props) {
  const queryClient = useQueryClient();
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader className="flex flex-row items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {transaction.items.length} examen{transaction.items.length !== 1 ? 'es' : ''}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {examTypeLabels[transaction.exam_type as ExamType] || transaction.exam_type}
                </Badge>
              </div>
              <DialogTitle className="font-display text-lg text-foreground leading-tight">
                {employeeName}
              </DialogTitle>
              <p className="text-muted-foreground text-sm flex items-center gap-3">
                <span>C.C. {transaction.employees?.document_number}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(transaction.exam_date), 'dd MMM yyyy', { locale: es })}
                </span>
              </p>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
          {/* Items */}
          <div className="space-y-2">
            {transaction.items.map((item) => {
              const rs = resultStyles[item.result] || resultStyles.pendiente;
              return (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.exam_name}</p>
                      {item.expiration_date && (
                        <p className="text-xs text-muted-foreground">
                          Vence {format(new Date(item.expiration_date), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn('gap-1 text-xs whitespace-nowrap', rs.bg, rs.text)}>
                    {resultLabels[item.result] || item.result}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Información de la Aplicación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Centro de Operación</p>
                  <p className="text-sm font-medium truncate">{transaction.employees?.operation_centers?.name || 'Sin centro'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Proveedor / IPS</p>
                  <p className="text-sm font-medium truncate">{transaction.provider || '—'}</p>
                </div>
              </div>
            </div>
            {transaction.doctor_name && (
              <div className="text-sm">
                <p className="text-muted-foreground text-xs">Médico</p>
                <p className="text-foreground">{transaction.doctor_name}</p>
              </div>
            )}
            {transaction.observations && (
              <>
                <Separator />
                <div className="text-sm">
                  <p className="text-muted-foreground mb-1 text-xs">Observaciones</p>
                  <p className="text-foreground">{transaction.observations}</p>
                </div>
              </>
            )}
          </div>

          {/* Document */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary" />
              Documento Adjunto
              {documentUrl && (
                <Badge variant="outline" className="text-xs bg-success-light text-success border-0 ml-1">
                  <CheckCircle className="w-3 h-3 mr-1" /> Adjunto
                </Badge>
              )}
            </p>

            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} />

            {documentUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
                <FileText className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Documento PDF</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf}>
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveDocument} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf}>
                <Upload className="w-4 h-4" />
                {isUploadingPdf ? 'Subiendo...' : 'Adjuntar PDF'}
              </Button>
            )}
          </div>

          {/* Signature */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PenTool className="w-4 h-4 text-primary" />
              Firma del Empleado
              {signatureDataUrl && !showSignature && (
                <Badge variant="outline" className="text-xs bg-success-light text-success border-0 ml-1">
                  <CheckCircle className="w-3 h-3 mr-1" /> Guardada
                </Badge>
              )}
            </p>

            {signatureDataUrl && !showSignature ? (
              <div className="space-y-2">
                <div className="bg-muted/30 rounded-lg p-3">
                  <img src={signatureDataUrl} alt="Firma" className="w-full max-h-[100px] object-contain" />
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSignatureDataUrl(null); setShowSignature(true); }}>
                  Volver a firmar
                </Button>
              </div>
            ) : showSignature || !signatureDataUrl ? (
              <SignatureCanvas
                onSave={handleSaveSignature}
                width={400}
                height={150}
              />
            ) : null}
            {isSavingSignature && (
              <p className="text-xs text-muted-foreground">Guardando firma...</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
