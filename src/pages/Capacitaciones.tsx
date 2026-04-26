import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, MoreHorizontal, Clock, Sparkles, PenLine, Library, Link2,
  Eye, Copy, Trash2, LayoutDashboard, BookOpenCheck, MonitorPlay, UsersRound,
  Layers, Timer, BadgeCheck, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CourseFormDialog, CertificateAlertsCard, TrainingPreviewDialog } from '@/components/training';
import { useTrainingCourses, useTrainingStats, useDeleteCourse, useDuplicateCourse } from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import type { TrainingCourse, TrainingModality, TrainingCourseContent } from '@/types/training';

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

const COURSE_ICON_BY_MODALITY = {
  presencial: UsersRound,
  virtual: MonitorPlay,
  mixto: Layers,
} satisfies Record<TrainingModality, typeof UsersRound>;

export default function Capacitaciones() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { data: courses, isLoading: loadingCourses } = useTrainingCourses();
  const { data: stats } = useTrainingStats();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [previewCourse, setPreviewCourse] = useState<TrainingCourse | null>(null);

  const filteredCourses = courses?.filter(course =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.code && course.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">Capacitaciones</h1>
          <p className="text-sm text-muted-foreground">Plataforma integral de capacitación empresarial</p>
        </div>
        <Button size={isMobile ? 'sm' : 'default'} onClick={() => navigate('/capacitaciones/crear')} className="shrink-0">
          <Sparkles className="h-4 w-4 mr-1.5" /> Nueva con IA
        </Button>
      </div>

      {/* AI Banner + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 h-full">
            <CardContent className="pt-5 pb-5 md:pt-6 md:pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-full">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 bg-primary/20 rounded-xl shrink-0">
                  <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-bold">Plataforma de Capacitaciones con IA</h2>
                  <p className="text-sm text-muted-foreground">Genera contenido, evaluaciones y certificados automáticamente</p>
                </div>
              </div>
              <Button onClick={() => navigate('/capacitaciones/crear')} size={isMobile ? 'sm' : 'lg'} className="w-full sm:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-2" /> Crear Capacitación
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions - hidden on mobile */}
        <Card className="hidden lg:block">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => navigate('/capacitaciones/crear')}>
                <Sparkles className="h-4 w-4 mr-2" /> Nueva con IA
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/capacitaciones/biblioteca')}>
                <Library className="h-4 w-4 mr-2" /> Ver Biblioteca
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/capacitaciones/crear-manual')}>
                <PenLine className="h-4 w-4 mr-2" /> Nueva Manual
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => navigate('/capacitaciones/acceso/generar')}>
                <Link2 className="h-4 w-4 mr-2" /> Generar Enlace
              </Button>
              <Button variant="outline" className="justify-start col-span-2" onClick={() => navigate('/capacitaciones/cumplimiento')}>
                <LayoutDashboard className="h-4 w-4 mr-2" /> Cumplimiento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <CertificateAlertsCard />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cursos..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Courses - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader><CardTitle>Cursos de Capacitación</CardTitle></CardHeader>
        <CardContent>
          {isMobile ? (
            <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
              {loadingCourses ? (
                <p className="text-center text-muted-foreground py-8">Cargando...</p>
              ) : filteredCourses?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay cursos registrados</p>
              ) : (
                <div className="space-y-3">
                  {(filteredCourses || []).map((course, index) => {
                    const content = course.content as TrainingCourseContent | null;
                    const statusLabel = STATUS_LABELS[course.status] || course.status;
                    const statusClass = STATUS_COLORS[course.status] || '';
                    const CourseIcon = COURSE_ICON_BY_MODALITY[course.modality] || BookOpenCheck;

                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="rounded-xl border border-border/70 bg-card p-4 shadow-sm ring-1 ring-primary/5"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <CourseIcon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{course.name}</h3>
                                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <BookOpenCheck className="h-3.5 w-3.5" />
                                  <span className="truncate">{course.category}</span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setPreviewCourse(course)}><Eye className="h-4 w-4 mr-2" /> Vista previa</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(course)}><PenLine className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(course.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/capacitaciones/acceso/generar?courseId=${course.id}`)}><Link2 className="h-4 w-4 mr-2" /> Generar enlace</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              <Badge className={statusClass}><BadgeCheck className="mr-1 h-3 w-3" />{statusLabel}</Badge>
                              <Badge variant="outline"><FileText className="mr-1 h-3 w-3" />{course.code || 'Sin código'}</Badge>
                              {content?.isManual ? (
                                <Badge variant="outline"><PenLine className="h-3 w-3 mr-1" /> Manual</Badge>
                              ) : content ? (
                                <Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" /> IA</Badge>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <div className="rounded-lg bg-muted/50 p-2">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers className="h-3 w-3" /> Modalidad</div>
                                <p className="mt-0.5 text-sm font-medium text-foreground">{MODALITY_LABELS[course.modality]}</p>
                              </div>
                              <div className="rounded-lg bg-muted/50 p-2">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Timer className="h-3 w-3" /> Duración</div>
                                <p className="mt-0.5 text-sm font-medium text-foreground">{course.duration_hours}h</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </PullToRefresh>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CourseFormDialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen} course={selectedCourse} />
      <TrainingPreviewDialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)} course={previewCourse} />
    </div>
  );
}
