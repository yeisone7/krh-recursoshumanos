import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Sun,
  Moon,
  RotateCcw,
  Users,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useShiftTypes, useEmployeeShifts, useDeleteShiftType } from '@/hooks/useShifts';
import { ShiftTypeFormDialog, AssignShiftDialog } from '@/components/shifts';
import type { ShiftType } from '@/types/config';

export default function Jornadas() {
  const [activeTab, setActiveTab] = useState<'types' | 'assignments'>('types');
  const [searchQuery, setSearchQuery] = useState('');
  const [showShiftTypeForm, setShowShiftTypeForm] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: shiftTypes = [], isLoading: loadingTypes } = useShiftTypes();
  const { data: employeeShifts = [], isLoading: loadingAssignments } = useEmployeeShifts();
  const deleteShiftType = useDeleteShiftType();

  // Filter shift types
  const filteredShiftTypes = useMemo(() => {
    return shiftTypes.filter((shift) =>
      shift.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shiftTypes, searchQuery]);

  // Filter employee shifts
  const filteredAssignments = useMemo(() => {
    return employeeShifts.filter((assignment: any) => {
      const employeeName = `${assignment.employees?.first_name} ${assignment.employees?.last_name}`.toLowerCase();
      const shiftName = assignment.shift_types?.name?.toLowerCase() || '';
      return employeeName.includes(searchQuery.toLowerCase()) ||
             shiftName.includes(searchQuery.toLowerCase());
    });
  }, [employeeShifts, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    totalTypes: shiftTypes.length,
    activeTypes: shiftTypes.filter(s => s.is_active).length,
    nightShifts: shiftTypes.filter(s => s.is_night_shift).length,
    totalAssignments: employeeShifts.length,
  }), [shiftTypes, employeeShifts]);

  const handleEditShiftType = (shift: ShiftType) => {
    setSelectedShiftType(shift);
    setShowShiftTypeForm(true);
  };

  const handleDeleteShiftType = async () => {
    if (!deleteConfirmId) return;
    
    try {
      await deleteShiftType.mutateAsync(deleteConfirmId);
      toast.success('Jornada eliminada');
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo eliminar la jornada',
      });
    }
    setDeleteConfirmId(null);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Clock className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne a una empresa.
        </p>
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
          <h1 className="font-display text-2xl font-bold text-foreground">Jornadas y Turnos</h1>
          <p className="text-muted-foreground mt-1">Configura tipos de jornada y asígnales a empleados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAssignDialog(true)}>
            <Users className="w-4 h-4 mr-2" />
            Asignar Jornada
          </Button>
          <Button onClick={() => {
            setSelectedShiftType(null);
            setShowShiftTypeForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Jornada
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalTypes}</p>
              <p className="text-xs text-muted-foreground">Tipos de Jornada</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <Sun className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.activeTypes}</p>
              <p className="text-xs text-muted-foreground">Jornadas Activas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Moon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.nightShifts}</p>
              <p className="text-xs text-muted-foreground">Jornadas Nocturnas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-info/10">
              <Users className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalAssignments}</p>
              <p className="text-xs text-muted-foreground">Asignaciones</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'types' | 'assignments')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <TabsList>
                  <TabsTrigger value="types" className="gap-2">
                    <Clock className="w-4 h-4" />
                    Tipos de Jornada
                  </TabsTrigger>
                  <TabsTrigger value="assignments" className="gap-2">
                    <Users className="w-4 h-4" />
                    Asignaciones
                  </TabsTrigger>
                </TabsList>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Types Tab */}
              <TabsContent value="types" className="mt-4">
                {loadingTypes ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredShiftTypes.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay jornadas configuradas</h3>
                    <p className="text-muted-foreground mb-4">
                      Crea tu primera jornada para comenzar.
                    </p>
                    <Button onClick={() => setShowShiftTypeForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Jornada
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jornada</TableHead>
                          <TableHead>Horario</TableHead>
                          <TableHead>Descanso</TableHead>
                          <TableHead>Características</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredShiftTypes.map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{shift.name}</p>
                                <p className="text-xs text-muted-foreground">Código: {shift.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {shift.break_duration_minutes} min
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {shift.is_night_shift && (
                                  <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">
                                    <Moon className="w-3 h-3 mr-1" />
                                    Nocturna
                                  </Badge>
                                )}
                                {shift.is_rotating && (
                                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    Rotativa
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  shift.is_active
                                    ? 'bg-success-light text-success border-success/20'
                                    : 'bg-muted text-muted-foreground'
                                )}
                              >
                                {shift.is_active ? 'Activa' : 'Inactiva'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditShiftType(shift as ShiftType)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirmId(shift.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Assignments Tab */}
              <TabsContent value="assignments" className="mt-4">
                {loadingAssignments ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg mb-2">No hay asignaciones</h3>
                    <p className="text-muted-foreground mb-4">
                      Asigna jornadas a los empleados.
                    </p>
                    <Button onClick={() => setShowAssignDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Asignar Jornada
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Jornada</TableHead>
                          <TableHead>Horario</TableHead>
                          <TableHead>Vigencia</TableHead>
                          <TableHead>Notas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAssignments.map((assignment: any) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {assignment.employees?.first_name?.[0]}
                                    {assignment.employees?.last_name?.[0]}
                                  </span>
                                </div>
                                <span className="font-medium">
                                  {assignment.employees?.first_name} {assignment.employees?.last_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {assignment.shift_types?.is_night_shift && (
                                  <Moon className="w-4 h-4 text-purple-500" />
                                )}
                                <span>{assignment.shift_types?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {formatTime(assignment.shift_types?.start_time || '')} - {formatTime(assignment.shift_types?.end_time || '')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>
                                  {format(new Date(assignment.effective_from), 'dd MMM yyyy', { locale: es })}
                                </span>
                                {assignment.effective_to && (
                                  <>
                                    <span className="text-muted-foreground">-</span>
                                    <span>
                                      {format(new Date(assignment.effective_to), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {assignment.notes || '-'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <ShiftTypeFormDialog
        open={showShiftTypeForm}
        onOpenChange={(open) => {
          setShowShiftTypeForm(open);
          if (!open) setSelectedShiftType(null);
        }}
        shiftType={selectedShiftType}
      />

      <AssignShiftDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Eliminar Jornada
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta jornada? Esta acción no se puede deshacer.
              Los empleados asignados a esta jornada perderán su asignación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteShiftType}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteShiftType.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
