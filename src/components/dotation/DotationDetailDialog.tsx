import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Calendar, FileText, AlertTriangle, CheckCircle, FileDown, PenTool, MapPin, User, Upload, Paperclip, ExternalLink, Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { generateActaEntregaPdf } from '@/lib/dotationPdfGenerator';
import { useCompany } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { getDotationStatus, getDaysRemaining } from '@/hooks/useDotation';
import { toast } from 'sonner';
import type { DotationTransaction } from '@/hooks/useDotationTransactions';

const dotationItemTypeLabels: Record<string, string> = {
  uniforme_camisa: 'Camisa',
  uniforme_pantalon: 'Pantalón',
  uniforme_conjunto: 'Conjunto',
  calzado_seguridad: 'Calzado Seguridad',
  calzado_dielectrico: 'Calzado Dieléctrico',
  casco: 'Casco',
  guantes: 'Guantes',
  gafas_seguridad: 'Gafas Seguridad',
  protector_auditivo: 'Protector Auditivo',
  arnes: 'Arnés',
  overol: 'Overol',
  chaleco_reflectivo: 'Chaleco Reflectivo',
  impermeable: 'Impermeable',
  otros: 'Otros',
};

type DotationStatus = 'vigente' | 'por_vencer' | 'vencida';

const statusConfig: Record<DotationStatus, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  vigente: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle, label: 'Vigente' },
  por_vencer: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle, label: 'Por Vencer' },
  vencida: { bg: 'bg-destructive-light', text: 'text-destructive', icon: AlertTriangle, label: 'Vencida' },
};

interface DotationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: DotationTransaction | null;
}

