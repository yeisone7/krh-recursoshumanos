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
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="flex h-full min-h-0 flex-col gap-3 sm:gap-4">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => {
          const isActive = enabledTypes.includes(type);
          return (
            <motion.button
              key={type}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleEventType(type)}
              className={cn(
                'relative flex flex-col items-center justify-center rounded-[2rem] border p-4 transition-all duration-300 text-center',
                isActive
                  ? 'bg-background shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-primary/20 ring-1 ring-primary/5'
                  : 'bg-muted/30 border-transparent opacity-50 grayscale hover:grayscale-0 hover:opacity-100',
              )}
            >
              <div className={cn(
                'mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110',
                EVENT_STYLES[type].bgColor, 
                EVENT_STYLES[type].color
              )}>
                {EVENT_ICONS[type]}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-black tracking-tight leading-none">{typeCounts[type]}</span>
                <span className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                  {EVENT_TYPE_LABELS[type]}
                </span>
              </div>
              {isActive && (
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Main layout: Calendar + Sidebar */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6 overflow-hidden">
        {/* Calendar Card */}
        <Card className="flex min-h-[420px] min-w-0 flex-1 flex-col sm:min-h-[640px] lg:min-h-0 rounded-[2.5rem] border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Header */}
          <div className="flex flex-col gap-4 px-4 pb-4 pt-6 xl:flex-row xl:items-center xl:justify-between border-b border-border/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <h2 className="text-xl font-black uppercase tracking-widest text-foreground/90 whitespace-nowrap">
                {viewTitle}
              </h2>
              <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-2xl border border-border/50 w-fit">
                <Button variant="ghost" size="sm" onClick={goToToday} className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-background transition-all">
                  Hoy
                </Button>
                <Separator orientation="vertical" className="h-4 mx-1 opacity-50" />
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background" onClick={goToPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-background" onClick={goToNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week' | 'agenda')} className="w-full sm:w-auto">
                <TabsList className="bg-muted/30 p-1.5 rounded-2xl border border-border/50 w-full sm:w-auto overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value="agenda" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm transition-all whitespace-nowrap">
                    <List className="mr-2 h-3.5 w-3.5" />
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="month" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm transition-all whitespace-nowrap">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    Mes
                  </TabsTrigger>
                  <TabsTrigger value="week" className="rounded-xl px-4 py-2 font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm transition-all whitespace-nowrap">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    Semana
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-11 rounded-2xl border-2 px-5 font-black uppercase tracking-widest text-[9px] hover:bg-muted/50 transition-all ml-auto sm:ml-0">
                    <Filter className="mr-2 h-4 w-4 text-primary" />
                    Filtros
                    {enabledTypes.length < 5 && (
                      <Badge variant="default" className="ml-2 h-5 px-1.5 text-[10px] rounded-full">
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

          {/* Calendar body */}
          <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
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
                            <div className="sticky top-0 z-10 mb-2 flex min-w-0 items-center gap-2 bg-card py-1">
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
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold capitalize">
                                  {format(date, 'EEEE', { locale: es })}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground capitalize">
                                  {format(date, "d 'de' MMMM yyyy", { locale: es })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                                {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                              </Badge>
                            </div>
                            <div className="ml-2 space-y-1.5 border-l-2 border-muted pl-2 sm:ml-5">
                              {dayEvents.map((event) => (
                                <button
                                  key={event.id}
                                  onClick={() => handleEventClick(event)}
                                  className="group flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition-all hover:border-primary/30 hover:shadow-sm sm:w-[calc(100%-12px)] sm:gap-3 sm:p-3"
                                >
                                  <div className={cn('rounded-md p-1.5 mt-0.5 shrink-0', event.bgColor, event.color)}>
                                    {EVENT_ICONS[event.type]}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="break-words text-sm font-medium sm:truncate">{event.title}</p>
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
                                   <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100" />
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
              <div className="flex h-full min-w-0 flex-col overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {/* Weekday header */}
                <div className="mb-1 grid min-w-[640px] grid-cols-7 gap-1 sm:min-w-0">
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
                <div className="min-h-0 min-w-[640px] flex-1 overflow-y-auto sm:min-w-0">
                  <div className="grid min-w-[640px] grid-cols-7 gap-1 sm:min-w-0">
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
                            view === 'week' ? 'min-h-[150px] sm:min-h-[180px]' : 'min-h-[72px] sm:min-h-[85px]',
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

        {/* Mobile selected day detail */}
        {view !== 'agenda' && (
          <Card className="lg:hidden">
            <div className="px-4 pb-3 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agenda del día</p>
              <p className="mt-1 text-base font-bold capitalize">{format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}</p>
            </div>
            <Separator />
            <div className="max-h-[320px] space-y-2 overflow-y-auto p-4">
              {selectedDayEvents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-sm">Sin eventos este día</p>
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <button key={event.id} onClick={() => handleEventClick(event)} className="w-full rounded-lg border p-3 text-left transition-all hover:border-primary/30">
                    <div className="flex items-start gap-2.5">
                      <div className={cn('mt-0.5 shrink-0 rounded-md p-1.5', event.bgColor, event.color)}>{EVENT_ICONS[event.type]}</div>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{event.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{event.description}</p>
                        <Badge variant="outline" className="mt-1.5 px-1.5 py-0 text-[10px]">{EVENT_TYPE_LABELS[event.type]}</Badge>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Sidebar: Selected day detail */}
        <Card className="hidden xl:flex w-[340px] flex-col shrink-0 rounded-[2.5rem] border-border/50 shadow-xl bg-background/95 backdrop-blur-xl">
          <div className="px-6 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                Agenda del día
              </p>
              {isToday(selectedDay) && (
                <Badge variant="default" className="bg-primary/10 text-primary border-transparent hover:bg-primary/20 text-[9px] font-black uppercase tracking-widest rounded-full px-3">
                  Hoy
                </Badge>
              )}
            </div>
            <h3 className="text-xl font-black capitalize mt-2 text-foreground">
              {format(selectedDay, "EEEE d", { locale: es })}
              <span className="text-primary block text-sm font-bold opacity-80">{format(selectedDay, "'de' MMMM yyyy", { locale: es })}</span>
            </h3>
          </div>
          
          <div className="px-6 py-4">
            <Separator className="opacity-50" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 custom-scrollbar">
            <div className="space-y-3 pb-6">
              {selectedDayEvents.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Sin eventos</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Tu agenda está libre hoy</p>
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <motion.button
                    key={event.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEventClick(event)}
                    className={cn(
                      'group w-full text-left rounded-3xl border p-4 transition-all duration-300 relative overflow-hidden',
                      'bg-card hover:shadow-lg hover:border-primary/20 hover:shadow-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 transition-transform duration-300 group-hover:rotate-12',
                        event.bgColor, 
                        event.color
                      )}>
                        {EVENT_ICONS[event.type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-foreground truncate uppercase tracking-wide">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-medium">
                          {event.description}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                            event.bgColor,
                            event.color
                          )}>
                            {EVENT_TYPE_LABELS[event.type]}
                          </span>
                          {!isSameDay(event.startDate, event.endDate) && (
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">
                              {format(event.startDate, 'dd/MM')} – {format(event.endDate, 'dd/MM')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExternalLink className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>

          {/* Bottom legend summary */}
          <div className="p-6 bg-muted/20 border-t border-border/50">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Leyenda</p>
            <div className="flex flex-wrap gap-2">
              {enabledTypes.map((type) => (
                <div
                  key={type}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border transition-colors',
                    EVENT_STYLES[type].bgColor,
                    EVENT_STYLES[type].color,
                    'border-transparent'
                  )}
                >
                  <div className={cn('w-2 h-2 rounded-full ring-2 ring-background', EVENT_STYLES[type].color.replace('text-', 'bg-'))} />
                  {EVENT_TYPE_LABELS[type]}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
