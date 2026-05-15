import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus, Search, MoreVertical, Clock, Sparkles, PenLine, Library, Link2,
  Eye, Copy, Trash2, LayoutDashboard, BookOpenCheck, MonitorPlay, UsersRound,
  Layers, Timer, BadgeCheck, FileText, ShieldCheck, HeartPulse, Utensils,
  Flame, HardHat, ClipboardCheck, Leaf, BriefcaseBusiness, ImageIcon,
  Filter, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CourseFormDialog, CertificateAlertsCard, TrainingPreviewDialog } from '@/components/training';
import { useTrainingCourses, useTrainingStats, useDeleteCourse, useDuplicateCourse } from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import type { TrainingCourse, TrainingModality, TrainingCourseContent } from '@/types/training';
import { cn } from '@/lib/utils';

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

const COURSE_ICON_STYLE_BY_MODALITY = {
  presencial: 'bg-warning-light text-warning ring-warning/25',
  virtual: 'bg-info-light text-info ring-info/25',
  mixto: 'bg-primary/10 text-primary ring-primary/25',
} satisfies Record<TrainingModality, string>;

const COURSE_CATEGORY_VISUALS = [
  { keywords: ['seguridad', 'sst', 'riesgo', 'epp'], icon: ShieldCheck, style: 'bg-success-light text-success ring-success/25' },
  { keywords: ['salud', 'primeros auxilios', 'higiene'], icon: HeartPulse, style: 'bg-destructive/10 text-destructive ring-destructive/20' },
  { keywords: ['alimento', 'cocina', 'cuchillo', 'manipulación', 'manipulacion', 'contaminación', 'contaminacion'], icon: Utensils, style: 'bg-warning-light text-warning ring-warning/25' },
  { keywords: ['incendio', 'emergencia', 'evacuación', 'evacuacion'], icon: Flame, style: 'bg-accent text-accent-foreground ring-accent/30' },
  { keywords: ['operación', 'operacion', 'mantenimiento', 'técnico', 'tecnico'], icon: HardHat, style: 'bg-info-light text-info ring-info/25' },
  { keywords: ['ambiental', 'ambiente', 'residuo'], icon: Leaf, style: 'bg-success-light text-success ring-success/25' },
  { keywords: ['legal', 'cumplimiento', 'norma'], icon: ClipboardCheck, style: 'bg-primary/10 text-primary ring-primary/25' },
  { keywords: ['administrativo', 'corporativo', 'inducción', 'induccion'], icon: BriefcaseBusiness, style: 'bg-background text-muted-foreground ring-border' },
];

function getCourseCategoryVisual(category: string) {
  const normalizedCategory = category.toLowerCase();
  return COURSE_CATEGORY_VISUALS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedCategory.includes(keyword))
  ) || { icon: BookOpenCheck, style: 'bg-primary/10 text-primary ring-primary/25' };
}

