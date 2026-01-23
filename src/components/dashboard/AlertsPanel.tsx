import { motion } from 'framer-motion';
import { AlertTriangle, Clock, FileText, Stethoscope, Package, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Alert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  daysRemaining: number;
  entityName: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'contract',
    level: 'critical',
    title: 'Contrato por vencer',
    description: 'Contrato a término fijo vence en 3 días',
    daysRemaining: 3,
    entityName: 'María García',
  },
  {
    id: '2',
    type: 'medical',
    level: 'warning',
    title: 'Examen médico pendiente',
    description: 'Examen periódico vence en 15 días',
    daysRemaining: 15,
    entityName: 'Carlos Rodríguez',
  },
  {
    id: '3',
    type: 'extension',
    level: 'critical',
    title: 'Prórroga por vencer',
    description: 'Prórroga #2 vence en 5 días',
    daysRemaining: 5,
    entityName: 'Ana Martínez',
  },
  {
    id: '4',
    type: 'dotation',
    level: 'info',
    title: 'Dotación por entregar',
    description: 'Entrega programada en 30 días',
    daysRemaining: 30,
    entityName: 'Pedro López',
  },
];

const typeIcons = {
  contract: FileText,
  extension: Clock,
  medical: Stethoscope,
  dotation: Package,
};

const levelStyles = {
  info: {
    bg: 'bg-info-light',
    border: 'border-info/20',
    icon: 'text-info',
    badge: 'bg-info/10 text-info',
  },
  warning: {
    bg: 'bg-warning-light',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning-foreground',
  },
  critical: {
    bg: 'bg-destructive-light',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
};

export function AlertsPanel() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Alertas Activas</h2>
            <p className="text-sm text-muted-foreground">{mockAlerts.length} alertas pendientes</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
          Ver todas
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {mockAlerts.map((alert, index) => {
          const Icon = typeIcons[alert.type];
          const styles = levelStyles[alert.level];

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                styles.bg,
                styles.border
              )}
            >
              <div className={cn("w-10 h-10 rounded-lg bg-card flex items-center justify-center", styles.icon)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-foreground">{alert.title}</p>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", styles.badge)}>
                    {alert.daysRemaining} días
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{alert.entityName} • {alert.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}