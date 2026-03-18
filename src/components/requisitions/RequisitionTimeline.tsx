import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText,
  Settings,
  Users,
  Scale,
  Crown,
  UserSearch,
  Check,
  X,
  Clock,
  Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PersonnelRequisition } from '@/hooks/useRequisitions';

interface RequisitionTimelineProps {
  requisition: PersonnelRequisition;
  vacancies?: { id: string; position_title: string; status: string; candidates?: { id: string; status: string }[] }[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Settings,
  Users,
  Scale,
  Crown,
  UserSearch,
  Briefcase,
};

interface TimelineStepData {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'approved' | 'rejected' | 'current';
  date: string | null;
  approver: string | null;
  observations: string | null;
  extraData?: Record<string, any>;
}

function getTimelineSteps(requisition: PersonnelRequisition, autoriza: string | null): TimelineStepData[] {
  const estado = requisition.estado_requisicion;

  const steps: TimelineStepData[] = [
    {
      key: 'solicitud',
      title: 'Solicitud / Requisición',
      icon: FileText,
      status: estado === 'borrador' ? 'current' : 'approved',
      date: requisition.fecha_requisicion,
      approver: requisition.solicitante_nombre,
      observations: requisition.observaciones_motivo_solicitud,
      extraData: {
        cargo: requisition.cargo_solicitado,
        cantidad: requisition.cantidad_vacantes_requeridas,
        motivo: requisition.motivo_solicitud,
      },
    },
    {
      key: 'operaciones',
      title: 'Operaciones',
      icon: Settings,
      status: requisition.operaciones_aprobado === true
        ? 'approved'
        : requisition.operaciones_aprobado === false
          ? 'rejected'
          : estado === 'en_operaciones'
            ? 'current'
            : 'pending',
      date: requisition.operaciones_fecha_aprobacion,
      approver: requisition.operaciones_quien_aprobo,
      observations: requisition.operaciones_observaciones,
      extraData: {
        salario_aprobado: requisition.operaciones_aprobado_salario,
      },
    },
    {
      key: 'rrhh',
      title: 'Recursos Humanos',
      icon: Users,
      status: requisition.rrhh_aprobado === true
        ? 'approved'
        : requisition.rrhh_aprobado === false
          ? 'rejected'
          : estado === 'en_rrhh'
            ? 'current'
            : 'pending',
      date: requisition.rrhh_fecha_aprobacion,
      approver: requisition.rrhh_quien_aprobo,
      observations: requisition.rrhh_observaciones,
      extraData: {
        asignacion_salarial: requisition.rrhh_asignacion_salarial,
        tipo_convocatoria: requisition.rrhh_tipo_convocatoria,
        condiciones: requisition.rrhh_condiciones_adicionales,
      },
    },
    {
      key: 'juridico',
      title: 'Jurídico',
      icon: Scale,
      status: requisition.juridico_aprobado === true
        ? 'approved'
        : requisition.juridico_aprobado === false
          ? 'rejected'
          : estado === 'en_juridico'
            ? 'current'
            : 'pending',
      date: requisition.juridico_fecha_aprobacion,
      approver: requisition.juridico_quien_aprobo,
      observations: requisition.juridico_observaciones,
      extraData: {
        tipo_contrato: requisition.juridico_tipo_contrato,
        duracion: requisition.juridico_duracion,
      },
    },
    {
      key: 'gerencia',
      title: 'Gerencia',
      icon: Crown,
      status: requisition.gerencia_aprobado === true
        ? 'approved'
        : requisition.gerencia_aprobado === false
          ? 'rejected'
          : estado === 'en_gerencia'
            ? 'current'
            : 'pending',
      date: requisition.gerencia_fecha_aprobacion,
      approver: requisition.gerencia_quien_aprobo,
      observations: requisition.gerencia_observaciones,
      extraData: {
        salario_aprobado: requisition.gerencia_aprobado_salario,
      },
    },
    {
      key: 'seleccion',
      title: 'Selección',
      icon: UserSearch,
      status: requisition.seleccion_aprobado === true
        ? 'approved'
        : requisition.seleccion_aprobado === false
          ? 'rejected'
          : estado === 'en_seleccion'
            ? 'current'
            : 'pending',
      date: requisition.seleccion_fecha_aprobacion,
      approver: requisition.seleccion_quien_aprobo,
      observations: requisition.seleccion_observaciones,
      extraData: {
        fecha_inicio: requisition.seleccion_fecha_inicio_proceso,
      },
    },
  ];

  // Filter steps based on autoriza
  return steps.filter(step => {
    if (step.key === 'gerencia' && autoriza === 'gerencia_operaciones') return false;
    if (step.key === 'operaciones' && autoriza === 'gerencia_administrativa') return false;
    return true;
  });
}

function StatusIcon({ status }: { status: TimelineStepData['status'] }) {
  switch (status) {
    case 'approved':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
          <Check className="h-4 w-4" />
        </div>
      );
    case 'rejected':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <X className="h-4 w-4" />
        </div>
      );
    case 'current':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground animate-pulse">
          <Clock className="h-4 w-4" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Clock className="h-4 w-4" />
        </div>
      );
  }
}

