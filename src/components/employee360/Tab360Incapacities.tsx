import { motion } from 'framer-motion';
import { Stethoscope, Calendar, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360IncapacitiesProps {
  incapacities: any[];
  isLoading: boolean;
}

const originLabels: Record<string, string> = {
  comun: 'Enfermedad Común',
  laboral: 'Accidente Laboral',
  profesional: 'Enfermedad Profesional',
};

const recoveryStatusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-warning-light text-warning' },
  en_proceso: { label: 'En Proceso', color: 'bg-primary-light text-primary' },
  cobrado: { label: 'Cobrado', color: 'bg-success-light text-success' },
  rechazado: { label: 'Rechazado', color: 'bg-destructive/10 text-destructive' },
};

export function Tab360Incapacities({ incapacities, isLoading }: Tab360IncapacitiesProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (incapacities.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin incapacidades</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene incapacidades registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  // Calculate totals
  const totals = incapacities.reduce((acc, inc) => ({
    totalDays: acc.totalDays + (inc.total_days || 0),
    totalAmount: acc.totalAmount + (inc.total_amount || 0),
    recoveredAmount: acc.recoveredAmount + (inc.recovered_amount || 0),
  }), { totalDays: 0, totalAmount: 0, recoveredAmount: 0 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="overflow-x-auto pb-1">
      <div className="grid min-w-[760px] grid-cols-4 gap-4 md:min-w-0">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{incapacities.length}</p>
                <p className="text-sm text-muted-foreground">Total Incapacidades</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.totalDays}</p>
                <p className="text-sm text-muted-foreground">Días Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totals.totalAmount)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totals.recoveredAmount)}</p>
                <p className="text-sm text-muted-foreground">Recobrado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Incapacity List */}
      <div className="space-y-3">
        {incapacities.map((inc, index) => {
          const recoveryStatus = recoveryStatusConfig[inc.recovery_status] || recoveryStatusConfig.pendiente;

          return (
            <motion.div
              key={inc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={cn(
                inc.is_extension && 'border-l-4 border-l-warning'
              )}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn(
                          inc.origin === 'laboral' && 'bg-destructive/10 text-destructive border-destructive/20',
                          inc.origin === 'comun' && 'bg-primary-light text-primary border-primary/20',
                          inc.origin === 'profesional' && 'bg-warning-light text-warning border-warning/20'
                        )}>
                          {originLabels[inc.origin] || inc.origin}
                        </Badge>
                        {inc.is_extension && (
                          <Badge variant="secondary">
                            Prórroga #{inc.extension_number}
                          </Badge>
                        )}
                        <Badge variant="outline" className={recoveryStatus.color}>
                          {recoveryStatus.label}
                        </Badge>
                      </div>

                      <h4 className="font-medium">{inc.diagnosis}</h4>
                      {inc.cie10_code && (
                        <p className="text-sm text-muted-foreground">CIE-10: {inc.cie10_code}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {format(new Date(inc.start_date), "d MMM", { locale: es })} - {format(new Date(inc.end_date), "d MMM yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{inc.total_days} días</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      {inc.total_amount > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Valor</p>
                          <p className="font-semibold">{formatCurrency(inc.total_amount)}</p>
                        </div>
                      )}
                      {inc.recovered_amount > 0 && (
                        <div className="text-success">
                          <p className="text-sm">Recobrado</p>
                          <p className="font-semibold">{formatCurrency(inc.recovered_amount)}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Day breakdown */}
                  <div className="mt-4 overflow-x-auto border-t pt-4">
                  <div className="grid min-w-[480px] grid-cols-4 gap-2 text-center text-sm sm:min-w-0">
                    <div>
                      <p className="text-muted-foreground">Empleador</p>
                      <p className="font-medium">{inc.employer_days} días</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">EPS</p>
                      <p className="font-medium">{inc.eps_days} días</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ARL</p>
                      <p className="font-medium">{inc.arl_days} días</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AFP</p>
                      <p className="font-medium">{inc.afp_days} días</p>
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
