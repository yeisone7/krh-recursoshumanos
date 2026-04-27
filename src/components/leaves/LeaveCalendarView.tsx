import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LeaveRequest, LEAVE_TYPE_LABELS } from '@/types/leave';
import { useLeaveRequests, useLeaveTypeConfigs } from '@/hooks/useLeaves';

interface LeaveCalendarViewProps {
  onSelectRequest?: (request: LeaveRequest) => void;
}

export function LeaveCalendarView({ onSelectRequest }: LeaveCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: requests = [] } = useLeaveRequests();
  const { data: typeConfigs = [] } = useLeaveTypeConfigs();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Only show approved and pending requests
  const activeRequests = useMemo(() => {
    return requests.filter(r => r.status === 'aprobado' || r.status === 'pendiente');
  }, [requests]);

  const getRequestsForDay = (day: Date) => {
    return activeRequests.filter(request => {
      const start = new Date(request.start_date);
      const end = new Date(request.end_date);
      return day >= start && day <= end;
    });
  };

  const getTypeColor = (leaveType: string) => {
    const config = typeConfigs.find(c => c.leave_type === leaveType);
    return config?.color || '#3B82F6';
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Get first day of week offset (0 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg">Calendario de Permisos</CardTitle>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-0 flex-1 text-center text-sm font-medium capitalize sm:min-w-[200px] sm:text-lg">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground sm:text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {emptyDays.map((_, index) => (
            <div key={`empty-${index}`} className="h-16 rounded-md bg-muted/30 sm:h-24" />
          ))}

          {/* Days of the month */}
          {days.map(day => {
            const dayRequests = getRequestsForDay(day);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'h-16 overflow-hidden rounded-md border p-1 sm:h-24',
                  isToday && 'ring-2 ring-primary',
                  !isSameMonth(day, currentMonth) && 'bg-muted/50'
                )}
              >
                <div className={cn(
                  'mb-1 text-xs font-medium sm:text-sm',
                  isToday && 'text-primary'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="max-h-10 space-y-0.5 overflow-y-auto sm:max-h-16">
                  {dayRequests.slice(0, 3).map(request => {
                    const color = getTypeColor(request.leave_type);
                    const employeeName = request.employees_v2
                      ? `${request.employees_v2.first_name} ${request.employees_v2.last_name.charAt(0)}.`
                      : 'Empleado';

                    return (
                      <div
                        key={request.id}
                        className={cn(
                          'rounded px-1 py-0.5 text-[10px] truncate cursor-pointer hover:opacity-80 transition-opacity sm:text-xs',
                          request.status === 'pendiente' && 'opacity-60 border border-dashed'
                        )}
                        style={{ 
                          backgroundColor: `${color}20`,
                          borderColor: color,
                          color: color 
                        }}
                        onClick={() => onSelectRequest?.(request)}
                        title={`${employeeName} - ${LEAVE_TYPE_LABELS[request.leave_type]}`}
                      >
                        {employeeName}
                      </div>
                    );
                  })}
                  {dayRequests.length > 3 && (
                      <div className="text-center text-[10px] text-muted-foreground sm:text-xs">
                      +{dayRequests.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {typeConfigs.filter(c => c.is_active).map(config => (
            <div key={config.leave_type} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-muted-foreground">{config.display_name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
