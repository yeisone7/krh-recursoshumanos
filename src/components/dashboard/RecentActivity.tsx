import { motion } from 'framer-motion';
import { UserPlus, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'employee_created' | 'contract_signed' | 'extension_added' | 'process_completed' | 'process_rejected';
  title: string;
  description: string;
  timestamp: string;
  user: string;
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'employee_created',
    title: 'Nuevo empleado registrado',
    description: 'Laura Sánchez - Analista de Sistemas',
    timestamp: 'Hace 15 min',
    user: 'Juan Díaz',
  },
  {
    id: '2',
    type: 'contract_signed',
    title: 'Contrato firmado',
    description: 'Contrato indefinido - Pedro Ramírez',
    timestamp: 'Hace 1 hora',
    user: 'María Torres',
  },
  {
    id: '3',
    type: 'extension_added',
    title: 'Prórroga registrada',
    description: 'Prórroga #3 - Ana Martínez',
    timestamp: 'Hace 2 horas',
    user: 'Juan Díaz',
  },
  {
    id: '4',
    type: 'process_completed',
    title: 'Proceso de selección completado',
    description: 'Vacante: Desarrollador Senior',
    timestamp: 'Hace 3 horas',
    user: 'Psicóloga Sandra',
  },
  {
    id: '5',
    type: 'process_rejected',
    title: 'Candidato no seleccionado',
    description: 'Carlos Mendoza - No pasó validación',
    timestamp: 'Hace 5 horas',
    user: 'Psicóloga Sandra',
  },
];

const typeConfig = {
  employee_created: {
    icon: UserPlus,
    color: 'text-success',
    bg: 'bg-success-light',
  },
  contract_signed: {
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary-light',
  },
  extension_added: {
    icon: Clock,
    color: 'text-info',
    bg: 'bg-info-light',
  },
  process_completed: {
    icon: CheckCircle,
    color: 'text-accent',
    bg: 'bg-accent-light',
  },
  process_rejected: {
    icon: XCircle,
    color: 'text-destructive',
    bg: 'bg-destructive-light',
  },
};

export function RecentActivity() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-semibold text-lg text-foreground">Actividad Reciente</h2>
        <span className="text-sm text-muted-foreground">Últimas 24 horas</span>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

        <div className="space-y-4">
          {mockActivities.map((activity, index) => {
            const config = typeConfig[activity.type];
            const Icon = config.icon;

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
                  <p className="font-medium text-foreground text-sm">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{activity.user}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}