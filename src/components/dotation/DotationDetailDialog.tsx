import { useState, useEffect, useRef } from 'react';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Calendar, FileText, AlertTriangle, CheckCircle, FileDown, PenTool, MapPin, User, Upload, ExternalLink, Trash2, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { generateActaEntregaPdf } from '@/lib/dotationPdfGenerator';
import { useCompany } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { getDotationStatus, getDaysRemaining } from '@/hooks/useDotation';
import { toast } from 'sonner';
import { DotationSignatureLink } from './DotationSignatureLink';
import { getDotationSignatureUrl } from '@/lib/dotationSignature';
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
  const { currentCompanyId, isAdmin, isRRHH, isSuperAdmin, canUpdate } = useAuth();
  const canSign = isAdmin || isRRHH || isSuperAdmin || canUpdate('dotacion');
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

  const hasSignature = Boolean(signatureDataUrl || transaction.signature_path || transaction.signed_at);
  const handleSaveSignature = async (dataUrl: string) => {
    if (!canSign || isSavingSignature || transaction.signature_source === 'mobile') return;
    setIsSavingSignature(true);
    let uploadedPath: string | null = null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = `${transaction.employees?.company_id}/${transaction.id}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage.from('dotation-signatures')
        .upload(fileName, blob, { contentType: 'image/png', upsert: false });
      if (uploadError) throw uploadError;
      uploadedPath = fileName;
      const { error: updateError } = await supabase.rpc('save_local_dotation_signature', {
        p_transaction_id: transaction.id, p_path: fileName, p_updated_at: transaction.updated_at,
      });
      if (updateError) throw updateError;
      uploadedPath = null;
      setSignatureDataUrl(dataUrl);
      setShowSignature(false);
      await queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
      toast.success('Firma guardada correctamente');
    } catch {
      // Storage policy permits cleanup only if the object is not attached.
      if (uploadedPath) await supabase.storage.from('dotation-signatures').remove([uploadedPath]);
      toast.error('No se pudo guardar la firma. Actualiza el detalle e intenta nuevamente.');
      void queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
    } finally { setIsSavingSignature(false); }
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
        logoUrl: company?.horizontal_logo_url || company?.logo_url || null,
        deliveries,
        signatureDataUrl: transaction.signature_path ? await getDotationSignatureUrl(transaction) : signatureDataUrl,
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
      <DialogContent className="dotation-detail-dialog flex h-[100dvh] w-screen max-w-2xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-lg bg-background ">
        {/* Header con gradiente */}
        <div className="dotation-detail-header shrink-0 relative bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-start gap-3 sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge variant="outline" className="h-5 rounded-lg px-2 bg-background border-border/50 font-bold text-[9px] uppercase tracking-widest text-muted-foreground">
                  {transaction.items.length} Artículos
                </Badge>
                <Badge className={cn('h-5 rounded-lg px-2 gap-1 text-[9px] font-bold uppercase tracking-widest border-0 shadow-sm', sc.bg, sc.text)}>
                  <StatusIcon className="w-3 h-3" />
                  {sc.label}
                </Badge>
              </div>
              <DialogTitle className="font-bold text-xl leading-tight tracking-tight sm:text-2xl whitespace-normal break-words text-foreground">
                {employeeName}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Detalle de entrega de dotación de {employeeName}
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                <span>C.C. {transaction.employees?.document_number}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {hasValidDate ? formatDateOnly(transaction.delivery_date, 'dd MMM yyyy', { locale: es }) : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Items as cards */}
          <div className="space-y-2.5">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detalle de Entrega</Label>
            {transaction.items.map((item) => {
              const hasExpDate = item.expiration_date && !isNaN(new Date(item.expiration_date).getTime());
              const itemStatus = hasExpDate
                ? (getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date }) as DotationStatus)
                : 'vigente';
              const itemSc = statusConfig[itemStatus];
              const ItemStatusIcon = itemSc.icon;
              const daysRem = hasExpDate ? getDaysRemaining(item.expiration_date) : 0;

              return (
                <div key={item.id} className="group relative flex flex-col gap-4 rounded-2xl border border-border/50 bg-background p-4 transition-all duration-300 hover:bg-primary/[0.02] hover:border-primary/20 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background group-hover:bg-primary/10 transition-colors">
                      <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.item_name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                        {dotationItemTypeLabels[item.item_type] || item.item_type}
                        {item.size && <span className="mx-1">•</span>}
                        {item.size && `Talla ${item.size}`}
                        <span className="mx-1">•</span>
                        {`Cant. ${item.quantity}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end sm:shrink-0">
                    {hasExpDate && (
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">
                        Vence: {formatDateOnly(item.expiration_date, 'dd/MM/yy')}
                      </span>
                    )}
                    <Badge variant="outline" className={cn('h-7 rounded-lg gap-1.5 text-[9px] font-bold uppercase tracking-widest border-0 shadow-sm', itemSc.bg, itemSc.text)}>
                      <ItemStatusIcon className="w-3.5 h-3.5" />
                      {itemSc.label}
                      {itemStatus === 'por_vencer' && daysRem > 0 && <span>({daysRem}d)</span>}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="bg-background p-4 rounded-2xl border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 text-primary" /> Centro Operativo
              </div>
              <p className="font-bold text-sm leading-tight text-foreground truncate">{transaction.employees?.operation_centers?.name || 'Sin asignar'}</p>
            </div>
            <div className="bg-background p-4 rounded-2xl border border-border/50 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <User className="w-3.5 h-3.5 text-primary" /> Entregado por
              </div>
              <p className="font-bold text-sm leading-tight text-foreground truncate">{transaction.delivered_by || '—'}</p>
            </div>
          </div>

          {transaction.observations && (
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones</Label>
              <div className="bg-background p-4 rounded-2xl border border-border/50">
                <p className="text-sm font-medium text-foreground leading-relaxed">{transaction.observations}</p>
              </div>
            </div>
          )}

          {/* Document Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Soporte Digital</Label>
              {documentUrl && (
                <Badge className="h-5 rounded-lg px-2 bg-green-500/10 text-green-600 font-bold text-[8px] uppercase tracking-widest border-0">
                  Documento Cargado
                </Badge>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleUploadPdf}
            />
            {documentUrl ? (
              <div className="group flex flex-col gap-3 rounded-2xl border border-border/50 p-4 bg-background hover:bg-primary/[0.01] transition-all sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                  <FileText className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">Acta de Entrega Digital</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Formato PDF • Soporte firmado</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest border-border/50" asChild>
                    <a href={documentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver
                    </a>
                  </Button>
                  <Button aria-label="Reemplazar acta firmada" title="Reemplazar acta firmada" variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl border-border/50" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPdf}>
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button aria-label="Eliminar acta firmada" title="Eliminar acta firmada" variant="ghost" size="sm" onClick={handleRemoveDocument} className="h-9 w-9 p-0 rounded-xl text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="h-16 w-full gap-3 border-dashed rounded-2xl bg-background /10 border-border font-bold text-xs uppercase tracking-widest text-muted-foreground hover:hover:border-primary/30 hover:text-primary transition-all"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPdf}
              >
                <Upload className="w-5 h-5" />
                {isUploadingPdf ? 'Subiendo Soporte...' : 'Adjuntar Acta Firmada'}
              </Button>
            )}
          </div>

          {/* Signature Section */}
          <div className="space-y-3">
            <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Firma del Colaborador</Label>
            {canSign && !hasSignature && <DotationSignatureLink key={transaction.id} transactionId={transaction.id} open={open} />}
            <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-background /10">
              {hasSignature && !showSignature ? (
                <div className="p-6 space-y-4">
                  <div className="bg-background rounded-2xl p-6 border border-border/30 flex items-center justify-center">
                    {signatureDataUrl ? <img src={signatureDataUrl} alt="Firma" className="max-h-[120px] object-contain drop-shadow-sm" /> : <p className="text-sm">Firma registrada. Vuelve a abrir el detalle para cargar la imagen.</p>}
                  </div>
                  {canSign && transaction.signature_source !== 'mobile' && <div className="flex justify-center">
                    <Button variant="ghost" size="sm" className="rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest hover:bg-background" onClick={() => setShowSignature(true)}>
                      <PenTool className="w-3.5 h-3.5" /> Re-firmar Documento
                    </Button>
                  </div>}
                  {transaction.signed_at && <p className="text-center text-xs text-muted-foreground">Firmado el {new Date(transaction.signed_at).toLocaleString('es-CO')}</p>}
                </div>
              ) : (
                <div className="p-6 bg-background ">
                  <div className="bg-white/80 rounded-2xl p-4 border border-primary/20 shadow-inner">
                    <SignatureCanvas
                      onSave={handleSaveSignature}
                      disabled={isSavingSignature || !canSign}
                      saving={isSavingSignature}
                      width={480}
                      height={140}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-muted-foreground text-center uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                    {isSavingSignature ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Procesando firma...</>
                    ) : (
                      <>Firma de recibido en pantalla</>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="dotation-detail-footer shrink-0 flex flex-col gap-3 p-6 border-t border-border/50 bg-background /10 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado de Registro</span>
             <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
               <CheckCircle className="w-3.5 h-3.5 text-primary" /> {hasSignature ? 'Firmado' : 'Pendiente de firma'}
             </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
            >
              Cerrar
            </Button>
            <Button 
              size="lg"
              onClick={handleExportPdf} 
              disabled={isExporting} 
              className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" /> Exportar Acta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
