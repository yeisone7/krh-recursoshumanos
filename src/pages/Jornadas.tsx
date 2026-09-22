import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Briefcase,
  RotateCcw,
  Users,
  Calendar,
  Zap,
  FileSpreadsheet,
  Loader2,
  Maximize2,
  Minimize2,
  Building2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { 
  useWorkSchedules, 
  useShifts, 
  useShiftCycles,
  useDeleteWorkSchedule,
  useDeleteShift,
  useDeleteShiftCycle,
} from '@/hooks/useSchedules';
import { useOperationCenters } from '@/hooks/useCompanies';
import { 
  WorkScheduleFormDialog, 
  ShiftFormDialog, 
  ShiftCycleFormDialog,
  ShiftCalendar,
  CycleGeneratorDialog,
  BulkCycleGeneratorDialog,
  ShiftReportExport,
} from '@/components/schedules';
import { DAY_NAMES_SHORT } from '@/types/schedule';
import type { WorkSchedule, Shift, ShiftCycle } from '@/types/schedule';
import { filterDayShiftsForCenter } from '@/lib/scheduleCenterScope';
import { exportDayShiftsToExcel } from '@/lib/dayShiftExporter';

const DAY_BADGE_COLORS: Record<number, string> = {
  1: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/20', // Lun
  2: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/20', // Mar
  3: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20', // Mié
  4: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20', // Jue
  5: 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20', // Vie
  6: 'bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/20', // Sáb
  0: 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20', // Dom
};

const getShiftColor = (color?: string) => {
  if (!color || color === 'transparent' || color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff') {
    return '#3b82f6';
  }
  return color;
};

