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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Analíticas de Evaluaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Métricas, tendencias y comparativos del desempeño organizacional</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold sm:text-3xl">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  </div>
                  <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Trend + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
            <CardDescription>Evaluaciones completadas y pendientes (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="completadas" fill="hsl(var(--primary))" name="Completadas" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="pendientes" fill="#f59e0b" name="Pendientes" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="promedio" stroke="#10b981" strokeWidth={2} name="Puntaje Promedio" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribución por Estado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={byStatus} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                  {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* By Cycle + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo por Ciclo</CardTitle>
            <CardDescription>Total vs completadas por ciclo de evaluación</CardDescription>
          </CardHeader>
          <CardContent>
            {byCycle.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin datos de ciclos</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={byCycle} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="completadas" fill="#10b981" name="Completadas" radius={[0, 4, 4, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Puntajes</CardTitle>
            <CardDescription>Rangos de calificación según escala</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
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
        <Card>
          <CardHeader>
            <CardTitle>Uso de Plantillas</CardTitle>
            <CardDescription>Evaluaciones por plantilla</CardDescription>
          </CardHeader>
          <CardContent>
            {byTemplate.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={byTemplate} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ value }) => `${value}`}>
                    {byTemplate.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Top 5 — Mejor Desempeño
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sin evaluaciones calificadas</p>
              ) : topPerformers.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ev.employee?.first_name} {ev.employee?.last_name}
                    </p>
                    <Progress value={ev.overall_score || 0} className="h-2 mt-1" />
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(ev.overall_score || 0)}`}>
                    {ev.overall_score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Top 5 — Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottomPerformers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sin evaluaciones calificadas</p>
              ) : bottomPerformers.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {ev.employee?.first_name} {ev.employee?.last_name}
                    </p>
                    <Progress value={ev.overall_score || 0} className="h-2 mt-1" />
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(ev.overall_score || 0)}`}>
                    {ev.overall_score}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Cycles */}
      {activeCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ciclos Activos</CardTitle>
            <CardDescription>Progreso de los ciclos de evaluación en curso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCycles.map(cycle => {
                const cycleEvals = evaluations.filter(e => e.cycle_id === cycle.id);
                const cycleCompleted = cycleEvals.filter(e => e.status === 'submitted' || e.status === 'reviewed' || e.status === 'approved').length;
                const progress = cycleEvals.length > 0 ? Math.round((cycleCompleted / cycleEvals.length) * 100) : 0;
                return (
                  <div key={cycle.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{cycle.name}</p>
                      <Badge variant="secondary" className="text-xs">{cycleCompleted}/{cycleEvals.length}</Badge>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{format(parseISO(cycle.start_date), 'dd MMM yy', { locale: es })}</span>
                      <span className="font-medium">{progress}%</span>
                      <span>{format(parseISO(cycle.end_date), 'dd MMM yy', { locale: es })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparativo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Resumen Comparativo</CardTitle>
            <CardDescription className="mt-1">
              Compara puntajes de todos los empleados evaluados en un ciclo
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={compareCycleId} onValueChange={setCompareCycleId}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Seleccionar ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {compareEvaluations.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportComparative}>
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Excel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!compareCycleId ? (
            <p className="text-muted-foreground text-center py-8">
              Selecciona un ciclo para ver el comparativo
            </p>
          ) : compareEvaluations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay evaluaciones con puntaje en este ciclo
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Promedio</p>
                  <p className="text-2xl font-bold text-foreground">{compareAvg}/100</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Mejor Puntaje</p>
                  <p className="text-2xl font-bold text-foreground">
                    {compareEvaluations[0]?.overall_score || 0}/100
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Evaluados</p>
                  <p className="text-2xl font-bold text-foreground">{compareEvaluations.length}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Calificación</TableHead>
                    <TableHead>Barra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareEvaluations.map((ev, idx) => (
                    <TableRow key={ev.id}>
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {ev.employee?.first_name} {ev.employee?.last_name}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{ev.overall_score}/100</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          (ev.overall_score || 0) >= 91
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : (ev.overall_score || 0) >= 75
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : (ev.overall_score || 0) >= 60
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }>
                          {ev.overall_rating || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[150px]">
                        <Progress value={ev.overall_score || 0} className="h-2" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
