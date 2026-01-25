import { motion } from 'framer-motion';
import { Scale, AlertTriangle, Calendar, FileText, User, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360DisciplinaryProps {
  disciplinary: any[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  apertura: { label: 'Apertura', color: 'bg-warning-light text-warning' },
  notificacion: { label: 'Notificación', color: 'bg-primary-light text-primary' },
  descargos: { label: 'Descargos', color: 'bg-primary-light text-primary' },
  audiencia: { label: 'Audiencia', color: 'bg-warning-light text-warning' },
  decision: { label: 'Decisión', color: 'bg-destructive/10 text-destructive' },
  sancion: { label: 'Sanción', color: 'bg-destructive/10 text-destructive' },
  apelacion: { label: 'Apelación', color: 'bg-warning-light text-warning' },
  cerrado: { label: 'Cerrado', color: 'bg-muted text-muted-foreground' },
  archivado: { label: 'Archivado', color: 'bg-muted text-muted-foreground' },
};

const faultTypeLabels: Record<string, string> = {
  leve: 'Falta Leve',
  grave: 'Falta Grave',
  muy_grave: 'Falta Muy Grave',
};

const sanctionTypeLabels: Record<string, string> = {
  amonestacion_verbal: 'Amonestación Verbal',
  amonestacion_escrita: 'Amonestación Escrita',
  suspension: 'Suspensión',
  terminacion: 'Terminación de Contrato',
  ninguna: 'Sin Sanción',
};

export function Tab360Disciplinary({ disciplinary, isLoading }: Tab360DisciplinaryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (disciplinary.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin procesos disciplinarios</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene procesos disciplinarios registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeProcesses = disciplinary.filter(p => !['cerrado', 'archivado'].includes(p.status));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Alert for active processes */}
      {activeProcesses.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="font-medium">
                {activeProcesses.length} proceso{activeProcesses.length > 1 ? 's' : ''} disciplinario{activeProcesses.length > 1 ? 's' : ''} activo{activeProcesses.length > 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processes List */}
      <div className="space-y-4">
        {disciplinary.map((process, index) => {
          const status = statusConfig[process.status] || statusConfig.apertura;
          const isActive = !['cerrado', 'archivado'].includes(process.status);

          return (
            <motion.div
              key={process.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={cn(isActive && 'border-warning/30')}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base">
                          Caso #{process.case_number}
                        </CardTitle>
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          process.fault_type === 'leve' ? 'secondary' :
                          process.fault_type === 'grave' ? 'outline' : 'destructive'
                        } className={cn(
                          process.fault_type === 'grave' && 'border-warning text-warning bg-warning-light'
                        )}>
                          {faultTypeLabels[process.fault_type] || process.fault_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <p>Apertura:</p>
                      <p className="font-medium">
                        {format(new Date(process.opening_date), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm">{process.facts_description}</p>

                  {/* Timeline events */}
                  {process.disciplinary_timeline && process.disciplinary_timeline.length > 0 && (
                    <div className="pt-4 border-t">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Cronología
                      </h4>
                      <div className="space-y-2">
                        {process.disciplinary_timeline.slice(0, 5).map((event: any) => (
                          <div key={event.id} className="text-sm flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0">
                              {format(new Date(event.action_date), "d MMM", { locale: es })}
                            </span>
                            <span>{event.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sanction info */}
                  {process.sanction_type && process.sanction_type !== 'ninguna' && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="font-medium">
                          {sanctionTypeLabels[process.sanction_type] || process.sanction_type}
                        </span>
                        {process.sanction_days && (
                          <Badge variant="outline">{process.sanction_days} días</Badge>
                        )}
                      </div>
                      {process.sanction_start_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(process.sanction_start_date), "d MMM", { locale: es })}
                          {process.sanction_end_date && (
                            <> - {format(new Date(process.sanction_end_date), "d MMM yyyy", { locale: es })}</>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
