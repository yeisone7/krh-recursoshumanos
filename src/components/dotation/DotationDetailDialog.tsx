import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, Calendar, FileText, AlertTriangle, CheckCircle, FileDown, PenTool, MapPin, User } from 'lucide-react';

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

  // Load existing signature when dialog opens
  useEffect(() => {
    if (transaction?.signature_url) {
      setSignatureDataUrl(transaction.signature_url);
    } else {
      setSignatureDataUrl(null);
    }
    setShowSignature(false);
  }, [transaction?.id, transaction?.signature_url]);

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

  const hasValidDate = transaction.delivery_date && !isNaN(new Date(transaction.delivery_date).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header — inspired by training preview */}
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader className="flex flex-row items-start gap-4">
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
              <p className="text-muted-foreground text-sm flex items-center gap-3">
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
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-5">
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
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
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
                  <div className="flex items-center gap-3 shrink-0">
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
        <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between bg-background">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {hasValidDate ? format(new Date(transaction.delivery_date), 'dd MMM yyyy', { locale: es }) : '—'} Entrega
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button size="sm" onClick={handleExportPdf} disabled={isExporting} className="gap-1.5">
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Generando...' : 'Acta PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
