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
  isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useUnifiedCalendar, CalendarEvent, CalendarEventType, EVENT_STYLES } from '@/hooks/useUnifiedCalendar';
import { useNavigate } from 'react-router-dom';

const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  vacation: 'Vacaciones',
  leave: 'Permisos',
  incapacity: 'Incapacidades',
  contract: 'Vencimientos',
  training: 'Capacitaciones',
};

interface UnifiedCalendarProps {
  defaultView?: 'month' | 'week';
}

export function UnifiedCalendar({ defaultView = 'month' }: UnifiedCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>(defaultView);
  const [enabledTypes, setEnabledTypes] = useState<CalendarEventType[]>([
    'vacation', 'leave', 'incapacity', 'contract', 'training'
  ]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: events = [], isLoading } = useUnifiedCalendar(
    year, 
    month, 
    view, 
    currentDate, 
    enabledTypes
  );

  // Calculate calendar days based on view
  const calendarDays = useMemo(() => {
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [currentDate, view]);

  // Navigation functions
  const goToPrevious = () => {
    if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => setCurrentDate(new Date());

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      if (isSameDay(event.startDate, event.endDate)) {
        return isSameDay(day, event.startDate);
      }
      return isWithinInterval(day, { start: event.startDate, end: event.endDate });
    });
  };

  // Toggle event type filter
  const toggleEventType = (type: CalendarEventType) => {
    setEnabledTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const handleEventClick = (event: CalendarEvent) => {
    if (event.actionUrl) {
      navigate(event.actionUrl);
    }
  };

  // Calculate title based on view
  const viewTitle = view === 'week' 
    ? `${format(calendarDays[0], 'd MMM', { locale: es })} - ${format(calendarDays[6], 'd MMM yyyy', { locale: es })}`
    : format(currentDate, 'MMMM yyyy', { locale: es });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg font-semibold capitalize">
              {viewTitle}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <Tabs value={view} onValueChange={(v) => setView(v as 'month' | 'week')}>
              <TabsList className="h-8">
                <TabsTrigger value="month" className="text-xs px-3">
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  Mes
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">
                  <List className="h-3.5 w-3.5 mr-1" />
                  Semana
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Event type filters */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  Filtros
                  {enabledTypes.length < 5 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {enabledTypes.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Tipos de evento</p>
                  {(Object.keys(EVENT_TYPE_LABELS) as CalendarEventType[]).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Checkbox
                        id={type}
                        checked={enabledTypes.includes(type)}
                        onCheckedChange={() => toggleEventType(type)}
                      />
                      <Label 
                        htmlFor={type} 
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
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Cargando eventos...
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <ScrollArea className="flex-1">
              <div className={cn(
                'grid grid-cols-7 gap-1',
                view === 'week' ? 'h-full' : ''
              )}>
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'p-1.5 border rounded-md transition-colors',
                        view === 'week' ? 'min-h-[200px]' : 'min-h-[90px]',
                        isCurrentMonth ? 'bg-background' : 'bg-muted/30',
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
                        <TooltipProvider delayDuration={200}>
                          {dayEvents.slice(0, view === 'week' ? 10 : 3).map((event) => (
                            <Tooltip key={event.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleEventClick(event)}
                                  className={cn(
                                    'w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate',
                                    'hover:opacity-80 transition-opacity',
                                    event.bgColor,
                                    event.color
                                  )}
                                >
                                  {event.title}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">{event.description}</p>
                                  <p className="text-xs">
                                    {format(event.startDate, 'dd/MM/yyyy')}
                                    {!isSameDay(event.startDate, event.endDate) && (
                                      <> - {format(event.endDate, 'dd/MM/yyyy')}</>
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
                        {dayEvents.length > (view === 'week' ? 10 : 3) && (
                          <span className="text-[10px] text-muted-foreground pl-1">
                            +{dayEvents.length - (view === 'week' ? 10 : 3)} más
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-3 mt-3 border-t">
              {enabledTypes.map((type) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={cn('w-3 h-3 rounded', EVENT_STYLES[type].bgColor)} />
                  <span className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
