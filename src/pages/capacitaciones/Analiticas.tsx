import { useMemo } from 'react';
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { BookOpen, Users, FileSignature, Building2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTrainingCourses, useTrainingCompletions, useTrainingStats } from '@/hooks/useTraining';
import type { TrainingCompletion } from '@/types/training';

const COLORS = ['hsl(var(--primary))', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Analiticas() {
  const { data: courses = [] } = useTrainingCourses();
  const { data: completions = [] } = useTrainingCompletions();
  const { data: stats } = useTrainingStats();

  const monthlyData = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const count = (completions as TrainingCompletion[]).filter(c => {
        const d = parseISO(c.completed_at);
        return d >= start && d <= end;
      }).length;
      months.push({ month: format(date, 'MMM yy', { locale: es }), count });
    }
    return months;
  }, [completions]);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach(c => { map[c.category] = (map[c.category] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [courses]);

  const byArea = useMemo(() => {
    const map: Record<string, number> = {};
    courses.forEach(c => { const a = c.audience || 'Sin asignar'; map[a] = (map[a] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [courses]);

  const recentCompletions = useMemo(() => {
    return (completions as TrainingCompletion[]).slice(0, 10);
  }, [completions]);

  const kpis = [
    { label: 'Total Capacitaciones', value: courses.length, icon: BookOpen, color: 'text-primary' },
    { label: 'Personal Capacitado', value: completions.length, icon: Users, color: 'text-blue-600' },
    { label: 'Evidencias del Mes', value: monthlyData[monthlyData.length - 1]?.count || 0, icon: FileSignature, color: 'text-emerald-600' },
    { label: 'Cursos Activos', value: stats?.totalCourses || 0, icon: TrendingUp, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Analíticas de Capacitaciones</h1><p className="text-muted-foreground">Métricas y estadísticas del módulo</p></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{kpi.label}</p><p className="text-3xl font-bold">{kpi.value}</p></div><kpi.icon className={`h-8 w-8 ${kpi.color}`} /></div></CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><CardHeader><CardTitle>Completadas por Mes</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Completadas" /></AreaChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Por Categoría</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={byCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
              {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Por Público Objetivo</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byArea} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" name="Capacitaciones" /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Últimas Evidencias</CardTitle></CardHeader><CardContent>
          <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Capacitación</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
            <TableBody>{recentCompletions.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Sin datos</TableCell></TableRow> : recentCompletions.map(c => (
              <TableRow key={c.id}><TableCell>{c.operator_name}</TableCell><TableCell>{c.course?.name || '-'}</TableCell><TableCell>{format(parseISO(c.completed_at), 'dd/MM/yy', { locale: es })}</TableCell></TableRow>
            ))}</TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </div>
  );
}
