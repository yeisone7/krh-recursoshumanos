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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  // Stats
  const stats = useMemo(() => ({
    schedules: workSchedules.filter(s => s.is_active).length,
    shifts: shifts.filter(s => s.is_active).length,
    cycles: shiftCycles.filter(c => c.is_active).length,
  }), [workSchedules, shifts, shiftCycles]);

  const formatTime = (time: string) => time?.slice(0, 5) || '';

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      if (deleteConfirm.type === 'schedule') {
        await deleteSchedule.mutateAsync(deleteConfirm.id);
      } else if (deleteConfirm.type === 'shift') {
        await deleteShift.mutateAsync(deleteConfirm.id);
      } else if (deleteConfirm.type === 'cycle') {
        await deleteCycle.mutateAsync(deleteConfirm.id);
      }
      toast.success('Eliminado correctamente');
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
    setDeleteConfirm(null);
  };

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador.</p>
      </div>
    );
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-lg font-bold text-foreground">Calendario de Turnos</h2>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsFullscreen(false)}>
            <Minimize2 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Restaurar</span>
          </Button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <ShiftCalendar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground">Horarios y Turnos</h1>
          <p className="text-muted-foreground text-xs hidden sm:block">Gestiona horarios administrativos, turnos operativos y ciclos de rotación</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowGeneratorDialog(true)}>
            <Zap className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Generar Ciclo</span>
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={() => setShowBulkGeneratorDialog(true)}>
            <Users className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Generar Todos</span>
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowExportDialog(true)}>
            <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="flex-1 min-h-0 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="p-2 flex-1 min-h-0 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <TabsList className="h-9 w-full sm:w-auto">
                <TabsTrigger value="calendar" className="gap-1.5 text-xs h-7 px-2.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Calendario</span>
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-1.5 text-xs h-7 px-2.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Horarios</span>
                </TabsTrigger>
                <TabsTrigger value="shifts" className="gap-1.5 text-xs h-7 px-2.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Turnos</span>
                </TabsTrigger>
                <TabsTrigger value="cycles" className="gap-1.5 text-xs h-7 px-2.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ciclos</span>
                </TabsTrigger>
              </TabsList>

              {activeTab !== 'calendar' && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button size="sm" onClick={() => {
                    if (activeTab === 'schedules') { setSelectedSchedule(null); setShowScheduleForm(true); }
                    else if (activeTab === 'shifts') { setSelectedShift(null); setShowShiftForm(true); }
                    else if (activeTab === 'cycles') { setSelectedCycle(null); setShowCycleForm(true); }
                  }}>
                    <Plus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Horarios Administrativos */}
            <TabsContent value="schedules" className="overflow-auto">
              {loadingSchedules ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="hidden sm:table-cell">Días</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead className="hidden md:table-cell">Descanso</TableHead>
                        <TableHead className="hidden sm:table-cell">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workSchedules.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{schedule.name}</span>
                              <div className="sm:hidden flex gap-0.5 mt-1">
                                {schedule.days_of_week.map(d => (
                                  <Badge key={d} variant="outline" className="text-[10px] px-0.5 h-4">{DAY_NAMES_SHORT[d]}</Badge>
                                ))}
                              </div>
                              <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                                {schedule.is_active ? '● Activo' : '○ Inactivo'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex gap-1">
                              {schedule.days_of_week.map(d => (
                                <Badge key={d} variant="outline" className="text-xs px-1">{DAY_NAMES_SHORT[d]}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</TableCell>
                          <TableCell className="hidden md:table-cell">{schedule.break_minutes} min</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                              {schedule.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedSchedule(schedule); setShowScheduleForm(true); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ type: 'schedule', id: schedule.id })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Turnos */}
            <TabsContent value="shifts" className="overflow-auto">
              {loadingShifts ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turno</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                        <TableHead className="hidden sm:table-cell">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: shift.color }} />
                              <div>
                                <span className="font-medium">{shift.name}</span>
                                {shift.code && <span className="text-muted-foreground ml-1">({shift.code})</span>}
                                <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                                  {shift.is_active ? '● Activo' : '○ Inactivo'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-muted-foreground text-sm">
                              {shift.description || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={shift.is_active ? 'default' : 'secondary'}>
                              {shift.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedShift(shift); setShowShiftForm(true); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ type: 'shift', id: shift.id })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Ciclos */}
            <TabsContent value="cycles" className="overflow-auto">
              {loadingCycles ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ciclo</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                        <TableHead className="hidden sm:table-cell">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftCycles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cycle) => (
                        <TableRow key={cycle.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">{cycle.name}</span>
                              {cycle.code && <span className="text-muted-foreground ml-2">({cycle.code})</span>}
                              <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                                {cycle.is_active ? '● Activo' : '○ Inactivo'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{cycle.total_days} días</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground max-w-[200px] truncate">{cycle.description || '-'}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={cycle.is_active ? 'default' : 'secondary'}>
                              {cycle.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedCycle(cycle); setShowCycleForm(true); }}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteConfirm({ type: 'cycle', id: cycle.id })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Calendario */}
            <TabsContent value="calendar" className="mt-1 flex-1 min-h-0 flex flex-col">
              <div className="flex justify-end mb-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsFullscreen(true)}>
                  <Maximize2 className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Pantalla completa</span>
                </Button>
              </div>
              <ShiftCalendar />
            </TabsContent>
          </Tabs>
        </Card>

      {/* Dialogs */}
      <WorkScheduleFormDialog open={showScheduleForm} onOpenChange={setShowScheduleForm} schedule={selectedSchedule} />
      <ShiftFormDialog open={showShiftForm} onOpenChange={setShowShiftForm} shift={selectedShift} />
      <ShiftCycleFormDialog open={showCycleForm} onOpenChange={setShowCycleForm} cycle={selectedCycle} />
      <CycleGeneratorDialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog} />
      <ShiftReportExport open={showExportDialog} onOpenChange={setShowExportDialog} />
      <BulkCycleGeneratorDialog open={showBulkGeneratorDialog} onOpenChange={setShowBulkGeneratorDialog} />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