export default function Jornadas() {
  const [searchParams] = useSearchParams();
  const isShiftsCatalog = searchParams.get('tab') === 'shifts';
  const [activeTab, setActiveTab] = useState<'calendar' | 'schedules' | 'shifts' | 'day-shifts' | 'cycles'>(isShiftsCatalog ? 'shifts' : 'calendar');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dayShiftCenterFilter, setDayShiftCenterFilter] = useState('all');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(false);
  
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkGeneratorDialog, setShowBulkGeneratorDialog] = useState(false);
  const [isExportingDayShifts, setIsExportingDayShifts] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<ShiftCycle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: workSchedules = [], isLoading: loadingSchedules } = useWorkSchedules();
  const { data: shifts = [], isLoading: loadingShifts } = useShifts();
  const { data: dayShifts = [], isLoading: loadingDayShifts } = useShifts('day');
  const { data: shiftCycles = [], isLoading: loadingCycles } = useShiftCycles();
  const { data: operationCenters = [] } = useOperationCenters();
  
  const deleteSchedule = useDeleteWorkSchedule();
  const deleteShift = useDeleteShift();
  const deleteCycle = useDeleteShiftCycle();

  const stats = useMemo(() => ([
    { label: 'HORARIOS', value: workSchedules.filter(s => s.is_active).length, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-500/10' },
    { label: 'TURNOS', value: shifts.filter(s => s.is_active).length, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
    { label: 'CICLOS', value: shiftCycles.filter(c => c.is_active).length, icon: RotateCcw, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  ]), [workSchedules, shifts, shiftCycles]);

  const formatTime = (time: string) => time?.slice(0, 5) || '';
  const filteredSchedules = workSchedules.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredShifts = shifts.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredDayShifts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');
    return filterDayShiftsForCenter(dayShifts, dayShiftCenterFilter).filter((shift) => {
      if (!normalizedQuery) return true;
      const centerNames = shift.shift_operation_centers
        ?.map((scope) => scope.operation_centers?.name ?? '')
        .join(' ') ?? '';
      return [shift.name, shift.code, shift.description, centerNames]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase('es').includes(normalizedQuery));
    });
  }, [dayShifts, dayShiftCenterFilter, searchQuery]);
  const filteredCycles = shiftCycles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedDayShiftCenterLabel = useMemo(() => {
    if (dayShiftCenterFilter === 'all') return 'Todos (incluye turnos globales)';
    if (dayShiftCenterFilter === 'global') return 'Solo turnos globales';
    return operationCenters.find((center) => center.id === dayShiftCenterFilter)?.name ?? 'Centro seleccionado';
  }, [dayShiftCenterFilter, operationCenters]);

  const handleExportDayShifts = async () => {
    if (filteredDayShifts.length === 0) {
      toast.warning('No hay Turnos Día para exportar con los filtros actuales');
      return;
    }

    setIsExportingDayShifts(true);
    try {
      await exportDayShiftsToExcel(filteredDayShifts, {
        centerFilterLabel: selectedDayShiftCenterLabel,
        searchQuery,
      });
      toast.success(`${filteredDayShifts.length} Turnos Día exportados a Excel`);
    } catch (error: unknown) {
      toast.error('No se pudo exportar Turnos Día', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsExportingDayShifts(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'schedule') await deleteSchedule.mutateAsync(deleteConfirm.id);
      else if (deleteConfirm.type === 'shift' || deleteConfirm.type === 'day-shift') await deleteShift.mutateAsync(deleteConfirm.id);
      else if (deleteConfirm.type === 'cycle') await deleteCycle.mutateAsync(deleteConfirm.id);
      toast.success('Eliminado correctamente');
    } catch (error: unknown) {
      toast.error('Error', { description: error instanceof Error ? error.message : 'No se pudo eliminar el registro' });
    }
    setDeleteConfirm(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-border flex items-center justify-center mb-6">
          <Clock className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Compañía No Vinculada</h2>
        <p className="text-muted-foreground font-medium mt-2">Seleccione una organización para gestionar sus jornadas.</p>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col p-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="w-4 h-4" />
             </div>
             <h2 className="font-black text-foreground tracking-tight uppercase text-sm">Calendario de Turnos Operativos</h2>
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold uppercase tracking-widest text-[10px]" onClick={() => setIsFullscreen(false)}>
            <Minimize2 className="w-3.5 h-3.5 mr-2" />
            Restaurar
          </Button>
        </div>
        <div className="flex-1 bg-white rounded-2xl border border-border p-4 overflow-hidden">
          <ShiftCalendar containedScroll />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Flat Premium Header */}
      <div className="relative shrink-0 bg-white px-6 py-8 sm:px-10 sm:py-10 border-b border-border">
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0.5 rounded-md">
                  Operaciones / RRHH
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">{isShiftsCatalog ? 'Turnos' : 'Jornadas'}</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              {isShiftsCatalog ? 'Configuración de los turnos operativos disponibles para la organización.' : 'Planificación estratégica de horarios administrativos y rotación de personal operativo con visualización en tiempo real.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[450px]">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden p-4 rounded-2xl bg-slate-50 border border-border transition-colors hover:bg-slate-100/70"
              >
                <div className={`absolute top-3 right-3 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-60`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full md:w-auto">
          <TabsList className="h-12 bg-slate-100 p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto overflow-y-hidden scrollbar-hide">
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none gap-2 rounded-lg font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1 sm:flex-none gap-2 rounded-lg font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="day-shifts" className="flex-1 sm:flex-none gap-2 rounded-lg font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Turnos Día</span>
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex-1 sm:flex-none gap-2 rounded-lg font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-white data-[state=active]:text-primary transition-all">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ciclos</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {activeTab !== 'calendar' && (
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Filtrar registros..."
                className="pl-11 h-12 rounded-xl bg-white border-border focus:ring-0 focus:border-primary transition-all text-sm font-bold placeholder:font-normal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {activeTab === 'day-shifts' && (
            <Select value={dayShiftCenterFilter} onValueChange={setDayShiftCenterFilter}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border bg-white sm:w-64" aria-label="Filtrar Turnos Día por centro">
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Todos los centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="global">Globales</SelectItem>
                {operationCenters.filter((center) => center.is_active).map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'day-shifts' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-12 w-full rounded-xl border-border bg-white px-5 font-bold sm:w-auto"
                onClick={() => void handleExportDayShifts()}
                disabled={loadingDayShifts || isExportingDayShifts || filteredDayShifts.length === 0}
              >
                {isExportingDayShifts ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                )}
                Exportar Excel
              </Button>
            )}
            {activeTab === 'calendar' ? (
              <Button size="sm" className="h-12 w-full sm:w-auto px-6 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px]" onClick={() => setShowGeneratorDialog(true)}>
                <Zap className="w-4 h-4 mr-2" />
                Generar
              </Button>
            ) : (
              <Button size="sm" className="h-12 w-full sm:w-auto px-8 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px]" onClick={() => {
                if (activeTab === 'schedules') { setSelectedSchedule(null); setShowScheduleForm(true); }
                else if (activeTab === 'shifts' || activeTab === 'day-shifts') { setSelectedShift(null); setShowShiftForm(true); }
                else if (activeTab === 'cycles') { setSelectedCycle(null); setShowCycleForm(true); }
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-12 w-12 rounded-xl border-border bg-white p-0">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white rounded-2xl border border-border shadow-md">
                 <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold cursor-pointer" onClick={() => setShowBulkGeneratorDialog(true)}>
                    <Users className="w-4 h-4 mr-3 text-primary" /> Generar Masivo
                 </DropdownMenuItem>
                 {activeTab !== 'day-shifts' && (
                   <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold cursor-pointer" onClick={() => setShowExportDialog(true)}>
                      <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-600" /> Exportar Excel
                   </DropdownMenuItem>
                 )}
                 <DropdownMenuSeparator />
                 <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold cursor-pointer" onClick={() => setIsFullscreen(true)}>
                    <Maximize2 className="w-4 h-4 mr-3" /> Pantalla Completa
                 </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        <Tabs value={activeTab} className="w-full">
          {/* Horarios Content */}
          <TabsContent value="schedules" className="m-0 focus-visible:ring-0">
             {loadingSchedules ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredSchedules.map((schedule) => (
                      <div 
                        key={schedule.id}
                        className="group p-6 rounded-2xl bg-white border border-border hover:border-primary/50 transition-colors"
                      >
                         <div className="relative flex flex-col h-full gap-5">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-2 rounded">Administrativo</Badge>
                                  <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-1">{schedule.name}</h3>
                               </div>
                               <Badge variant="outline" className={schedule.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none'}>
                                  {schedule.is_active ? 'Vigente' : 'Inactivo'}
                               </Badge>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-border">
                               <div className="p-2 rounded-lg bg-white text-primary border border-border">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                   <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Franja Horaria</p>
                                   <p className="font-black text-foreground text-sm tracking-tight">
                                      {formatTime(schedule.start_time)} — {formatTime(schedule.end_time)}
                                   </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                               {schedule.days_of_week.map(d => (
                                   <Badge 
                                     key={d} 
                                     variant="outline" 
                                     className={cn(
                                       "text-[9px] font-black tracking-tighter px-2.5 h-5 rounded-md border transition-all duration-200 shadow-none",
                                       DAY_BADGE_COLORS[d] || 'border-border bg-slate-50 text-muted-foreground'
                                     )}
                                   >
                                      {DAY_NAMES_SHORT[d]}
                                   </Badge>
                                ))}
                            </div>

                            <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
                               <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Receso: {schedule.break_minutes} min
                                </div>
                               <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-slate-100 hover:text-foreground transition-all" onClick={() => { setSelectedSchedule(schedule); setShowScheduleForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={() => setDeleteConfirm({ type: 'schedule', id: schedule.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Turnos Día Content */}
          <TabsContent value="day-shifts" className="m-0 focus-visible:ring-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="overflow-x-auto">
                <Table className="min-w-[860px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[28%]">Turno / código</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead className="w-[30%]">Centros</TableHead>
                      <TableHead>Receso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingDayShifts ? (
                      [1, 2, 3].map((row) => (
                        <TableRow key={row}>
                          <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredDayShifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-44 text-center">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Clock className="h-8 w-8 opacity-40" />
                            <p className="font-semibold">No hay Turnos Día para estos filtros</p>
                            <p className="text-xs">Prueba otra búsqueda o centro de operación.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredDayShifts.map((shift) => {
                      const shiftCenters = shift.shift_operation_centers ?? [];
                      return (
                        <TableRow key={shift.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full border border-black/5"
                                style={{ backgroundColor: getShiftColor(shift.color) }}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-foreground">{shift.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {shift.code ? `#${shift.code}` : 'Sin código'}
                                  {shift.description ? ` · ${shift.description}` : ''}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                            {shift.crosses_midnight && (
                              <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-[9px] text-amber-700">Nocturno</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {shiftCenters.length === 0 ? (
                              <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">Todos los centros</Badge>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {shiftCenters.slice(0, 3).map((scope) => (
                                  <Badge key={scope.operation_center_id} variant="secondary" className="font-medium">
                                    {scope.operation_centers?.name ?? 'Centro no disponible'}
                                  </Badge>
                                ))}
                                {shiftCenters.length > 3 && (
                                  <Badge variant="outline">+{shiftCenters.length - 3}</Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{shift.break_minutes} min</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={shift.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}>
                              {shift.is_active ? 'Vigente' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                aria-label={`Editar ${shift.name}`}
                                onClick={() => { setSelectedShift(shift); setShowShiftForm(true); }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 hover:bg-rose-50 hover:text-rose-600"
                                aria-label={`Eliminar ${shift.name}`}
                                onClick={() => setDeleteConfirm({ type: 'day-shift', id: shift.id })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {!loadingDayShifts && filteredDayShifts.length > 0 && (
                <div className="border-t border-border bg-slate-50 px-5 py-3 text-xs font-medium text-muted-foreground">
                  {filteredDayShifts.length} de {dayShifts.length} turnos visibles
                </div>
              )}
            </div>
          </TabsContent>

          {/* Turnos operativos Content */}
          <TabsContent value="shifts" className="m-0 focus-visible:ring-0">
             {loadingShifts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredShifts.map((shift) => (
                      <div 
                        key={shift.id}
                        className="group p-6 rounded-2xl bg-white border border-border hover:border-primary/50 transition-colors"
                      >
                         <div className="relative flex flex-col h-full gap-5">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full animate-pulse shadow-sm" style={{ backgroundColor: getShiftColor(shift.color) }} />
                                     {shift.is_rest_day ? (
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-none">
                                           DESCANSO
                                        </Badge>
                                     ) : (
                                        <Badge 
                                          variant="outline" 
                                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded transition-all duration-200 shadow-none" 
                                          style={{ 
                                            borderColor: `${getShiftColor(shift.color)}40`, 
                                            color: getShiftColor(shift.color), 
                                            backgroundColor: `${getShiftColor(shift.color)}10` 
                                          }}
                                        >
                                           OPERATIVO
                                        </Badge>
                                     )}
                                  </div>
                                  <h3 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2 line-clamp-1">
                                     {shift.name}
                                     {shift.code && <span className="text-xs font-mono text-muted-foreground/50">#{shift.code}</span>}
                                  </h3>
                               </div>
                               <Badge variant="outline" className={shift.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none'}>
                                  {shift.is_active ? 'Vigente' : 'Inactivo'}
                               </Badge>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-border">
                               <div className="p-2 rounded-lg bg-white border border-border flex items-center justify-center shrink-0" style={{ color: getShiftColor(shift.color) }}>
                                  <Clock className="w-4 h-4" />
                               </div>
                               <div className="space-y-0.5">
                                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Horario del Turno</p>
                                  <p className="font-black text-foreground text-sm tracking-tight">
                                     {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                                  </p>
                               </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                               {shift.description || 'Sin descripción adicional para este turno operativo.'}
                            </div>

                            <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                     <RotateCcw className="w-3.5 h-3.5" />
                                     Receso: {shift.break_minutes} min
                                  </div>
                                  {shift.crosses_midnight && (
                                     <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-500/5 text-amber-600 border-amber-500/10 rounded-md">Nocturno</Badge>
                                  )}
                               </div>
                               <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-slate-100 hover:text-foreground transition-all" onClick={() => { setSelectedShift(shift); setShowShiftForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={() => setDeleteConfirm({ type: 'shift', id: shift.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Ciclos Content */}
          <TabsContent value="cycles" className="m-0 focus-visible:ring-0">
             {loadingCycles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredCycles.map((cycle) => (
                      <div 
                        key={cycle.id}
                        className="group p-6 rounded-2xl bg-white border border-border hover:border-primary/50 transition-colors"
                      >
                         <div className="relative flex flex-col h-full gap-5">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2 rounded">Rotativo</Badge>
                                  <h3 className="text-lg font-black text-foreground tracking-tight line-clamp-1">{cycle.name}</h3>
                               </div>
                               <Badge variant="outline" className={cycle.is_active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md shadow-none'}>
                                  {cycle.is_active ? 'Vigente' : 'Inactivo'}
                               </Badge>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-border">
                               <div className="p-2 rounded-lg bg-white text-emerald-600 border border-border animate-pulse">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5 flex-1">
                                   <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Duración del Ciclo</p>
                                   <p className="font-black text-foreground text-sm tracking-tight">
                                      {cycle.total_days} días — {cycle.cycle_days?.length || 0} Hitos / Turnos
                                   </p>
                                </div>
                             </div>

                             <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic line-clamp-2 min-h-[2.5rem]">
                                {cycle.description || 'Configuración de rotación secuencial para personal de planta y operaciones externas.'}
                             </p>

                             <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                   Cód: {cycle.code || 'UNSET'}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-slate-100 hover:text-foreground transition-all" onClick={() => { setSelectedCycle(cycle); setShowCycleForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all" onClick={() => setDeleteConfirm({ type: 'cycle', id: cycle.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                             </div>
                          </div>
                      </div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Calendar Content */}
          <TabsContent value="calendar" className="m-0 focus-visible:ring-0">
             <div className="bg-white rounded-2xl border border-border p-6 sm:p-10 overflow-hidden min-h-[600px] flex flex-col">
                <ShiftCalendar />
             </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Dialogs */}
      <WorkScheduleFormDialog open={showScheduleForm} onOpenChange={setShowScheduleForm} schedule={selectedSchedule} />
      <ShiftFormDialog open={showShiftForm} onOpenChange={setShowShiftForm} shift={selectedShift} kind={activeTab === 'day-shifts' ? 'day' : 'operational'} />
      <ShiftCycleFormDialog open={showCycleForm} onOpenChange={setShowCycleForm} cycle={selectedCycle} />
      <CycleGeneratorDialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog} />
      <ShiftReportExport open={showExportDialog} onOpenChange={setShowExportDialog} />
      <BulkCycleGeneratorDialog open={showBulkGeneratorDialog} onOpenChange={setShowBulkGeneratorDialog} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-white border border-border shadow-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">¿Confirmar Eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground text-sm">
              Esta operación es irreversible y afectará la planificación histórica vinculada a este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl h-12 px-6 font-bold uppercase tracking-widest text-[11px] border-border bg-white text-foreground hover:bg-slate-50 transition-colors">Mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[11px] transition-colors">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
