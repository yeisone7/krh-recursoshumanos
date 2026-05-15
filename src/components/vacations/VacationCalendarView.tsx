import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWithinInterval, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useVacationCalendar } from '@/hooks/useVacations';
import { VacationRequest } from '@/types/vacation';

const EMPLOYEE_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/60', text: 'text-blue-800 dark:text-blue-200' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/60', text: 'text-emerald-800 dark:text-emerald-200' },
  { bg: 'bg-violet-100 dark:bg-violet-900/60', text: 'text-violet-800 dark:text-violet-200' },
  { bg: 'bg-amber-100 dark:bg-amber-900/60', text: 'text-amber-800 dark:text-amber-200' },
  { bg: 'bg-rose-100 dark:bg-rose-900/60', text: 'text-rose-800 dark:text-rose-200' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/60', text: 'text-cyan-800 dark:text-cyan-200' },
  { bg: 'bg-orange-100 dark:bg-orange-900/60', text: 'text-orange-800 dark:text-orange-200' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/60', text: 'text-indigo-800 dark:text-indigo-200' },
];

interface VacationCalendarViewProps {
  onRequestClick?: (request: VacationRequest) => void;
}

export function VacationCalendarView({ onRequestClick }: VacationCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('week');
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const { data: requests, isLoading } = useVacationCalendar(year, month);

  const calendarDays = useMemo(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, view]);

  const mobileWeekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Assign a consistent color to each employee
  const employeeColorMap = useMemo(() => {
    if (!requests) return new Map<string, typeof EMPLOYEE_COLORS[0]>();
    const uniqueIds = [...new Set(requests.map(r => r.employee_id))];
    const map = new Map<string, typeof EMPLOYEE_COLORS[0]>();
    uniqueIds.forEach((id, i) => {
      map.set(id, EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]);
    });
    return map;
  }, [requests]);

  const goToPrevious = () => {
    setCurrentDate(view === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };
  const goToNext = () => {
    setCurrentDate(view === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };
  const goToPreviousWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getRequestsForDay = (day: Date) => {
    if (!requests) return [];
    return requests.filter(r => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const viewTitle = view === 'week'
    ? `${format(calendarDays[0], 'd MMM', { locale: es })} – ${format(calendarDays[6], 'd MMM yyyy', { locale: es })}`
    : format(currentDate, 'MMMM yyyy', { locale: es });

  const mobileTitle = `${format(mobileWeekDays[0], 'd MMM', { locale: es })} – ${format(mobileWeekDays[6], 'd MMM yyyy', { locale: es })}`;

  const maxVisible = view === 'week' ? 10 : 3;

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <CardTitle className="text-base font-semibold capitalize sm:text-lg">
            <span className="sm:hidden">{mobileTitle}</span>
            <span className="hidden sm:inline">{viewTitle}</span>
          </CardTitle>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
              <TabsList className="hidden h-8 sm:inline-flex">
                <TabsTrigger value="month" className="text-xs px-3">Mes</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" className="h-8" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:hidden" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <div className="space-y-2">
            <div className="space-y-2 sm:hidden">
              {mobileWeekDays.map((day) => {
                const dayRequests = getRequestsForDay(day);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'rounded-md border p-3 transition-colors',
                      isCurrentDay && 'ring-2 ring-primary'
                    )}
                  >
                    <div className={cn('mb-2 flex items-center justify-between text-sm font-medium', isCurrentDay && 'text-primary')}>
                      <span className="capitalize">{format(day, 'EEE d', { locale: es })}</span>
                      <Badge variant="outline">{dayRequests.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {dayRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin vacaciones</p>
                      ) : (
                        dayRequests.map((request) => {
                          const colors = employeeColorMap.get(request.employee_id) || EMPLOYEE_COLORS[0];
                          const employeeName = request.employee
                            ? `${request.employee.first_name} ${request.employee.last_name}`
                            : 'Empleado';

                          return (
                            <button
                              key={request.id}
                              onClick={() => onRequestClick?.(request)}
                              className={cn(
                                'w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-opacity hover:opacity-80',
                                colors.bg,
                                colors.text
                              )}
                            >
                              <span className="block">{employeeName}</span>
                              <span className="block font-normal opacity-90">
                                {request.business_days} días hábiles • {request.status}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Week days header */}
            <div className="hidden grid-cols-7 gap-1 sm:grid">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="hidden grid-cols-7 gap-1 sm:grid">
              {calendarDays.map((day) => {
                const dayRequests = getRequestsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-1.5 border rounded-md transition-colors',
                      view === 'week' ? 'min-h-[180px]' : 'min-h-[90px]',
                      isCurrentMonth ? 'bg-background' : 'bg-background',
                      isCurrentDay && 'ring-2 ring-primary'
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium mb-1',
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground',
                      isCurrentDay && 'text-primary'
                    )}>
                      {format(day, 'd')}
                      {view === 'week' && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          {format(day, 'EEE', { locale: es })}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-0.5">
                      {dayRequests.slice(0, maxVisible).map((request) => {
                        const colors = employeeColorMap.get(request.employee_id) || EMPLOYEE_COLORS[0];
                        return (
                          <button
                            key={request.id}
                            onClick={() => onRequestClick?.(request)}
                            className={cn(
                              'w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate',
                              'hover:opacity-80 transition-opacity',
                              colors.bg,
                              colors.text
                            )}
                          >
                            {request.employee?.first_name} {request.employee?.last_name?.charAt(0)}.
                          </button>
                        );
                      })}
                      {dayRequests.length > maxVisible && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{dayRequests.length - maxVisible} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend - show unique employees with their colors */}
            {requests && requests.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                {[...employeeColorMap.entries()].map(([empId, colors]) => {
                  const req = requests.find(r => r.employee_id === empId);
                  const name = req?.employee 
                    ? `${req.employee.first_name} ${req.employee.last_name?.charAt(0)}.`
                    : empId;
                  return (
                    <div key={empId} className="flex items-center gap-1.5">
                      <div className={cn('w-3 h-3 rounded', colors.bg)} />
                      <span className="text-xs text-muted-foreground">{name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
