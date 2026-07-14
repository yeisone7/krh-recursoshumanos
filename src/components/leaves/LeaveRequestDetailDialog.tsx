import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';
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

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al aprobar la solicitud'));
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al rechazar la solicitud'));
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al cancelar la solicitud'));
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Error al subir el documento'));
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
    } catch {
      toast.error('Error al descargar el documento');
    }
  };

  const employeeName = request.employees_v2 
    ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
    : 'Empleado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0 border-b border-border/70 bg-slate-50/70 px-5 py-4 pr-12 dark:bg-slate-900/70 sm:px-6 sm:py-5 sm:pr-14">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-3 text-left text-lg font-semibold tracking-tight sm:text-xl">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-[18px] w-[18px]" />
              </span>
              Detalle de solicitud
            </DialogTitle>
            <Badge className="w-fit shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide" variant={getStatusBadgeVariant(request.status)}>
              {LEAVE_STATUS_LABELS[request.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:px-6 sm:pb-6">
          {/* Employee Info */}
          <section className="rounded-xl border border-border/70 bg-slate-50/60 p-4 dark:bg-slate-900/50 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border/70">
                <User className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Empleado</p>
                <p className="mt-1 truncate text-lg font-semibold text-foreground">{employeeName}</p>
                <p className="text-sm text-muted-foreground">
                  Documento {request.employees_v2?.document_number}
                </p>
              </div>
            </div>

            {/* Leave Type & Duration */}
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border/60 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo de permiso</p>
                <p className="mt-1 font-semibold text-foreground">{LEAVE_TYPE_LABELS[request.leave_type]}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tipo de duración</p>
                <p className="mt-1 font-semibold text-foreground">{LEAVE_DURATION_TYPE_LABELS[request.duration_type]}</p>
              </div>
            </div>
          </section>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha de inicio</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatDateOnly(request.start_date, 'PPP', { locale: es })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
              <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fecha de finalización</p>
                <p className="mt-1 font-semibold tabular-nums">
                  {formatDateOnly(request.end_date, 'PPP', { locale: es })}
                </p>
              </div>
            </div>
          </div>

          {/* Time if applicable */}
          {request.start_time && request.end_time && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hora de inicio</p>
                  <p className="mt-1 font-semibold tabular-nums">{request.start_time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/70 p-4">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hora de finalización</p>
                  <p className="mt-1 font-semibold tabular-nums">{request.end_time}</p>
                </div>
              </div>
            </div>
          )}

          {/* Total Days/Hours */}
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-muted-foreground">Duración total</span>
              <span className="text-xl font-bold tabular-nums text-primary">
                {request.total_hours 
                  ? `${request.total_hours} horas`
                  : `${request.total_days} días`}
              </span>
            </div>
          </div>

          {/* Reason */}
          <section className="rounded-xl border border-border/70 p-4">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Motivo</p>
            </div>
            <p className="text-sm leading-relaxed text-foreground sm:text-base">{request.reason}</p>
          </section>

          {/* Document Section */}
          <section className="rounded-xl border border-border/70 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Documento de soporte</p>
            {request.document_url ? (
              <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-sm">{request.document_name || 'Documento adjunto'}</span>
                <Button className="w-full sm:w-auto" variant="outline" size="sm" onClick={handleDownloadDocument}>
                  <Download className="w-4 h-4 mr-1" />
                  Descargar
                </Button>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-background transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
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
          </section>

          {/* Review Info */}
          {request.reviewed_at && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Información de Revisión</p>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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
                    <p className="p-2 bg-background rounded">{request.review_notes}</p>
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
                    <p className="p-2 bg-background rounded">{request.cancellation_reason}</p>
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
                <section className="space-y-4 rounded-xl border border-border/70 bg-slate-50/50 p-4 dark:bg-slate-900/40">
                  <div>
                    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notas de revisión (opcional)</Label>
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Agregue notas sobre la revisión..."
                      className="mt-2 min-h-[88px] resize-y bg-background"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button 
                      className="w-full"
                      variant="outline" 
                      onClick={() => setShowCancelForm(true)}
                    >
                      Cancelar Solicitud
                    </Button>
                    <Button 
                      className="w-full"
                      variant="destructive" 
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button 
                      className="w-full"
                      onClick={handleApprove}
                      disabled={approveRequest.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveRequest.isPending ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                  </div>
                </section>
              )}

              {showRejectForm && (
                <div className="space-y-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div>
                    <Label>Motivo del Rechazo *</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Indique el motivo del rechazo..."
                      className="mt-2 min-h-[88px] resize-y bg-background"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowRejectForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      className="w-full sm:w-auto"
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
                <div className="space-y-4 rounded-xl border border-border/70 bg-slate-50/50 p-4 dark:bg-slate-900/40">
                  <div>
                    <Label>Motivo de la Cancelación *</Label>
                    <Textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Indique el motivo de la cancelación..."
                      className="mt-2 min-h-[88px] resize-y bg-background"
                    />
                  </div>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowCancelForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      className="w-full sm:w-auto"
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
                    className="w-full sm:w-auto"
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
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowCancelForm(false)}>
                      Volver
                    </Button>
                    <Button 
                      className="w-full sm:w-auto"
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
