import { motion } from 'framer-motion';
import { UserPlus, FileText, Clock, CheckCircle, XCircle, Edit, Trash2, Shield, Building2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityConfig {
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
}

const activityConfig: Record<string, ActivityConfig> = {
  create: {
    icon: UserPlus,
    color: 'text-success',
    bg: 'bg-success-light',
    label: 'Creación',
  },
  update: {
    icon: Edit,
    color: 'text-info',
    bg: 'bg-info-light',
    label: 'Actualización',
  },
  delete: {
    icon: Trash2,
    color: 'text-destructive',
    bg: 'bg-destructive-light',
    label: 'Eliminación',
  },
  login: {
    icon: Shield,
    color: 'text-primary',
    bg: 'bg-primary-light',
    label: 'Inicio de sesión',
  },
  logout: {
    icon: Shield,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    label: 'Cierre de sesión',
  },
  assign_role: {
    icon: Shield,
    color: 'text-accent',
    bg: 'bg-accent-light',
    label: 'Asignación de rol',
  },
  remove_role: {
    icon: Shield,
    color: 'text-warning',
    bg: 'bg-warning-light',
    label: 'Remoción de rol',
  },
  assign_center: {
    icon: Building2,
    color: 'text-info',
    bg: 'bg-info-light',
    label: 'Asignación a centro',
  },
  terminate_contract: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive-light',
    label: 'Terminación de contrato',
  },
  extend_contract: {
    icon: Clock,
    color: 'text-info',
    bg: 'bg-info-light',
    label: 'Prórroga de contrato',
  },
  deliver_dotation: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success-light',
    label: 'Entrega de dotación',
  },
  reactivate: {
    icon: UserPlus,
    color: 'text-success',
    bg: 'bg-success-light',
    label: 'Reactivación',
  },
  deactivate: {
    icon: XCircle,
    color: 'text-warning',
    bg: 'bg-warning-light',
    label: 'Desactivación',
  },
};

const entityLabels: Record<string, string> = {
  employee: 'Empleado',
  employee_v2: 'Empleado',
  contract: 'Contrato',
  dotation: 'Dotación',
  medical_exam: 'Examen Médico',
  operation_center: 'Centro de Operación',
  user: 'Usuario',
  company: 'Empresa',
  role: 'Rol',
  vacancy: 'Vacante',
  candidate: 'Candidato',
  incapacity: 'Incapacidad',
  leave: 'Permiso',
  vacation: 'Vacación',
};

const defaultConfig: ActivityConfig = {
  icon: Activity,
  color: 'text-muted-foreground',
  bg: 'bg-muted',
  label: 'Actividad',
};

export function RecentActivity() {
  const { data: logs, isLoading } = useAuditLogs({ limit: 10 });

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activities = logs || [];

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-lg text-foreground">Actividad Reciente</h2>
        <span className="text-sm text-muted-foreground">Últimas 24 horas</span>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay actividad reciente</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.action] || defaultConfig;
              const Icon = config.icon;
              const entityType = entityLabels[activity.entity_type] || activity.entity_type;
              
              // Generate description
              let description = activity.entity_name || entityType;
              if (activity.new_values) {
                const values = activity.new_values as Record<string, any>;
                if (values.firstName && values.lastName) {
                  description = `${values.firstName} ${values.lastName}`;
                } else if (values.position) {
                  description += ` - ${values.position}`;
                }
              }

              // Format timestamp
              const timestamp = formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: true,
                locale: es,
              });

              // Get user email display name
              const userName = activity.user_email?.split('@')[0] || 'Sistema';

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="flex gap-4 relative"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center z-10 ring-4 ring-card",
                    config.bg
                  )}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium text-foreground text-sm">
                      {config.label} de {entityType}
                    </p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground capitalize">{timestamp}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{userName}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
