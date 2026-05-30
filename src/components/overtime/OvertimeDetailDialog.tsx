import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Percent,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  OvertimeRecord, 
  OVERTIME_TYPE_LABELS, 
  OVERTIME_STATUS_LABELS,
  OvertimeStatus 
} from '@/types/overtime';
import { useApproveOvertimeRecord, useRejectOvertimeRecord } from '@/hooks/useOvertime';
import { toast } from 'sonner';

interface OvertimeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: OvertimeRecord | null;
}

export function OvertimeDetailDialog({
  open,
  onOpenChange,
  record,
}: OvertimeDetailDialogProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectedReason, setRejectedReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approveRecord = useApproveOvertimeRecord();
  const rejectRecord = useRejectOvertimeRecord();

  if (!record) return null;

  const getStatusBadgeVariant = (status: OvertimeStatus) => {
    switch (status) {
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      case 'pagado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleApprove = async () => {
    try {
      await approveRecord.mutateAsync({ 
        id: record.id, 
        approval_notes: approvalNotes || undefined 
      });
      toast.success('Hora extra aprobada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar');
    }
  };

  const handleReject = async () => {
    if (!rejectedReason.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    try {
      await rejectRecord.mutateAsync({ 
        id: record.id, 
        rejected_reason: rejectedReason 
      });
      toast.success('Hora extra rechazada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al rechazar');
    }
  };

  const employeeName = record.employees_v2 
    ? `${record.employees_v2.first_name} ${record.employees_v2.last_name}`
    : 'Empleado';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalle de Hora Extra</DialogTitle>
            <Badge variant={getStatusBadgeVariant(record.status)}>
              {OVERTIME_STATUS_LABELS[record.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-4 bg-background rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{employeeName}</p>
              <p className="text-sm text-muted-foreground">
                {record.employees_v2?.document_number}
              </p>
            </div>
          </div>

          {/* Type & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge variant="outline" className="text-sm">
                {OVERTIME_TYPE_LABELS[record.overtime_type]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {formatDateOnly(record.work_date, 'PPP', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Time & Hours */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="font-medium">{record.start_time.slice(0, 5)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fin</p>
                <p className="font-medium">{record.end_time.slice(0, 5)}</p>
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{record.total_hours}h</p>
            </div>
          </div>

          <Separator />

          {/* Financial Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Recargo</p>
                <p className="font-semibold text-primary">{record.surcharge_percentage}%</p>
              </div>
            </div>
            {record.hourly_rate && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor/Hora</p>
                  <p className="font-medium">{formatCurrency(record.hourly_rate)}</p>
                </div>
              </div>
            )}
          </div>

          {record.total_value && (
            <div className="p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(record.total_value)}
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          {record.reason && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Motivo</p>
                </div>
                <p className="p-3 bg-background rounded-lg">{record.reason}</p>
              </div>
            </>
          )}

          {/* Export Info */}
          {record.is_exported && (
            <>
              <Separator />
              <div className="p-3 bg-secondary/20 rounded-lg">
                <p className="text-sm font-medium">Exportado a Nómina</p>
                <p className="text-xs text-muted-foreground">
                  Período: {record.payroll_period} • 
                  {record.exported_at && format(new Date(record.exported_at), ' dd/MM/yyyy')}
                </p>
              </div>
            </>
          )}

          {/* Rejection Info */}
          {record.rejected_reason && (
            <>
              <Separator />
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive">Motivo de Rechazo</p>
                <p className="text-sm">{record.rejected_reason}</p>
              </div>
            </>
          )}

          {/* Actions for Pending Records */}
          {record.status === 'pendiente' && (
            <>
              <Separator />
              
              {!showRejectForm ? (
                <div className="space-y-4">
                  <div>
                    <Label>Notas de Aprobación (opcional)</Label>
                    <Textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Agregue notas..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button 
                      onClick={handleApprove}
                      disabled={approveRecord.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRecord.isPending ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Motivo del Rechazo *</Label>
                    <Textarea
                      value={rejectedReason}
                      onChange={(e) => setRejectedReason(e.target.value)}
                      placeholder="Indique el motivo..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleReject}
                      disabled={rejectRecord.isPending}
                    >
                      {rejectRecord.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
