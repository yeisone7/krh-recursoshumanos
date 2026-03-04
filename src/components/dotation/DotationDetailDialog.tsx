import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Calendar, Clock, FileText, AlertTriangle, CheckCircle, FileDown, PenTool } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!transaction) return null;

  const employeeName = [
    transaction.employees?.first_name,
    transaction.employees?.middle_name,
    transaction.employees?.last_name,
    transaction.employees?.second_last_name,
  ].filter(Boolean).join(' ');

  // Get worst status across all items
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

  const handleExportPdf = async () => {
    // Build delivery-like objects for the PDF generator
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh]">
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
              <p className="text-white/70 text-sm">C.C. {transaction.employees?.document_number}</p>
            </div>
            <Badge className={cn('gap-1 text-sm px-3 py-1', sc.bg, sc.text, 'border-0')}>
              <StatusIcon className="w-3.5 h-3.5" />
              {sc.label}
            </Badge>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          {/* Transaction info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <Calendar className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Fecha de Entrega</p>
              <p className="font-semibold text-sm">
                {hasValidDate ? format(new Date(transaction.delivery_date), 'PPP', { locale: es }) : '—'}
              </p>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 text-center">
              <Package className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Artículos</p>
              <p className="font-semibold text-sm">{transaction.items.length} artículo(s)</p>
            </div>
          </div>

          {/* Items table */}
          <div className="bg-muted/40 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground px-4 pt-3 pb-2">
              <Package className="w-4 h-4 text-primary" />
              Artículos Entregados
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Artículo</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs text-center">Cant.</TableHead>
                  <TableHead className="text-xs">Talla</TableHead>
                  <TableHead className="text-xs">Vencimiento</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.items.map((item) => {
                  const hasExpDate = item.expiration_date && !isNaN(new Date(item.expiration_date).getTime());
                  const itemStatus = hasExpDate
                    ? (getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date }) as DotationStatus)
                    : 'vigente';
                  const itemSc = statusConfig[itemStatus];
                  const ItemStatusIcon = itemSc.icon;
                  const daysRem = hasExpDate ? getDaysRemaining(item.expiration_date) : 0;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dotationItemTypeLabels[item.item_type] || item.item_type}</TableCell>
                      <TableCell className="text-sm text-center">{item.quantity}</TableCell>
                      <TableCell className="text-sm">{item.size || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {hasExpDate ? format(new Date(item.expiration_date), 'dd/MM/yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('gap-1 text-xs', itemSc.bg, itemSc.text)}>
                          <ItemStatusIcon className="w-3 h-3" />
                          {itemSc.label}
                          {itemStatus === 'por_vencer' && daysRem > 0 && <span>({daysRem}d)</span>}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Delivery info */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="w-4 h-4 text-primary" />
              Información de Entrega
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Centro de Operación</span>
              <span className="font-medium">{transaction.employees?.operation_centers?.name || 'Sin centro'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Entregado por</span>
              <span className="font-medium">{transaction.delivered_by || '—'}</span>
            </div>
            {transaction.observations && (
              <div className="pt-2 border-t border-border/50 text-sm">
                <p className="text-muted-foreground mb-1">Observaciones</p>
                <p>{transaction.observations}</p>
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
                    onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
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
