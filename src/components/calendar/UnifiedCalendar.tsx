import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Filter,
  Palmtree,
  Stethoscope,
  FileWarning,
  GraduationCap,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useUnifiedCalendar,
  CalendarEvent,
  CalendarEventType,
  EVENT_STYLES,
} from '@/hooks/useUnifiedCalendar';
import { useNavigate } from 'react-router-dom';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  vacation: 'Vacaciones',
  leave: 'Permisos',
  incapacity: 'Incapacidades',
  contract: 'Vencimientos',
  training: 'Capacitaciones',
};

const EVENT_ICONS: Record<CalendarEventType, React.ReactNode> = {
  vacation: <Palmtree className="h-3.5 w-3.5" />,
  leave: <Clock className="h-3.5 w-3.5" />,
  incapacity: <Stethoscope className="h-3.5 w-3.5" />,
  contract: <FileWarning className="h-3.5 w-3.5" />,
  training: <GraduationCap className="h-3.5 w-3.5" />,
};

interface UnifiedCalendarProps {
  defaultView?: 'month' | 'week' | 'agenda';
}

export function UnifiedCalendar({ defaultView = 'agenda' }: UnifiedCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'agenda'>(defaultView);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [enabledTypes, setEnabledTypes] = useState<CalendarEventType[]>([
    'vacation', 'leave', 'incapacity', 'contract', 'training',
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: events = [], isLoading } = useUnifiedCalendar(
    year, month, view, currentDate, enabledTypes,
  );

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

  const goToPrevious = () => {
    setCurrentDate(view === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1));
  };
  const goToNext = () => {
    setCurrentDate(view === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date());
  };

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      if (isSameDay(event.startDate, event.endDate)) {
        return isSameDay(day, event.startDate);
      }
      return isWithinInterval(day, { start: event.startDate, end: event.endDate });
    });
  };

  const toggleEventType = (type: CalendarEventType) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.actionUrl) navigate(event.actionUrl);
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const viewTitle =
    view === 'week'
      ? `${format(calendarDays[0], 'd MMM', { locale: es })} – ${format(calendarDays[6], 'd MMM yyyy', { locale: es })}`
      : format(currentDate, 'MMMM yyyy', { locale: es });

  // Summary counts
  const typeCounts = useMemo(() => {
    const counts: Record<CalendarEventType, number> = {
      vacation: 0, leave: 0, incapacity: 0, contract: 0, training: 0,
    };
    events.forEach((e) => { counts[e.type]++; });
    return counts;
  }, [events]);

  // Events for selected day
  const selectedDayEvents = useMemo(() => getEventsForDay(selectedDay), [selectedDay, events]);

  const maxVisible = view === 'week' ? 8 : 3;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => {
          const isActive = enabledTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => toggleEventType(type)}
              className={cn(
                'min-w-0 rounded-xl border px-3 py-2.5 text-left transition-all sm:flex sm:items-center sm:gap-3 sm:px-4 sm:py-3',
                isActive
                  ? 'bg-white shadow-sm border-border dark:bg-background'
                  : 'bg-white/60 border-transparent opacity-60 dark:bg-muted/40',
              )}
            >
              <div className={cn('mb-2 inline-flex rounded-lg p-2 sm:mb-0', EVENT_STYLES[type].bgColor, EVENT_STYLES[type].color)}>
                {EVENT_ICONS[type]}
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold leading-none sm:text-lg">{typeCounts[type]}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {EVENT_TYPE_LABELS[type]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main layout: Calendar + Sidebar */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Calendar Card */}
        <Card className="flex min-h-[560px] min-w-0 flex-1 flex-col sm:min-h-[640px] lg:min-h-0">
          {/* Header */}
          <div className="flex flex-col gap-3 px-3 pb-3 pt-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:justify-start">
              <h2 className="text-base font-semibold capitalize sm:text-lg">{viewTitle}</h2>
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <Button variant="ghost" size="sm" onClick={goToToday} className="h-7 text-xs">
                  Hoy
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goToNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'agenda')}>
                <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:inline-flex sm:w-auto">
                  <TabsTrigger value="agenda" className="shrink-0 gap-1 px-3 text-xs whitespace-nowrap">
                    <List className="h-3.5 w-3.5" />
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="month" className="shrink-0 gap-1 px-3 text-xs whitespace-nowrap">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Mes
                  </TabsTrigger>
                  <TabsTrigger value="week" className="shrink-0 gap-1 px-3 text-xs whitespace-nowrap">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    Semana
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-full gap-1.5 sm:w-auto">
                    <Filter className="h-3.5 w-3.5" />
                    Filtros
                    {enabledTypes.length < 5 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {enabledTypes.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] max-w-56" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Tipos de evento</p>
                    {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox
                          id={`filter-${type}`}
                          checked={enabledTypes.includes(type)}
                          onCheckedChange={() => toggleEventType(type)}
                        />
                        <Label
                          htmlFor={`filter-${type}`}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <div className={cn('w-3 h-3 rounded', EVENT_STYLES[type].bgColor)} />
                          {EVENT_TYPE_LABELS[type]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Calendar body */}
          <CardContent className="min-h-0 flex-1 overflow-hidden p-2 sm:p-3">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Cargando eventos...
              </div>
            ) : view === 'agenda' ? (
              /* ───── Agenda / List View ───── */
              <div className="h-full overflow-y-auto">
                <div className="space-y-1">
                  {events.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground">
                      <List className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin eventos en este periodo</p>
                    </div>
                  ) : (
                    (() => {
                      // Group events by date
                      const grouped: Record<string, CalendarEvent[]> = {};
                      const sortedEvents = [...events].sort(
                        (a, b) => a.startDate.getTime() - b.startDate.getTime(),
                      );
                      sortedEvents.forEach((event) => {
                        const key = format(event.startDate, 'yyyy-MM-dd');
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(event);
                      });
                      return Object.entries(grouped).map(([dateKey, dayEvents]) => {
                        const date = new Date(dateKey);
                        return (
                          <div key={dateKey} className="mb-4">
                            <div className="flex items-center gap-2 mb-2 sticky top-0 bg-card z-10 py-1">
                              <div
                                className={cn(
                                  'flex items-center justify-center w-10 h-10 rounded-lg text-sm font-bold',
                                  isToday(date)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {format(date, 'd')}
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize">
                                  {format(date, 'EEEE', { locale: es })}
                                </p>
                                <p className="text-[11px] text-muted-foreground capitalize">
                                  {format(date, "d 'de' MMMM yyyy", { locale: es })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="ml-auto text-[10px]">
                                {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                              </Badge>
                            </div>
                            <div className="space-y-1.5 pl-2 border-l-2 border-muted ml-5">
                              {dayEvents.map((event) => (
                                <button
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className="w-[calc(100%-12px)] text-left rounded-lg border p-3 transition-all hover:shadow-sm hover:border-primary/30 group flex items-start gap-3"
                                >
                                  <div className={cn('rounded-md p-1.5 mt-0.5 shrink-0', event.bgColor, event.color)}>
                                    {EVENT_ICONS[event.type]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{event.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                      {event.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        {EVENT_TYPE_LABELS[event.type]}
                                      </Badge>
                                      {!isSameDay(event.startDate, event.endDate) && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {format(event.startDate, 'dd/MM')} – {format(event.endDate, 'dd/MM')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wide py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day) => {
                      const dayEvents = getEventsForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentDate);
                      const isCurrentDay = isToday(day);
                      const isSelected = isSameDay(day, selectedDay);

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDay(day)}
                          className={cn(
                            'p-1.5 border rounded-lg transition-all text-left',
                            view === 'week' ? 'min-h-[180px]' : 'min-h-[85px]',
                            isCurrentMonth ? 'bg-background hover:bg-accent/30' : 'bg-muted/20',
                            isSelected && 'ring-2 ring-primary/60 bg-primary/5',
                            isCurrentDay && !isSelected && 'ring-1 ring-primary/40',
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={cn(
                                'text-xs font-medium inline-flex items-center justify-center',
                                isCurrentDay && 'bg-primary text-primary-foreground rounded-full w-6 h-6',
                                !isCurrentDay && isCurrentMonth && 'text-foreground',
                                !isCurrentDay && !isCurrentMonth && 'text-muted-foreground/50',
                              )}
                            >
                              {format(day, 'd')}
                            </span>
                            {dayEvents.length > 0 && view === 'month' && (
                              <span className="text-[9px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <TooltipProvider delayDuration={150}>
                              {dayEvents.slice(0, maxVisible).map((event) => (
                                <Tooltip key={event.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                      }}
                                      className={cn(
                                        'text-[10px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer',
                                        'hover:opacity-80 transition-opacity font-medium',
                                        event.bgColor,
                                        event.color,
                                      )}
                                    >
                                      {view === 'week' && (
                                        <span className="inline-block mr-1 align-middle">
                                          {EVENT_ICONS[event.type]}
                                        </span>
                                      )}
                                      {event.title}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    <div className="space-y-1">
                                      <p className="font-medium">{event.title}</p>
                                      <p className="text-xs text-muted-foreground">{event.description}</p>
                                      <p className="text-xs">
                                        {format(event.startDate, 'dd/MM/yyyy')}
                                        {!isSameDay(event.startDate, event.endDate) && (
                                          <> – {format(event.endDate, 'dd/MM/yyyy')}</>
                                        )}
                                      </p>
                                      <Badge variant="outline" className="text-[10px]">
                                        {EVENT_TYPE_LABELS[event.type]}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                            </TooltipProvider>
                            {dayEvents.length > maxVisible && (
                              <span className="text-[10px] text-muted-foreground pl-1 font-medium">
                                +{dayEvents.length - maxVisible} más
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar: Selected day detail */}
        <Card className="hidden lg:flex w-[300px] flex-col shrink-0">
          <div className="px-4 pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
              Agenda del día
            </p>
            <p className="text-base font-bold capitalize mt-1">
              {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
            </p>
            {isToday(selectedDay) && (
              <Badge variant="default" className="mt-1.5 text-[10px]">Hoy</Badge>
            )}
          </div>
          <Separator />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {selectedDayEvents.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin eventos este día</p>
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-all hover:shadow-sm group',
                      'hover:border-primary/30',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn('rounded-md p-1.5 mt-0.5 shrink-0', event.bgColor, event.color)}>
                        {EVENT_ICONS[event.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {EVENT_TYPE_LABELS[event.type]}
                          </Badge>
                          {!isSameDay(event.startDate, event.endDate) && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(event.startDate, 'dd/MM')} – {format(event.endDate, 'dd/MM')}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          {/* Bottom summary */}
          <Separator />
          <div className="p-3 flex flex-wrap gap-1.5">
            {enabledTypes.map((type) => (
              <div
                key={type}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  EVENT_STYLES[type].bgColor,
                  EVENT_STYLES[type].color,
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-full', EVENT_STYLES[type].bgColor)} />
                {EVENT_TYPE_LABELS[type]}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
