import { motion } from 'framer-motion';
import { Briefcase, Users, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useVacancies } from '@/hooks/useVacancies';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierta',
  in_process: 'En proceso',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
};

const statusStyles: Record<string, string> = {
  draft: 'bg-background text-muted-foreground border-border',
  open: 'bg-success-light text-success border-success/20',
  in_process: 'bg-info-light text-info border-info/20',
  closed: 'bg-background text-muted-foreground border-border',
  cancelled: 'bg-destructive-light text-destructive border-destructive/20',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-background ',
  medium: 'bg-warning-light',
  high: 'bg-destructive-light',
  urgent: 'bg-destructive',
};

export function VacanciesOverview() {
  const navigate = useNavigate();
  const { data: vacancies, isLoading } = useVacancies();

  // Filter active vacancies (open or in_process)
  const activeVacancies = vacancies?.filter(v => v.status === 'open' || v.status === 'in_process') || [];
  const displayVacancies = activeVacancies.slice(0, 5);

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Vacantes Activas</h2>
            <p className="text-sm text-muted-foreground">{activeVacancies.length} vacantes abiertas</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary-hover"
          onClick={() => navigate('/seleccion')}
        >
          Ver todas
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {displayVacancies.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay vacantes activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayVacancies.map((vacancy, index) => {
            const candidatesCount = (vacancy.candidates as any[])?.length || 0;
            const priority = vacancy.priority || 'medium';
            const status = vacancy.status || 'open';
            const location = (vacancy.operation_centers as any)?.name || 'Sin ubicación';
            
            return (
              <motion.div
                key={vacancy.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => navigate(`/seleccion?vacancy=${vacancy.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("w-2 h-2 rounded-full", priorityStyles[priority])} />
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {vacancy.position_title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{vacancy.department_area || 'Sin área'}</p>
                  </div>
                  <Badge
                    variant="outline" 
                    className={cn("font-medium", statusStyles[status])}
                  >
                    {statusLabels[status] || status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {candidatesCount} candidatos
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