export function DotationDetailDialog({ open, onOpenChange, transaction }: DotationDetailDialogProps) {
  const { currentCompanyId } = useAuth();
  const { data: company } = useCompany(currentCompanyId || undefined);
  const queryClient = useQueryClient();
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing data when dialog opens
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

  const getWorstStatus = (): DotationStatus => {
    let worst: DotationStatus = 'vigente';
    for (const item of transaction.items) {
      if (!item.expiration_date) continue;
      const s = getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date }) as DotationStatus;
      if (s === 'vencida') return 'vencida';
      if (s === 'por_vencer') worst = 'por_vencer';
    }
    return worst;
  };

  const overallStatus = getWorstStatus();
  const sc = statusConfig[overallStatus];
  const StatusIcon = sc.icon;

  const handleSaveSignature = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setIsSavingSignature(true);
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `signatures/${transaction.id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('dotation-images')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('dotation-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('dotation_delivery_transactions')
        .update({ signature_url: publicUrl })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      setSignatureDataUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
      toast.success('Firma guardada correctamente');
    } catch (error) {
      console.error('Error saving signature:', error);
      toast.error('Error al guardar la firma');
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleExportPdf = async () => {
    const deliveries = transaction.items.map(item => ({
      id: item.id,
      employee_id: transaction.employee_id,
      item_type: item.item_type,
      item_name: item.item_name,
      quantity: item.quantity,
      size: item.size,
      delivery_date: item.delivery_date,
      expiration_date: item.expiration_date,
      delivered_by: transaction.delivered_by,
      observations: transaction.observations,
      employees: transaction.employees,
    }));

    setIsExporting(true);
    try {
      await generateActaEntregaPdf({
        companyName: company?.name || 'Empresa',
        companyNit: company?.nit || '',
        deliveries,
        signatureDataUrl,
      });
      toast.success('Acta de entrega generada');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10 MB');
      return;
    }

    setIsUploadingPdf(true);
    try {
      const fileName = `documents/${transaction.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('dotation-images')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('dotation-images').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from('dotation_delivery_transactions')
        .update({ document_url: publicUrl })
        .eq('id', transaction.id);
      if (updateError) throw updateError;

      setDocumentUrl(publicUrl);
      queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
      toast.success('Documento adjuntado correctamente');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      toast.error('Error al subir el documento');
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = async () => {
    try {
      const { error } = await supabase
        .from('dotation_delivery_transactions')
        .update({ document_url: null })
        .eq('id', transaction.id);
      if (error) throw error;
      setDocumentUrl(null);
      queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
      toast.success('Documento eliminado');
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Error al eliminar el documento');
    }
  };

  const hasValidDate = transaction.delivery_date && !isNaN(new Date(transaction.delivery_date).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-screen max-w-2xl translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border">
        {/* Header — inspired by training preview */}
        <div className="px-4 pt-5 pb-4 shrink-0 sm:px-6 sm:pt-6">
          <DialogHeader className="flex flex-row items-start gap-3 pr-12 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs font-medium">
                  {transaction.items.length} artículo{transaction.items.length !== 1 ? 's' : ''}
                </Badge>
                <Badge className={cn('gap-1 text-xs border-0', sc.bg, sc.text)}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </Badge>
              </div>
              <DialogTitle className="font-display text-lg text-foreground leading-tight">
                {employeeName}
              </DialogTitle>
              <p className="text-muted-foreground text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>C.C. {transaction.employees?.document_number}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {hasValidDate ? format(new Date(transaction.delivery_date), 'dd MMM yyyy', { locale: es }) : '—'}
                </span>
              </p>
            </div>
          </DialogHeader>
        </div>

        <Separator />

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-4 sm:px-6 sm:py-5 sm:space-y-5">
          {/* Items as cards */}
          <div className="space-y-2">
            {transaction.items.map((item) => {
              const hasExpDate = item.expiration_date && !isNaN(new Date(item.expiration_date).getTime());
              const itemStatus = hasExpDate
                ? (getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date }) as DotationStatus)
                : 'vigente';
              const itemSc = statusConfig[itemStatus];
              const ItemStatusIcon = itemSc.icon;
              const daysRem = hasExpDate ? getDaysRemaining(item.expiration_date) : 0;

              return (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dotationItemTypeLabels[item.item_type] || item.item_type}
                        {item.size && ` · Talla ${item.size}`}
                        {` · Cant. ${item.quantity}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end sm:shrink-0">
                    {hasExpDate && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        Vence {format(new Date(item.expiration_date), 'dd/MM/yyyy')}
                      </span>
                    )}
                    <Badge variant="outline" className={cn('gap-1 text-xs whitespace-nowrap', itemSc.bg, itemSc.text)}>
                      <ItemStatusIcon className="w-3 h-3" />
                      {itemSc.label}
                      {itemStatus === 'por_vencer' && daysRem > 0 && <span>({daysRem}d)</span>}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery info as metric cards */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Información de Entrega
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  <p className="text-xs text-muted-foreground">Entregado por</p>
                  <p className="text-sm font-medium truncate">{transaction.delivered_by || '—'}</p>
                </div>
              </div>
            </div>
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

          {/* PDF Document attachment */}
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

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUploadPdf}
            />

            {documentUrl ? (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3 bg-muted/30 sm:flex-row sm:items-center">
                <FileText className="w-5 h-5 text-destructive shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Documento PDF</p>
                  <p className="text-xs text-muted-foreground">Archivo adjunto a esta entrega</p>
                </div>
                <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:shrink-0">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto" asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ver
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf}>
                    <Upload className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleRemoveDocument} className="w-full text-destructive hover:text-destructive sm:w-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPdf}
              >
                <Upload className="w-4 h-4" />
                {isUploadingPdf ? 'Subiendo...' : 'Adjuntar PDF'}
              </Button>
            )}
          </div>

          {/* Signature capture */}
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
            ) : (
              <div className="bg-card rounded-lg p-3 border border-primary/20">
                <SignatureCanvas
                  onSave={handleSaveSignature}
                  width={440}
                  height={120}
                />
                {isSavingSignature && (
                  <p className="text-xs text-muted-foreground mt-2 animate-pulse">Guardando firma...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="shrink-0 border-t border-border bg-background px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between sm:px-6 sm:pb-4">
          <p className="min-w-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span className="truncate">{hasValidDate ? format(new Date(transaction.delivery_date), 'dd MMM yyyy', { locale: es }) : '—'} Entrega</span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button size="sm" onClick={handleExportPdf} disabled={isExporting} className="w-full gap-1.5 sm:w-auto">
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Generando...' : 'Acta PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
