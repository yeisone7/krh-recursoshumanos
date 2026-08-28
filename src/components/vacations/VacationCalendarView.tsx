import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useVacationRequests } from '@/hooks/useVacations';
import { isDateOnlyWithinRange, parseDateOnlyOr } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';
import {
  REQUEST_TYPE_LABELS,
  STATUS_LABELS,
  VacationRequest,
  VacationRequestType,
  VacationStatus,
} from '@/types/vacation';

interface VacationCalendarViewProps {
  onRequestClick?: (request: VacationRequest) => void;
}

type CalendarStatusFilter = VacationStatus | 'all';

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const REQUEST_TYPE_COLORS: Record<VacationRequestType, string> = {
  disfrute: '#0E7490',
  compensacion: '#B45309',
  acumulacion: '#7C3AED',
  interrupcion: '#C2410C',
};
const STATUS_LEGEND: Array<{ status: VacationStatus; className: string }> = [
  { status: 'borrador', className: 'bg-warning' },
  { status: 'aprobado', className: 'bg-primary' },
  { status: 'en_curso', className: 'bg-success' },
  { status: 'completado', className: 'bg-emerald-600' },
  { status: 'interrumpido', className: 'bg-orange-600' },
  { status: 'cancelado', className: 'bg-muted-foreground' },
];

function getEmployeeName(request: VacationRequest, abbreviated = false) {
  if (!request.employee) return 'Empleado';
  const { first_name, last_name } = request.employee;
  return abbreviated ? `${first_name} ${last_name.charAt(0)}.` : `${first_name} ${last_name}`;
}

function getEmployeeInitials(request: VacationRequest) {
  if (!request.employee) return '?';
  return `${request.employee.first_name.charAt(0)}${request.employee.last_name.charAt(0)}`.toUpperCase();
}

function getEmployeeCenter(request: VacationRequest) {
  const workInfo = request.employee?.employee_work_info;
  const current = workInfo?.find((item) => item.is_current) ?? workInfo?.[0];
  return {
    id: current?.operation_center_id ?? null,
    name: current?.operation_centers?.name ?? 'Sin centro asignado',
  };
}

function getStatusBadgeClass(status: VacationStatus) {
  if (status === 'aprobado') return 'border-primary/30 bg-primary/10 text-primary';
  if (status === 'en_curso' || status === 'completado') return 'border-success/30 bg-success/10 text-success';
  if (status === 'borrador') return 'border-warning/40 bg-warning-light text-warning';
  if (status === 'interrumpido') return 'border-orange-500/30 bg-orange-500/10 text-orange-700';
  return 'border-border bg-muted text-muted-foreground';
}

function formatDateRange(request: VacationRequest) {
  const start = parseDateOnlyOr(request.start_date, new Date());
  const end = parseDateOnlyOr(request.end_date, start);
  if (isSameDay(start, end)) return format(start, 'd MMM', { locale: es });
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: es })}–${format(end, 'd MMM', { locale: es })}`;
  }
  return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM', { locale: es })}`;
}

