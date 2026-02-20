import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Download,
  Upload,
  X
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
import { LeaveRequest, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LEAVE_DURATION_TYPE_LABELS } from '@/types/leave';
import { useApproveLeaveRequest, useRejectLeaveRequest, useCancelLeaveRequest, useUpdateLeaveRequest } from '@/hooks/useLeaves';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaveRequestDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
}

export function LeaveRequestDetailDialog({
  open,
  onOpenChange,
  request,
}: LeaveRequestDetailDialogProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documentSignedUrl, setDocumentSignedUrl] = useState<string | null>(null);

  const { currentCompanyId } = useAuth();
  const approveRequest = useApproveLeaveRequest();
  const rejectRequest = useRejectLeaveRequest();
  const cancelRequest = useCancelLeaveRequest();
  const updateRequest = useUpdateLeaveRequest();

  if (!request) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      case 'cancelado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleApprove = async () => {
    try {
      await approveRequest.mutateAsync({ 
        id: request.id, 
        review_notes: reviewNotes || undefined 
      });
      toast.success('Solicitud aprobada exitosamente');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar la solicitud');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    try {
      await rejectRequest.mutateAsync({ 
        id: request.id, 
        rejection_reason: rejectionReason 
      });
      toast.success('Solicitud rechazada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al rechazar la solicitud');
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Debe indicar el motivo de la cancelación');
      return;
    }
    try {
      await cancelRequest.mutateAsync({ 
        id: request.id, 
        cancellation_reason: cancellationReason 
      });
      toast.success('Solicitud cancelada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al cancelar la solicitud');
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (!currentCompanyId) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB');
      return;
    }

    try {
      setIsUploading(true);
      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${currentCompanyId}/leaves/${request.employee_id}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      await updateRequest.mutateAsync({
        id: request.id,
        document_url: filePath,
        document_name: file.name,
      });

      // Update local request object
      request.document_url = filePath;
      request.document_name = file.name;

      toast.success('Documento adjuntado exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al subir el documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadDocument = async () => {
    if (!request.document_url) return;

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(request.document_url, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast.error('Error al descargar el documento');
    }
  };

  const employeeName = request.employees_v2 
    ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
    : 'Empleado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalle de Solicitud</DialogTitle>
            <Badge variant={getStatusBadgeVariant(request.status)}>
              {LEAVE_STATUS_LABELS[request.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{employeeName}</p>
              <p className="text-sm text-muted-foreground">
                {request.employees_v2?.document_number}
              </p>
            </div>
          </div>

          {/* Leave Type & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tipo de Permiso</p>
              <p className="font-medium">{LEAVE_TYPE_LABELS[request.leave_type]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Tipo de Duración</p>
              <p className="font-medium">{LEAVE_DURATION_TYPE_LABELS[request.duration_type]}</p>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                <p className="font-medium">
                  {format(new Date(request.start_date), 'PPP', { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Fin</p>
                <p className="font-medium">
                  {format(new Date(request.end_date), 'PPP', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Time if applicable */}
          {request.start_time && request.end_time && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hora de Inicio</p>
                  <p className="font-medium">{request.start_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Hora de Fin</p>
                  <p className="font-medium">{request.end_time}</p>
                </div>
              </div>
            </div>
          )}

          {/* Total Days/Hours */}
          <div className="p-4 bg-primary/5 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-bold">
                {request.total_hours 
                  ? `${request.total_hours} horas`
                  : `${request.total_days} días`}
              </span>
            </div>
          </div>

          <Separator />

          {/* Reason */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Motivo</p>
            </div>
            <p className="p-3 bg-muted rounded-lg">{request.reason}</p>
          </div>

          {/* Document Section */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Documento de Soporte</p>
            {request.document_url ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm truncate flex-1">{request.document_name || 'Documento adjunto'}</span>
                <Button variant="outline" size="sm" onClick={handleDownloadDocument}>
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </Button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {isUploading ? 'Subiendo...' : 'Haga clic para adjuntar un documento'}
                </span>
                <span className="text-xs text-muted-foreground">PDF, JPG, PNG (máx. 10 MB)</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadDocument(file);
                  }}
                />
              </label>
            )}
          </div>

          {/* Review Info */}
          {request.reviewed_at && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Información de Revisión</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Revisado por</p>
                    <p>{request.reviewer_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Fecha de revisión</p>
                    <p>{format(new Date(request.reviewed_at), 'PPP', { locale: es })}</p>
                  </div>
                </div>
                {request.review_notes && (
                  <div>
                    <p className="text-muted-foreground">Notas</p>
                    <p className="p-2 bg-muted rounded">{request.review_notes}</p>
                  </div>
                )}
                {request.rejection_reason && (
                  <div>
                    <p className="text-muted-foreground text-destructive">Motivo de Rechazo</p>
                    <p className="p-2 bg-destructive/10 rounded text-destructive">
                      {request.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cancellation Info */}
          {request.cancelled_at && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Información de Cancelación</p>
                <div>
                  <p className="text-muted-foreground">Fecha de cancelación</p>
                  <p>{format(new Date(request.cancelled_at), 'PPP', { locale: es })}</p>
                </div>
                {request.cancellation_reason && (
                  <div>
                    <p className="text-muted-foreground">Motivo</p>
                    <p className="p-2 bg-muted rounded">{request.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Actions for Pending Requests */}
          {request.status === 'pendiente' && (
            <>
              <Separator />
              
              {!showRejectForm && !showCancelForm && (
                <div className="space-y-4">
                  <div>
                    <Label>Notas de Revisión (opcional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Agregue notas sobre la revisión..."
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCancelForm(true)}
                    >
                      Cancelar Solicitud
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button 
                      onClick={handleApprove}
                      disabled={approveRequest.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRequest.isPending ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                  </div>
                </div>
              )}

              {showRejectForm && (
                <div className="space-y-4">
                  <div>
                    <Label>Motivo del Rechazo *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Indique el motivo del rechazo..."
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
                      disabled={rejectRequest.isPending}
                    >
                      {rejectRequest.isPending ? 'Rechazando...' : 'Confirmar Rechazo'}
                    </Button>
                  </div>
                </div>
              )}

              {showCancelForm && (
                <div className="space-y-4">
                  <div>
                    <Label>Motivo de la Cancelación *</Label>
                    <Textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Indique el motivo de la cancelación..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowCancelForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={handleCancel}
                      disabled={cancelRequest.isPending}
                    >
                      {cancelRequest.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cancel option for approved requests */}
          {request.status === 'aprobado' && (
            <>
              <Separator />
              {!showCancelForm ? (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCancelForm(true)}
                  >
                    Cancelar Permiso Aprobado
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Motivo de la Cancelación *</Label>
                    <Textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Indique el motivo de la cancelación..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setShowCancelForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleCancel}
                      disabled={cancelRequest.isPending}
                    >
                      {cancelRequest.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
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
