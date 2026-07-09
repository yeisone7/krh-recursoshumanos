import { useEffect, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, ChevronDown, ChevronRight, UserCheck, UserX,
  Search, Building2, BookOpen, Download, SlidersHorizontal,
  Table2, Rows3, CalendarDays, IdCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrainingPeriodFilter } from '@/components/training';
import { useTrainingCompliance, type CenterComplianceData, type CourseComplianceData } from '@/hooks/useTrainingCompliance';
import type { TrainingPeriodInput } from '@/lib/trainingPeriods';
import * as XLSX from 'xlsx';

type ViewMode = 'cards' | 'table';

type ComplianceTableRow = {
  centerId: string;
  centerName: string;
  courseId: string;
  courseName: string;
  courseCode: string | null;
  employee: CourseComplianceData['pending'][number];
  status: 'Completado' | 'Pendiente';
  completedAt: string | null;
};

function normalizeSearchText(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getEmployeeName(employee: CourseComplianceData['pending'][number]) {
  return [employee.first_name, employee.last_name].filter(Boolean).join(' ').trim();
}

function matchesSearch(value: unknown, search: string) {
  return normalizeSearchText(value).includes(search);
}

function employeeMatchesSearch(employee: CourseComplianceData['pending'][number], search: string) {
  return (
    matchesSearch(getEmployeeName(employee), search) ||
    matchesSearch(employee.document_number, search)
  );
}

function recalculateCourse(course: CourseComplianceData): CourseComplianceData {
  const total = course.completed.length + course.pending.length;
  const completedCount = course.completed.length;

  return {
    ...course,
    total,
    completedCount,
    percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
  };
}

function filterComplianceDataBySearch(data: CenterComplianceData[], search: string) {
  const normalizedSearch = normalizeSearchText(search);
  if (!normalizedSearch) return data;

  return data
    .map((center) => {
      const centerMatches = matchesSearch(center.center_name, normalizedSearch);

      const courses = center.courses
        .map((course) => {
          const courseMatches =
            matchesSearch(course.course_name, normalizedSearch) ||
            matchesSearch(course.course_code, normalizedSearch);

          if (centerMatches || courseMatches) return course;

          const completed = course.completed.filter(({ employee }) =>
            employeeMatchesSearch(employee, normalizedSearch)
          );
          const pending = course.pending.filter((employee) =>
            employeeMatchesSearch(employee, normalizedSearch)
          );

          if (completed.length === 0 && pending.length === 0) return null;

          return recalculateCourse({
            ...course,
            completed,
            pending,
          });
        })
        .filter(Boolean) as CourseComplianceData[];

      if (courses.length === 0) return null;

      if (centerMatches) return { ...center, courses };

      const visibleEmployeeIds = new Set<string>();
      for (const course of courses) {
        course.completed.forEach(({ employee }) => visibleEmployeeIds.add(employee.id));
        course.pending.forEach((employee) => visibleEmployeeIds.add(employee.id));
      }

      return {
        ...center,
        courses,
        totalEmployees: visibleEmployeeIds.size || center.totalEmployees,
      };
    })
    .filter(Boolean) as CenterComplianceData[];
}

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
          <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-emerald-700 outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-emerald-400 sm:min-h-8 sm:w-auto sm:px-0 sm:hover:bg-transparent sm:hover:underline">
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
          <CollapsibleTrigger className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium text-red-700 outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-red-400 sm:min-h-8 sm:w-auto sm:px-0 sm:hover:bg-transparent sm:hover:underline">
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
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden cursor-pointer transition-colors hover:bg-background hover:border-primary/30 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
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

function ComplianceViewToggle({ viewMode, onChange }: { viewMode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-xl border border-border/50 bg-background p-1 shadow-inner">
      <Button
        type="button"
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('cards')}
        className="h-10 rounded-lg gap-2 text-xs font-bold"
      >
        <Rows3 className="h-4 w-4" />
        Actual
      </Button>
      <Button
        type="button"
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('table')}
        className="h-10 rounded-lg gap-2 text-xs font-bold"
      >
        <Table2 className="h-4 w-4" />
        Tabla
      </Button>
    </div>
  );
}

