import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  FileText, 
  Award, 
  Clock, 
  HeartPulse,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

const quickActions = [
  {
    label: 'Nuevo Empleado',
    description: 'Registrar empleado',
    icon: UserPlus,
    path: '/empleados',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    isPrimary: true,
  },
  {
    label: 'Nuevo Contrato',
    description: 'Crear contrato',
    icon: FileText,
    path: '/contratos',
    iconBg: 'bg-secondary/10',
    iconColor: 'text-secondary',
  },
  {
    label: 'Incapacidades',
    description: 'Registrar incapacidad',
    icon: HeartPulse,
    path: '/incapacidades',
    iconBg: 'bg-rose/10',
    iconColor: 'text-rose',
  },
  {
    label: 'Horas Extra',
    description: 'Registrar horas',
    icon: Clock,
    path: '/horas-extra',
    iconBg: 'bg-tertiary/10',
    iconColor: 'text-tertiary',
  },
  {
    label: 'Capacitaciones',
    description: 'Ver programadas',
    icon: Award,
    path: '/capacitaciones',
    iconBg: 'bg-violet/10',
    iconColor: 'text-violet',
  },
  {
    label: 'Dotación',
    description: 'Entregar dotación',
    icon: Package,
    path: '/dotacion',
    iconBg: 'bg-teal/10',
    iconColor: 'text-teal',
  },
];

export function QuickActionsPanel() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-elevated p-6"
    >
      <h3 className="font-display font-semibold text-lg text-foreground mb-4">
        Acciones Rápidas
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            onClick={() => navigate(action.path)}
            className={cn(
              "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 group",
              action.isPrimary 
                ? 'bg-primary border-primary hover:bg-primary-hover' 
                : 'border-border bg-card hover:bg-background hover:border-primary/30'
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform",
              action.isPrimary ? 'bg-primary-foreground' : action.iconBg
            )}>
              <action.icon className={cn(
                "w-5 h-5",
                action.isPrimary ? 'text-primary' : action.iconColor
              )} />
            </div>
            <div className="text-center">
              <p className={cn(
                "text-sm font-medium",
                action.isPrimary ? 'text-primary-foreground' : 'text-foreground'
              )}>
                {action.label}
              </p>
              <p className={cn(
                "text-xs",
                action.isPrimary ? 'text-primary-foreground/80' : 'text-muted-foreground'
              )}>
                {action.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}