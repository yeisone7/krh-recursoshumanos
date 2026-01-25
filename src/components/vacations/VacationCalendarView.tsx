import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isWithinInterval, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVacationCalendar } from '@/hooks/useVacations';
import { VacationRequest, STATUS_COLORS, STATUS_LABELS } from '@/types/vacation';

interface VacationCalendarViewProps {
  onRequestClick?: (request: VacationRequest) => void;
}

export function VacationCalendarView({ onRequestClick }: VacationCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const { data: requests, isLoading } = useVacationCalendar(year, month);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Get requests for a specific day
  const getRequestsForDay = (day: Date) => {
    if (!requests) return [];
    return requests.filter(r => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            Cargando...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayRequests = getRequestsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'min-h-[80px] p-1 border rounded-md',
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
                    </div>
                    
                    <div className="space-y-0.5">
                      {dayRequests.slice(0, 3).map((request) => (
                        <button
                          key={request.id}
                          onClick={() => onRequestClick?.(request)}
                          className={cn(
                            'w-full text-left text-[10px] px-1 py-0.5 rounded truncate',
                            'hover:opacity-80 transition-opacity',
                            request.status === 'en_curso' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : request.status === 'aprobado'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          )}
                        >
                          {request.employee?.first_name} {request.employee?.last_name?.charAt(0)}.
                        </button>
                      ))}
                      {dayRequests.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">
                          +{dayRequests.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900" />
                <span className="text-xs text-muted-foreground">En curso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900" />
                <span className="text-xs text-muted-foreground">Aprobado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-muted-foreground">Completado</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
