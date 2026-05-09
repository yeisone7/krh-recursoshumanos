import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Loader2,
  Zap,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { useIsMobile } from '@/hooks/use-mobile';
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

export default function Jornadas() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'calendar' | 'schedules' | 'shifts' | 'cycles'>('calendar');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(false);
  
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showBulkGeneratorDialog, setShowBulkGeneratorDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<WorkSchedule | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<ShiftCycle | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: workSchedules = [], isLoading: loadingSchedules } = useWorkSchedules();
  const { data: shifts = [], isLoading: loadingShifts } = useShifts();
  const { data: shiftCycles = [], isLoading: loadingCycles } = useShiftCycles();
  
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
  const filteredCycles = shiftCycles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'schedule') await deleteSchedule.mutateAsync(deleteConfirm.id);
      else if (deleteConfirm.type === 'shift') await deleteShift.mutateAsync(deleteConfirm.id);
      else if (deleteConfirm.type === 'cycle') await deleteCycle.mutateAsync(deleteConfirm.id);
      toast.success('Eliminado correctamente');
    } catch (error: any) {
      toast.error('Error', { description: error.message });
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
        <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-muted-foreground/40" />
        </div>
        <h2 className="text-2xl font-black text-foreground tracking-tight">Compañía No Vinculada</h2>
        <p className="text-muted-foreground font-medium mt-2">Seleccione una organización para gestionar sus jornadas.</p>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col p-2 sm:p-4">
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
        <div className="flex-1 bg-muted/10 rounded-2xl border border-primary/5 p-4 overflow-hidden">
          <ShiftCalendar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50 overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 px-6 py-8 sm:px-10 sm:py-10 border-b border-primary/5">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-accent/5 blur-[80px] pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-xl shadow-primary/20 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Operaciones / RRHH
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Jornadas & Turnos</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Planificación estratégica de horarios administrativos y rotación de personal operativo con visualización en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 lg:min-w-[450px]">
            {stats.map((stat, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={stat.label}
                className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-primary/5 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500"
              >
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background/60 backdrop-blur-xl border-b border-primary/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
          <TabsList className="h-12 bg-muted/40 p-1 rounded-2xl border border-primary/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            <TabsTrigger value="calendar" className="flex-1 sm:flex-none gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1 sm:flex-none gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
            <TabsTrigger value="shifts" className="flex-1 sm:flex-none gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Turnos</span>
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex-1 sm:flex-none gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider h-10 px-6 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all">
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
                className="pl-11 h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'calendar' ? (
              <Button size="sm" className="h-12 w-full sm:w-auto px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20" onClick={() => setShowGeneratorDialog(true)}>
                <Zap className="w-4 h-4 mr-2" />
                Generar
              </Button>
            ) : (
              <Button size="sm" className="h-12 w-full sm:w-auto px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20" onClick={() => {
                if (activeTab === 'schedules') { setSelectedSchedule(null); setShowScheduleForm(true); }
                else if (activeTab === 'shifts') { setSelectedShift(null); setShowShiftForm(true); }
                else if (activeTab === 'cycles') { setSelectedCycle(null); setShowCycleForm(true); }
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-12 w-12 rounded-2xl border-primary/10 bg-background/50 p-0">
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl rounded-2xl border-primary/10 shadow-2xl">
                 <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold" onClick={() => setShowBulkGeneratorDialog(true)}>
                    <Users className="w-4 h-4 mr-3 text-primary" /> Generar Masivo
                 </DropdownMenuItem>
                 <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold" onClick={() => setShowExportDialog(true)}>
                    <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-600" /> Exportar Excel
                 </DropdownMenuItem>
                 <DropdownMenuSeparator />
                 <DropdownMenuItem className="p-3 rounded-xl m-1 font-bold" onClick={() => setIsFullscreen(true)}>
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
                  {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem]" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredSchedules.map((schedule) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={schedule.id}
                        className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-background border border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500"
                      >
                         <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                            <Briefcase className="w-24 h-24" />
                         </div>
                         <div className="relative flex flex-col h-full gap-6">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-2">Administrativo</Badge>
                                  <h3 className="text-xl font-black text-foreground tracking-tight line-clamp-1">{schedule.name}</h3>
                               </div>
                               <Badge variant={schedule.is_active ? 'outline' : 'secondary'} className={schedule.is_active ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10 font-bold' : 'font-bold opacity-50'}>
                                  {schedule.is_active ? 'Vigente' : 'Inactivo'}
                               </Badge>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-muted/30 border border-primary/5">
                               <div className="p-2 rounded-xl bg-background text-primary shadow-sm">
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
                                  <Badge key={d} variant="outline" className="text-[9px] font-black tracking-tighter px-2 h-5 border-primary/10 group-hover:border-primary/30 transition-colors">
                                     {DAY_NAMES_SHORT[d]}
                                  </Badge>
                               ))}
                            </div>

                            <div className="pt-4 mt-auto border-t border-primary/5 flex items-center justify-between">
                               <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Receso: {schedule.break_minutes} min
                               </div>
                               <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { setSelectedSchedule(schedule); setShowScheduleForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => setDeleteConfirm({ type: 'schedule', id: schedule.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Turnos Content */}
          <TabsContent value="shifts" className="m-0 focus-visible:ring-0">
             {loadingShifts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem]" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredShifts.map((shift) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={shift.id}
                        className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-background border border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500"
                      >
                         <div className="absolute top-0 right-0 p-8 opacity-[0.05]" style={{ color: shift.color }}>
                            <Clock className="w-24 h-24" />
                         </div>
                         <div className="relative flex flex-col h-full gap-6">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: shift.color }} />
                                     <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2" style={{ borderColor: `${shift.color}40`, color: shift.color, backgroundColor: `${shift.color}05` }}>
                                        {shift.is_rest_day ? 'DESCANSO' : 'OPERATIVO'}
                                     </Badge>
                                  </div>
                                  <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
                                     {shift.name}
                                     {shift.code && <span className="text-xs font-mono text-muted-foreground/50">#{shift.code}</span>}
                                  </h3>
                               </div>
                            </div>

                            <div className="flex items-center gap-4">
                               <div className="flex-1 p-4 rounded-2xl bg-muted/30 border border-primary/5 text-center group-hover:bg-background transition-colors">
                                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase mb-1">INICIO</p>
                                  <p className="text-lg font-black text-foreground tracking-tighter">{formatTime(shift.start_time)}</p>
                               </div>
                               <div className="flex-1 p-4 rounded-2xl bg-muted/30 border border-primary/5 text-center group-hover:bg-background transition-colors">
                                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase mb-1">FIN</p>
                                  <p className="text-lg font-black text-foreground tracking-tighter">{formatTime(shift.end_time)}</p>
                               </div>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground leading-relaxed line-clamp-2 min-h-[2.5rem]">
                               {shift.description || 'Sin descripción adicional para este turno operativo.'}
                            </div>

                            <div className="pt-4 mt-auto border-t border-primary/5 flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                     <RotateCcw className="w-3.5 h-3.5" />
                                     {shift.break_minutes}m
                                  </div>
                                  {shift.crosses_midnight && (
                                     <Badge variant="outline" className="text-[9px] font-black uppercase bg-amber-500/5 text-amber-600 border-amber-500/10">Nocturno</Badge>
                                  )}
                               </div>
                               <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { setSelectedShift(shift); setShowShiftForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => setDeleteConfirm({ type: 'shift', id: shift.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Ciclos Content */}
          <TabsContent value="cycles" className="m-0 focus-visible:ring-0">
             {loadingCycles ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem]" />)}
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredCycles.map((cycle) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={cycle.id}
                        className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-background border border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all duration-500"
                      >
                         <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.1] transition-opacity">
                            <RotateCcw className="w-24 h-24" />
                         </div>
                         <div className="relative flex flex-col h-full gap-6">
                            <div className="flex items-start justify-between">
                               <div className="space-y-1">
                                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2">Rotativo</Badge>
                                  <h3 className="text-xl font-black text-foreground tracking-tight line-clamp-1">{cycle.name}</h3>
                               </div>
                            </div>

                            <div className="flex items-center gap-6">
                               <div className="space-y-1 flex-1">
                                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">Duración Total</p>
                                  <p className="text-2xl font-black text-primary tracking-tighter">{cycle.total_days} <span className="text-sm">días</span></p>
                               </div>
                               <div className="w-16 h-16 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col items-center justify-center">
                                  <p className="text-xs font-black text-primary">{cycle.cycle_days?.length || 0}</p>
                                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Hitos</p>
                               </div>
                            </div>

                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic line-clamp-2">
                               {cycle.description || 'Configuración de rotación secuencial para personal de planta y operaciones externas.'}
                            </p>

                            <div className="pt-4 mt-auto border-t border-primary/5 flex items-center justify-between">
                               <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                  Cód: {cycle.code || 'UNSET'}
                               </div>
                               <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { setSelectedCycle(cycle); setShowCycleForm(true); }}>
                                     <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => setDeleteConfirm({ type: 'cycle', id: cycle.id })}>
                                     <Trash2 className="w-4 h-4" />
                                  </Button>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                   ))}
                </div>
             )}
          </TabsContent>

          {/* Calendar Content */}
          <TabsContent value="calendar" className="m-0 focus-visible:ring-0">
             <div className="bg-background rounded-[2.5rem] border border-primary/10 p-6 sm:p-10 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
                <ShiftCalendar />
             </div>
          </TabsContent>
        </Tabs>
      </ScrollArea>

      {/* Dialogs */}
      <WorkScheduleFormDialog open={showScheduleForm} onOpenChange={setShowScheduleForm} schedule={selectedSchedule} />
      <ShiftFormDialog open={showShiftForm} onOpenChange={setShowShiftForm} shift={selectedShift} />
      <ShiftCycleFormDialog open={showCycleForm} onOpenChange={setShowCycleForm} cycle={selectedCycle} />
      <CycleGeneratorDialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog} />
      <ShiftReportExport open={showExportDialog} onOpenChange={setShowExportDialog} />
      <BulkCycleGeneratorDialog open={showBulkGeneratorDialog} onOpenChange={setShowBulkGeneratorDialog} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-xl border-none shadow-2xl rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">¿Confirmar Eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground">
              Esta operación es irreversible y afectará la planificación histórica vinculada a este registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-2xl h-12 px-8 font-bold uppercase tracking-widest text-[11px]">Mantener</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-2xl h-12 px-10 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-destructive/20">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

