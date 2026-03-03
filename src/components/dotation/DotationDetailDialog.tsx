import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, User, Calendar, Clock, FileText, AlertTriangle, CheckCircle, FileDown, PenTool } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { generateActaEntregaPdf } from '@/lib/dotationPdfGenerator';
import { useCompany } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useDotationDeliveries, getDotationStatus, getDaysRemaining } from '@/hooks/useDotation';
import { toast } from 'sonner';

interface DotationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: any;
}

type DotationStatus = 'vigente' | 'por_vencer' | 'vencida';

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

const statusConfig: Record<DotationStatus, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  vigente: { bg: 'bg-success-light', text: 'text-success', icon: CheckCircle, label: 'Vigente' },
  por_vencer: { bg: 'bg-warning-light', text: 'text-warning', icon: AlertTriangle, label: 'Por Vencer' },
  vencida: { bg: 'bg-destructive-light', text: 'text-destructive', icon: AlertTriangle, label: 'Vencida' },
};

export function DotationDetailDialog({ open, onOpenChange, delivery }: DotationDetailDialogProps) {
  const { currentCompanyId } = useAuth();
  const { data: company } = useCompany(currentCompanyId || undefined);
  const { data: allDeliveries = [] } = useDotationDeliveries();
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!delivery) return null;

  const status = getDotationStatus(delivery) as DotationStatus;
  const daysRemaining = getDaysRemaining(delivery.expiration_date);
  const sc = statusConfig[status];
  const StatusIcon = sc.icon;

  const employeeName = [
    delivery.employees?.first_name,
    delivery.employees?.middle_name,
    delivery.employees?.last_name,
    delivery.employees?.second_last_name,
  ].filter(Boolean).join(' ');

  const handleExportPdf = async () => {
    const sameBatch = allDeliveries.filter(
      (d: any) => d.employee_id === delivery.employee_id && d.delivery_date === delivery.delivery_date
    );
    setIsExporting(true);
    try {
      await generateActaEntregaPdf({
        companyName: company?.name || 'Empresa',
        companyNit: company?.nit || '',
        deliveries: sameBatch.length > 0 ? sameBatch : [delivery],
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Styled header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Detalle de Entrega
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-white/80 text-sm">Empleado</p>
              <p className="font-semibold text-lg">{employeeName}</p>
              <p className="text-white/70 text-sm">C.C. {delivery.employees?.document_number}</p>
            </div>
            <Badge className={cn('gap-1 text-sm px-3 py-1', sc.bg, sc.text, 'border-0')}>
              <StatusIcon className="w-3.5 h-3.5" />
              {sc.label}
            </Badge>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Item card */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="w-4 h-4 text-primary" />
              Artículo Entregado
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre</span>
                <p className="font-medium">{delivery.item_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo</span>
                <p className="font-medium">{dotationItemTypeLabels[delivery.item_type] || delivery.item_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cantidad</span>
                <p className="font-medium">{delivery.quantity}</p>
              </div>
              {delivery.size && (
                <div>
                  <span className="text-muted-foreground">Talla</span>
                  <p className="font-medium">{delivery.size}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Entrega</p>
              <p className="font-semibold text-sm">{format(new Date(delivery.delivery_date), 'PPP', { locale: es })}</p>
            </div>
            <div className={cn(
              'rounded-xl p-4 text-center',
              status === 'vencida' ? 'bg-destructive/10' : status === 'por_vencer' ? 'bg-warning/10' : 'bg-muted/40'
            )}>
              <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Vencimiento</p>
              <p className="font-semibold text-sm">{format(new Date(delivery.expiration_date), 'PPP', { locale: es })}</p>
              <p className={cn('text-xs mt-1', sc.text)}>
                {daysRemaining > 0
                  ? `${daysRemaining} días restantes`
                  : daysRemaining === 0
                    ? 'Vence hoy'
                    : `Venció hace ${Math.abs(daysRemaining)} días`}
              </p>
            </div>
          </div>

          {/* Delivery info */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              Información de Entrega
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Centro de Operación</span>
              <span className="font-medium">{delivery.employees?.operation_centers?.name || 'Sin centro'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Entregado por</span>
              <span className="font-medium">{delivery.delivered_by || '—'}</span>
            </div>
            {delivery.observations && (
              <div className="pt-2 border-t border-border/50 text-sm">
                <p className="text-muted-foreground mb-1">Observaciones</p>
                <p>{delivery.observations}</p>
              </div>
            )}
          </div>

          {/* Signature capture for PDF */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowSignature(!showSignature)}
              className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <PenTool className="w-4 h-4" />
              {signatureDataUrl ? 'Firma capturada ✓ — Cambiar' : 'Capturar firma del empleado para el acta'}
            </button>
            {showSignature && (
              <div className="border border-primary/20 rounded-lg p-3 bg-white">
                {signatureDataUrl ? (
                  <div className="space-y-2">
                    <img src={signatureDataUrl} alt="Firma" className="w-full max-h-[100px] object-contain" />
                    <Button variant="outline" size="sm" onClick={() => setSignatureDataUrl(null)}>
                      Volver a firmar
                    </Button>
                  </div>
                ) : (
                  <SignatureCanvas
                    onSave={(dataUrl) => {
                      setSignatureDataUrl(dataUrl);
                    }}
                    width={440}
                    height={120}
                  />
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={handleExportPdf} disabled={isExporting} className="gap-2">
              <FileDown className="w-4 h-4" />
              {isExporting ? 'Generando...' : 'Descargar Acta PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
