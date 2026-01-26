import { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSunday, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useShifts, useShiftAssignments, useCreateBulkShiftAssignments } from '@/hooks/useSchedules';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeFullName } from '@/types/employee';
import type { Shift, EmployeeShiftAssignment, EmployeeAbsence } from '@/types/schedule';

// Festivos de Colombia 2024-2026 (simplificado)
const COLOMBIAN_HOLIDAYS: Record<string, string> = {
  '2024-01-01': 'Año Nuevo',
  '2024-01-08': 'Reyes Magos',
  '2024-03-25': 'San José',
  '2024-03-28': 'Jueves Santo',
  '2024-03-29': 'Viernes Santo',
  '2024-05-01': 'Día del Trabajo',
  '2024-05-13': 'Ascensión',
  '2024-06-03': 'Corpus Christi',
  '2024-06-10': 'Sagrado Corazón',
  '2024-07-01': 'San Pedro y San Pablo',
  '2024-07-20': 'Día de la Independencia',
  '2024-08-07': 'Batalla de Boyacá',
  '2024-08-19': 'Asunción',
  '2024-10-14': 'Día de la Raza',
  '2024-11-04': 'Todos los Santos',
  '2024-11-11': 'Independencia de Cartagena',
  '2024-12-08': 'Inmaculada Concepción',
  '2024-12-25': 'Navidad',
  '2025-01-01': 'Año Nuevo',
  '2025-01-06': 'Reyes Magos',
  '2025-03-24': 'San José',
  '2025-04-17': 'Jueves Santo',
  '2025-04-18': 'Viernes Santo',
  '2025-05-01': 'Día del Trabajo',
  '2025-06-02': 'Ascensión',
  '2025-06-23': 'Corpus Christi',
  '2025-06-30': 'Sagrado Corazón',
  '2025-07-20': 'Día de la Independencia',
  '2025-08-07': 'Batalla de Boyacá',
  '2025-08-18': 'Asunción',
  '2025-10-13': 'Día de la Raza',
  '2025-11-03': 'Todos los Santos',
  '2025-11-17': 'Independencia de Cartagena',
  '2025-12-08': 'Inmaculada Concepción',
  '2025-12-25': 'Navidad',
  '2026-01-01': 'Año Nuevo',
  '2026-01-12': 'Reyes Magos',
  '2026-03-23': 'San José',
  '2026-04-02': 'Jueves Santo',
  '2026-04-03': 'Viernes Santo',
  '2026-05-01': 'Día del Trabajo',
  '2026-05-18': 'Ascensión',
  '2026-06-08': 'Corpus Christi',
  '2026-06-15': 'Sagrado Corazón',
  '2026-06-29': 'San Pedro y San Pablo',
  '2026-07-20': 'Día de la Independencia',
  '2026-08-07': 'Batalla de Boyacá',
  '2026-08-17': 'Asunción',
  '2026-10-12': 'Día de la Raza',
  '2026-11-02': 'Todos los Santos',
  '2026-11-16': 'Independencia de Cartagena',
  '2026-12-08': 'Inmaculada Concepción',
  '2026-12-25': 'Navidad',
};

interface ShiftCalendarProps {
  centerId?: string;
}

