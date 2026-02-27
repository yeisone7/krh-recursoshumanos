import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, LayoutGrid, List, FolderTree, MoreVertical, Eye, PenLine, Copy,
  Link2, Trash2, Sparkles, MessageCircle, GraduationCap, RefreshCw,
  BookOpen, ClipboardCheck, Clock, Calendar, FileText, Image as ImageIcon,
  Filter, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrainingPreviewDialog } from '@/components/training';
import { useTrainingCourses, useDeleteCourse, useDuplicateCourse } from '@/hooks/useTraining';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TrainingCourse, TrainingCourseContent } from '@/types/training';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  borrador: { label: 'Borrador', className: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' },
  publicado: { label: 'Publicado', className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400' },
  completado: { label: 'Completado', className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Charla 5 min': <MessageCircle className="h-5 w-5 text-muted-foreground" />,
  'Inducción': <GraduationCap className="h-5 w-5 text-muted-foreground" />,
  'Reinducción': <RefreshCw className="h-5 w-5 text-muted-foreground" />,
  'Evaluación': <ClipboardCheck className="h-5 w-5 text-muted-foreground" />,
};

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'presencial',
  virtual: 'virtual',
  mixto: 'híbrida',
};

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} minutos`;
  if (hours === 1) return '1 hora';
  return `${hours} horas`;
}

export default function Biblioteca() {
  const navigate = useNavigate();
  const { data: courses = [] } = useTrainingCourses();
  const deleteCourse = useDeleteCourse();
  const duplicateCourse = useDuplicateCourse();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'tree'>('grid');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [previewCourse, setPreviewCourse] = useState<TrainingCourse | null>(null);

  const filtered = useMemo(() => {
    return courses.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || c.category === filterType;
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [courses, search, filterType, filterStatus]);

  const categories = useMemo(() => [...new Set(courses.map(c => c.category))], [courses]);

  const handleEdit = (course: TrainingCourse) => {
    const content = course.content as TrainingCourseContent | null;
    navigate(content?.isManual ? `/capacitaciones/crear-manual?id=${course.id}` : `/capacitaciones/crear?id=${course.id}`);
  };

  const handleDuplicate = async (id: string) => {
    try { await duplicateCourse.mutateAsync(id); toast.success('Duplicado'); } catch { toast.error('Error'); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCourse.mutateAsync(id); toast.success('Eliminado'); } catch { toast.error('Error'); }
  };

  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Biblioteca de Capacitaciones</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Repositorio completo de capacitaciones para consulta y reutilización</p>
      </div>

      {/* Search + Filters + View Mode */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar capacitaciones por título..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 space-y-4" align="end">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Categoría</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Estado</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => { setFilterType('all'); setFilterStatus('all'); }}>
                Limpiar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex gap-0.5 border rounded-lg p-0.5">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('tree')}><FolderTree className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">{filtered.length} capacitación(es) encontrada(s)</p>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course, i) => {
            const content = course.content as TrainingCourseContent | null;
            const statusCfg = STATUS_CONFIG[course.status] || STATUS_CONFIG.borrador;
            const evalCount = content?.evaluacion?.length ?? 0;

            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
                <Card
                  className="hover:shadow-md transition-all cursor-pointer group border"
                  onClick={() => setPreviewCourse(course)}
                >
                  <CardContent className="p-5 flex flex-col gap-3">
                    {/* Top row: icon + badges + menu */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-muted">
                          {TYPE_ICONS[course.category] || <BookOpen className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <Badge variant="outline" className="text-xs font-medium">{course.category}</Badge>
                        {content?.isManual ? (
                          <Badge variant="outline" className="text-xs gap-1 px-1.5"><PenLine className="h-3 w-3" /> Manual</Badge>
                        ) : content ? (
                          <Badge className="text-xs gap-1 px-1.5 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"><Sparkles className="h-3 w-3" /> IA</Badge>
                        ) : null}
                      </div>
                      <div onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setPreviewCourse(course)}><Eye className="h-4 w-4 mr-2" /> Vista previa</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(course)}><PenLine className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(course.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/capacitaciones/acceso/generar?courseId=${course.id}`)}><Link2 className="h-4 w-4 mr-2" /> Generar enlace</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(course.id)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">{course.name}</h3>

                    {/* Meta lines */}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        <span>{course.category}</span>
                        <span>•</span>
                        <span className="capitalize">{course.level}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatDuration(course.duration_hours)}</span>
                        <span>•</span>
                        <span>{MODALITY_LABELS[course.modality] || course.modality}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>{format(parseISO(course.created_at), 'dd/M/yyyy', { locale: es })}</span>
                        <span>•</span>
                        <span>v{course.version}</span>
                      </div>
                    </div>

                    {/* Footer: media counts + status */}
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {content?.contenido ? 1 : 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {evalCount}
                        </span>
                      </div>
                      <Badge variant="outline" className={`text-[11px] font-medium ${statusCfg.className}`}>
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Modalidad</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(course => {
                  const content = course.content as TrainingCourseContent | null;
                  const statusCfg = STATUS_CONFIG[course.status] || STATUS_CONFIG.borrador;
                  return (
                    <TableRow key={course.id} className="cursor-pointer" onClick={() => setPreviewCourse(course)}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell><Badge variant="outline">{course.category}</Badge></TableCell>
                      <TableCell className="capitalize">{course.level}</TableCell>
                      <TableCell>{formatDuration(course.duration_hours)}</TableCell>
                      <TableCell className="capitalize">{MODALITY_LABELS[course.modality] || course.modality}</TableCell>
                      <TableCell>v{course.version}</TableCell>
                      <TableCell><Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(course)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(course.id)}>Duplicar</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(course.id)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tree View */}
      {viewMode === 'tree' && (
        <Card>
          <CardContent className="pt-6">
            {categories.filter(c => filterType === 'all' || c === filterType).map(cat => {
              const catCourses = filtered.filter(c => c.category === cat);
              if (catCourses.length === 0) return null;
              return (
                <div key={cat} className="mb-5">
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">{cat} ({catCourses.length})</h3>
                  <div className="ml-4 space-y-1">
                    {catCourses.map(course => {
                      const statusCfg = STATUS_CONFIG[course.status] || STATUS_CONFIG.borrador;
                      return (
                        <div key={course.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setPreviewCourse(course)}>
                          <span className="text-sm">{course.name}</span>
                          <Badge variant="outline" className={`text-[11px] ${statusCfg.className}`}>{statusCfg.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron capacitaciones</p>
        </div>
      )}

      <TrainingPreviewDialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)} course={previewCourse} />
    </div>
  );
}