function ComplianceTable({ data, courseFilter }: { data: CenterComplianceData[]; courseFilter: string }) {
  const [selectedRow, setSelectedRow] = useState<ComplianceTableRow | null>(null);

  const rows: ComplianceTableRow[] = data.flatMap((center) => {
    const coursesToShow = courseFilter === 'all'
      ? center.courses
      : center.courses.filter((course) => course.course_id === courseFilter);

    return coursesToShow.flatMap((course) => [
      ...course.completed.map(({ employee, completed_at }) => ({
        centerId: center.center_id,
        centerName: center.center_name,
        courseId: course.course_id,
        courseName: course.course_name,
        courseCode: course.course_code,
        employee,
        status: 'Completado' as const,
        completedAt: completed_at,
      })),
      ...course.pending.map((employee) => ({
        centerId: center.center_id,
        centerName: center.center_name,
        courseId: course.course_id,
        courseName: course.course_name,
        courseCode: course.course_code,
        employee,
        status: 'Pendiente' as const,
        completedAt: null,
      })),
    ]);
  });

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No hay empleados para mostrar con los filtros seleccionados.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border/70 bg-muted/60">
                <tr className="text-left text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-4">Centro</th>
                  <th className="px-5 py-4">Curso</th>
                  <th className="px-5 py-4">Empleado</th>
                  <th className="px-5 py-4">Documento</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-background">
                {rows.map((row) => {
                  const { centerId, centerName, courseId, courseName, courseCode, employee, status, completedAt } = row;
                  const isCompleted = status === 'Completado';
                  return (
                    <tr
                      key={`${centerId}-${courseId}-${employee.id}`}
                      className="cursor-pointer transition-colors hover:bg-muted/40 focus:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      tabIndex={0}
                      onClick={() => setSelectedRow(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedRow(row);
                        }
                      }}
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Building2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground">{centerName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <div className="flex min-w-0 items-start gap-2">
                          <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-foreground">{courseName}</p>
                            {courseCode && (
                              <p className="mt-1 text-xs font-medium text-muted-foreground">{courseCode}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <p className="font-semibold text-foreground">{getEmployeeName(employee)}</p>
                      </td>
                      <td className="px-5 py-4 align-top font-medium text-muted-foreground">
                        {employee.document_number || '-'}
                      </td>
                      <td className="px-5 py-4 align-top">
                        <Badge className={isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                          {isCompleted ? <UserCheck className="mr-1 h-3.5 w-3.5" /> : <UserX className="mr-1 h-3.5 w-3.5" />}
                          {status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 align-top font-medium text-muted-foreground">
                        {completedAt ? format(parseISO(completedAt), 'dd MMM yyyy', { locale: es }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden rounded-[2rem] border-border/50 bg-background p-0 shadow-2xl sm:w-full [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-xl [&>button]:bg-background/90 [&>button]:p-2 [&>button]:opacity-100 [&>button]:shadow-sm">
          {selectedRow && (
            <>
              <div className="relative overflow-hidden border-b border-border/50 bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-6 pr-16 sm:px-8">
                <DialogHeader className="relative z-10 text-left">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <Badge variant="outline" className="mb-2 border-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                        Registro
                      </Badge>
                      <DialogTitle className="break-words text-2xl font-black tracking-tight text-foreground">
                        Detalle de cumplimiento
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                        Informacion del empleado, capacitacion y estado del registro seleccionado.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
              </div>

              <div className="max-h-[calc(90dvh-9rem)] overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                <div className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Empleado</p>
                      <p className="mt-1 break-words text-xl font-black text-foreground">{getEmployeeName(selectedRow.employee)}</p>
                    </div>
                    <Badge className={`w-fit shrink-0 px-3 py-1 font-black uppercase tracking-widest ${selectedRow.status === 'Completado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                      {selectedRow.status === 'Completado' ? <UserCheck className="mr-1.5 h-3.5 w-3.5" /> : <UserX className="mr-1.5 h-3.5 w-3.5" />}
                      {selectedRow.status}
                    </Badge>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <IdCard className="h-4 w-4 text-primary" />
                        Documento
                      </div>
                      <p className="mt-3 break-words font-semibold text-foreground">{selectedRow.employee.document_number || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        Centro
                      </div>
                      <p className="mt-3 break-words font-semibold text-foreground">{selectedRow.centerName}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Capacitacion
                      </div>
                      <p className="mt-3 break-words font-semibold text-foreground">{selectedRow.courseName}</p>
                      {selectedRow.courseCode && <p className="mt-1 text-xs font-medium text-muted-foreground">{selectedRow.courseCode}</p>}
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        Fecha de cumplimiento
                      </div>
                      <p className="mt-3 font-semibold text-foreground">
                        {selectedRow.completedAt ? format(parseISO(selectedRow.completedAt), 'dd MMMM yyyy', { locale: es }) : 'Pendiente'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Cumplimiento() {
  const [periodFilter, setPeriodFilter] = useState<TrainingPeriodInput | null>(null);
  const { complianceData, centers, courses, isLoading } = useTrainingCompliance(periodFilter);
  const [centerFilter, setCenterFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    if (courseFilter !== 'all' && !courses.some((course) => course.id === courseFilter)) {
      setCourseFilter('all');
    }
  }, [courseFilter, courses]);

  const filteredData = useMemo(() => {
    let data = complianceData;
    if (centerFilter !== 'all') {
      data = data.filter((c) => c.center_id === centerFilter);
    }
    return filterComplianceDataBySearch(data, search);
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
                <Input placeholder="Buscar centro, empleado o documento..." className="min-h-11 pl-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <TrainingPeriodFilter value={periodFilter} onChange={setPeriodFilter} />
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
              <ComplianceViewToggle viewMode={viewMode} onChange={setViewMode} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card className="hidden sm:block rounded-[2rem] border-border/50 shadow-sm overflow-hidden bg-background">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 lg:flex-1 lg:min-w-[200px] lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Buscar centro, empleado o documento..." className="h-12 pl-12 rounded-xl border-border/50 bg-background shadow-inner text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <TrainingPeriodFilter value={periodFilter} onChange={setPeriodFilter} className="w-full sm:col-span-2 lg:col-span-1 lg:w-[360px]" />
            <div className="w-full sm:col-span-2 lg:col-span-1 lg:w-[220px]">
              <ComplianceViewToggle viewMode={viewMode} onChange={setViewMode} />
            </div>
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
          {viewMode === 'table' ? (
            <ComplianceTable data={filteredData} courseFilter={courseFilter} />
          ) : (
            filteredData.map((center) => (
              <CenterComplianceSection key={center.center_id} center={center} courseFilter={courseFilter} />
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
