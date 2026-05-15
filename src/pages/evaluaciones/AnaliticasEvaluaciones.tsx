import { useState, useMemo } from 'react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Award, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Line,
} from 'recharts';
import { useEvaluations } from '@/hooks/useEvaluations';
import { EVALUATION_STATUS_LABELS } from '@/types/evaluation';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['hsl(var(--primary))', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function getScoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-blue-600';
  if (score >= 25) return 'text-amber-600';
  return 'text-red-600';
}

export default function AnaliticasEvaluaciones() {
  const { evaluations, cycles, templates } = useEvaluations();
  const [compareCycleId, setCompareCycleId] = useState<string>('');
  const isMobile = useIsMobile();

  const completedEvals = evaluations.filter(e => e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved');
  const pendingEvals = evaluations.filter(e => e.status === 'pending');
  const inProgressEvals = evaluations.filter(e => e.status === 'in_progress');
  const totalEvaluations = evaluations.length;

  const avgScore = useMemo(() => {
    const scored = evaluations.filter(e => e.overall_score != null && e.overall_score > 0);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, e) => sum + (e.overall_score || 0), 0) / scored.length);
  }, [evaluations]);

  const completionRate = totalEvaluations > 0
    ? Math.round((completedEvals.length / totalEvaluations) * 100)
    : 0;

  const activeCycles = cycles.filter(c => c.status === 'active');

  // Comparison data
  const compareEvaluations = compareCycleId
    ? evaluations
        .filter(e => e.cycle_id === compareCycleId && e.overall_score !== null)
        .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
    : [];
  const compareAvg = compareEvaluations.length > 0
    ? Math.round(compareEvaluations.reduce((s, e) => s + (e.overall_score || 0), 0) / compareEvaluations.length)
    : 0;

  const handleExportComparative = () => {
    if (compareEvaluations.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    const cycleName = cycles.find(c => c.id === compareCycleId)?.name || 'Comparativo';
    const data = compareEvaluations.map((ev, idx) => ({
      '#': idx + 1,
      'Empleado': `${ev.employee?.first_name || ''} ${ev.employee?.last_name || ''}`,
      'Documento': ev.employee?.document_number || '',
      'Puntaje': ev.overall_score || 0,
      'Calificación': ev.overall_rating || '-',
      'Estado': EVALUATION_STATUS_LABELS[ev.status] || ev.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 18 }, { wch: 15 }];
    XLSX.writeFile(wb, `Comparativo_${cycleName.replace(/\s/g, '_')}.xlsx`);
    toast.success('Archivo Excel descargado');
  };

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const months: { month: string; completadas: number; pendientes: number; promedio: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const monthEvals = evaluations.filter(e => {
        if (!e.created_at) return false;
        const d = parseISO(e.created_at);
        return d >= start && d <= end;
      });
      const completed = monthEvals.filter(e => e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved').length;
      const pending = monthEvals.filter(e => e.status === 'pending').length;
      const scored = monthEvals.filter(e => e.overall_score != null && e.overall_score > 0);
      const avg = scored.length > 0 ? Math.round(scored.reduce((s, e) => s + (e.overall_score || 0), 0) / scored.length) : 0;
      months.push({ month: format(date, 'MMM yy', { locale: es }), completadas: completed, pendientes: pending, promedio: avg });
    }
    return months;
  }, [evaluations]);

  // By status
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    evaluations.forEach(e => { const s = e.status || 'pending'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name: EVALUATION_STATUS_LABELS[name as keyof typeof EVALUATION_STATUS_LABELS] || name, value }));
  }, [evaluations]);

  // By cycle
  const byCycle = useMemo(() => {
    const map: Record<string, { total: number; completed: number; scores: number[] }> = {};
    evaluations.forEach(e => {
      const cycle = cycles.find(c => c.id === e.cycle_id);
      const cycleName = cycle?.name || 'Sin ciclo';
      if (!map[cycleName]) map[cycleName] = { total: 0, completed: 0, scores: [] };
      map[cycleName].total++;
      if (e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved') map[cycleName].completed++;
      if (e.overall_score != null && e.overall_score > 0) map[cycleName].scores.push(e.overall_score);
    });
    return Object.entries(map).map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '…' : name,
      total: data.total,
      completadas: data.completed,
    })).sort((a, b) => b.total - a.total);
  }, [evaluations, cycles]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: '0-59', min: 0, max: 59, count: 0 },
      { range: '60-74', min: 60, max: 74, count: 0 },
      { range: '75-90', min: 75, max: 90, count: 0 },
      { range: '91-100', min: 91, max: 100, count: 0 },
    ];
    evaluations.forEach(e => {
      if (e.overall_score == null || e.overall_score === 0) return;
      const bucket = buckets.find(b => e.overall_score! >= b.min && e.overall_score! <= b.max);
      if (bucket) bucket.count++;
    });
    return buckets.map(b => ({ name: b.range, cantidad: b.count }));
  }, [evaluations]);

  // Top/Bottom
  const rankedEvaluations = useMemo(() => {
    return evaluations
      .filter(e => e.overall_score != null && e.overall_score > 0)
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
  }, [evaluations]);

  const topPerformers = rankedEvaluations.slice(0, 5);
  const bottomPerformers = [...rankedEvaluations].reverse().slice(0, 5);

  // By template (via cycle -> template)
  const byTemplate = useMemo(() => {
    const map: Record<string, number> = {};
    evaluations.forEach(e => {
      const cycle = cycles.find(c => c.id === e.cycle_id);
      const tmpl = templates.find(t => t.id === cycle?.template_id);
      const name = tmpl?.name || 'Sin plantilla';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 25 ? name.substring(0, 25) + '…' : name, value }))
      .sort((a, b) => b.value - a.value);
  }, [evaluations, cycles, templates]);

  const kpis = [
    { label: 'Total Evaluaciones', value: totalEvaluations, icon: Target, color: 'text-primary', sub: `${activeCycles.length} ciclos activos` },
    { label: 'Puntaje Promedio', value: `${avgScore}/100`, icon: Award, color: 'text-emerald-600', sub: avgScore >= 75 ? 'Desempeño alto' : avgScore >= 50 ? 'Desempeño medio' : 'Requiere atención' },
    { label: 'Tasa de Completado', value: `${completionRate}%`, icon: TrendingUp, color: 'text-blue-600', sub: `${completedEvals.length} completadas` },
    { label: 'Pendientes', value: pendingEvals.length, icon: AlertTriangle, color: 'text-amber-600', sub: `${inProgressEvals.length} en curso` },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-foreground">Analíticas de Evaluaciones</h1>
            <p className="text-muted-foreground font-medium mt-1">
              Métricas, tendencias y comparativos del desempeño organizacional
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card className="rounded-[2rem] border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden relative group h-full flex flex-col">
              <div className={`absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-${kpi.color.replace('text-', '')}/20 to-transparent rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
              <CardContent className="p-6 relative z-10 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl bg-gradient-to-br from-${kpi.color.replace('text-', '')}/20 to-transparent`}>
                    <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-1 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-3xl font-black text-foreground mb-1">{kpi.value}</p>
                  <p className="text-xs font-medium text-muted-foreground">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Trend + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold">Tendencia Mensual</CardTitle>
            <CardDescription className="font-medium">Evaluaciones completadas y pendientes (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} interval={isMobile ? 1 : 0} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" width={isMobile ? 28 : 40} tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} width={isMobile ? 28 : 40} tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, fontWeight: 500 }} />
                <Bar yAxisId="left" dataKey="completadas" fill="hsl(var(--primary))" name="Completadas" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="pendientes" fill="#f59e0b" name="Pendientes" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="promedio" stroke="#10b981" strokeWidth={3} name="Puntaje Promedio" dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6"><CardTitle className="text-xl font-bold">Distribución por Estado</CardTitle></CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" outerRadius={isMobile ? 72 : 90} innerRadius={isMobile ? 40 : 50} dataKey="value" label={isMobile ? false : ({ name, value }) => `${name} (${value})`} stroke="none" >
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Cycle + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold">Comparativo por Ciclo</CardTitle>
            <CardDescription className="font-medium">Total vs completadas por ciclo de evaluación</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            {byCycle.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 font-medium">Sin datos de ciclos</p>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 300}>
                <ComposedChart data={byCycle} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                  <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={isMobile ? 82 : 130} tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, fontWeight: 500 }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completadas" fill="#10b981" name="Completadas" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold">Distribución de Puntajes</CardTitle>
            <CardDescription className="font-medium">Rangos de calificación según escala</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center">
            <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.2)" />
                <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                <YAxis width={isMobile ? 28 : 40} tick={{ fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                <Bar dataKey="cantidad" name="Evaluaciones" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Template usage + Top/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold">Uso de Plantillas</CardTitle>
            <CardDescription className="font-medium">Evaluaciones por plantilla</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
            {byTemplate.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 font-medium">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byTemplate} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ value }) => `${value}`} stroke="none">
                    {byTemplate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="bg-emerald-500/10 border-b border-border/50 p-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="h-6 w-6" />
              Top 5 — Mejor Desempeño
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {topPerformers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 font-medium">Sin evaluaciones calificadas</p>
              ) : topPerformers.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-emerald-500/5 transition-colors border border-transparent hover:border-emerald-500/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {ev.employee?.first_name} {ev.employee?.last_name}
                    </p>
                    <Progress value={ev.overall_score || 0} className="h-2 mt-2 bg-emerald-100 dark:bg-emerald-950" indicatorClassName="bg-emerald-500" />
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${getScoreColor(ev.overall_score || 0)}`}>
                      {ev.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground block font-medium">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden flex flex-col bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardHeader className="bg-amber-500/10 border-b border-border/50 p-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-6 w-6" />
              Top 5 — Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {bottomPerformers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 font-medium">Sin evaluaciones calificadas</p>
              ) : bottomPerformers.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-amber-500/5 transition-colors border border-transparent hover:border-amber-500/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {ev.employee?.first_name} {ev.employee?.last_name}
                    </p>
                    <Progress value={ev.overall_score || 0} className="h-2 mt-2 bg-amber-100 dark:bg-amber-950" indicatorClassName="bg-amber-500" />
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-black ${getScoreColor(ev.overall_score || 0)}`}>
                      {ev.overall_score}
                    </span>
                    <span className="text-xs text-muted-foreground block font-medium">/100</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cycles */}
      {activeCycles.length > 0 && (
        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-background /10 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold">Ciclos Activos</CardTitle>
            <CardDescription className="font-medium">Progreso de los ciclos de evaluación en curso</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeCycles.map(cycle => {
                const cycleEvals = evaluations.filter(e => e.cycle_id === cycle.id);
                const cycleCompleted = cycleEvals.filter(e => e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved').length;
                const progress = cycleEvals.length > 0 ? Math.round((cycleCompleted / cycleEvals.length) * 100) : 0;
                return (
                  <div key={cycle.id} className="border border-border/50 bg-background shadow-inner rounded-2xl p-5 space-y-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-bold truncate text-lg">{cycle.name}</p>
                      <Badge variant="secondary" className="font-bold shadow-sm">{cycleCompleted}/{cycleEvals.length}</Badge>
                    </div>
                    <Progress value={progress} className="h-2.5" />
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span className="bg-background px-2 py-1 rounded-md">{format(parseISO(cycle.start_date), 'dd MMM yy', { locale: es })}</span>
                      <span className="text-primary px-2 py-1">{progress}%</span>
                      <span className="bg-background px-2 py-1 rounded-md">{format(parseISO(cycle.end_date), 'dd MMM yy', { locale: es })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparativo */}
      <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden bg-background">
        <CardHeader className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 border-b border-border/50 bg-background ">
          <div className="min-w-0">
            <CardTitle className="text-xl font-bold">Resumen Comparativo</CardTitle>
            <CardDescription className="mt-1 font-medium">
              Compara puntajes de todos los empleados evaluados en un ciclo
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            <Select value={compareCycleId} onValueChange={setCompareCycleId}>
              <SelectTrigger className="w-full sm:w-[240px] h-12 rounded-xl bg-background shadow-inner">
                <SelectValue placeholder="Seleccionar ciclo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {cycles.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compareEvaluations.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportComparative} className="w-full sm:w-auto h-12 rounded-xl font-bold shadow-sm">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" />
                Exportar Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {!compareCycleId ? (
            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-background ">
              <p className="text-muted-foreground font-semibold">
                Selecciona un ciclo para ver el comparativo
              </p>
            </div>
          ) : compareEvaluations.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-2xl bg-background ">
              <p className="text-muted-foreground font-semibold">
                No hay evaluaciones con puntaje en este ciclo
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-background rounded-2xl p-5 text-center border border-border/50 shadow-sm">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Promedio</p>
                  <p className="text-4xl font-black text-foreground">{compareAvg}<span className="text-lg text-muted-foreground">/100</span></p>
                </div>
                <div className="bg-background rounded-2xl p-5 text-center border border-border/50 shadow-sm">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Mejor Puntaje</p>
                  <p className="text-4xl font-black text-foreground">
                    {compareEvaluations[0]?.overall_score || 0}<span className="text-lg text-muted-foreground">/100</span>
                  </p>
                </div>
                <div className="bg-background rounded-2xl p-5 text-center border border-border/50 shadow-sm">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Evaluados</p>
                  <p className="text-4xl font-black text-foreground">{compareEvaluations.length}</p>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl border border-border/50 shadow-sm bg-background">
              <Table className="min-w-[680px] table-fixed sm:table-auto">
                <TableHeader className="bg-background">
                  <TableRow>
                    <TableHead className="w-16 font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">#</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Empleado</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Puntaje</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Calificación</TableHead>
                    <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Desempeño</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareEvaluations.map((ev, idx) => (
                    <TableRow key={ev.id} className="hover:bg-background /10 transition-colors">
                      <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-bold">
                        {ev.employee?.first_name} {ev.employee?.last_name}
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-lg">{ev.overall_score}</span><span className="text-xs text-muted-foreground font-semibold">/100</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          (ev.overall_score || 0) >= 91
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : (ev.overall_score || 0) >= 75
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : (ev.overall_score || 0) >= 60
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        } border-0 font-bold shadow-sm`}>
                          {ev.overall_rating || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <Progress value={ev.overall_score || 0} className="h-3" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