export default function Capacitaciones() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);

  const { data: courses, isLoading: loadingCourses, refetch } = useTrainingCourses();
  const deleteMutation = useDeleteCourse();
  const duplicateMutation = useDuplicateCourse();

  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | undefined>();
  const [previewCourse, setPreviewCourse] = useState<TrainingCourse | null>(null);
  const [previewInitialTab, setPreviewInitialTab] = useState('overview');

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    if (!searchTerm) return courses;
    
    const term = searchTerm.toLowerCase();
    return courses.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.code && c.code.toLowerCase().includes(term)) ||
      c.category.toLowerCase().includes(term)
    );
  }, [courses, searchTerm]);

  const handleOpenPreview = (course: TrainingCourse, tab = 'overview') => {
    setPreviewCourse(course);
    setPreviewInitialTab(tab);
  };

  const handleEdit = (course: TrainingCourse) => {
    setSelectedCourse(course);
    setCourseDialogOpen(true);
  };

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateMutation.mutateAsync(id);
      sonnerToast.success('Curso duplicado correctamente');
    } catch (error) {
      console.error(error);
      sonnerToast.error('Error al duplicar el curso');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      sonnerToast.success('Curso eliminado correctamente');
    } catch (error) {
      sonnerToast.error('Error al eliminar el curso');
    }
  };

  const statsKpis = useMemo(() => {
    if (!courses) return { total: 0, inProcess: 0, published: 0, completed: 0 };
    return {
      total: courses.length,
      inProcess: courses.filter(c => c.status === 'en_curso' || c.status === 'programado').length,
      published: courses.filter(c => c.status === 'publicado').length,
      completed: courses.filter(c => c.status === 'completado').length,
    };
  }, [courses]);

  const kpis = useMemo(() => ([
    { label: 'TOTAL CURSOS', value: statsKpis.total, desc: 'Catálogo completo', icon: Library, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'PUBLICADOS', value: statsKpis.published, desc: 'Cursos activos', icon: BadgeCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'EN PROCESO', value: statsKpis.inProcess, desc: 'Por iniciar/en curso', icon: Timer, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'COMPLETADOS', value: statsKpis.completed, desc: 'Ciclo finalizado', icon: BookOpenCheck, color: 'text-blue-600', bg: 'bg-blue-500/10' },
  ]), [statsKpis]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-xl shadow-primary/20 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <BookOpenCheck className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Formación Continua
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Capacitaciones</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Plataforma integral para la gestión de formación, desarrollo de competencias y cumplimiento normativo.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500">
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-30 px-6 py-4 sm:px-10 bg-background border-b border-border flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar cursos por nombre, código o categoría..."
              className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-12 rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider px-4"
              onClick={() => navigate('/capacitaciones/biblioteca')}
            >
              <Library className="w-4 h-4 mr-2 text-primary" />
              Biblioteca
            </Button>
            <Button
              variant="ghost"
              className="h-12 rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider px-4"
              onClick={() => navigate('/capacitaciones/cumplimiento')}
            >
              <LayoutDashboard className="w-4 h-4 mr-2 text-primary" />
              Cumplimiento
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20" 
            onClick={() => navigate('/capacitaciones/crear')}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Nueva con IA
          </Button>
          <Button 
            variant="outline"
            className="h-12 px-6 rounded-2xl border-border font-black uppercase tracking-widest text-[11px]" 
            onClick={() => navigate('/capacitaciones/crear-manual')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Manual
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Alerts */}
          <CertificateAlertsCard />

          {loadingCourses ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-[2rem]" />
              ))}
            </div>
          ) : filteredCourses?.length === 0 ? (
            <div className="text-center py-32 bg-background rounded-[3rem] border-2 border-dashed border-border ">
               <BookOpenCheck className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
               <p className="text-xl font-black uppercase tracking-[0.2em] text-muted-foreground/40">Sin cursos registrados</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              {isMobile ? (
                <div className="space-y-4">
                  {filteredCourses?.map((course, index) => {
                    const content = course.content as TrainingCourseContent | null;
                    const statusLabel = STATUS_LABELS[course.status] || course.status;
                    const statusClass = STATUS_COLORS[course.status] || '';
                    const { icon: CourseIcon, style: iconStyle } = getCourseCategoryVisual(course.category);

                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="group relative overflow-hidden rounded-[2rem] border border-border bg-background p-5 shadow-sm hover:shadow-xl transition-all duration-500"
                        onClick={() => handleOpenPreview(course)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] ring-1 transition-transform group-hover:scale-110 duration-500", iconStyle)}>
                            <CourseIcon className="h-7 w-7" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-black tracking-tight text-foreground text-base leading-tight line-clamp-2">{course.name}</h3>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 truncate">{course.category}</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-background hover:bg-background " onClick={(event) => event.stopPropagation()}><MoreVertical className="h-5 w-5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-2xl p-2">
                                  <DropdownMenuItem onClick={() => handleOpenPreview(course)} className="rounded-xl font-bold text-xs uppercase tracking-wider p-3"><Eye className="h-4 w-4 mr-3" /> Vista previa</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEdit(course)} className="rounded-xl font-bold text-xs uppercase tracking-wider p-3"><PenLine className="h-4 w-4 mr-3" /> Editar</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicate(course.id)} className="rounded-xl font-bold text-xs uppercase tracking-wider p-3"><Copy className="h-4 w-4 mr-3" /> Duplicar</DropdownMenuItem>
                                  <DropdownMenuItem className="rounded-xl font-bold text-xs uppercase tracking-wider p-3 text-destructive" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="h-4 w-4 mr-3" /> Eliminar</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge className={cn("h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border shadow-sm", statusClass)}>
                                <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
                                {statusLabel}
                              </Badge>
                              {content?.isManual ? (
                                <Badge variant="outline" className="h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 bg-background border-border "><PenLine className="mr-1.5 h-3.5 w-3.5" /> Manual</Badge>
                              ) : content ? (
                                <Badge variant="outline" className="h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 bg-success-light/20 text-success border-success/10"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> IA</Badge>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="rounded-2xl bg-background p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Modalidad</span>
                                <p className="text-xs font-black text-foreground">{MODALITY_LABELS[course.modality]}</p>
                              </div>
                              <div className="rounded-2xl bg-background p-3 flex flex-col items-center justify-center text-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Duración</span>
                                <p className="text-xs font-black text-foreground">{course.duration_hours}h</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-2xl bg-background ">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background border-b border-border hover:bg-background">
                        <TableHead className="px-8 h-16 font-black text-[10px] uppercase tracking-[0.2em]">Curso</TableHead>
                        <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Categoría</TableHead>
                        <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Modalidad</TableHead>
                        <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Duración</TableHead>
                        <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Estado</TableHead>
                        <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Tipo</TableHead>
                        <TableHead className="px-8 h-16 text-right font-black text-[10px] uppercase tracking-[0.2em]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses?.map((course, index) => {
                        const content = course.content as TrainingCourseContent | null;
                        const { icon: CourseIcon, style: iconStyle } = getCourseCategoryVisual(course.category);
                        const statusClass = STATUS_COLORS[course.status] || '';

                        return (
                          <TableRow
                            key={course.id}
                            className="group border-b border-border hover:bg-primary/[0.02] transition-colors cursor-pointer"
                            onClick={() => handleOpenPreview(course)}
                          >
                            <TableCell className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500", iconStyle)}>
                                  <CourseIcon className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black tracking-tight text-foreground text-base leading-none mb-1">{course.name}</p>
                                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">{course.code || 'S/C'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border ">
                                {course.category}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-black tracking-tight text-foreground/80">{MODALITY_LABELS[course.modality]}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-primary/60" />
                                <span className="text-sm font-black tracking-tight text-foreground/80">{course.duration_hours}h</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border shadow-sm", statusClass)}>
                                {STATUS_LABELS[course.status] || course.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {content?.isManual ? (
                                <Badge variant="outline" className="h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 bg-background border-border ">Manual</Badge>
                              ) : content ? (
                                <Badge variant="outline" className="h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 bg-success-light/20 text-success border-success/10">IA</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="px-8 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-10 w-10 rounded-xl hover:bg-primary text-primary hover:text-primary-foreground shadow-sm transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPreview(course);
                                  }}
                                >
                                  <Eye className="w-5 h-5" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl bg-background hover:bg-foreground hover:text-background transition-all">
                                      <MoreVertical className="w-5 h-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl border-border shadow-2xl p-2">
                                    <DropdownMenuItem onClick={() => handleEdit(course)} className="rounded-xl font-bold text-xs uppercase tracking-wider p-3"><PenLine className="h-4 w-4 mr-3" /> Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicate(course.id)} className="rounded-xl font-bold text-xs uppercase tracking-wider p-3"><Copy className="h-4 w-4 mr-3" /> Duplicar</DropdownMenuItem>
                                    <DropdownMenuItem className="rounded-xl font-bold text-xs uppercase tracking-wider p-3 text-destructive" onClick={() => handleDeleteCourse(course.id)}><Trash2 className="h-4 w-4 mr-3" /> Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <CourseFormDialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen} course={selectedCourse} />
      <TrainingPreviewDialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)} course={previewCourse} initialTab={previewInitialTab} />
    </div>
  );
}
