import { motion } from 'framer-motion';
import { UserX, ChevronRight, Clock, FileCheck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useActiveTerminations } from '@/hooks/useActiveTerminations';
import { terminationTypeLabels, terminationDocumentLabels, TerminationDocumentType } from '@/types/termination';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ActiveTerminationsPanel() {
  const { data: terminations, isLoading } = useActiveTerminations();
  const navigate = useNavigate();

  const getUrgencyLevel = (daysUntilEffective: number) => {
    if (daysUntilEffective <= 3) return 'critical';
    if (daysUntilEffective <= 7) return 'warning';
    return 'normal';
  };

  const urgencyStyles = {
    critical: {
      bg: 'bg-destructive-light',
      border: 'border-destructive/20',
      badge: 'bg-destructive/10 text-destructive',
      progress: 'bg-destructive',
    },
    warning: {
      bg: 'bg-warning-light',
      border: 'border-warning/20',
      badge: 'bg-warning/10 text-warning-foreground',
      progress: 'bg-warning',
    },
    normal: {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      progress: 'bg-orange-500',
    },
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = terminations?.length || 0;

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <UserX className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">Retiros en Proceso</h2>
            <p className="text-sm text-muted-foreground">
              {activeCount} {activeCount === 1 ? 'proceso activo' : 'procesos activos'}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary-hover"
          onClick={() => navigate('/empleados?status=en_retiro')}
        >
          Ver todos
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {activeCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center mb-3">
            <FileCheck className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">No hay procesos de retiro activos</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {terminations?.slice(0, 5).map((termination, index) => {
            const urgency = getUrgencyLevel(termination.daysUntilEffective);
            const styles = urgencyStyles[urgency];

            return (
              <motion.div
                key={termination.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md",
                  styles.bg,
                  styles.border
                )}
                onClick={() => navigate(`/empleados?detail=${termination.employeeId}`)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{termination.employeeName}</p>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap", styles.badge)}>
                        {terminationTypeLabels[termination.terminationType]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{termination.employeePosition}</p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                          urgency === 'critical' ? 'bg-destructive/10 text-destructive' :
                          urgency === 'warning' ? 'bg-warning/10 text-warning-foreground' :
                          'bg-background text-muted-foreground'
                        )}>
                          <Clock className="w-3 h-3" />
                          {termination.daysUntilEffective <= 0 
                            ? 'Vencido' 
                            : `${termination.daysUntilEffective}d`
                          }
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Fecha efectiva: {termination.effectiveDate.toLocaleDateString('es-CO')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">
                      Progreso documentos
                    </span>
                    <span className="font-medium text-foreground">
                      {termination.completedDocuments}/{termination.totalDocuments}
                    </span>
                  </div>
                  <Progress 
                    value={termination.progress} 
                    className="h-2"
                  />
                </div>

                {/* Pending Documents */}
                {termination.pendingDocuments.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
                    <p className="text-muted-foreground truncate">
                      Pendientes: {termination.pendingDocuments.slice(0, 2).map(doc => 
                        terminationDocumentLabels[doc as TerminationDocumentType]
                      ).join(', ')}
                      {termination.pendingDocuments.length > 2 && ` +${termination.pendingDocuments.length - 2} más`}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
          
          {terminations && terminations.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/empleados?status=en_retiro')}
            >
              Ver {terminations.length - 5} más
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
