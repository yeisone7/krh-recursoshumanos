import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  XCircle
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
  const availableEmployees = employees?.filter(e => !enrolledIds.has(e.id)) || [];

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{session.session_code}</span>
            <Badge className={STATUS_COLORS[session.status as TrainingStatus]}>
              {STATUS_LABELS[session.status as TrainingStatus]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-lg">{course?.name}</h3>
            <p className="text-sm text-muted-foreground">{course?.code} • {course?.category}</p>
            {course?.description && (
              <p className="text-sm mt-2">{course.description}</p>
            )}
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(parseISO(session.start_date), 'dd MMM yyyy', { locale: es })}</span>
            </div>
            {session.start_time && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{session.start_time} - {session.end_time}</span>
              </div>
            )}
            {session.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{session.location}</span>
              </div>
            )}
          </div>

          {/* Status Control */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Cambiar estado:</span>
            <div className="flex gap-2">
              {(['programado', 'en_curso', 'completado', 'cancelado'] as TrainingStatus[]).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={session.status === status ? 'default' : 'outline'}
                  onClick={() => handleStatusChange(status)}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>

          <Tabs defaultValue="attendance">
            <TabsList>
              <TabsTrigger value="attendance" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Asistencia ({attendance?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-4">
              {/* Enroll Employee */}
              <div className="flex items-center gap-2 p-4 border rounded-lg">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar empleado para inscribir" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} - {emp.document_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleEnroll} disabled={!selectedEmployeeId}>
                  Inscribir
                </Button>
              </div>

              {/* Attendance Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAttendance ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Cargando...</TableCell>
                    </TableRow>
                  ) : attendance?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay empleados inscritos
                      </TableCell>
                    </TableRow>
                  ) : (
                    attendance?.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {att.employee?.first_name} {att.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{att.employee?.document_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ATTENDANCE_STATUS_LABELS[att.attendance_status as AttendanceStatus]}
                          </Badge>
                          {att.passed !== null && (
                            <span className="ml-2">
                              {att.passed ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 inline" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive inline" />
                              )}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="w-20"
                            placeholder="0-100"
                            value={scores[att.id] ?? att.score ?? ''}
                            onChange={(e) => setScores(prev => ({
                              ...prev,
                              [att.id]: Number(e.target.value)
                            }))}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {att.attendance_status !== 'asistio' && att.attendance_status !== 'no_asistio' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRecordAttendance(att.id, 'asistio')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Asistió
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRecordAttendance(att.id, 'no_asistio')}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  No Asistió
                                </Button>
                              </>
                            )}
                            {att.passed && course?.requires_certification && (
                              <Button
                                size="sm"
                                onClick={() => handleIssueCertificate(att.employee_id)}
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Emitir Certificado
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
