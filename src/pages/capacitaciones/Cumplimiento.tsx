import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, ChevronDown, ChevronRight, UserCheck, UserX,
  Search, Building2, BookOpen, Download, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTrainingCompliance, type CenterComplianceData, type CourseComplianceData } from '@/hooks/useTrainingCompliance';
import * as XLSX from 'xlsx';

function CourseComplianceCard({ course }: { course: CourseComplianceData }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showPending, setShowPending] = useState(false);

  const progressColor = course.percentage === 100
    ? 'bg-emerald-500'
    : course.percentage >= 50
      ? 'bg-amber-500'
      : 'bg-destructive';

  return (
    <Card className="border-l-4" style={{ borderLeftColor: course.percentage === 100 ? '#10b981' : course.percentage >= 50 ? '#f59e0b' : 'hsl(var(--destructive))' }}>
      <CardContent className="pt-4 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-words font-semibold">{course.course_name}</span>
            {course.course_code && <Badge variant="outline" className="text-xs">{course.course_code}</Badge>}
          </div>
          <Badge className={`shrink-0 ${course.percentage === 100 ? 'bg-emerald-100 text-emerald-800' : course.percentage >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
            {course.percentage}%
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={course.percentage} className="flex-1 h-2.5" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{course.completedCount}/{course.total}</span>
        </div>

        {/* Completed */}
        <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
          <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-emerald-700 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-emerald-400 sm:min-h-8 sm:w-auto sm:px-0 sm:hover:bg-transparent sm:hover:underline">
            {showCompleted ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <UserCheck className="h-4 w-4 shrink-0" />
            Completaron ({course.completedCount})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-5 space-y-0.5">
            {course.completed.map(({ employee, completed_at }) => (
              <div key={employee.id} className="flex items-center justify-between text-sm py-0.5">
                <span>{employee.first_name} {employee.last_name}</span>
                <span className="text-muted-foreground text-xs">
                  {format(parseISO(completed_at), 'dd MMM yyyy', { locale: es })}
                </span>
              </div>
            ))}
            {course.completed.length === 0 && <p className="text-xs text-muted-foreground">Ninguno</p>}
          </CollapsibleContent>
        </Collapsible>

        {/* Pending */}
        <Collapsible open={showPending} onOpenChange={setShowPending}>
          <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-red-700 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-red-400 sm:min-h-8 sm:w-auto sm:px-0 sm:hover:bg-transparent sm:hover:underline">
            {showPending ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <UserX className="h-4 w-4 shrink-0" />
            Pendientes ({course.pending.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 ml-5 space-y-0.5">
            {course.pending.map((emp) => (
              <div key={emp.id} className="text-sm py-0.5">
                {emp.first_name} {emp.last_name}
              </div>
            ))}
            {course.pending.length === 0 && <p className="text-xs text-muted-foreground">Todos completaron</p>}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function CenterComplianceSection({ center, courseFilter }: { center: CenterComplianceData; courseFilter: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredCourses = courseFilter === 'all'
    ? center.courses
    : center.courses.filter((c) => c.course_id === courseFilter);

  const avgPercentage = filteredCourses.length > 0
    ? Math.round(filteredCourses.reduce((a, c) => a + c.percentage, 0) / filteredCourses.length)
    : 0;

  if (filteredCourses.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden cursor-pointer transition-colors hover:bg-muted/30 hover:border-primary/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <CardContent className="flex min-h-20 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between px-6">
            <div className="flex min-w-0 items-center gap-4">
              {isOpen ? <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />}
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="break-words text-lg font-bold">{center.center_name}</h3>
                <p className="text-sm font-medium text-muted-foreground mt-0.5">{center.totalEmployees} empleados activos · {filteredCourses.length} cursos</p>
              </div>
            </div>
            <div className="flex w-full items-center gap-4 sm:w-auto">
              <Progress value={avgPercentage} className="h-2.5 min-w-0 flex-1 sm:w-32 sm:flex-none" />
              <Badge className="shrink-0 text-xs px-2 py-0.5 rounded-md" variant={avgPercentage === 100 ? 'default' : 'secondary'}>{avgPercentage}%</Badge>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 gap-3 mt-3 sm:ml-4 md:grid-cols-2">
          {filteredCourses.map((course) => (
            <CourseComplianceCard key={course.course_id} course={course} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Cumplimiento() {
  const { complianceData, centers, courses, isLoading } = useTrainingCompliance();
  const [centerFilter, setCenterFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filteredData = useMemo(() => {
    let data = complianceData;
    if (centerFilter !== 'all') {
      data = data.filter((c) => c.center_id === centerFilter);
    }
    if (search) {
      data = data.filter((c) => c.center_name.toLowerCase().includes(search.toLowerCase()));
    }
    return data;
  }, [complianceData, centerFilter, search]);

  function handleExport() {
    const rows: any[] = [];
    for (const center of filteredData) {
      const coursesToExport = courseFilter === 'all' ? center.courses : center.courses.filter((c) => c.course_id === courseFilter);
      for (const course of coursesToExport) {
        for (const { employee, completed_at } of course.completed) {
          rows.push({
            Centro: center.center_name,
            Curso: course.course_name,
            Empleado: `${employee.first_name} ${employee.last_name}`,
            Cédula: employee.document_number,
            Estado: 'Completado',
            Fecha: format(parseISO(completed_at), 'dd/MM/yyyy'),
          });
        }
        for (const emp of course.pending) {
          rows.push({
            Centro: center.center_name,
            Curso: course.course_name,
            Empleado: `${emp.first_name} ${emp.last_name}`,
            Cédula: emp.document_number,
            Estado: 'Pendiente',
            Fecha: '',
          });
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cumplimiento');
    XLSX.writeFile(wb, 'cumplimiento-capacitaciones.xlsx');
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
              <ClipboardCheck className="h-8 w-8 shrink-0 text-primary" />
              Cumplimiento por Centro
            </h1>
            <p className="text-muted-foreground font-medium mt-1">Matriz de cumplimiento de capacitaciones por centro de operación</p>
          </div>
          <Button className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto" onClick={handleExport} disabled={filteredData.length === 0}>
            <Download className="h-4 w-4 mr-2" /> <span className="truncate">Exportar Excel</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="sm:hidden">
        <Card>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex min-h-12 w-full items-center justify-between px-4 py-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <span className="flex items-center gap-2 font-medium">
                <SlidersHorizontal className="h-4 w-4 text-primary" /> Filtros
              </span>
              {filtersOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar centro..." className="min-h-11 pl-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger className="min-h-11 w-full focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Centro de Operación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="min-h-11 w-full focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                  <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los cursos</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="hidden sm:block rounded-[2rem] border-border/50 shadow-sm overflow-hidden bg-muted/20">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 lg:flex-1 lg:min-w-[200px] lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Buscar centro..." className="h-12 pl-12 rounded-xl border-border/50 bg-background shadow-inner text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border/50 bg-background shadow-inner text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background lg:w-[220px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Centro de Operación" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos los centros</SelectItem>
                {centers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border/50 bg-background shadow-inner text-sm focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background sm:col-span-2 lg:col-span-1 lg:w-[220px]">
                <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Curso" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos los cursos</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando datos de cumplimiento...</CardContent></Card>
      ) : filteredData.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay centros con empleados activos asignados que tengan enlaces de capacitación publicados. Verifica que los empleados tengan un centro de operación asignado en su información laboral y que existan enlaces publicados para ese centro.</CardContent></Card>
      ) : (
        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {filteredData.map((center) => (
            <CenterComplianceSection key={center.center_id} center={center} courseFilter={courseFilter} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
