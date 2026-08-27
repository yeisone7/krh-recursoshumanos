import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, Clock3, FilePenLine, UserCheck, UsersRound, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LeaveRequest } from '@/types/leave';

type StepStatus = 'completed' | 'current' | 'pending' | 'rejected';

interface Step {
  title: string;
  subtitle: string;
  status: StepStatus;
  date?: string | null;
  approver?: string | null;
  observations?: string | null;
  icon: typeof FilePenLine;
}

function statusLabel(status: StepStatus) {
  if (status === 'completed') return 'Completado';
  if (status === 'current') return 'En revisión';
  if (status === 'rejected') return 'Rechazado';
  return 'Pendiente';
}

function StepMarker({ status }: { status: StepStatus }) {
  const Icon = status === 'completed' ? Check : status === 'rejected' ? X : Clock3;
  return (
    <span className={cn(
      'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-4 border-background',
      status === 'completed' && 'bg-emerald-500 text-white',
      status === 'current' && 'bg-primary text-primary-foreground shadow-md shadow-primary/25',
      status === 'rejected' && 'bg-destructive text-destructive-foreground',
      status === 'pending' && 'bg-muted text-muted-foreground',
    )}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function LeaveApprovalTimeline({ request }: { request: LeaveRequest }) {
  const managerStatus: StepStatus = request.manager_approved === false
    ? 'rejected'
    : request.manager_approved === true
      ? 'completed'
      : request.approval_stage === 'pending_manager' ? 'current' : 'pending';
  const leaderStatus: StepStatus = request.area_leader_approved === false
    ? 'rejected'
    : request.area_leader_approved === true
      ? 'completed'
      : request.approval_stage === 'pending_area_leader' ? 'current' : 'pending';

  const steps: Step[] = [
    {
      title: 'Empleado',
      subtitle: 'Solicitud de permiso radicada',
      status: 'completed',
      date: request.requested_at || request.created_at,
      approver: request.employees_v2
        ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
        : null,
      icon: FilePenLine,
    },
    {
      title: 'Jefe inmediato',
      subtitle: 'Revisión de fechas, motivo y soporte',
      status: managerStatus,
      date: request.manager_approved_at,
      approver: request.manager_approver_name,
      observations: request.manager_observations,
      icon: UserCheck,
    },
    {
      title: 'Líder de área',
      subtitle: 'Validación final del permiso y del saldo',
      status: leaderStatus,
      date: request.area_leader_approved_at,
      approver: request.area_leader_approver_name,
      observations: request.area_leader_observations,
      icon: UsersRound,
    },
  ];

  return (
    <div className="relative space-y-5">
      <div className="absolute bottom-5 left-[17px] top-5 w-px bg-border" />
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="relative flex gap-4">
            <StepMarker status={step.status} />
            <div className={cn(
              'min-w-0 flex-1 rounded-2xl border p-4',
              step.status === 'current' && 'border-primary/40 bg-primary/5',
              step.status === 'completed' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
              step.status === 'rejected' && 'border-destructive/30 bg-destructive/5',
            )}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.subtitle}</p>
                  </div>
                </div>
                <Badge variant="outline" className={cn(
                  'rounded-full',
                  step.status === 'completed' && 'border-emerald-200 bg-emerald-100 text-emerald-800',
                  step.status === 'current' && 'border-primary/25 bg-primary/10 text-primary',
                  step.status === 'rejected' && 'border-destructive/20 bg-destructive/10 text-destructive',
                )}>
                  {statusLabel(step.status)}
                </Badge>
              </div>
              {(step.approver || step.date) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {step.approver && <span>{step.approver}</span>}
                  {step.date && <span>{format(new Date(step.date), 'dd MMM yyyy, h:mm a', { locale: es })}</span>}
                </div>
              )}
              {step.observations && (
                <p className="mt-2 rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                  {step.observations}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