export function VacationCalendarView({ onRequestClick }: VacationCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | VacationRequestType>('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const { data: requests = [], isLoading } = useVacationRequests();
  const { data: operationCenters = [] } = useOperationCenters();

  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const filteredRequests = useMemo(() => requests.filter((request) => {
    const center = getEmployeeCenter(request);
    return (statusFilter === 'all' || request.status === statusFilter)
      && (typeFilter === 'all' || request.request_type === typeFilter)
      && (centerFilter === 'all'
        || (centerFilter === 'unassigned' ? !center.id : center.id === centerFilter));
  }), [centerFilter, requests, statusFilter, typeFilter]);

  const monthRequests = useMemo(() => filteredRequests.filter((request) => {
    const start = parseDateOnlyOr(request.start_date, monthStart);
    const end = parseDateOnlyOr(request.end_date, monthEnd);
    return start <= monthEnd && end >= monthStart;
  }), [filteredRequests, monthEnd, monthStart]);

  const upcomingRequests = useMemo(() => filteredRequests
    .filter((request) => {
      const end = parseDateOnlyOr(request.end_date, today);
      return request.status !== 'cancelado' && end >= today;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 20), [filteredRequests, today]);

  const pendingApproval = filteredRequests.filter((request) => request.status === 'borrador').length;
  const approvedThisMonth = monthRequests.filter((request) => (
    request.status === 'aprobado' || request.status === 'en_curso' || request.status === 'completado'
  )).length;

  const getRequestsForDay = (day: Date) => monthRequests.filter((request) => (
    isDateOnlyWithinRange(day, request.start_date, request.end_date)
  ));

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="border-b border-border/70 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setCurrentDate((date) => subMonths(date, 1))}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => setCurrentDate((date) => addMonths(date, 1))}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-1 flex min-w-0 items-center gap-2.5">
              <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
              <h2 className="truncate text-base font-bold capitalize sm:text-lg">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h2>
            </div>
            <Button variant="outline" size="sm" className="ml-1 h-9" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:justify-end">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CalendarStatusFilter)}>
              <SelectTrigger className="h-9 sm:min-w-[155px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {STATUS_LEGEND.map(({ status }) => (
                  <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | VacationRequestType)}>
              <SelectTrigger className="h-9 sm:min-w-[190px]">
                <SelectValue placeholder="Tipo de solicitud" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(Object.entries(REQUEST_TYPE_LABELS) as Array<[VacationRequestType, string]>).map(([type, label]) => (
                  <SelectItem key={type} value={type}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-9 sm:min-w-[205px]">
                <SelectValue placeholder="Centro de operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {operationCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
                <SelectItem value="unassigned">Sin centro asignado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 xl:border-r xl:border-border/70">
          <div className="hidden grid-cols-7 border-b border-border/70 bg-muted/20 sm:grid">
            {WEEK_DAYS.map((day, index) => (
              <div
                key={day}
                className={cn(
                  'px-2 py-2 text-center text-[10px] font-semibold text-muted-foreground lg:text-[11px]',
                  index >= 5 && 'bg-muted/30',
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="hidden grid-cols-7 sm:grid">
              {calendarDays.map((day, index) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[6.25rem] animate-pulse border-b border-r border-border/60 bg-muted/10 p-1.5',
                    index % 7 >= 5 && 'bg-muted/20',
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="hidden grid-cols-7 sm:grid">
              {calendarDays.map((day, index) => {
                const dayRequests = getRequestsForDay(day);
                const isToday = isSameDay(day, today);
                const isWeekend = index % 7 >= 5;
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[5.5rem] border-b border-r border-border/60 p-1 last:border-r-0 lg:min-h-[6.25rem] lg:p-1.5',
                      isWeekend && 'bg-muted/20',
                      !isSameMonth(day, currentDate) && 'bg-muted/10 text-muted-foreground/60',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold',
                          isToday && 'bg-primary text-primary-foreground',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayRequests.length > 0 && <span className="text-[10px] text-muted-foreground">{dayRequests.length}</span>}
                    </div>
                    <div className="space-y-0.5">
                      {dayRequests.slice(0, 3).map((request) => {
                        const color = REQUEST_TYPE_COLORS[request.request_type];
                        return (
                          <button
                            key={request.id}
                            type="button"
                            className={cn(
                              'group w-full overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              request.status === 'borrador' && 'border-dashed',
                              request.status === 'cancelado' && 'opacity-55',
                            )}
                            style={{ backgroundColor: `${color}14`, borderColor: `${color}70` }}
                            onClick={() => onRequestClick?.(request)}
                            title={`${getEmployeeName(request)} · ${REQUEST_TYPE_LABELS[request.request_type]}`}
                          >
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                              <span className="truncate text-[10px] font-semibold text-foreground lg:text-[11px]">
                                {getEmployeeName(request, true)}
                              </span>
                            </span>
                            <span className="block truncate pl-3 text-[9px] text-muted-foreground lg:text-[10px]">
                              {REQUEST_TYPE_LABELS[request.request_type]}
                            </span>
                          </button>
                        );
                      })}
                      {dayRequests.length > 3 && (
                        <p className="px-1 text-[10px] font-semibold text-primary">+ {dayRequests.length - 3} más</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 p-4 sm:hidden">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/40" />
              ))
            ) : (
              calendarDays
                .filter((day) => isSameMonth(day, currentDate) && getRequestsForDay(day).length > 0)
                .map((day) => (
                  <div key={day.toISOString()} className="border-b border-border/60 pb-3 last:border-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold',
                        isSameDay(day, today) && 'bg-primary text-primary-foreground',
                      )}>
                        {format(day, 'd')}
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">{format(day, 'EEEE', { locale: es })}</p>
                        <p className="text-xs text-muted-foreground">{getRequestsForDay(day).length} solicitudes</p>
                      </div>
                    </div>
                    <div className="space-y-2 pl-10">
                      {getRequestsForDay(day).map((request) => {
                        const color = REQUEST_TYPE_COLORS[request.request_type];
                        return (
                          <button
                            key={request.id}
                            type="button"
                            className="w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/30"
                            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                            onClick={() => onRequestClick?.(request)}
                          >
                            <p className="text-sm font-semibold">{getEmployeeName(request)}</p>
                            <p className="text-xs text-muted-foreground">
                              {REQUEST_TYPE_LABELS[request.request_type]} · {STATUS_LABELS[request.status]}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
            )}
            {!isLoading && monthRequests.length === 0 && (
              <div className="py-12 text-center">
                <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                <p className="text-sm font-semibold">No hay vacaciones para mostrar</p>
                <p className="mt-1 text-xs text-muted-foreground">Prueba cambiando los filtros seleccionados.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3">
            {STATUS_LEGEND.map(({ status, className }) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
                <span className="text-[11px] text-muted-foreground">{STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="min-w-0 bg-card">
          <div className="border-b border-border/70 px-4 py-4">
            <h3 className="font-bold">Próximas vacaciones</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Solicitudes programadas y pendientes</p>
          </div>

          <div className="grid grid-cols-2 border-b border-border/70">
            <div className="flex items-center gap-2.5 border-r border-border/70 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Por aprobar</p>
                <p className="text-xl font-bold leading-none tabular-nums">{pendingApproval}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Aprobadas en el mes</p>
                <p className="text-xl font-bold leading-none tabular-nums">{approvedThisMonth}</p>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[34rem] xl:h-[calc(100%-8.7rem)] xl:max-h-[44rem] xl:min-h-[32rem]">
            <div className="px-4">
              {upcomingRequests.map((request) => {
                const color = REQUEST_TYPE_COLORS[request.request_type];
                const center = getEmployeeCenter(request);
                return (
                  <button
                    key={request.id}
                    type="button"
                    className="flex w-full gap-3 border-b border-border/60 py-3.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => onRequestClick?.(request)}
                  >
                    <Avatar className="mt-0.5 h-8 w-8">
                      <AvatarImage src={request.employee?.avatar_url || undefined} alt={getEmployeeName(request)} />
                      <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: `${color}18`, color }}>
                        {getEmployeeInitials(request)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{getEmployeeName(request)}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('h-5 shrink-0 px-1.5 text-[9px]', getStatusBadgeClass(request.status))}>
                          {STATUS_LABELS[request.status]}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{formatDateRange(request)}</span>
                        <span className="flex min-w-0 items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{center.name}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!isLoading && upcomingRequests.length === 0 && (
                <div className="py-12 text-center">
                  <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
                  <p className="text-sm font-semibold">No hay próximas vacaciones</p>
                  <p className="mt-1 text-xs text-muted-foreground">No encontramos solicitudes con estos filtros.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </section>
  );
}
