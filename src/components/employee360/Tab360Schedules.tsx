import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CalendarClock, RotateCcw, Briefcase, History, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DAY_NAMES_SHORT } from '@/types/schedule';

interface EmployeeTimeConfig {
  id: string;
  mode: 'administrative' | 'shift';
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  work_schedules?: {
    id: string;
    name: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    break_minutes: number;
  } | null;
  shift_cycles?: {
    id: string;
    name: string;
    code?: string;
    total_days: number;
  } | null;
}

interface Tab360SchedulesProps {
  timeConfigs: EmployeeTimeConfig[];
  isLoading: boolean;
}

export function Tab360Schedules({ timeConfigs, isLoading }: Tab360SchedulesProps) {
  // Separate active from historical configs
  const { activeConfig, historicalConfigs } = useMemo(() => {
    const active = timeConfigs.find(c => c.is_active);
    const historical = timeConfigs
      .filter(c => !c.is_active)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    return { activeConfig: active, historicalConfigs: historical };
  }, [timeConfigs]);

  const formatDays = (days: number[]): string => {
    if (!days || days.length === 0) return '-';
    return days.map(d => DAY_NAMES_SHORT[d]).join(', ');
  };

  const formatTime = (time: string): string => {
    return time.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Configuración Actual
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeConfig ? (
            <div className="space-y-4">
              {/* Mode Badge */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span className="text-sm text-muted-foreground">Modalidad:</span>
                <Badge 
                  variant={activeConfig.mode === 'administrative' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {activeConfig.mode === 'administrative' ? (
                    <>
                      <Briefcase className="w-3 h-3" />
                      Horario Administrativo
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      Turnos Operativos
                    </>
                  )}
                </Badge>
              </div>

              {/* Schedule Details */}
              {activeConfig.mode === 'administrative' && activeConfig.work_schedules && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    {activeConfig.work_schedules.name}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Días:</span>
                      <p className="font-medium">{formatDays(activeConfig.work_schedules.days_of_week)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Entrada:</span>
                      <p className="font-medium">{formatTime(activeConfig.work_schedules.start_time)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Salida:</span>
                      <p className="font-medium">{formatTime(activeConfig.work_schedules.end_time)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Descanso:</span>
                      <p className="font-medium">{activeConfig.work_schedules.break_minutes} min</p>
                    </div>
                  </div>
                </div>
              )}

              {activeConfig.mode === 'shift' && activeConfig.shift_cycles && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="font-medium flex items-center gap-2">
                    <RotateCcw className="w-4 h-4" />
                    {activeConfig.shift_cycles.name}
                    {activeConfig.shift_cycles.code && (
                      <Badge variant="outline">{activeConfig.shift_cycles.code}</Badge>
                    )}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Duración del ciclo:</span>
                    <span className="font-medium ml-2">{activeConfig.shift_cycles.total_days} días</span>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Desde:</span>
                  <span className="font-medium">
                    {format(parseISO(activeConfig.start_date), 'dd MMM yyyy', { locale: es })}
                  </span>
                </div>
                {activeConfig.end_date && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Hasta:</span>
                    <span className="font-medium">
                      {format(parseISO(activeConfig.end_date), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                )}
              </div>

              {activeConfig.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notas:</span>
                  <p className="mt-1">{activeConfig.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay configuración de horario activa</p>
              <p className="text-sm mt-1">
                Configure la modalidad de tiempo desde el módulo de Jornadas
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Configurations */}
      {historicalConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5" />
              Historial de Configuraciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Configuración</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {config.mode === 'administrative' ? 'Administrativo' : 'Turnos'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {config.mode === 'administrative' 
                        ? config.work_schedules?.name || '-'
                        : config.shift_cycles?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(config.start_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {config.end_date 
                        ? format(parseISO(config.end_date), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
