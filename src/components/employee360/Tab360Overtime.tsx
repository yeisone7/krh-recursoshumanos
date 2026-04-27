import { motion } from 'framer-motion';
import { Clock, Calendar, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360OvertimeProps {
  overtime: any[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-warning-light text-warning' },
  aprobado: { label: 'Aprobado', color: 'bg-success-light text-success' },
  rechazado: { label: 'Rechazado', color: 'bg-destructive/10 text-destructive' },
  pagado: { label: 'Pagado', color: 'bg-primary-light text-primary' },
};

const overtimeTypeLabels: Record<string, string> = {
  diurna: 'Extra Diurna',
  nocturna: 'Extra Nocturna',
  dominical_diurna: 'Dominical/Festivo Diurna',
  dominical_nocturna: 'Dominical/Festivo Nocturna',
  recargo_nocturno: 'Recargo Nocturno',
  recargo_dominical: 'Recargo Dominical',
};

export function Tab360Overtime({ overtime, isLoading }: Tab360OvertimeProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
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

  if (overtime.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin horas extra</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene horas extra registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  // Calculate totals
  const totals = overtime.reduce((acc, ot) => ({
    totalHours: acc.totalHours + (ot.total_hours || 0),
    totalValue: acc.totalValue + (ot.total_value || 0),
    approved: acc.approved + (ot.status === 'aprobado' || ot.status === 'pagado' ? 1 : 0),
  }), { totalHours: 0, totalValue: 0, approved: 0 });

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
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overtime.length}</p>
                <p className="text-sm text-muted-foreground">Total Registros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totals.totalHours.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Horas Totales</p>
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
                <p className="text-2xl font-bold">{totals.approved}</p>
                <p className="text-sm text-muted-foreground">Aprobados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatCurrency(totals.totalValue)}</p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>

      {/* Overtime List */}
      <div className="space-y-3">
        {overtime.map((ot, index) => {
          const status = statusConfig[ot.status] || statusConfig.pendiente;

          return (
            <motion.div
              key={ot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Clock className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">
                          {overtimeTypeLabels[ot.overtime_type] || ot.overtime_type}
                        </h4>
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(ot.date), "d MMM yyyy", { locale: es })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{ot.start_time} - {ot.end_time}</span>
                        </div>
                        <span>{ot.total_hours} horas</span>
                      </div>

                      {ot.reason && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{ot.reason}</p>
                      )}
                    </div>

                    <div className="text-right">
                      {ot.total_value > 0 && (
                        <p className="text-lg font-semibold text-success">
                          {formatCurrency(ot.total_value)}
                        </p>
                      )}
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
