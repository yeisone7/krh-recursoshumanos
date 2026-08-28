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
import { useLeaveRequests, useLeaveTypeConfigs } from '@/hooks/useLeaves';
import { isDateOnlyWithinRange, parseDateOnlyOr } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';
import {
  getLeaveTypeLabel,
  LEAVE_STATUS_LABELS,
  LeaveRequest,
  LeaveRequestStatus,
} from '@/types/leave';

interface LeaveCalendarViewProps {
  onSelectRequest?: (request: LeaveRequest) => void;
}

type CalendarStatusFilter = LeaveRequestStatus | 'all';

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const STATUS_LEGEND: Array<{ status: LeaveRequestStatus; className: string }> = [
  { status: 'aprobado', className: 'bg-success' },
  { status: 'pendiente', className: 'bg-warning' },
  { status: 'rechazado', className: 'bg-destructive' },
  { status: 'cancelado', className: 'bg-muted-foreground' },
];

function getEmployeeName(request: LeaveRequest, abbreviated = false) {
  if (!request.employees_v2) return 'Empleado';
  const { first_name, last_name } = request.employees_v2;
  return abbreviated ? `${first_name} ${last_name.charAt(0)}.` : `${first_name} ${last_name}`;
}

function getEmployeeInitials(request: LeaveRequest) {
  if (!request.employees_v2) return '?';
  return `${request.employees_v2.first_name.charAt(0)}${request.employees_v2.last_name.charAt(0)}`.toUpperCase();
}

function getEmployeeCenter(request: LeaveRequest) {
  const workInfo = request.employees_v2?.employee_work_info;
  const current = workInfo?.find((item) => item.is_current) ?? workInfo?.[0];
  return {
    id: current?.operation_center_id ?? null,
    name: current?.operation_centers?.name ?? 'Sin centro asignado',
  };
}

function getStatusBadgeClass(status: LeaveRequestStatus) {
  if (status === 'aprobado') return 'border-success/30 bg-success/10 text-success';
  if (status === 'pendiente') return 'border-warning/40 bg-warning-light text-warning';
  if (status === 'rechazado') return 'border-destructive/30 bg-destructive/10 text-destructive';
  return 'border-border bg-muted text-muted-foreground';
}

function formatDateRange(request: LeaveRequest) {
  const start = parseDateOnlyOr(request.start_date, new Date());
  const end = parseDateOnlyOr(request.end_date, start);
  if (isSameDay(start, end)) return format(start, 'd MMM', { locale: es });
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, 'd', { locale: es })}–${format(end, 'd MMM', { locale: es })}`;
  }
  return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM', { locale: es })}`;
}

