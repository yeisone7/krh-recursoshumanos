import { motion } from 'framer-motion';
import { Briefcase, Users, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  candidates: number;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
}

const mockVacancies: Vacancy[] = [
  {
    id: '1',
    title: 'Desarrollador Full Stack',
    department: 'Tecnología',
    location: 'Bogotá',
    candidates: 12,
    status: 'in_progress',
    priority: 'high',
  },
  {
    id: '2',
    title: 'Analista Contable',
    department: 'Finanzas',
    location: 'Medellín',
    candidates: 8,
    status: 'open',
    priority: 'medium',
  },
  {
    id: '3',
    title: 'Coordinador de RRHH',
    department: 'Recursos Humanos',
    location: 'Bogotá',
    candidates: 5,
    status: 'in_progress',
    priority: 'high',
  },
];

const statusLabels = {
  open: 'Abierta',
  in_progress: 'En proceso',
  closed: 'Cerrada',
};

const statusStyles = {
  open: 'bg-success-light text-success border-success/20',
  in_progress: 'bg-info-light text-info border-info/20',
  closed: 'bg-muted text-muted-foreground border-border',
};

const priorityStyles = {
  low: 'bg-muted',
  medium: 'bg-warning-light',
  high: 'bg-destructive-light',
};

export function VacanciesOverview() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Vacantes Activas</h2>
            <p className="text-sm text-muted-foreground">{mockVacancies.length} vacantes abiertas</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary-hover">
          Ver todas
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-3">
        {mockVacancies.map((vacancy, index) => (
          <motion.div
            key={vacancy.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("w-2 h-2 rounded-full", priorityStyles[vacancy.priority])} />
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {vacancy.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">{vacancy.department}</p>
              </div>
              <Badge 
                variant="outline" 
                className={cn("font-medium", statusStyles[vacancy.status])}
              >
                {statusLabels[vacancy.status]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {vacancy.location}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {vacancy.candidates} candidatos
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}