export function ShiftCalendar({ centerId }: ShiftCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCells, setSelectedCells] = useState<{ employeeId: string; dates: string[] }[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ employeeId: string; date: string } | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: shifts = [] } = useShifts();
  
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  
  const { data: assignments = [], isLoading: loadingAssignments } = useShiftAssignments({
    startDate,
    endDate,
    centerId,
  });
  
  const createBulkAssignments = useCreateBulkShiftAssignments();

  // Fetch absences (vacations, leaves, incapacities) for all employees in the date range
  // Get days of the month first (needed for absences map)
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
  }, [currentMonth]);

  const { data: absences = [] } = useQuery({
    queryKey: ['employee_absences', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const employeeIds = employees.map(e => e.id);
      if (employeeIds.length === 0) return [];

      // Fetch vacations (use Spanish status values)
      const { data: vacations } = await supabase
        .from('vacation_requests')
        .select('employee_id, start_date, end_date, status')
        .in('employee_id', employeeIds)
        .in('status', ['aprobado', 'en_curso'])
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      // Fetch leaves (use Spanish status values)
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, status')
        .in('employee_id', employeeIds)
        .eq('status', 'aprobado')
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      // Fetch incapacities
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('employee_id, start_date, end_date')
        .in('employee_id', employeeIds)
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      const result: (EmployeeAbsence & { employee_id: string })[] = [];

      (vacations || []).forEach(v => {
        result.push({
          employee_id: v.employee_id,
          type: 'vacation',
          start_date: v.start_date,
          end_date: v.end_date,
          description: 'Vacaciones',
        });
      });

      (leaves || []).forEach(l => {
        result.push({
          employee_id: l.employee_id,
          type: 'leave',
          start_date: l.start_date,
          end_date: l.end_date,
          description: 'Permiso',
        });
      });

      (incapacities || []).forEach(i => {
        result.push({
          employee_id: i.employee_id,
          type: 'incapacity',
          start_date: i.start_date,
          end_date: i.end_date,
          description: 'Incapacidad',
        });
      });

      return result;
    },
    enabled: employees.length > 0,
  });

  // Build absences map: employeeId -> date -> absence info
  const absencesMap = useMemo(() => {
    const map: Record<string, Record<string, EmployeeAbsence>> = {};
    absences.forEach((a: any) => {
      if (!map[a.employee_id]) {
        map[a.employee_id] = {};
      }
      // Mark each day in the range
      const start = parseISO(a.start_date);
      const end = parseISO(a.end_date);
      daysInMonth.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (isWithinInterval(day, { start, end })) {
          map[a.employee_id][dateStr] = {
            type: a.type,
            start_date: a.start_date,
            end_date: a.end_date,
            description: a.description,
          };
        }
      });
    });
    return map;
  }, [absences, daysInMonth]);

  // Filter active employees with shift mode (for now, show all active)
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => e.is_active);
  }, [employees]);

  // Build assignments map: employeeId -> date -> assignment
  const assignmentsMap = useMemo(() => {
    const map: Record<string, Record<string, EmployeeShiftAssignment>> = {};
    assignments.forEach((a: any) => {
      if (!map[a.employee_id]) {
        map[a.employee_id] = {};
      }
      map[a.employee_id][a.assignment_date] = a;
    });
    return map;
  }, [assignments]);

  const getShiftById = (id: string): Shift | undefined => {
    return shifts.find(s => s.id === id);
  };

  const isHoliday = (date: Date): string | null => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return COLOMBIAN_HOLIDAYS[dateStr] || null;
  };

  const prevMonth = () => {
    setCurrentMonth(prev => addDays(startOfMonth(prev), -1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => addDays(endOfMonth(prev), 1));
  };

  // Selection handling
  const handleCellMouseDown = (employeeId: string, date: string) => {
    setIsSelecting(true);
    setSelectionStart({ employeeId, date });
    setSelectedCells([{ employeeId, dates: [date] }]);
  };

  const handleCellMouseEnter = (employeeId: string, date: string) => {
    if (!isSelecting || !selectionStart) return;
    
    // Only allow selection for the same employee
    if (employeeId !== selectionStart.employeeId) return;

    const startIdx = daysInMonth.findIndex(d => format(d, 'yyyy-MM-dd') === selectionStart.date);
    const endIdx = daysInMonth.findIndex(d => format(d, 'yyyy-MM-dd') === date);
    
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    const selectedDates = daysInMonth
      .slice(minIdx, maxIdx + 1)
      .map(d => format(d, 'yyyy-MM-dd'));

    setSelectedCells([{ employeeId, dates: selectedDates }]);
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
    if (selectedCells.length > 0 && selectedCells[0].dates.length > 0) {
      setShowAssignDialog(true);
    }
  };

  const clearSelection = () => {
    setSelectedCells([]);
    setSelectionStart(null);
    setIsSelecting(false);
  };

  const handleAssign = async () => {
    if (!selectedShiftId || selectedCells.length === 0) return;

    // Validate no absences in selected dates
    const selectedShift = getShiftById(selectedShiftId);
    const isWorkShift = selectedShift && !selectedShift.is_rest_day;

    if (isWorkShift) {
      const blockedDates: string[] = [];
      selectedCells.forEach(cell => {
        cell.dates.forEach(date => {
          const absence = absencesMap[cell.employeeId]?.[date];
          if (absence) {
            blockedDates.push(`${date} (${absence.description})`);
          }
        });
      });

      if (blockedDates.length > 0) {
        toast.error('No se puede asignar turno laboral', {
          description: `El empleado tiene novedades activas en: ${blockedDates.slice(0, 3).join(', ')}${blockedDates.length > 3 ? ` y ${blockedDates.length - 3} más` : ''}`,
        });
        return;
      }
    }

    const assignmentsToCreate = selectedCells.flatMap(cell =>
      cell.dates.map(date => ({
        employee_id: cell.employeeId,
        shift_id: selectedShiftId,
        assignment_date: date,
        source: 'manual' as const,
      }))
    );

    try {
      await createBulkAssignments.mutateAsync(assignmentsToCreate);
      toast.success(`${assignmentsToCreate.length} asignación(es) guardada(s)`);
      setShowAssignDialog(false);
      clearSelection();
      setSelectedShiftId('');
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudieron guardar las asignaciones',
      });
    }
  };

  const isCellSelected = (employeeId: string, date: string): boolean => {
    return selectedCells.some(
      cell => cell.employeeId === employeeId && cell.dates.includes(date)
    );
  };

  const activeShifts = shifts.filter(s => s.is_active);
  const isLoading = loadingEmployees || loadingAssignments;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
            <span>Domingo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" />
            <span>Festivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-200 border border-purple-400 rounded" />
            <span>Novedad</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <ScrollArea className="max-h-[calc(100vh-300px)]">
          <div className="min-w-[900px]">
            {/* Days Header */}
            <div className="flex bg-muted sticky top-0 z-10">
              <div className="w-48 p-2 border-r font-medium flex items-center gap-2 shrink-0">
                <Users className="w-4 h-4" />
                Empleado
              </div>
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const holiday = isHoliday(day);
                const sunday = isSunday(day);
                const today = isToday(day);

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      'w-10 p-1 text-center text-xs border-r shrink-0',
                      sunday && 'bg-red-50',
                      holiday && 'bg-amber-50',
                      today && 'ring-2 ring-inset ring-primary'
                    )}
                    title={holiday || undefined}
                  >
                    <div className="font-medium">{format(day, 'EEE', { locale: es })}</div>
                    <div className={cn(
                      'text-muted-foreground',
                      today && 'text-primary font-bold'
                    )}>
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Employee Rows */}
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No hay empleados activos
              </div>
            ) : (
              filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex border-t hover:bg-muted/30">
                  <div className="w-48 p-2 border-r font-medium shrink-0 flex items-center">
                    <span className="truncate">{getEmployeeFullName(employee)}</span>
                  </div>
                  {daysInMonth.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const assignment = assignmentsMap[employee.id]?.[dateStr];
                    const shift = assignment ? getShiftById(assignment.shift_id) : null;
                    const holiday = isHoliday(day);
                    const sunday = isSunday(day);
                    const selected = isCellSelected(employee.id, dateStr);
                    const absence = absencesMap[employee.id]?.[dateStr];

                    return (
                      <TooltipProvider key={dateStr}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'w-10 p-0.5 border-r shrink-0 cursor-pointer transition-colors select-none relative',
                                sunday && !absence && 'bg-red-50',
                                holiday && !absence && 'bg-amber-50',
                                absence && 'bg-purple-100',
                                selected && 'bg-primary/20 ring-2 ring-inset ring-primary'
                              )}
                              onMouseDown={() => handleCellMouseDown(employee.id, dateStr)}
                              onMouseEnter={() => handleCellMouseEnter(employee.id, dateStr)}
                              onMouseUp={handleCellMouseUp}
                            >
                              {absence && !shift && (
                                <div className="h-6 rounded text-[10px] font-medium text-purple-700 flex items-center justify-center bg-purple-200">
                                  <AlertTriangle className="w-3 h-3" />
                                </div>
                              )}
                              {shift && (
                                <div
                                  className="h-6 rounded text-[10px] font-medium text-white flex items-center justify-center"
                                  style={{ backgroundColor: shift.color }}
                                >
                                  {shift.code || shift.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              {!shift && !absence && <div className="h-6" />}
                            </div>
                          </TooltipTrigger>
                          {absence && (
                            <TooltipContent>
                              <p className="font-medium">{absence.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {absence.start_date} - {absence.end_date}
                              </p>
                            </TooltipContent>
                          )}
                          {shift && !absence && (
                            <TooltipContent>
                              <p>{shift.name}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        💡 Seleccione celdas arrastrando para asignar turnos a múltiples días.
      </p>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        setShowAssignDialog(open);
        if (!open) clearSelection();
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Turno</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Se asignará el turno a{' '}
                <strong>{selectedCells[0]?.dates.length || 0}</strong> día(s).
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Turno</label>
              <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Seleccione turno" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {activeShifts.map((shift) => (
                    <SelectItem key={shift.id} value={shift.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: shift.color }}
                        />
                        <span>{shift.name}</span>
                        {shift.is_rest_day && (
                          <Badge variant="secondary" className="text-xs">
                            Descanso
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAssignDialog(false);
              clearSelection();
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedShiftId || createBulkAssignments.isPending}
            >
              {createBulkAssignments.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
