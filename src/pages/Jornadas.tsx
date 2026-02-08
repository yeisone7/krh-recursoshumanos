import { useState, useMemo } from 'react';
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
  EmployeeTimeConfigDialog,
  ShiftCalendar,
  CycleGeneratorDialog,
  ShiftReportExport,
  MissingConfigAlert,
} from '@/components/schedules';
import { DAY_NAMES_SHORT } from '@/types/schedule';
import type { WorkSchedule, Shift, ShiftCycle } from '@/types/schedule';

export default function Jornadas() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'shifts' | 'cycles' | 'calendar'>('schedules');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
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

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Horarios y Turnos</h1>
          <p className="text-muted-foreground mt-1">Gestiona horarios administrativos, turnos operativos y ciclos de rotación</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
            <Users className="w-4 h-4 mr-2" />
            Asignar Empleado
          </Button>
          <Button variant="outline" onClick={() => setShowGeneratorDialog(true)}>
            <Zap className="w-4 h-4 mr-2" />
            Generar Ciclo
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </motion.div>


      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <TabsList>
                <TabsTrigger value="schedules" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  Horarios
                </TabsTrigger>
                <TabsTrigger value="shifts" className="gap-2">
                  <Clock className="w-4 h-4" />
                  Turnos
                </TabsTrigger>
                <TabsTrigger value="cycles" className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Ciclos
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Calendario
                </TabsTrigger>
              </TabsList>

              {activeTab !== 'calendar' && (
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => {
                    if (activeTab === 'schedules') { setSelectedSchedule(null); setShowScheduleForm(true); }
                    else if (activeTab === 'shifts') { setSelectedShift(null); setShowShiftForm(true); }
                    else if (activeTab === 'cycles') { setSelectedCycle(null); setShowCycleForm(true); }
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo
                  </Button>
                </div>
              )}
            </div>

            {/* Horarios Administrativos */}
            <TabsContent value="schedules">
              {loadingSchedules ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Descanso</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workSchedules.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {schedule.days_of_week.map(d => (
                                <Badge key={d} variant="outline" className="text-xs px-1">{DAY_NAMES_SHORT[d]}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</TableCell>
                          <TableCell>{schedule.break_minutes} min</TableCell>
                          <TableCell>
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
            <TabsContent value="shifts">
              {loadingShifts ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turno</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shifts.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: shift.color }} />
                              <span className="font-medium">{shift.name}</span>
                              {shift.code && <span className="text-muted-foreground">({shift.code})</span>}
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground text-sm">
                              {shift.description || '—'}
                            </span>
                          </TableCell>
                          <TableCell>
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
            <TabsContent value="cycles">
              {loadingCycles ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ciclo</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftCycles.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((cycle) => (
                        <TableRow key={cycle.id}>
                          <TableCell>
                            <span className="font-medium">{cycle.name}</span>
                            {cycle.code && <span className="text-muted-foreground ml-2">({cycle.code})</span>}
                          </TableCell>
                          <TableCell>{cycle.total_days} días</TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">{cycle.description || '-'}</TableCell>
                          <TableCell>
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
            <TabsContent value="calendar" className="space-y-4">
              <MissingConfigAlert onAssignClick={() => setShowConfigDialog(true)} />
              <ShiftCalendar />
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <WorkScheduleFormDialog open={showScheduleForm} onOpenChange={setShowScheduleForm} schedule={selectedSchedule} />
      <ShiftFormDialog open={showShiftForm} onOpenChange={setShowShiftForm} shift={selectedShift} />
      <ShiftCycleFormDialog open={showCycleForm} onOpenChange={setShowCycleForm} cycle={selectedCycle} />
      <EmployeeTimeConfigDialog open={showConfigDialog} onOpenChange={setShowConfigDialog} />
      <CycleGeneratorDialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog} />
      <ShiftReportExport open={showExportDialog} onOpenChange={setShowExportDialog} />
      <EmployeeTimeConfigDialog open={showConfigDialog} onOpenChange={setShowConfigDialog} />

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