export function LeaveCalendarView({ onSelectRequest }: LeaveCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const { data: requests = [] } = useLeaveRequests();
  const { data: typeConfigs = [] } = useLeaveTypeConfigs();
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
      && (typeFilter === 'all' || request.leave_type === typeFilter)
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
      return (request.status === 'aprobado' || request.status === 'pendiente') && end >= today;
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date))
    .slice(0, 20), [filteredRequests, today]);

  const pendingToday = filteredRequests.filter((request) => {
    if (request.status !== 'pendiente') return false;
    const start = parseDateOnlyOr(request.start_date, today);
    const end = parseDateOnlyOr(request.end_date, today);
    return start <= today && end >= today;
  }).length;

  const approvedThisMonth = monthRequests.filter((request) => request.status === 'aprobado').length;

  const getRequestsForDay = (day: Date) => monthRequests.filter((request) => (
    isDateOnlyWithinRange(day, request.start_date, request.end_date)
  ));

  const getTypeColor = (leaveType: string) => (
    typeConfigs.find((config) => config.leave_type === leaveType)?.color || '#0E7490'
  );

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
            <Button
              variant="outline"
              size="sm"
              className="ml-1 h-9"
              onClick={() => setCurrentDate(new Date())}
            >
              Hoy
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:flex xl:justify-end">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as CalendarStatusFilter)}>
              <SelectTrigger className="h-9 sm:min-w-[145px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="aprobado">Aprobados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="rechazado">Rechazados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 sm:min-w-[180px]">
                <SelectValue placeholder="Tipo de permiso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {typeConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.leave_type}>{config.display_name}</SelectItem>
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
                    {dayRequests.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{dayRequests.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayRequests.slice(0, 3).map((request) => {
                      const color = getTypeColor(request.leave_type);
                      return (
                        <button
                          key={request.id}
                          type="button"
                          className={cn(
                            'group w-full overflow-hidden rounded-md border px-1.5 py-0.5 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            request.status === 'pendiente' && 'border-dashed',
                            (request.status === 'rechazado' || request.status === 'cancelado') && 'opacity-55',
                          )}
                          style={{ backgroundColor: `${color}14`, borderColor: `${color}70` }}
                          onClick={() => onSelectRequest?.(request)}
                          title={`${getEmployeeName(request)} · ${getLeaveTypeLabel(request.leave_type, typeConfigs)}`}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate text-[10px] font-semibold text-foreground lg:text-[11px]">
                              {getEmployeeName(request, true)}
                            </span>
                          </span>
                          <span className="block truncate pl-3 text-[9px] text-muted-foreground lg:text-[10px]">
                            {getLeaveTypeLabel(request.leave_type, typeConfigs)}
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

          <div className="space-y-3 p-4 sm:hidden">
            {calendarDays
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
                      <p className="text-xs text-muted-foreground">{getRequestsForDay(day).length} ausencias</p>
                    </div>
                  </div>
                  <div className="space-y-2 pl-10">
                    {getRequestsForDay(day).map((request) => {
                      const color = getTypeColor(request.leave_type);
                      return (
                        <button
                          key={request.id}
                          type="button"
                          className="w-full rounded-lg border p-2.5 text-left"
                          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                          onClick={() => onSelectRequest?.(request)}
                        >
                          <p className="text-sm font-semibold">{getEmployeeName(request)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getLeaveTypeLabel(request.leave_type, typeConfigs)} · {LEAVE_STATUS_LABELS[request.status]}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            {monthRequests.length === 0 && (
              <div className="py-12 text-center">
                <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
                <p className="text-sm font-semibold">No hay permisos para mostrar</p>
                <p className="mt-1 text-xs text-muted-foreground">Prueba cambiando los filtros seleccionados.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3">
            {STATUS_LEGEND.map(({ status, className }) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={cn('h-2.5 w-2.5 rounded-full', className)} />
                <span className="text-[11px] text-muted-foreground">{LEAVE_STATUS_LABELS[status]}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="min-w-0 bg-card">
          <div className="border-b border-border/70 px-4 py-4">
            <h3 className="font-bold">Próximas ausencias</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Permisos aprobados y pendientes</p>
          </div>

          <div className="grid grid-cols-2 border-b border-border/70">
            <div className="flex items-center gap-2.5 border-r border-border/70 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Pendientes hoy</p>
                <p className="text-xl font-bold leading-none">{pendingToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Aprobadas en el mes</p>
                <p className="text-xl font-bold leading-none">{approvedThisMonth}</p>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[34rem] xl:h-[calc(100%-8.7rem)] xl:max-h-[44rem] xl:min-h-[32rem]">
            <div className="px-4">
              {upcomingRequests.map((request) => {
                const color = getTypeColor(request.leave_type);
                const center = getEmployeeCenter(request);
                return (
                  <button
                    key={request.id}
                    type="button"
                    className="flex w-full gap-3 border-b border-border/60 py-3.5 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => onSelectRequest?.(request)}
                  >
                    <Avatar className="mt-0.5 h-8 w-8">
                      <AvatarImage src={request.employees_v2?.avatar_url || undefined} alt="" />
                      <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: `${color}18`, color }}>
                        {getEmployeeInitials(request)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{getEmployeeName(request)}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {getLeaveTypeLabel(request.leave_type, typeConfigs)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('shrink-0 px-1.5 py-0 text-[9px]', getStatusBadgeClass(request.status))}>
                          {LEAVE_STATUS_LABELS[request.status]}
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
              {upcomingRequests.length === 0 && (
                <div className="px-3 py-12 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-success/50" />
                  <p className="text-sm font-semibold">Sin ausencias próximas</p>
                  <p className="mt-1 text-xs text-muted-foreground">No hay resultados para los filtros seleccionados.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </section>
  );
}
