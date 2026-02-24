import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, LayoutGrid, List, FolderTree, MoreHorizontal, Eye, PenLine, Copy, Link2, Image, Trash2, Sparkles, MessageCircle, GraduationCap, RefreshCw, BookOpen, ClipboardCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrainingPreviewDialog } from '@/components/training';
import { useTrainingCourses, useDeleteCourse, useDuplicateCourse } from '@/hooks/useTraining';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TrainingCourse, TrainingCourseContent } from '@/types/training';

const STATUS_COLORS: Record<string, string> = {
  borrador: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  publicado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  completado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Charla 5 min': <MessageCircle className="h-5 w-5" />,
  'Inducción': <GraduationCap className="h-5 w-5" />,
  'Reinducción': <RefreshCw className="h-5 w-5" />,
  'Evaluación': <ClipboardCheck className="h-5 w-5" />,
};

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Biblioteca de Capacitaciones</h1><p className="text-muted-foreground">Repositorio completo de contenidos</p></div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('list')}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="icon" onClick={() => setViewMode('tree')}><FolderTree className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="publicado">Publicado</SelectItem><SelectItem value="completado">Completado</SelectItem></SelectContent></Select>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course, i) => {
            const content = course.content as TrainingCourseContent | null;
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setPreviewCourse(course)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-lg bg-primary/10">{TYPE_ICONS[course.category] || <BookOpen className="h-5 w-5" />}</div>
                      <div className="flex gap-1">
                        <Badge className={STATUS_COLORS[course.status] || ''} variant="secondary">{course.status}</Badge>
                        {content?.isManual ? <Badge variant="outline"><PenLine className="h-3 w-3" /></Badge> : content ? <Badge variant="secondary"><Sparkles className="h-3 w-3" /></Badge> : null}
                      </div>
                    </div>
                    <h3 className="font-semibold mt-3 line-clamp-2">{course.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{course.category}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.duration_hours}h</span>
                    </div>
                    <div className="flex justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setPreviewCourse(course)}><Eye className="h-4 w-4 mr-2" /> Vista previa</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(course)}><PenLine className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(course.id)}><Copy className="h-4 w-4 mr-2" /> Duplicar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/capacitaciones/acceso/generar?courseId=${course.id}`)}><Link2 className="h-4 w-4 mr-2" /> Generar enlace</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(course.id)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {viewMode === 'list' && (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Categoría</TableHead><TableHead>Nivel</TableHead><TableHead>Duración</TableHead><TableHead>Estado</TableHead><TableHead>Tipo</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map(course => {
                  const content = course.content as TrainingCourseContent | null;
                  return (
                    <TableRow key={course.id} className="cursor-pointer" onClick={() => setPreviewCourse(course)}>
                      <TableCell className="font-medium">{course.name}</TableCell>
                      <TableCell><Badge variant="outline">{course.category}</Badge></TableCell>
                      <TableCell className="capitalize">{course.level}</TableCell>
                      <TableCell>{course.duration_hours}h</TableCell>
                      <TableCell><Badge className={STATUS_COLORS[course.status] || ''}>{course.status}</Badge></TableCell>
                      <TableCell>{content?.isManual ? <Badge variant="outline">Manual</Badge> : content ? <Badge variant="secondary">IA</Badge> : '-'}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
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

      {viewMode === 'tree' && (
        <Card><CardContent className="pt-6"><p className="text-muted-foreground text-center py-8">Vista de árbol: {filtered.length} capacitaciones agrupadas por categoría</p>
          {categories.filter(c => filterType === 'all' || c === filterType).map(cat => {
            const catCourses = filtered.filter(c => c.category === cat);
            if (catCourses.length === 0) return null;
            return (
              <div key={cat} className="mb-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">{cat} ({catCourses.length})</h3>
                <div className="ml-4 space-y-1">
                  {catCourses.map(course => (
                    <div key={course.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setPreviewCourse(course)}>
                      <span className="text-sm">{course.name}</span>
                      <Badge className={STATUS_COLORS[course.status] || ''} variant="secondary">{course.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent></Card>
      )}

      {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground"><BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No se encontraron capacitaciones</p></div>}

      <TrainingPreviewDialog open={!!previewCourse} onOpenChange={() => setPreviewCourse(null)} course={previewCourse} />
    </div>
  );
}
