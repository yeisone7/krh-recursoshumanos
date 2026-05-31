import { useMemo } from 'react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Award,
  BarChart3,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarCheck,
  CheckCircle2,
  FileSignature,
  Gauge,
  GraduationCap,
  Layers3,
  Medal,
  PieChart as PieChartIcon,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RadarShape,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useTrainingCourses, useTrainingCompletions, useTrainingStats } from '@/hooks/useTraining';
import type { TrainingCompletion, TrainingCourse } from '@/types/training';

const COLORS = ['#14b8c6', '#2563eb', '#f97316', '#ec4899', '#7c3aed', '#22c55e', '#f59e0b', '#334155'];

const toDate = (value?: string | null) => {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
};

const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

const normalize = (value?: string | null, fallback = 'Sin dato') => {
  const clean = value?.trim();
  return clean && clean.length > 0 ? clean : fallback;
};

const topEntries = (map: Map<string, number>, limit = 6) =>
  Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

const average = (values: number[]) =>
  values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

function SmallKpi({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'cyan',
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof BookOpen;
  tone?: 'cyan' | 'blue' | 'orange' | 'pink' | 'emerald' | 'violet';
}) {
  const tones = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    pink: 'border-pink-200 bg-pink-50 text-pink-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    violet: 'border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{helper}</p>
          </div>
          <div className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl border', tones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRail({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-black uppercase tracking-[0.14em] text-slate-600">{label}</span>
        <span className="font-black text-slate-950">{value}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function InfographicCircle({
  index,
  label,
  value,
  helper,
  color,
  icon: Icon,
}: {
  index: string;
  label: string;
  value: string;
  helper: string;
  color: string;
  icon: typeof BookOpen;
}) {
  return (
    <div className="relative min-h-[180px] rounded-[2rem] p-5 text-white shadow-sm" style={{ background: color }}>
      <div className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full border border-white/35 bg-white/10">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-4xl font-black leading-none">{index}</p>
      <div className="mt-8">
        <p className="text-3xl font-black leading-none">{value}</p>
        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em]">{label}</p>
        <p className="mt-3 max-w-[16rem] text-sm font-semibold leading-snug text-white/86">{helper}</p>
      </div>
    </div>
  );
}

