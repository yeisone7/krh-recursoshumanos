import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  Plus, BookOpen, Calendar, Award, AlertTriangle, Search, Filter,
  MoreHorizontal, Users, Clock, Sparkles, PenLine, Library, Link2,
  FileSignature, BarChart3, Eye, Copy, Trash2, LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CourseFormDialog, SessionFormDialog, SessionDetailDialog, CertificateAlertsCard, TrainingPreviewDialog } from '@/components/training';
import { useTrainingCourses, useTrainingSessions, useTrainingStats, useDeleteCourse, useDuplicateCourse } from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import type { TrainingCourse, TrainingSession, TrainingStatus, TrainingModality, CourseStatus, TrainingCourseContent } from '@/types/training';

const STATUS_COLORS: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_curso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  completado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelado: 'bg-destructive/10 text-destructive',
  borrador: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  publicado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  programado: 'Programado', en_curso: 'En Curso', completado: 'Completado',
  cancelado: 'Cancelado', borrador: 'Borrador', publicado: 'Publicado',
};

const MODALITY_LABELS: Record<TrainingModality, string> = {
  presencial: 'Presencial', virtual: 'Virtual', mixto: 'Mixto',
};

export default function Capacitaciones() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: courses, isLoading: loadingCourses } = useTrainingCourses();
  const { data: sessions, isLoading: loadingSessions } = useTrainingSessions();
  const { data: stats } = useTrainingStats();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);
  const [previewCourse, setPreviewCourse] = useState<TrainingCourse | null>(null);

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
    } catch {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  }

  async function handleDuplicate(id: string) {
    try {
      await duplicateCourse.mutateAsync(id);
      sonnerToast.success('Curso duplicado exitosamente');
    } catch {
      sonnerToast.error('Error al duplicar');
    }
  }

  function handleEdit(course: TrainingCourse) {
    const content = course.content as TrainingCourseContent | null;
    if (content?.isManual) {
      navigate(`/capacitaciones/crear-manual?id=${course.id}`);
    } else {
      navigate(`/capacitaciones/crear?id=${course.id}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capacitaciones</h1>
          <p className="text-muted-foreground">Plataforma integral de capacitación empresarial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSessionDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" /> Programar Sesión
          </Button>
          <Button onClick={() => navigate('/capacitaciones/crear')}>
            <Sparkles className="h-4 w-4 mr-2" /> Nueva con IA
          </Button>
        </div>
      </div>

      {/* AI Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-xl">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Plataforma de Capacitaciones con IA</h2>
                  <p className="text-muted-foreground">Genera contenido, evaluaciones y certificados automáticamente</p>
                </div>
              </div>
              <Button onClick={() => navigate('/capacitaciones/crear')} size="lg">
                <Plus className="h-4 w-4 mr-2" /> Crear Capacitación
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CertificateAlertsCard />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/capacitaciones/crear')}>
              <Sparkles className="h-4 w-4 mr-2" /> Nueva con IA
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/capacitaciones/crear-manual')}>
              <PenLine className="h-4 w-4 mr-2" /> Nueva Manual
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/capacitaciones/biblioteca')}>
              <Library className="h-4 w-4 mr-2" /> Ver Biblioteca
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/capacitaciones/acceso/generar')}>
              <Link2 className="h-4 w-4 mr-2" /> Generar Enlace
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cursos o sesiones..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-2" /> Catálogo de Cursos</TabsTrigger>
          <TabsTrigger value="sessions"><Calendar className="h-4 w-4 mr-2" /> Sesiones</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <Card>
            <CardHeader><CardTitle>Cursos de Capacitación</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Modalidad</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingCourses ? (
                    <TableRow><TableCell colSpan={8} className="text-center">Cargando...</TableCell></TableRow>
                  ) : filteredCourses?.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No hay cursos registrados</TableCell></TableRow>
                  ) : (
                    filteredCourses?.map((course) => {
                      const content = course.content as TrainingCourseContent | null;
                      return (
                        <TableRow key={course.id}>
                          <TableCell className="font-medium">{course.code || '-'}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell><Badge variant="outline">{course.category}</Badge></TableCell>
                          <TableCell>{MODALITY_LABELS[course.modality]}</TableCell>
                          <TableCell><Clock className="h-4 w-4 text-muted-foreground inline mr-1" />{course.duration_hours}h</TableCell>
                          <TableCell><Badge className={STATUS_COLORS[course.status] || ''}>{STATUS_LABELS[course.status] || course.status}</Badge></TableCell>
                          <TableCell>
                            {content?.isManual ? (
                              <Badge variant="outline"><PenLine className="h-3 w-3 mr-1" /> Manual</Badge>
                            ) : content ? (
                              <Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" /> IA</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setPreviewCourse(course)}><Eye className="h-4 w-4 mr-2" /> Vista previa</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(course)}><PenLine className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(course.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/capacitaciones/acceso/generar?courseId=${course.id}`)}><Link2 className="h-4 w-4 mr-2" /> Generar enlace</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardHeader><CardTitle>Sesiones de Capacitación</CardTitle></CardHeader>
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
                    <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>
                  ) : filteredSessions?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No hay sesiones programadas</TableCell></TableRow>
                  ) : (
                    filteredSessions?.map((session) => (
                      <TableRow key={session.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedSession(session); setSessionDetailOpen(true); }}>
                        <TableCell className="font-medium">{session.session_code || '-'}</TableCell>
                        <TableCell>{session.course?.name}</TableCell>
                        <TableCell>{format(parseISO(session.start_date), 'dd MMM yyyy', { locale: es })}</TableCell>
                        <TableCell>{session.instructor_name || '-'}</TableCell>
                        <TableCell>{session.location || '-'}</TableCell>
                        <TableCell><Badge className={STATUS_COLORS[session.status] || ''}>{STATUS_LABELS[session.status] || session.status}</Badge></TableCell>
                        <TableCell><Button variant="ghost" size="sm"><Users className="h-4 w-4" /></Button></TableCell>
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
      <CourseFormDialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen} course={selectedCourse} />
      <SessionFormDialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen} />
      <SessionDetailDialog open={sessionDetailOpen} onOpenChange={setSessionDetailOpen} session={selectedSession} />
      <TrainingPreviewDialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)} course={previewCourse} />
    </div>
  );
}
