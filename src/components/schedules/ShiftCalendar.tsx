import { useState, useMemo } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSunday, parseISO, isWithinInterval, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Users, Loader2, AlertTriangle, Building2, ChevronDown, ChevronUp, Trash2, Edit, Plus, Briefcase, RotateCcw } from 'lucide-react';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAreas } from '@/hooks/useSystemConfig';
import { useShifts, useShiftAssignments, useCreateBulkShiftAssignments, useDeleteShiftAssignment, useEmployeeTimeConfigs } from '@/hooks/useSchedules';
import { useHolidaysMap } from '@/hooks/useHolidays';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeFullName } from '@/types/employee';
import type { Shift, EmployeeShiftAssignment, EmployeeAbsence, WorkSchedule, EmployeeTimeMode } from '@/types/schedule';

type ViewMode = 'quincenal' | 'mensual' | 'trimestral' | 'semestral';

interface GroupedEmployee {
  centerId: string;
  centerName: string;
  areas: {
    areaId: string;
    areaName: string;
    employees: ReturnType<typeof useEmployees>['data'];
  }[];
}

interface ShiftCalendarProps {
  centerId?: string;
}

export function ShiftCalendar({ centerId: propCenterId }: ShiftCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('quincenal');
  const [selectedCenterId, setSelectedCenterId] = useState<string>(propCenterId || 'all');
  const [modeFilter, setModeFilter] = useState<'all' | 'administrative' | 'shift'>('all');
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set());
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<{ employeeId: string; dates: string[] }[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ employeeId: string; date: string } | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: shifts = [] } = useShifts();
  const { data: centers = [] } = useOperationCenters();
  const { data: areas = [] } = useAreas();
  const { data: holidaysMap = {} } = useHolidaysMap();
  const { data: timeConfigs = [] } = useEmployeeTimeConfigs();

  // Build employee mode map: employeeId -> { mode, workSchedule }
  const employeeModeMap = useMemo(() => {
    const map: Record<string, { mode: EmployeeTimeMode; workSchedule?: WorkSchedule }> = {};
    timeConfigs.forEach(tc => {
      if (tc.is_active) {
        map[tc.employee_id] = {
          mode: tc.mode,
          workSchedule: tc.work_schedules || undefined,
        };
      }
    });
    return map;
  }, [timeConfigs]);
  
  // Calculate date range based on view mode
  const { startDate, endDate, daysInPeriod } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    if (viewMode === 'quincenal') {
      const isFirstHalf = currentMonth.getDate() <= 15;
      const start = isFirstHalf ? monthStart : addDays(monthStart, 15);
      const end = isFirstHalf ? addDays(monthStart, 14) : monthEnd;
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        daysInPeriod: eachDayOfInterval({ start, end }),
      };
    }
    
    if (viewMode === 'mensual') {
      return {
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(monthEnd, 'yyyy-MM-dd'),
        daysInPeriod: eachDayOfInterval({ start: monthStart, end: monthEnd }),
      };
    }

    if (viewMode === 'trimestral') {
      const threeMonthsEnd = endOfMonth(addMonths(monthStart, 2));
      return {
        startDate: format(monthStart, 'yyyy-MM-dd'),
        endDate: format(threeMonthsEnd, 'yyyy-MM-dd'),
        daysInPeriod: eachDayOfInterval({ start: monthStart, end: threeMonthsEnd }),
      };
    }

    // Semestral: 6 months starting from the current month's start
    const sixMonthsEnd = endOfMonth(addMonths(monthStart, 5));
    return {
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(sixMonthsEnd, 'yyyy-MM-dd'),
      daysInPeriod: eachDayOfInterval({ start: monthStart, end: sixMonthsEnd }),
    };
  }, [currentMonth, viewMode]);
  
  const { data: assignments = [], isLoading: loadingAssignments } = useShiftAssignments({
    startDate,
    endDate,
    centerId: selectedCenterId !== 'all' ? selectedCenterId : undefined,
  });
  
  const createBulkAssignments = useCreateBulkShiftAssignments();
  const deleteAssignment = useDeleteShiftAssignment();

  // Fetch absences
  const { data: absences = [] } = useQuery({
    queryKey: ['employee_absences', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const employeeIds = employees.map(e => e.id);
      if (employeeIds.length === 0) return [];

      const { data: vacations } = await supabase
        .from('vacation_requests')
        .select('employee_id, start_date, end_date, status')
        .in('employee_id', employeeIds)
        .in('status', ['aprobado', 'en_curso', 'completado'])
        .gte('end_date', startDate)
        .lte('start_date', endDate);

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, status')
        .in('employee_id', employeeIds)
        .eq('status', 'aprobado')
        .gte('end_date', startDate)
        .lte('start_date', endDate);

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

  // Build absences map
  const absencesMap = useMemo(() => {
    const map: Record<string, Record<string, EmployeeAbsence>> = {};
    absences.forEach((a: any) => {
      if (!map[a.employee_id]) {
        map[a.employee_id] = {};
      }
      const start = parseISO(a.start_date);
      const end = parseISO(a.end_date);
      daysInPeriod.forEach(day => {
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
  }, [absences, daysInPeriod]);

  // Group employees by Center -> Area with filtering
  const groupedEmployees = useMemo((): GroupedEmployee[] => {
    const filtered = employees.filter(e => {
      if (!e.is_active) return false;
      if (selectedCenterId !== 'all') {
        if (e.work_info?.operation_center_id !== selectedCenterId) return false;
      }
      if (modeFilter !== 'all') {
        const empMode = employeeModeMap[e.id]?.mode;
        if (empMode !== modeFilter) return false;
      }
      return true;
    });

    const centerMap = new Map<string, Map<string, typeof filtered>>();

    filtered.forEach(emp => {
      const centerId = emp.work_info?.operation_center_id || 'sin-centro';
      const areaId = emp.work_info?.area_id || 'sin-area';

      if (!centerMap.has(centerId)) {
        centerMap.set(centerId, new Map());
      }
      const areaMap = centerMap.get(centerId)!;
      if (!areaMap.has(areaId)) {
        areaMap.set(areaId, []);
      }
      areaMap.get(areaId)!.push(emp);
    });

    const result: GroupedEmployee[] = [];
    centerMap.forEach((areaMap, centerId) => {
      const center = centers.find(c => c.id === centerId);
      const areasArr: GroupedEmployee['areas'] = [];
      
      areaMap.forEach((emps, areaId) => {
        const area = areas.find(a => a.id === areaId);
        areasArr.push({
          areaId,
          areaName: area?.name || 'Sin área',
          employees: emps,
        });
      });

      areasArr.sort((a, b) => a.areaName.localeCompare(b.areaName));

      result.push({
        centerId,
        centerName: center?.name || 'Sin centro',
        areas: areasArr,
      });
    });

    result.sort((a, b) => a.centerName.localeCompare(b.centerName));
    return result;
  }, [employees, selectedCenterId, modeFilter, employeeModeMap, centers, areas]);

  // Flatten for total count
  const totalEmployees = useMemo(() => {
    return groupedEmployees.reduce((acc, g) => 
      acc + g.areas.reduce((a, area) => a + (area.employees?.length || 0), 0), 0
    );
  }, [groupedEmployees]);

  // Build assignments map
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

  const getShiftById = (id: string): Shift | undefined => shifts.find(s => s.id === id);
  const isHoliday = (date: Date): string | null => holidaysMap[format(date, 'yyyy-MM-dd')] || null;

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === 'quincenal') {
      const isFirstHalf = currentMonth.getDate() <= 15;
      if (direction === 'next') {
        if (isFirstHalf) {
          setCurrentMonth(addDays(currentMonth, 15));
        } else {
          setCurrentMonth(addDays(startOfMonth(addMonths(currentMonth, 1)), 0));
        }
      } else {
        if (isFirstHalf) {
          setCurrentMonth(addDays(endOfMonth(addMonths(currentMonth, -1)), 0));
        } else {
          setCurrentMonth(startOfMonth(currentMonth));
        }
      }
    } else if (viewMode === 'mensual') {
      setCurrentMonth(addMonths(currentMonth, direction === 'next' ? 1 : -1));
    } else {
      // Trimestral
      setCurrentMonth(addMonths(currentMonth, direction === 'next' ? 3 : -3));
    }
  };

  const toggleCenter = (centerId: string) => {
    setExpandedCenters(prev => {
      const next = new Set(prev);
      if (next.has(centerId)) {
        next.delete(centerId);
      } else {
        next.add(centerId);
      }
      return next;
    });
  };

  const toggleArea = (areaKey: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(areaKey)) {
        next.delete(areaKey);
      } else {
        next.add(areaKey);
      }
      return next;
    });
  };

  // Selection handling
  const handleCellMouseDown = (employeeId: string, date: string) => {
    setIsSelecting(true);
    setSelectionStart({ employeeId, date });
    setSelectedCells([{ employeeId, dates: [date] }]);
  };

  const handleCellMouseEnter = (employeeId: string, date: string) => {
    if (!isSelecting || !selectionStart) return;
    if (employeeId !== selectionStart.employeeId) return;

    const startIdx = daysInPeriod.findIndex(d => format(d, 'yyyy-MM-dd') === selectionStart.date);
    const endIdx = daysInPeriod.findIndex(d => format(d, 'yyyy-MM-dd') === date);
    
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    
    const selectedDates = daysInPeriod
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
      toast.error('Error', { description: error.message || 'No se pudieron guardar las asignaciones' });
    }
  };

  const isCellSelected = (employeeId: string, date: string): boolean => {
    return selectedCells.some(cell => cell.employeeId === employeeId && cell.dates.includes(date));
  };

  const activeShifts = shifts.filter(s => s.is_active);
  const isLoading = loadingEmployees || loadingAssignments;

  // Expand all by default on load
  useMemo(() => {
    if (groupedEmployees.length > 0 && expandedCenters.size === 0) {
      const allCenters = new Set(groupedEmployees.map(g => g.centerId));
      setExpandedCenters(allCenters);
      const allAreas = new Set(groupedEmployees.flatMap(g => g.areas.map(a => `${g.centerId}-${a.areaId}`)));
      setExpandedAreas(allAreas);
    }
  }, [groupedEmployees]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'quincenal') {
      return `${format(parseISO(startDate), 'd')} - ${format(parseISO(endDate), 'd MMM yyyy', { locale: es })}`;
    }
    if (viewMode === 'mensual') {
      return format(currentMonth, 'MMMM yyyy', { locale: es });
    }
    // Trimestral
    return `${format(currentMonth, 'MMM')} - ${format(addMonths(currentMonth, 2), 'MMM yyyy', { locale: es })}`;
  }, [viewMode, startDate, endDate, currentMonth]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
      {/* Header Controls */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 shrink-0" onClick={() => navigatePeriod('prev')}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <h2 className="text-xs sm:text-sm font-semibold min-w-0 flex-1 sm:min-w-[180px] text-center capitalize truncate">
              {periodLabel}
            </h2>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-7 sm:w-7 shrink-0" onClick={() => navigatePeriod('next')}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* View Mode Toggle - always visible */}
          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="justify-self-end">
            <ToggleGroupItem value="quincenal" aria-label="Vista quincenal" className="h-8 sm:h-7 text-xs px-2">
              15d
            </ToggleGroupItem>
            <ToggleGroupItem value="mensual" aria-label="Vista mensual" className="h-8 sm:h-7 text-xs px-2">
              Mes
            </ToggleGroupItem>
            <ToggleGroupItem value="trimestral" aria-label="Vista trimestral" className="h-8 sm:h-7 text-xs px-2">
              3m
            </ToggleGroupItem>
            <ToggleGroupItem value="semestral" aria-label="Vista semestral" className="h-8 sm:h-7 text-xs px-2">
              6m
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:flex-wrap">
          {/* Mode Filter */}
          <ToggleGroup type="single" value={modeFilter} onValueChange={(v) => v && setModeFilter(v as any)} className="grid grid-cols-3 sm:flex w-full sm:w-auto">
            <ToggleGroupItem value="all" aria-label="Todos" className="h-8 sm:h-7 text-xs">
              Todos
            </ToggleGroupItem>
            <ToggleGroupItem value="administrative" aria-label="Administrativos" className="h-8 sm:h-7 text-xs gap-1">
              <Briefcase className="w-3 h-3" />
              <span>Admin</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="shift" aria-label="Turnos" className="h-8 sm:h-7 text-xs gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Turnos</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Center Filter */}
          <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
            <SelectTrigger className="w-full sm:w-48 h-9 sm:h-8 flex-1 sm:flex-none min-w-0">
              <Building2 className="w-4 h-4 mr-2 shrink-0" />
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todos los centros</SelectItem>
              {centers.map((center) => (
                <SelectItem key={center.id} value={center.id}>
                  {center.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Legend */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-indigo-100 border border-indigo-400 rounded text-[8px] font-bold text-indigo-700 flex items-center justify-center">H</div>
          <span>Horario Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
          <span>Domingo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" />
          <span>Festivo</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-100 border border-green-400 rounded text-[8px] font-bold text-green-700 flex items-center justify-center">V</div>
          <span>Vacaciones</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-100 border border-blue-400 rounded text-[8px] font-bold text-blue-700 flex items-center justify-center">P</div>
          <span>Permiso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-orange-100 border border-orange-400 rounded text-[8px] font-bold text-orange-700 flex items-center justify-center">I</div>
          <span>Incapacidad</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-emerald-100 border border-emerald-400 rounded text-[8px] font-bold text-emerald-700 flex items-center justify-center">D</div>
          <span>Descanso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border-2 border-destructive rounded relative">
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" />
          </div>
          <span className="text-destructive font-medium">Conflicto</span>
        </div>
        <span>|</span>
        <span>{totalEmployees} empleados</span>
      </div>
      {/* Mobile legend - compact */}
      <div className="flex sm:hidden items-center gap-2 text-[10px] text-muted-foreground overflow-x-auto pb-1">
        <span className="shrink-0">{totalEmployees} empleados</span>
        <span className="shrink-0">·</span>
        <span className="shrink-0 text-indigo-600 font-medium">H=Admin</span>
        <span className="shrink-0 text-green-600 font-medium">V=Vac</span>
        <span className="shrink-0 text-blue-600 font-medium">P=Perm</span>
        <span className="shrink-0 text-orange-600 font-medium">I=Inc</span>
        <span className="shrink-0 text-emerald-600 font-medium">D=Desc</span>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-auto flex-1 min-h-[260px] sm:min-h-0 overscroll-contain">
        <div className="min-w-max">
          {/* Days Header */}
          <div className="flex bg-background sticky top-0 z-10">
            <div className="w-36 sm:w-56 px-2 sm:px-3 py-2 sm:py-1.5 border-r font-medium text-xs flex items-center gap-1.5 shrink-0 sticky left-0 bg-background z-20">
              <Users className="w-3.5 h-3.5 hidden sm:block" />
              Empleado
            </div>
            {daysInPeriod.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const holiday = isHoliday(day);
              const sunday = isSunday(day);
              const today = isToday(day);

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'w-9 sm:w-10 py-1 text-center text-[10px] border-r shrink-0 leading-tight',
                    sunday && 'bg-red-50',
                    holiday && 'bg-amber-50',
                    today && 'ring-2 ring-inset ring-primary'
                  )}
                  title={holiday || undefined}
                >
                  <div className="font-medium">{format(day, 'EEE', { locale: es })}</div>
                  <div className={cn('text-muted-foreground', today && 'text-primary font-bold')}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grouped Rows */}
          {groupedEmployees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay empleados activos en el centro seleccionado
            </div>
          ) : (
            groupedEmployees.map((group) => {
              const isCenterExpanded = expandedCenters.has(group.centerId);
              
              return (
                <div key={group.centerId}>
                  {/* Center Header */}
                  <div 
                    className="flex border-t bg-background cursor-pointer hover:bg-slate-200"
                    onClick={() => toggleCenter(group.centerId)}
                  >
                    <div className="w-36 sm:w-56 px-2 sm:px-3 py-2 sm:py-1.5 border-r font-semibold flex items-center gap-1.5 shrink-0 text-xs sticky left-0 bg-background z-10">
                      {isCenterExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      <Building2 className="w-3 h-3 text-primary" />
                      <span className="truncate">{group.centerName}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1">
                        {group.areas.reduce((acc, a) => acc + (a.employees?.length || 0), 0)}
                      </Badge>
                    </div>
                    {daysInPeriod.map((day) => (
                      <div key={format(day, 'yyyy-MM-dd')} className="w-9 sm:w-10 border-r shrink-0" />
                    ))}
                  </div>

                  {/* Areas & Employees */}
                  {isCenterExpanded && group.areas.map((area) => {
                    const areaKey = `${group.centerId}-${area.areaId}`;
                    const isAreaExpanded = expandedAreas.has(areaKey);

                    return (
                      <div key={area.areaId}>
                        {/* Area Header */}
                        <div 
                          className="flex border-t bg-background cursor-pointer hover:bg-background"
                          onClick={() => toggleArea(areaKey)}
                        >
                          <div className="w-36 sm:w-56 px-2 sm:px-3 py-2 sm:py-1.5 pl-4 sm:pl-6 border-r font-medium flex items-center gap-1.5 shrink-0 text-xs sticky left-0 bg-background z-10">
                            {isAreaExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronUp className="w-2.5 h-2.5" />}
                            <span className="truncate">{area.areaName}</span>
                            <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1">
                              {area.employees?.length || 0}
                            </Badge>
                          </div>
                          {daysInPeriod.map((day) => (
                            <div key={format(day, 'yyyy-MM-dd')} className="w-9 sm:w-10 border-r shrink-0" />
                          ))}
                        </div>

                        {/* Employees */}
                        {isAreaExpanded && area.employees?.map((employee) => {
                          const empConfig = employeeModeMap[employee.id];
                          const isAdminMode = empConfig?.mode === 'administrative';
                          const adminSchedule = isAdminMode ? empConfig?.workSchedule : undefined;

                          return (
                          <div key={employee.id} className="flex border-y hover:bg-background -mt-px">
                            <div className="w-36 sm:w-56 px-2 sm:px-3 py-1.5 sm:py-1 pl-5 sm:pl-9 border-r shrink-0 flex items-center gap-1.5 sticky left-0 bg-background z-10">
                              <span className="truncate text-xs">{getEmployeeFullName(employee)}</span>
                              {isAdminMode ? (
                                <Briefcase className="w-3 h-3 text-indigo-500 shrink-0" />
                              ) : (
                                <RotateCcw className="w-3 h-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            {daysInPeriod.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd');
                              const assignment = assignmentsMap[employee.id]?.[dateStr];
                              const shift = assignment ? getShiftById(assignment.shift_id) : null;
                              const holiday = isHoliday(day);
                              const sunday = isSunday(day);
                              const selected = isCellSelected(employee.id, dateStr);
                              const absence = absencesMap[employee.id]?.[dateStr];
                              
                              // Admin mode: derive working day from work_schedule.days_of_week
                              const adminIsWorkDay = adminSchedule?.days_of_week?.includes(day.getDay()) ?? false;

                              // Conflict: work shift assigned on a day with an absence
                              const hasConflict = shift && absence && !shift.is_rest_day;

                              return (
                                <ContextMenu key={dateStr}>
                                  <ContextMenuTrigger>
                                    <div
                                      className={cn(
                                        'w-9 sm:w-10 px-0.5 py-0.5 border-r shrink-0 cursor-pointer transition-colors select-none relative',
                                        sunday && !absence && 'bg-red-50',
                                        holiday && !absence && 'bg-amber-50',
                                        absence && !hasConflict && absence.type === 'vacation' && 'bg-green-50',
                                        absence && !hasConflict && absence.type === 'leave' && 'bg-blue-50',
                                        absence && !hasConflict && absence.type === 'incapacity' && 'bg-orange-50',
                                        hasConflict && 'bg-red-50 ring-2 ring-inset ring-destructive',
                                        selected && 'bg-primary/20 ring-2 ring-inset ring-primary'
                                      )}
                                      onMouseDown={(e) => {
                                        // Only handle left click for selection
                                        if (e.button === 0) {
                                          handleCellMouseDown(employee.id, dateStr);
                                        }
                                      }}
                                      onMouseEnter={() => handleCellMouseEnter(employee.id, dateStr)}
                                      onMouseUp={handleCellMouseUp}
                                    >
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="w-full h-full min-h-[28px] sm:min-h-[20px]">
                                              {/* Conflict indicator badge */}
                                              {hasConflict && (
                                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive rounded-full flex items-center justify-center z-10 shadow-sm">
                                                  <span className="text-[8px] text-destructive-foreground font-bold">!</span>
                                                </div>
                                              )}
                                              
                                              {absence && (!shift || shift.is_rest_day) && (
                                                <div 
                                                  className={cn(
                                              'h-6 rounded text-[10px] font-bold flex items-center justify-center',
                                                    absence.type === 'vacation' && 'bg-green-100 text-green-700 border border-green-300',
                                                    absence.type === 'leave' && 'bg-blue-100 text-blue-700 border border-blue-300',
                                                    absence.type === 'incapacity' && 'bg-orange-100 text-orange-700 border border-orange-300'
                                                  )}
                                                >
                                                  {absence.type === 'vacation' && 'VAC'}
                                                  {absence.type === 'leave' && 'PER'}
                                                  {absence.type === 'incapacity' && 'INC'}
                                                </div>
                                              )}
                                              {shift && !shift.is_rest_day && (
                                                <div
                                                  className={cn(
                                                    'h-6 rounded text-[10px] font-medium flex items-center justify-center',
                                                    (!shift.color || shift.color === 'transparent') ? 'text-foreground bg-background border border-border' : 'text-white',
                                                    hasConflict && 'opacity-70'
                                                  )}
                                                  style={shift.color && shift.color !== 'transparent' ? { backgroundColor: shift.color } : undefined}
                                                >
                                                  {shift.code || shift.name.slice(0, 2).toUpperCase()}
                                                </div>
                                              )}
                                              {shift && shift.is_rest_day && !absence && (
                                                <div className="h-6 rounded text-[10px] font-bold flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-300">
                                                  D
                                                </div>
                                              )}
                                              {/* Admin schedule: working day */}
                                              {isAdminMode && !shift && !absence && adminIsWorkDay && (
                                                <div className="h-6 rounded text-[10px] font-bold flex items-center justify-center bg-indigo-100 text-indigo-700 border border-indigo-300">
                                                  {adminSchedule?.name?.slice(0, 3).toUpperCase() || 'ADM'}
                                                </div>
                                              )}
                                              {/* Admin rest day: show D */}
                                              {isAdminMode && !shift && !absence && !adminIsWorkDay && (
                                                <div className="h-6 rounded text-[10px] font-bold flex items-center justify-center bg-emerald-100 text-emerald-700 border border-emerald-300">
                                                  D
                                                </div>
                                              )}
                                              {/* Empty: non-admin with no shift/absence */}
                                              {!isAdminMode && !shift && !absence && <div className="h-7 sm:h-6" />}
                                            </div>
                                          </TooltipTrigger>
                                          
                                          {/* Conflict tooltip */}
                                          {hasConflict && (
                                            <TooltipContent side="top" className="bg-red-50 border-destructive/30 max-w-[200px]">
                                              <div className="space-y-1">
                                                <p className="font-semibold text-destructive flex items-center gap-1">
                                                  <AlertTriangle className="w-3 h-3" />
                                                  Conflicto detectado
                                                </p>
                                                <p className="text-sm text-foreground">Turno: {shift.name}</p>
                                                <p className="text-sm text-foreground">Novedad: {absence.description}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  Click derecho → Eliminar
                                                </p>
                                              </div>
                                            </TooltipContent>
                                          )}
                                          
                                          {/* Absence-only tooltip */}
                                          {absence && !hasConflict && (
                                            <TooltipContent>
                                              <p className="font-medium">{absence.description}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {absence.start_date} - {absence.end_date}
                                              </p>
                                            </TooltipContent>
                                          )}
                                          
                                          {/* Shift-only tooltip */}
                                          {shift && !absence && (
                                            <TooltipContent>
                                              <p>{shift.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
                                              </p>
                                              <p className="text-xs text-muted-foreground mt-1">Click derecho para opciones</p>
                                            </TooltipContent>
                                          )}
                                          
                                          {/* Admin schedule tooltip */}
                                          {isAdminMode && !shift && !absence && adminIsWorkDay && adminSchedule && (
                                            <TooltipContent>
                                              <p className="font-medium">{adminSchedule.name}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {adminSchedule.start_time?.slice(0, 5)} - {adminSchedule.end_time?.slice(0, 5)}
                                              </p>
                                              <p className="text-xs text-muted-foreground">Descanso: {adminSchedule.break_minutes} min</p>
                                            </TooltipContent>
                                          )}

                                          {/* Empty cell tooltip */}
                                          {!shift && !absence && (!isAdminMode || !adminIsWorkDay) && (
                                            <TooltipContent>
                                              <p className="text-xs text-muted-foreground">
                                                {isAdminMode ? 'Día de descanso (horario administrativo)' : 'Click derecho para asignar turno'}
                                              </p>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  </ContextMenuTrigger>
                                  
                                  <ContextMenuContent className="w-48 bg-background">
                                    {/* Assign shift (when no shift exists) */}
                                    {!assignment && !absence && (
                                      <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                          <Plus className="w-3 h-3" />
                                          Asignar turno
                                        </div>
                                        {activeShifts.map((s) => (
                                          <ContextMenuItem
                                            key={s.id}
                                            onClick={() => {
                                              createBulkAssignments.mutate([{
                                                employee_id: employee.id,
                                                shift_id: s.id,
                                                assignment_date: dateStr,
                                                source: 'manual' as const,
                                              }], {
                                                onSuccess: () => toast.success('Turno asignado'),
                                                onError: (error: any) => toast.error('Error', { description: error.message })
                                              });
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="truncate">{s.name}</span>
                                            {s.is_rest_day && <Badge variant="secondary" className="text-[10px] ml-auto">D</Badge>}
                                          </ContextMenuItem>
                                        ))}
                                      </>
                                    )}
                                    
                                    {/* Change/Delete shift (when shift exists) */}
                                    {assignment && (
                                      <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                                          <Edit className="w-3 h-3" />
                                          Cambiar turno
                                        </div>
                                        {activeShifts.filter(s => s.id !== assignment.shift_id).map((s) => (
                                          <ContextMenuItem
                                            key={s.id}
                                            onClick={() => {
                                              createBulkAssignments.mutate([{
                                                employee_id: employee.id,
                                                shift_id: s.id,
                                                assignment_date: dateStr,
                                                source: 'manual' as const,
                                              }], {
                                                onSuccess: () => toast.success('Turno cambiado'),
                                                onError: (error: any) => toast.error('Error', { description: error.message })
                                              });
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="truncate">{s.name}</span>
                                            {s.is_rest_day && <Badge variant="secondary" className="text-[10px] ml-auto">D</Badge>}
                                          </ContextMenuItem>
                                        ))}
                                        <ContextMenuSeparator />
                                        <ContextMenuItem
                                          onClick={() => {
                                            deleteAssignment.mutate(assignment.id, {
                                              onSuccess: () => toast.success('Asignación eliminada'),
                                              onError: (error: any) => toast.error('Error', { description: error.message })
                                            });
                                          }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Eliminar asignación
                                        </ContextMenuItem>
                                      </>
                                    )}
                                    
                                    {/* Absence day - can only assign rest days */}
                                    {absence && !assignment && (
                                      <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                          Solo descansos (hay novedad)
                                        </div>
                                        {activeShifts.filter(s => s.is_rest_day).map((s) => (
                                          <ContextMenuItem
                                            key={s.id}
                                            onClick={() => {
                                              createBulkAssignments.mutate([{
                                                employee_id: employee.id,
                                                shift_id: s.id,
                                                assignment_date: dateStr,
                                                source: 'manual' as const,
                                              }], {
                                                onSuccess: () => toast.success('Turno asignado'),
                                                onError: (error: any) => toast.error('Error', { description: error.message })
                                              });
                                            }}
                                            className="flex items-center gap-2"
                                          >
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                            <span className="truncate">{s.name}</span>
                                            <Badge variant="secondary" className="text-[10px] ml-auto">D</Badge>
                                          </ContextMenuItem>
                                        ))}
                                        {activeShifts.filter(s => s.is_rest_day).length === 0 && (
                                          <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                                            No hay turnos de descanso configurados
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </ContextMenuContent>
                                </ContextMenu>
                              );
                            })}
                          </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Instructions */}
      <p className="text-xs sm:text-sm text-muted-foreground">
        💡 <span className="hidden sm:inline"><strong>Clic izquierdo y arrastre</strong> para selección múltiple. <strong>Clic derecho</strong> sobre un día para opciones rápidas.</span>
        <span className="sm:hidden"><strong>Desliza</strong> para selección múltiple. Mantén presionado para opciones.</span>
      </p>

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={(open) => {
        setShowAssignDialog(open);
        if (!open) clearSelection();
      }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Asignar Turno</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto min-h-0 px-1 pb-1 sm:px-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Se asignará el turno a <strong>{selectedCells[0]?.dates.length || 0}</strong> día(s).
              </p>
              
              {/* Show existing assignments info */}
              {selectedCells.length > 0 && (() => {
                const existingAssignments = selectedCells[0]?.dates.filter(date => 
                  assignmentsMap[selectedCells[0].employeeId]?.[date]
                ) || [];
                if (existingAssignments.length > 0) {
                  return (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      ⚠️ {existingAssignments.length} día(s) ya tienen turno asignado y serán reemplazados.
                    </p>
                  );
                }
                return null;
              })()}
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
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                        <span>{shift.name}</span>
                        {shift.is_rest_day && <Badge variant="secondary" className="text-xs">Descanso</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col-reverse sm:flex-row gap-2 pt-2">
            {/* Delete button - only show when there are existing assignments */}
            {selectedCells.length > 0 && selectedCells[0]?.dates.some(date => 
              assignmentsMap[selectedCells[0].employeeId]?.[date]
            ) && (
              <Button 
                variant="destructive" 
                className="w-full sm:w-auto sm:mr-auto"
                onClick={async () => {
                  const assignmentsToDelete = selectedCells[0]?.dates
                    .map(date => assignmentsMap[selectedCells[0].employeeId]?.[date])
                    .filter(Boolean) as EmployeeShiftAssignment[];
                  
                  if (assignmentsToDelete.length === 0) return;
                  
                  try {
                    for (const assignment of assignmentsToDelete) {
                      await deleteAssignment.mutateAsync(assignment.id);
                    }
                    toast.success(`${assignmentsToDelete.length} asignación(es) eliminada(s)`);
                    setShowAssignDialog(false);
                    clearSelection();
                  } catch (error: any) {
                    toast.error('Error', { description: error.message });
                  }
                }}
                disabled={deleteAssignment.isPending}
              >
                {deleteAssignment.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar
              </Button>
            )}
            
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setShowAssignDialog(false); clearSelection(); }}>
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto" onClick={handleAssign} disabled={!selectedShiftId || createBulkAssignments.isPending}>
                {createBulkAssignments.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Asignar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