export function RequisitionTimeline({ requisition, vacancies = [] }: RequisitionTimelineProps) {
  const steps = getTimelineSteps(requisition, requisition.autoriza);

  return (
    <div className="space-y-6">
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border" />

        <div className="space-y-8">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div key={step.key} className="relative flex gap-4">
                {/* Status indicator */}
                <div className="relative z-10 flex-shrink-0">
                  <StatusIcon status={step.status} />
                </div>

                {/* Content */}
                <Card className={cn(
                  'flex-1',
                  step.status === 'current' && 'border-primary shadow-md',
                  step.status === 'approved' && 'border-success/30',
                  step.status === 'rejected' && 'border-destructive/30'
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">{step.title}</CardTitle>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          step.status === 'approved' && 'bg-success/10 text-success border-success/20',
                          step.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/20',
                          step.status === 'current' && 'bg-primary/10 text-primary border-primary/20',
                          step.status === 'pending' && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {step.status === 'approved' && 'Aprobado'}
                        {step.status === 'rejected' && 'Rechazado'}
                        {step.status === 'current' && 'En proceso'}
                        {step.status === 'pending' && 'Pendiente'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {step.date && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Fecha:</strong> {format(new Date(step.date), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    )}
                    {step.approver && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Responsable:</strong> {step.approver}
                      </p>
                    )}
                    {step.observations && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Observaciones:</strong> {step.observations}
                      </p>
                    )}

                    {/* Extra data per step */}
                    {step.key === 'solicitud' && step.extraData && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <p className="text-sm"><strong>Cargo:</strong> {step.extraData.cargo}</p>
                        <p className="text-sm"><strong>Cantidad:</strong> {step.extraData.cantidad}</p>
                      </div>
                    )}

                    {step.key === 'rrhh' && step.extraData?.asignacion_salarial && (
                      <div className="pt-2 border-t">
                        <p className="text-sm">
                          <strong>Asignación salarial:</strong> ${step.extraData.asignacion_salarial?.toLocaleString()}
                        </p>
                        {step.extraData.tipo_convocatoria && (
                          <p className="text-sm">
                            <strong>Tipo convocatoria:</strong> {step.extraData.tipo_convocatoria}
                          </p>
                        )}
                      </div>
                    )}

                    {step.key === 'juridico' && step.extraData?.tipo_contrato && (
                      <div className="pt-2 border-t">
                        <p className="text-sm">
                          <strong>Tipo contrato:</strong> {step.extraData.tipo_contrato}
                        </p>
                        {step.extraData.duracion && (
                          <p className="text-sm">
                            <strong>Duración:</strong> {step.extraData.duracion}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {/* Vacancies section */}
          {vacancies.length > 0 && (
            <div className="relative flex gap-4">
              <div className="relative z-10 flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Briefcase className="h-4 w-4" />
                </div>
              </div>

              <Card className="flex-1 border-primary/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Vacantes Creadas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {vacancies.map((vacancy) => (
                      <div
                        key={vacancy.id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <span className="font-medium">{vacancy.position_title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {vacancy.candidates?.length || 0} candidatos
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              vacancy.status === 'open' && 'bg-success/10 text-success',
                              vacancy.status === 'closed' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {vacancy.status === 'open' ? 'Abierta' : vacancy.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
