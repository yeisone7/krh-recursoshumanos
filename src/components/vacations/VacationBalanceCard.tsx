import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { VacationBalance } from '@/types/vacation';

interface VacationBalanceCardProps {
  balance: VacationBalance;
  alertThreshold?: number;
  onClick?: () => void;
}

export function VacationBalanceCard({ balance, alertThreshold = 30, onClick }: VacationBalanceCardProps) {
  const usedPercentage = ((Number(balance.days_taken) + Number(balance.days_compensated)) / Number(balance.days_accrued)) * 100;
  const isExcessiveAccumulation = Number(balance.days_pending) > alertThreshold;
  
  const periodLabel = `${format(new Date(balance.period_start), 'dd/MM/yyyy', { locale: es })} - ${format(new Date(balance.period_end), 'dd/MM/yyyy', { locale: es })}`;
  
  const employeeName = balance.employee 
    ? `${balance.employee.first_name} ${balance.employee.last_name}`
    : 'Empleado';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${isExcessiveAccumulation ? 'border-orange-300 dark:border-orange-700' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-medium">{employeeName}</CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              {periodLabel}
            </p>
          </div>
          {isExcessiveAccumulation && (
            <Badge variant="outline" className="border-orange-500 text-orange-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Acumulación
            </Badge>
          )}
          {balance.is_accumulated && (
            <Badge variant="outline" className="border-purple-500 text-purple-600">
              <Clock className="h-3 w-3 mr-1" />
              Autorizada
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Uso del período</span>
              <span className="font-medium">{Math.round(usedPercentage)}%</span>
            </div>
            <Progress value={usedPercentage} className="h-2" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-background p-2">
              <p className="text-xs text-muted-foreground">Causados</p>
              <p className="text-lg font-bold">{balance.days_accrued}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2">
              <p className="text-xs text-muted-foreground">Tomados</p>
              <p className="text-lg font-bold text-primary">{balance.days_taken}</p>
            </div>
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-2">
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className={`text-lg font-bold ${isExcessiveAccumulation ? 'text-orange-600' : 'text-green-600'}`}>
                {balance.days_pending}
              </p>
            </div>
          </div>

          {/* Compensated days */}
          {Number(balance.days_compensated) > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Días compensados en dinero: {balance.days_compensated}
            </p>
          )}

          {/* Expiration warning */}
          {balance.accumulation_expires && (
            <p className="text-xs text-orange-600 text-center">
              ⚠️ Vence: {format(new Date(balance.accumulation_expires), 'dd/MM/yyyy', { locale: es })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
