import { motion } from 'framer-motion';
import { FileText, Calendar, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360ContractsProps {
  contracts: any[];
  isLoading: boolean;
}

const contractTypeLabels: Record<string, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término Fijo',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
  servicios: 'Prestación de Servicios',
  temporal: 'Temporal',
};

export function Tab360Contracts({ contracts, isLoading }: Tab360ContractsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin contratos registrados</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene contratos en el sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {contracts.map((contract, index) => {
        const isActive = !contract.is_terminated && (!contract.end_date || new Date(contract.end_date) >= new Date());
        const daysToExpire = contract.end_date 
          ? differenceInDays(new Date(contract.end_date), new Date())
          : null;
        const isExpiringSoon = daysToExpire !== null && daysToExpire > 0 && daysToExpire <= 30;

        return (
          <motion.div
            key={contract.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={cn(
              index === 0 && isActive && 'border-primary/50 bg-primary/5'
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isActive ? 'bg-success-light' : 'bg-muted'
                    )}>
                      <FileText className={cn(
                        'w-5 h-5',
                        isActive ? 'text-success' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {contractTypeLabels[contract.contract_type] || contract.contract_type}
                        {index === 0 && isActive && (
                          <Badge variant="default" className="bg-success text-success-foreground">
                            Vigente
                          </Badge>
                        )}
                        {contract.is_terminated && (
                          <Badge variant="secondary">Terminado</Badge>
                        )}
                        {isExpiringSoon && (
                          <Badge variant="outline" className="bg-warning-light text-warning border-warning/20">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Próximo a vencer
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {contract.contract_number || 'Sin número de contrato'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Inicio
                    </p>
                    <p className="font-medium">
                      {format(new Date(contract.start_date), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Fin
                    </p>
                    <p className="font-medium">
                      {contract.end_date 
                        ? format(new Date(contract.end_date), "d MMM yyyy", { locale: es })
                        : 'Indefinido'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Salario
                    </p>
                    <p className="font-medium">{formatCurrency(contract.salary)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Período de Prueba
                    </p>
                    <p className="font-medium">
                      {contract.trial_period_days ? `${contract.trial_period_days} días` : 'Sin período'}
                    </p>
                  </div>
                </div>

                {/* Extensions */}
                {contract.contract_extensions && contract.contract_extensions.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Prórrogas ({contract.contract_extensions.length})
                    </h4>
                    <div className="space-y-2">
                      {contract.contract_extensions.map((ext: any) => {
                        const extensionTypeLabel = ext.extension_type === 'automatica' 
                          ? 'Automática' 
                          : 'Pactada';
                        return (
                          <div 
                            key={ext.id}
                            className="text-sm flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <span>
                              Prórroga #{ext.extension_number} ({extensionTypeLabel}): {format(new Date(ext.start_date), "d MMM yyyy", { locale: es })} 
                              {' → '}
                              {format(new Date(ext.end_date), "d MMM yyyy", { locale: es })}
                            </span>
                            {ext.new_salary && (
                              <Badge variant="outline">{formatCurrency(ext.new_salary)}</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Termination info */}
                {contract.is_terminated && contract.termination_date && (
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          Terminado el {format(new Date(contract.termination_date), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                        {contract.termination_reason && (
                          <p className="text-muted-foreground mt-1">{contract.termination_reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
