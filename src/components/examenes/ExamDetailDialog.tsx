import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Stethoscope, 
  User, 
  Calendar, 
  FileText, 
  Building2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MedicalExam,
  examTypeLabels,
  examResultLabels,
  examResultConfig,
  examStatusConfig,
  getExamStatus,
  calculateDaysRemaining,
} from '@/types/medicalExam';

interface ExamDetailDialogProps {
  exam: MedicalExam | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resultIcons = {
  apto: CheckCircle,
  apto_restricciones: AlertTriangle,
  no_apto: XCircle,
  pendiente: Clock,
};

export function ExamDetailDialog({ exam, open, onOpenChange }: ExamDetailDialogProps) {
  if (!exam) return null;

  const status = getExamStatus(exam);
  const statusStyle = examStatusConfig[status];
  const resultStyle = examResultConfig[exam.result];
  const ResultIcon = resultIcons[exam.result];
  const daysRemaining = calculateDaysRemaining(exam.expirationDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Stethoscope className="w-5 h-5 text-primary" />
            Detalle del Examen Médico
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Result Summary */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {examTypeLabels[exam.examType]}
            </Badge>
            <Badge className={cn('text-sm px-3 py-1', statusStyle.bg, statusStyle.text)}>
              {statusStyle.label}
              {daysRemaining !== null && daysRemaining > 0 && ` (${daysRemaining} días)`}
            </Badge>
            <Badge className={cn('text-sm px-3 py-1 flex items-center gap-1', resultStyle.bg, resultStyle.text)}>
              <ResultIcon className="w-3 h-3" />
              {examResultLabels[exam.result]}
            </Badge>
          </div>

          {/* Employee Info */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{exam.employeeName}</h3>
                <p className="text-sm text-muted-foreground">Doc: {exam.employeeDocument}</p>
              </div>
            </div>
          </div>

          {/* Dates Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Fecha del Examen</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {format(new Date(exam.examDate), 'PPP', { locale: es })}
              </p>
            </div>

            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Fecha de Vencimiento</span>
              </div>
              {exam.expirationDate ? (
                <>
                  <p className={cn('text-lg font-semibold', statusStyle.text)}>
                    {format(new Date(exam.expirationDate), 'PPP', { locale: es })}
                  </p>
                  {daysRemaining !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysRemaining > 0 
                        ? `Faltan ${daysRemaining} días`
                        : daysRemaining === 0
                          ? 'Vence hoy'
                          : `Vencido hace ${Math.abs(daysRemaining)} días`
                      }
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No aplica</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Medical Concept */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Concepto Médico</h4>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-foreground">{exam.concept}</p>
            </div>
          </div>

          {/* Restrictions */}
          {exam.restrictions && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h4 className="font-semibold text-foreground">Restricciones</h4>
              </div>
              <div className="p-4 bg-warning-light rounded-lg border border-warning/20">
                <p className="text-foreground">{exam.restrictions}</p>
              </div>
            </div>
          )}

          {/* Observations */}
          {exam.observations && (
            <div>
              <h4 className="font-semibold text-foreground mb-2">Observaciones</h4>
              <p className="text-muted-foreground">{exam.observations}</p>
            </div>
          )}

          <Separator />

          {/* Provider Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary" />
              <h4 className="font-semibold text-foreground">Información del Proveedor</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">IPS / Proveedor</p>
                <p className="font-medium text-foreground">{exam.provider}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Médico Evaluador</p>
                <p className="font-medium text-foreground">{exam.doctorName}</p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>Registrado: {format(new Date(exam.createdAt), 'PPpp', { locale: es })}</p>
            <p>Última actualización: {format(new Date(exam.updatedAt), 'PPpp', { locale: es })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
