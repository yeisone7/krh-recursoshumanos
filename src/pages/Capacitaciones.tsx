import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Plus, 
  BookOpen, 
  Calendar, 
  Award, 
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Users,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CourseFormDialog, 
  SessionFormDialog, 
  SessionDetailDialog,
  CertificateAlertsCard 
} from '@/components/training';
import { 
  useTrainingCourses, 
  useTrainingSessions, 
  useTrainingStats,
  useDeleteCourse 
} from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';
import type { TrainingCourse, TrainingSession, TrainingStatus, TrainingModality } from '@/types/training';

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

const MODALITY_LABELS: Record<TrainingModality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  mixto: 'Mixto',
};

export default function Capacitaciones() {
  const { toast } = useToast();
  const { data: courses, isLoading: loadingCourses } = useTrainingCourses();
  const { data: sessions, isLoading: loadingSessions } = useTrainingSessions();
  const { data: stats } = useTrainingStats();
  const deleteCourse = useDeleteCourse();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);

  const filteredCourses = courses?.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.code && course.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSessions = sessions?.filter(session =>
    session.course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (session.session_code && session.session_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function handleDeleteCourse(id: string) {
    try {
      await deleteCourse.mutateAsync(id);
      toast({ title: 'Curso eliminado' });
    } catch (error) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capacitaciones</h1>
          <p className="text-muted-foreground">
            Gestión de cursos, sesiones y certificaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSessionDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Programar Sesión
          </Button>
          <Button onClick={() => { setSelectedCourse(null); setCourseDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cursos Activos</p>
                  <p className="text-3xl font-bold">{stats?.totalCourses || 0}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sesiones Programadas</p>
                  <p className="text-3xl font-bold">{stats?.activeSessions || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certificados (Año)</p>
                  <p className="text-3xl font-bold">{stats?.certificatesThisYear || 0}</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                  <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Por Vencer</p>
                  <p className="text-3xl font-bold text-amber-600">{stats?.expiringCertificates || 0}</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Alerts */}
      <CertificateAlertsCard />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cursos o sesiones..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">
            <BookOpen className="h-4 w-4 mr-2" />
            Catálogo de Cursos
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Calendar className="h-4 w-4 mr-2" />
            Sesiones
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Cursos de Capacitación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Obligatorio</TableHead>
                    <TableHead>Certificación</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCourses ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Cargando...</TableCell>
                    </TableRow>
                  ) : filteredCourses?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No hay cursos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses?.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.code || '-'}</TableCell>
                        <TableCell>{course.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{course.category}</Badge>
                        </TableCell>
                        <TableCell>{MODALITY_LABELS[course.modality as TrainingModality]}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {course.duration_hours}h
                          </div>
                        </TableCell>
                        <TableCell>
                          {course.is_mandatory && (
                            <Badge variant="destructive">Obligatorio</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {course.requires_certification && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {course.validity_months 
                                ? `${course.validity_months} meses`
                                : 'Permanente'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedCourse(course); setCourseDialogOpen(true); }}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSessionDialogOpen(true)}>
                                Programar Sesión
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDeleteCourse(course.id)}
                              >
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Sesiones de Capacitación</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSessions ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Cargando...</TableCell>
                    </TableRow>
                  ) : filteredSessions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No hay sesiones programadas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions?.map((session) => (
                      <TableRow 
                        key={session.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedSession(session); setSessionDetailOpen(true); }}
                      >
                        <TableCell className="font-medium">{session.session_code || '-'}</TableCell>
                        <TableCell>{session.course?.name}</TableCell>
                        <TableCell>
                          {format(parseISO(session.start_date), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell>{session.instructor_name || '-'}</TableCell>
                        <TableCell>{session.location || '-'}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[session.status as TrainingStatus]}>
                            {STATUS_LABELS[session.status as TrainingStatus]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Users className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CourseFormDialog
        open={courseDialogOpen}
        onOpenChange={setCourseDialogOpen}
        course={selectedCourse}
      />

      <SessionFormDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
      />

      <SessionDetailDialog
        open={sessionDetailOpen}
        onOpenChange={setSessionDetailOpen}
        session={selectedSession}
      />
    </div>
  );
}
