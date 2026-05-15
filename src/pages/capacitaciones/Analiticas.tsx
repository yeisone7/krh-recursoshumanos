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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Analíticas de Capacitaciones</h1>
          <p className="text-muted-foreground font-medium mt-1">Métricas y estadísticas del módulo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-black mt-1">{kpi.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-background shadow-inner border border-border/50 ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/50 bg-background /10"><CardTitle className="text-lg font-bold">Completadas por Mes</CardTitle></CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{fontSize: 12}} tickLine={false} axisLine={false} /><YAxis tick={{fontSize: 12}} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))' }} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorPrimary)" name="Completadas" />
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/50 bg-background /10"><CardTitle className="text-lg font-bold">Por Categoría</CardTitle></CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={byCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name} (${value})`} stroke="hsl(var(--background))" strokeWidth={2}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/50 bg-background /10"><CardTitle className="text-lg font-bold">Por Público Objetivo</CardTitle></CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byArea} layout="vertical" barSize={20}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" /><XAxis type="number" tick={{fontSize: 12}} tickLine={false} axisLine={false} /><YAxis dataKey="name" type="category" width={120} tick={{fontSize: 12}} tickLine={false} axisLine={false} /><Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{ borderRadius: '1rem', border: '1px solid hsl(var(--border))' }} /><Bar dataKey="value" fill="hsl(var(--primary))" name="Capacitaciones" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-6 py-5 border-b border-border/50 bg-background /10"><CardTitle className="text-lg font-bold">Últimas Evidencias</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="font-semibold h-10">Nombre</TableHead>
                  <TableHead className="font-semibold h-10">Capacitación</TableHead>
                  <TableHead className="font-semibold h-10">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCompletions.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">Sin datos</TableCell></TableRow>
                ) : (
                  recentCompletions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-xs">{c.operator_name}</TableCell>
                      <TableCell className="text-xs">{c.course?.name || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(parseISO(c.completed_at), 'dd/MM/yy', { locale: es })}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