function EmptyBlock({ label }: { label: string }) {
  return (
    <div className="grid min-h-[220px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
      <div>
        <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function Analiticas() {
  const { data: courses = [] } = useTrainingCourses();
  const { data: completions = [] } = useTrainingCompletions();
  const { data: stats } = useTrainingStats();

  const analytics = useMemo(() => {
    const typedCourses = courses as TrainingCourse[];
    const typedCompletions = completions as TrainingCompletion[];
    const publishedCourses = typedCourses.filter((course) => course.status === 'publicado').length;
    const mandatoryCourses = typedCourses.filter((course) => course.is_mandatory).length;
    const certificationCourses = typedCourses.filter((course) => course.requires_certification).length;
    const manualCourses = typedCourses.filter((course) => course.content?.isManual).length;
    const aiCourses = Math.max(typedCourses.length - manualCourses, 0);
    const totalHours = Math.round(typedCourses.reduce((sum, course) => sum + (Number(course.duration_hours) || 0), 0));
    const scores = typedCompletions.map((completion) => Number(completion.quiz_score)).filter((score) => Number.isFinite(score));
    const averageScore = average(scores);
    const approvedScores = scores.filter((score) => score >= 70).length;
    const uniquePeople = new Set(
      typedCompletions.map((completion) => completion.operator_cedula || completion.employee_id || completion.operator_name).filter(Boolean),
    ).size;

    const categoryMap = new Map<string, number>();
    const modalityMap = new Map<string, number>();
    const audienceMap = new Map<string, number>();
    const riskMap = new Map<string, number>();
    const completionCourseMap = new Map<string, number>();
    const completionCategoryMap = new Map<string, number>();
    const centerMap = new Map<string, number>();

    typedCourses.forEach((course) => {
      categoryMap.set(normalize(course.category), (categoryMap.get(normalize(course.category)) || 0) + 1);
      modalityMap.set(normalize(course.modality), (modalityMap.get(normalize(course.modality)) || 0) + 1);
      audienceMap.set(normalize(course.audience || course.target_audience || course.objective), (audienceMap.get(normalize(course.audience || course.target_audience || course.objective)) || 0) + 1);
      riskMap.set(normalize(course.risk_level), (riskMap.get(normalize(course.risk_level)) || 0) + 1);
    });

    typedCompletions.forEach((completion) => {
      const courseName = normalize(completion.course?.name, 'Capacitacion sin nombre');
      const category = normalize(completion.course?.category, 'Sin categoria');
      const center = normalize((completion as any).token?.center?.name, 'Sin centro asociado');
      completionCourseMap.set(courseName, (completionCourseMap.get(courseName) || 0) + 1);
      completionCategoryMap.set(category, (completionCategoryMap.get(category) || 0) + 1);
      centerMap.set(center, (centerMap.get(center) || 0) + 1);
    });

    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const date = subMonths(new Date(), 11 - index);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthCompletions = typedCompletions.filter((completion) => {
        const completedAt = toDate(completion.completed_at);
        return completedAt ? completedAt >= start && completedAt <= end : false;
      }).length;
      const createdCourses = typedCourses.filter((course) => {
        const createdAt = toDate(course.created_at);
        return createdAt ? createdAt >= start && createdAt <= end : false;
      }).length;
      return {
        month: format(date, 'MMM yy', { locale: es }),
        completadas: monthCompletions,
        creadas: createdCourses,
      };
    });

    let cumulative = 0;
    const cumulativeData = monthlyData.map((item) => {
      cumulative += item.completadas;
      return { ...item, acumulado: cumulative };
    });

    const scoreBands = [
      { name: '0-59', value: scores.filter((score) => score < 60).length },
      { name: '60-69', value: scores.filter((score) => score >= 60 && score < 70).length },
      { name: '70-84', value: scores.filter((score) => score >= 70 && score < 85).length },
      { name: '85-100', value: scores.filter((score) => score >= 85).length },
    ];

    const health = [
      { subject: 'Publicadas', value: pct(publishedCourses, typedCourses.length) },
      { subject: 'Obligatorias', value: pct(mandatoryCourses, typedCourses.length) },
      { subject: 'Certificables', value: pct(certificationCourses, typedCourses.length) },
      { subject: 'Aprobacion', value: pct(approvedScores, scores.length) },
      { subject: 'Evidencias', value: pct(typedCompletions.length, Math.max(typedCourses.length, 1)) },
    ];

    return {
      totalCourses: typedCourses.length,
      publishedCourses,
      mandatoryCourses,
      certificationCourses,
      manualCourses,
      aiCourses,
      totalHours,
      completions: typedCompletions.length,
      uniquePeople,
      averageScore,
      passRate: pct(approvedScores, scores.length),
      evidenceThisMonth: monthlyData.at(-1)?.completadas || 0,
      categories: topEntries(categoryMap, 8),
      modalities: topEntries(modalityMap, 6),
      audiences: topEntries(audienceMap, 6),
      risks: topEntries(riskMap, 6),
      topCourses: topEntries(completionCourseMap, 8),
      completionCategories: topEntries(completionCategoryMap, 7),
      centers: topEntries(centerMap, 7),
      monthlyData,
      cumulativeData,
      scoreBands,
      health,
      recentCompletions: typedCompletions.slice(0, 10),
    };
  }, [courses, completions]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="flex items-start gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">
                Inteligencia de formacion
              </span>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Analiticas de Capacitaciones</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Controla el inventario de cursos, evidencias, certificaciones, desempeno por evaluacion y cobertura por centro con una lectura ejecutiva y visual.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-3xl font-black text-slate-950">{analytics.totalCourses}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Cursos</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-3xl font-black text-slate-950">{analytics.completions}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Evidencias</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-3xl font-black text-slate-950">{analytics.passRate}%</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Aprobacion</p>
            </div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="resumen" className="space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="h-auto min-w-max rounded-2xl bg-slate-100 p-1">
            <TabsTrigger value="resumen" className="gap-2 px-5 text-[10px]">
              <BarChart3 className="h-4 w-4" /> Resumen
            </TabsTrigger>
            <TabsTrigger value="tendencias" className="gap-2 px-5 text-[10px]">
              <TrendingUp className="h-4 w-4" /> Tendencias
            </TabsTrigger>
            <TabsTrigger value="desempeno" className="gap-2 px-5 text-[10px]">
              <Medal className="h-4 w-4" /> Desempeno
            </TabsTrigger>
            <TabsTrigger value="graficas" className="gap-2 px-5 text-[10px]">
              <Sparkles className="h-4 w-4" /> Consultas Graficas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumen" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SmallKpi label="Cursos activos" value={analytics.totalCourses} helper={`${analytics.publishedCourses} publicados y ${analytics.mandatoryCourses} obligatorios`} icon={BookOpen} tone="cyan" />
            <SmallKpi label="Personas capacitadas" value={analytics.uniquePeople} helper={`${analytics.completions} evidencias registradas`} icon={Users} tone="blue" />
            <SmallKpi label="Certificables" value={stats?.certificatesThisYear || 0} helper="certificados emitidos este ano" icon={Award} tone="emerald" />
            <SmallKpi label="Horas formativas" value={analytics.totalHours} helper="Suma de duracion del catalogo activo" icon={CalendarCheck} tone="orange" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Layers3 className="h-5 w-5 text-sky-500" /> Arquitectura del catalogo
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-4">
                  <MetricRail label="Cursos publicados" value={pct(analytics.publishedCourses, analytics.totalCourses)} color="#14b8c6" />
                  <MetricRail label="Obligatorios" value={pct(analytics.mandatoryCourses, analytics.totalCourses)} color="#f97316" />
                  <MetricRail label="Requieren certificado" value={pct(analytics.certificationCourses, analytics.totalCourses)} color="#22c55e" />
                  <MetricRail label="Contenido con IA" value={pct(analytics.aiCourses, analytics.totalCourses)} color="#7c3aed" />
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={analytics.modalities} innerRadius={56} outerRadius={92} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={3}>
                      {analytics.modalities.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Radar className="h-5 w-5 text-violet-500" /> Salud del modulo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={analytics.health}>
                    <PolarGrid stroke="#dbeafe" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <RadarShape dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.32} strokeWidth={3} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tendencias" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <TrendingUp className="h-5 w-5 text-sky-500" /> Evolucion mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={analytics.cumulativeData}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    <Legend />
                    <Bar dataKey="completadas" fill="#14b8c6" name="Evidencias" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="creadas" fill="#f97316" name="Cursos creados" radius={[8, 8, 0, 0]} />
                    <Line type="monotone" dataKey="acumulado" stroke="#7c3aed" name="Acumulado" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Building2 className="h-5 w-5 text-orange-500" /> Centros con evidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.centers.length === 0 ? (
                  <EmptyBlock label="Sin centros asociados a evidencias" />
                ) : (
                  <div className="space-y-4">
                    {analytics.centers.map((center, index) => (
                      <div key={center.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{center.name}</p>
                            <p className="text-xs font-semibold text-slate-500">{center.value} evidencias</p>
                          </div>
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-xs font-black text-slate-700 shadow-sm">#{index + 1}</span>
                        </div>
                        <Progress className="mt-3 h-2 bg-white" value={pct(center.value, analytics.completions)} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="desempeno" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Cursos mas completados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.topCourses} layout="vertical" barSize={18}>
                    <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" fill="#0ea5e9" name="Evidencias" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Gauge className="h-5 w-5 text-pink-500" /> Evaluacion y calificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[2rem] bg-slate-950 p-5 text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Promedio general</p>
                  <p className="mt-3 text-5xl font-black">{analytics.averageScore}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-300">{analytics.passRate}% con resultado aprobatorio</p>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={analytics.scoreBands}>
                    <CartesianGrid stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="value" name="Personas" radius={[10, 10, 0, 0]}>
                      {analytics.scoreBands.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <FileSignature className="h-5 w-5 text-sky-500" /> Ultimas evidencias registradas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black uppercase tracking-widest text-slate-500">Persona</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-slate-500">Capacitacion</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-slate-500">Puntaje</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-slate-500">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.recentCompletions.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-500">Sin evidencias registradas</TableCell></TableRow>
                    ) : (
                      analytics.recentCompletions.map((completion) => (
                        <TableRow key={completion.id}>
                          <TableCell className="font-bold text-slate-900">{completion.operator_name}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-600">{completion.course?.name || '-'}</TableCell>
                          <TableCell className="text-sm font-black text-slate-900">{completion.quiz_score ?? 'N/A'}</TableCell>
                          <TableCell className="text-sm font-semibold text-slate-500">
                            {toDate(completion.completed_at) ? format(toDate(completion.completed_at)!, 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="graficas" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]">
            <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Consulta grafica</span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Triada de formacion</h2>
                  </div>
                  <BrainCircuit className="h-8 w-8 text-sky-500" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfographicCircle index="01" label="Catalogo" value={`${analytics.totalCourses}`} helper={`${analytics.mandatoryCourses} obligatorias para control operativo`} color="#0f9ec7" icon={BookOpen} />
                  <InfographicCircle index="02" label="Evidencias" value={`${analytics.completions}`} helper={`${analytics.uniquePeople} personas con trazabilidad registrada`} color="#2563eb" icon={FileSignature} />
                  <InfographicCircle index="03" label="Aprobacion" value={`${analytics.passRate}%`} helper={`Promedio de evaluacion ${analytics.averageScore}/100`} color="#1d4ed8" icon={Target} />
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[2rem] border-slate-200 bg-white shadow-sm">
              <CardContent className="p-6">
                <div className="mb-6">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">Mapa visual</span>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Categorias con mayor movimiento</h2>
                </div>
                <div className="grid gap-3">
                  {analytics.completionCategories.length === 0 ? (
                    <EmptyBlock label="Sin categorias completadas" />
                  ) : (
                    analytics.completionCategories.slice(0, 5).map((item, index) => (
                      <div key={item.name} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white" style={{ background: COLORS[index % COLORS.length] }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div className="overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="flex h-10 items-center rounded-full px-4 text-xs font-black uppercase tracking-[0.12em] text-white"
                            style={{ width: `${Math.max(pct(item.value, analytics.completions), 18)}%`, background: COLORS[index % COLORS.length] }}
                          >
                            <span className="truncate">{item.name}</span>
                          </div>
                        </div>
                        <span className="text-sm font-black text-slate-950">{item.value}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm lg:col-span-2">
              <CardContent className="p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-600">Panel comparativo</span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Lectura ejecutiva por audiencia</h2>
                  </div>
                  <PieChartIcon className="h-8 w-8 text-violet-500" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={analytics.audiences} innerRadius={58} outerRadius={110} paddingAngle={3} dataKey="value" nameKey="name" stroke="#fff" strokeWidth={4}>
                        {analytics.audiences.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {analytics.audiences.map((item, index) => (
                      <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                          <p className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{item.name}</p>
                          <p className="text-sm font-black text-slate-950">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-slate-950 text-white shadow-sm">
              <CardContent className="p-6">
                <ShieldCheck className="h-10 w-10 text-emerald-300" />
                <h2 className="mt-4 text-2xl font-black tracking-tight">Semaforo de control</h2>
                <div className="mt-6 space-y-4">
                  <MetricRail label="Publicacion" value={pct(analytics.publishedCourses, analytics.totalCourses)} color="#22c55e" />
                  <MetricRail label="Certificacion" value={pct(analytics.certificationCourses, analytics.totalCourses)} color="#14b8c6" />
                  <MetricRail label="Evidencia mes" value={pct(analytics.evidenceThisMonth, Math.max(analytics.completions, 1))} color="#f97316" />
                  <MetricRail label="Aprobacion" value={analytics.passRate} color="#ec4899" />
                </div>
                <p className="mt-6 rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-white/75">
                  Ideal para comite: permite ver si la formacion esta publicada, certificada, evaluada y con actividad reciente.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
