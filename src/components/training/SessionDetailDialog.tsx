import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  UserPlus,
  Award,
  CheckCircle,
  XCircle,
  Presentation
} from 'lucide-react';
import { 
  useSessionAttendance, 
  useEnrollEmployee, 
  useRecordAttendance,
  useIssueCertificate,
  useUpdateSessionStatus 
} from '@/hooks/useTraining';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import type { TrainingSession, TrainingStatus, AttendanceStatus } from '@/types/training';

interface SessionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: TrainingSession | null;
}

const STATUS_COLORS: Record<TrainingStatus, string> = {
  programado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_curso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelado: 'bg-destructive/10 text-destructive',
};

const STATUS_LABELS: Record<TrainingStatus, string> = {
  programado: 'Programado',
  en_curso: 'En Curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  inscrito: 'Inscrito',
  asistio: 'Asistió',
  no_asistio: 'No Asistió',
  justificado: 'Justificado',
};

export function SessionDetailDialog({ open, onOpenChange, session }: SessionDetailDialogProps) {
  const { toast } = useToast();
  const { data: attendance, isLoading: loadingAttendance } = useSessionAttendance(session?.id);
  const { data: employees } = useEmployees();
  const enrollEmployee = useEnrollEmployee();
  const recordAttendance = useRecordAttendance();
  const issueCertificate = useIssueCertificate();
  const updateSessionStatus = useUpdateSessionStatus();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  if (!session) return null;

  const course = session.course;
  const enrolledIds = new Set(attendance?.map(a => a.employee_id) || []);
  const availableEmployees = employees?.filter(e => e.is_active && !enrolledIds.has(e.id)) || [];

  async function handleEnroll() {
    if (!selectedEmployeeId) return;
    try {
      await enrollEmployee.mutateAsync({
        sessionId: session.id,
        employeeId: selectedEmployeeId,
      });
      toast({ title: 'Empleado inscrito correctamente' });
      setSelectedEmployeeId('');
    } catch (error) {
      toast({ title: 'Error al inscribir', variant: 'destructive' });
    }
  }

  async function handleRecordAttendance(attendanceId: string, status: AttendanceStatus) {
    const score = scores[attendanceId];
    const passed = score !== undefined ? score >= 70 : status === 'asistio';

    try {
      await recordAttendance.mutateAsync({
        attendanceId,
        status,
        score,
        passed,
      });
      toast({ title: 'Asistencia registrada' });
    } catch (error) {
      toast({ title: 'Error al registrar', variant: 'destructive' });
    }
  }

  async function handleIssueCertificate(employeeId: string) {
    if (!course) return;
    try {
      await issueCertificate.mutateAsync({
        sessionId: session.id,
        employeeId,
        courseId: course.id,
        validityMonths: course.validity_months || undefined,
      });
      toast({ title: 'Certificado emitido correctamente' });
    } catch (error) {
      toast({ title: 'Error al emitir certificado', variant: 'destructive' });
    }
  }

  async function handleStatusChange(newStatus: TrainingStatus) {
    try {
      await updateSessionStatus.mutateAsync({ id: session.id, status: newStatus });
      toast({ title: 'Estado actualizado' });
    } catch (error) {
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <Presentation className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5">
                    SESIÓN
                  </Badge>
                  <Badge className={cn("font-black uppercase tracking-widest text-[9px] px-2 py-0.5", STATUS_COLORS[session.status as TrainingStatus])}>
                    {STATUS_LABELS[session.status as TrainingStatus]}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                  {session.session_code}
                </DialogTitle>
                <DialogDescription className="font-medium mt-1">
                  Detalles de la sesión y control de asistencia
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Course Info */}
          <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-4">
            <div>
              <h3 className="font-black text-lg text-foreground tracking-tight">{course?.name}</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">{course?.code} • {course?.category}</p>
            </div>
            {course?.description && (
              <p className="text-sm font-medium leading-relaxed opacity-80">{course.description}</p>
            )}

            {/* Session Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Fecha</p>
                  <p className="text-xs font-bold text-foreground">{format(parseISO(session.start_date), 'dd MMM yyyy', { locale: es })}</p>
                </div>
              </div>
              
              {session.start_time && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Horario</p>
                    <p className="text-xs font-bold text-foreground">{session.start_time} - {session.end_time}</p>
                  </div>
                </div>
              )}
              
              {session.location && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Ubicación</p>
                    <p className="text-xs font-bold text-foreground truncate max-w-[120px]">{session.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Control */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-background border border-border/50 shadow-sm">
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground shrink-0">Estado de sesión:</span>
            <div className="flex flex-wrap gap-2">
              {(['programado', 'en_curso', 'completado', 'cancelado'] as TrainingStatus[]).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={session.status === status ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(status)}
                  className={cn(
                    "rounded-xl h-9 text-[10px] font-bold uppercase tracking-widest",
                    session.status === status && "shadow-md"
                  )}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="bg-background p-1.5 rounded-[1.5rem] h-auto w-full flex justify-start overflow-x-auto">
              <TabsTrigger 
                value="attendance" 
                className="rounded-2xl px-6 py-2.5 font-bold uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
              >
                <Users className="h-4 w-4 mr-2" />
                Asistencia ({attendance?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-6 mt-6">
              {/* Enroll Employee */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-background border border-border/50 rounded-2xl">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="flex-1 h-12 rounded-xl bg-background border-border/50 focus:ring-primary/20">
                      <SelectValue placeholder="Seleccionar empleado para inscribir" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id} className="rounded-lg">
                          {emp.first_name} {emp.last_name} - {emp.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleEnroll} 
                  disabled={!selectedEmployeeId}
                  className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-md"
                >
                  Inscribir
                </Button>
              </div>

              {/* Attendance Table */}
              <div className="overflow-hidden rounded-[2rem] border border-border shadow-lg bg-background ">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background border-b border-border hover:bg-background">
                      <TableHead className="px-6 h-12 font-black text-[10px] uppercase tracking-[0.2em]">Empleado</TableHead>
                      <TableHead className="h-12 font-black text-[10px] uppercase tracking-[0.2em]">Estado</TableHead>
                      <TableHead className="h-12 font-black text-[10px] uppercase tracking-[0.2em]">Puntaje</TableHead>
                      <TableHead className="px-6 h-12 text-right font-black text-[10px] uppercase tracking-[0.2em]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {loadingAttendance ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground font-medium">Cargando...</TableCell>
                    </TableRow>
                  ) : attendance?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <span className="font-bold uppercase tracking-widest text-xs opacity-60">No hay empleados inscritos</span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance?.map((att) => (
                      <TableRow key={att.id} className="group border-b border-border hover:bg-primary/[0.02] transition-colors">
                        <TableCell className="px-6 py-4">
                          <div>
                            <p className="font-black text-sm tracking-tight text-foreground">
                              {att.employee?.first_name} {att.employee?.last_name}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{att.employee?.document_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-6 rounded-full text-[9px] font-bold uppercase tracking-widest px-2.5 bg-background border-border/50">
                              {ATTENDANCE_STATUS_LABELS[att.attendance_status as AttendanceStatus]}
                            </Badge>
                            {att.passed !== null && (
                              <span className="ml-1">
                                {att.passed ? (
                                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20 h-9 rounded-xl border-border/50 bg-background text-xs font-bold text-center focus:ring-primary/20"
                            placeholder="0-100"
                            value={scores[att.id] ?? att.score ?? ''}
                            onChange={(e) => setScores(prev => ({
                              ...prev,
                              [att.id]: Number(e.target.value)
                            }))}
                          />
                        </TableCell>
                        <TableCell className="px-6">
                          <div className="flex items-center justify-end gap-2">
                            {att.attendance_status !== 'asistio' && att.attendance_status !== 'no_asistio' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                                  onClick={() => handleRecordAttendance(att.id, 'asistio')}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1.5" />
                                  Asistió
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
                                  onClick={() => handleRecordAttendance(att.id, 'no_asistio')}
                                >
                                  <XCircle className="h-3 w-3 mr-1.5" />
                                  Faltó
                                </Button>
                              </>
                            )}
                            {att.passed && course?.requires_certification && (
                              <Button
                                size="sm"
                                className="h-8 rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-none"
                                onClick={() => handleIssueCertificate(att.employee_id)}
                              >
                                <Award className="h-3 w-3 mr-1.5" />
                                Certificar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
