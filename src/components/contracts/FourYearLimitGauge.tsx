import { addYears, differenceInCalendarDays, differenceInMonths, format, max, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Scale, AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { COLOMBIAN_LABOR_LAW } from '@/lib/colombianContractLaw';

interface FourYearLimitGaugeProps {
  startDate: Date;
  currentEndDate: Date | null;
  originalEndDate: Date | null;
  extensionCount: number;
  contractType: string;
}

export function FourYearLimitGauge({
  startDate,
  currentEndDate,
  originalEndDate,
  extensionCount,
  contractType,
}: FourYearLimitGaugeProps) {
  if (contractType !== 'fixed') return null;

  const endDate = currentEndDate || originalEndDate;
  if (!endDate) return null;

  const lawEffectiveDate = new Date(2025, 5, 25);
  const countingStart = max([startOfDay(startDate), lawEffectiveDate]);
  const maxYears = COLOMBIAN_LABOR_LAW.MAX_FIXED_TERM_YEARS;
  const limitDate = addYears(countingStart, maxYears);
  const totalMonths = Math.max(0, differenceInMonths(endDate, countingStart));
  const totalDays = Math.max(0, differenceInCalendarDays(endDate, countingStart));
  const maxDays = differenceInCalendarDays(limitDate, countingStart);
  const percentageUsed = Math.min((totalDays / maxDays) * 100, 100);
  const remainingDays = Math.max(0, maxDays - totalDays);
  const remainingMonths = Math.min(maxYears * 12, differenceInMonths(limitDate, endDate));
  const formatRemaining = () => remainingMonths > 0
    ? formatDuration(remainingMonths)
    : `${remainingDays} días`;

  // Determinar estado visual
  const getStatusConfig = () => {
    if (percentageUsed >= 100) {
      return {
        level: 'exceeded' as const,
        color: 'text-destructive',
        bgColor: 'bg-destructive',
        lightBg: 'bg-destructive-light',
        borderColor: 'border-destructive/30',
        icon: AlertTriangle,
        label: totalDays > maxDays ? 'Límite superado' : 'Límite alcanzado',
      };
    }
    if (percentageUsed >= 75) {
      return {
        level: 'critical' as const,
        color: 'text-destructive',
        bgColor: 'bg-destructive',
        lightBg: 'bg-destructive-light',
        borderColor: 'border-destructive/30',
        icon: AlertTriangle,
        label: 'Próximo al límite',
      };
    }
    if (percentageUsed >= 50) {
      return {
        level: 'warning' as const,
        color: 'text-warning-foreground',
        bgColor: 'bg-warning',
        lightBg: 'bg-warning-light',
        borderColor: 'border-warning/30',
        icon: Clock,
        label: 'Monitorear',
      };
    }
    return {
      level: 'safe' as const,
      color: 'text-success',
      bgColor: 'bg-success',
      lightBg: 'bg-success-light',
      borderColor: 'border-success/30',
      icon: CheckCircle,
      label: 'Disponible',
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  // Formatear duración
  const formatDuration = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMths = months % 12;
    
    if (years === 0) {
      return `${remainingMths} mes${remainingMths !== 1 ? 'es' : ''}`;
    }
    if (remainingMths === 0) {
      return `${years} año${years !== 1 ? 's' : ''}`;
    }
    return `${years} año${years !== 1 ? 's' : ''} y ${remainingMths} mes${remainingMths !== 1 ? 'es' : ''}`;
  };

  return (
    <div className={cn(
      "rounded-lg border p-4",
      status.lightBg,
      status.borderColor
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", status.lightBg)}>
            <Scale className={cn("w-4 h-4", status.color)} />
          </div>
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              Límite Legal de {maxYears} Años
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      El artículo 6 de la Ley 2466 de 2025 establece un máximo de cuatro años.
                      Para los contratos vigentes al entrar en vigor la ley, el conteo comienza el 25 de junio de 2025.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </h4>
            <p className="text-xs text-muted-foreground">
              Desde el {format(countingStart, 'dd/MM/yyyy')} hasta el {format(limitDate, 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1 text-xs",
            status.level === 'exceeded' || status.level === 'critical' 
              ? "bg-destructive-light text-destructive border-destructive/30"
              : status.level === 'warning'
              ? "bg-warning-light text-warning-foreground border-warning/30"
              : "bg-success-light text-success border-success/30"
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      {/* Progress bar visual */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Tiempo utilizado</span>
          <span className={cn("font-bold", status.color)}>
            {percentageUsed.toFixed(1)}%
          </span>
        </div>
        
        <div className="relative h-3 bg-background rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
              status.bgColor
            )}
            style={{ width: `${Math.min(percentageUsed, 100)}%` }}
          />
          {/* Marcadores de referencia */}
          <div className="absolute left-1/4 top-0 w-px h-full bg-border/50" />
          <div className="absolute left-1/2 top-0 w-px h-full bg-border/50" />
          <div className="absolute left-3/4 top-0 w-px h-full bg-border/50" />
        </div>

        {/* Escala */}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0</span>
          <span>1 año</span>
          <span>2 años</span>
          <span>3 años</span>
          <span>4 años</span>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Tiempo acumulado</p>
          <p className="font-bold text-sm">{formatDuration(totalMonths)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Prórrogas</p>
          <p className="font-bold text-sm">{extensionCount}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Disponible</p>
          <p className={cn("font-bold text-sm", remainingDays === 0 ? "text-destructive" : "text-success")}>
            {remainingDays === 0
              ? 'Agotado' 
              : formatRemaining()
            }
          </p>
        </div>
      </div>

      {/* Advertencia si está cerca del límite */}
      {status.level !== 'safe' && (
        <div className={cn(
          "mt-3 p-2 rounded-md text-xs",
          status.level === 'exceeded' || status.level === 'critical'
            ? "bg-destructive/10 text-destructive"
            : "bg-warning/10 text-warning-foreground"
        )}>
          <p className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {status.level === 'exceeded' 
                ? `Se alcanzó el límite de ${maxYears} años. Si la relación laboral continúa más allá del límite, corresponde el término indefinido.`
                : status.level === 'critical'
                ? `Quedan ${formatRemaining()} para alcanzar el límite. Planifique las próximas acciones.`
                : `El contrato ha utilizado más del 50% del límite legal. Monitoree las próximas prórrogas.`
              }
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
