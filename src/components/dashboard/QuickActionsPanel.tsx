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

const quickActions = [
  {
    label: 'Nuevo Empleado',
    description: 'Registrar empleado',
    icon: UserPlus,
    path: '/empleados',
    color: 'bg-[#2b8e66] text-white',
  },
  {
    label: 'Nuevo Contrato',
    description: 'Crear contrato',
    icon: FileText,
    path: '/contratos',
    color: 'bg-info/10 text-info',
  },
  {
    label: 'Incapacidades',
    description: 'Registrar incapacidad',
    icon: HeartPulse,
    path: '/incapacidades',
    color: 'bg-warning/10 text-warning',
  },
  {
    label: 'Horas Extra',
    description: 'Registrar horas',
    icon: Clock,
    path: '/horas-extra',
    color: 'bg-accent/10 text-accent',
  },
  {
    label: 'Capacitaciones',
    description: 'Ver programadas',
    icon: Award,
    path: '/capacitaciones',
    color: 'bg-primary/10 text-primary',
  },
  {
    label: 'Dotación',
    description: 'Entregar dotación',
    icon: Package,
    path: '/dotacion',
    color: 'bg-info/10 text-info',
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
        {quickActions.map((action, index) => {
          const isNuevoEmpleado = action.label === 'Nuevo Empleado';
          
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => navigate(action.path)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 group ${
                isNuevoEmpleado 
                  ? 'bg-primary border-primary hover:bg-primary-hover' 
                  : 'border-border bg-card hover:bg-muted/50 hover:border-primary/30'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                isNuevoEmpleado 
                  ? 'bg-white' 
                  : action.color
              }`}>
                <action.icon className={`w-5 h-5 ${isNuevoEmpleado ? 'text-primary' : ''}`} />
              </div>
              <div className="text-center">
                <p className={`text-sm font-medium ${isNuevoEmpleado ? 'text-primary-foreground' : 'text-foreground'}`}>{action.label}</p>
                <p className={`text-xs ${isNuevoEmpleado ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{action.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
