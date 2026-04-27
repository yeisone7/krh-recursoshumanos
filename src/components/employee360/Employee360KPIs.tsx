import React from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Umbrella, 
  Stethoscope, 
  FileText, 
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Employee360KPIs as KPIsType } from '@/hooks/useEmployee360';
import { cn } from '@/lib/utils';

interface Employee360KPIsProps {
  kpis: KPIsType | null;
  isLoading: boolean;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: 'default' | 'warning' | 'success' | 'info';
  delay?: number;
}

function KPICard({ icon, label, value, sublabel, variant = 'default', delay = 0 }: KPICardProps) {
  const variantStyles = {
    default: 'bg-card',
    warning: 'bg-warning-light border-warning/20',
    success: 'bg-success-light border-success/20',
    info: 'bg-primary-light border-primary/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    warning: 'text-warning',
    success: 'text-success',
    info: 'text-primary',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'card-elevated p-3 flex items-center gap-2',
        variantStyles[variant]
      )}
    >
      <div className={cn('shrink-0', iconStyles[variant])}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-display font-bold text-foreground truncate">
          {value}
        </p>
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-muted-foreground truncate">{sublabel}</p>
        )}
      </div>
    </motion.div>
  );
}

export function Employee360KPIs({ kpis, isLoading }: Employee360KPIsProps) {
  if (isLoading) {
    return (
      <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[900px] grid-cols-6 gap-3 lg:min-w-0 lg:gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card-elevated p-4">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  const lastExamFormatted = kpis.lastMedicalExam
    ? format(new Date(kpis.lastMedicalExam.date), "d MMM yyyy", { locale: es })
    : 'Sin registro';

  const nextTrainingFormatted = kpis.nextTraining
    ? format(new Date(kpis.nextTraining.date), "d MMM", { locale: es })
    : null;

  return (
    <div className="overflow-x-auto pb-1">
    <div className="grid min-w-[900px] grid-cols-6 gap-3 lg:min-w-0 lg:gap-4">
      <KPICard
        icon={<Calendar className="w-6 h-6" />}
        label="Antigüedad"
        value={kpis.seniority.formatted}
        variant="info"
        delay={0}
      />
      
      <KPICard
        icon={<Umbrella className="w-6 h-6" />}
        label="Vacaciones Pendientes"
        value={`${kpis.pendingVacationDays} días`}
        variant={kpis.pendingVacationDays > 15 ? 'warning' : 'default'}
        delay={0.05}
      />
      
      <KPICard
        icon={<Stethoscope className="w-6 h-6" />}
        label="Incapacidades (año)"
        value={kpis.incapacitiesYTD}
        variant={kpis.incapacitiesYTD > 3 ? 'warning' : 'default'}
        delay={0.1}
      />
      
      <KPICard
        icon={<FileText className="w-6 h-6" />}
        label="Último Examen Médico"
        value={lastExamFormatted}
        sublabel={kpis.lastMedicalExam?.type}
        delay={0.15}
      />
      
      <KPICard
        icon={<GraduationCap className="w-6 h-6" />}
        label="Capacitaciones"
        value={kpis.totalTrainingsCompleted}
        sublabel={kpis.nextTraining ? `Próxima: ${nextTrainingFormatted}` : undefined}
        variant="success"
        delay={0.2}
      />
      
      <KPICard
        icon={<AlertTriangle className="w-6 h-6" />}
        label="Procesos Disciplinarios"
        value={kpis.activeDisciplinaryProcesses}
        sublabel="Activos"
        variant={kpis.activeDisciplinaryProcesses > 0 ? 'warning' : 'default'}
        delay={0.25}
      />
    </div>
    </div>
  );
}
