import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, ChevronDown, ChevronRight, UserCheck, UserX,
  Search, Building2, BookOpen, Download,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{course.course_name}</span>
            {course.course_code && <Badge variant="outline" className="text-xs">{course.course_code}</Badge>}
          </div>
          <Badge className={course.percentage === 100 ? 'bg-emerald-100 text-emerald-800' : course.percentage >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
            {course.percentage}%
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={course.percentage} className="flex-1 h-2.5" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">{course.completedCount}/{course.total}</span>
        </div>

        {/* Completed */}
        <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
            {showCompleted ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <UserCheck className="h-3.5 w-3.5" />
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
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400 hover:underline">
            {showPending ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <UserX className="h-3.5 w-3.5" />
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
  const [isOpen, setIsOpen] = useState(true);

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
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-lg">{center.center_name}</h3>
                <p className="text-sm text-muted-foreground">{center.totalEmployees} empleados activos · {filteredCourses.length} cursos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={avgPercentage} className="w-32 h-2.5" />
              <Badge variant={avgPercentage === 100 ? 'default' : 'secondary'}>{avgPercentage}%</Badge>
            </div>
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 ml-4">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Cumplimiento por Centro
          </h1>
          <p className="text-muted-foreground">Matriz de cumplimiento de capacitaciones por centro de operación</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filteredData.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar centro..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="w-[220px]">
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
              <SelectTrigger className="w-[220px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando datos de cumplimiento...</CardContent></Card>
      ) : filteredData.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No hay centros con empleados activos asignados</CardContent></Card>
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
