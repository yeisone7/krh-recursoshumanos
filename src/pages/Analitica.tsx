import { motion } from 'framer-motion';
import type React from 'react';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  TrendingDown, 
  Clock, 
  HeartPulse,
  GraduationCap,
  Target,
  AlertTriangle,
  BarChart3,
  Gauge,
  LineChart,
  PieChart,
  Sparkles
} from 'lucide-react';
import { useHRAnalytics } from '@/hooks/useHRAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TurnoverChart, 
  AbsenteeismChart, 
  ComplianceChart, 
  AreaMetricsTable,
  DistributionCharts,
  AnalyticsKPICard,
  SelectionDiversityCharts,
  DiversityTrendsChart,
  DiversityGoalsWidget,
} from '@/components/analytics';
import type { HRAnalytics } from '@/hooks/useHRAnalytics';

const infographicColors = {
  teal: '#10A5BC',
  pink: '#F84D8A',
  orange: '#FF9900',
  violet: '#5B45C4',
  blue: '#4F7BEF',
  aqua: '#49D1D5',
  ink: '#263147',
  soft: '#F7F7FD',
};

const formatNumber = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function InfographicPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function DonutInfographic({
  value,
  label,
  detail,
  color,
}: {
  value: number;
  label: string;
  detail: string;
  color: string;
}) {
  const percent = clampPercent(value);
  const circumference = 2 * Math.PI * 46;
  const dash = (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <svg viewBox="0 0 128 128" className="h-36 w-36">
        <circle cx="64" cy="64" r="52" fill="#F4F5F7" stroke="#E7EBF0" strokeWidth="12" />
        <circle
          cx="64"
          cy="64"
          r="46"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 64 64)"
        />
        <circle cx="64" cy="64" r="32" fill="white" stroke="#D7DDE6" strokeWidth="2" />
        <text x="64" y="60" textAnchor="middle" className="fill-slate-950 text-2xl font-black">{percent}%</text>
        <text x="64" y="76" textAnchor="middle" className="fill-slate-500 text-[10px] font-bold uppercase tracking-wide">indice</text>
      </svg>
      <p className="text-sm font-black uppercase tracking-wide text-slate-950">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(7, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[120px_1fr_52px] items-center gap-3">
      <span className="truncate text-xs font-black text-slate-700">{label}</span>
      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-right text-xs font-black text-slate-800">{formatNumber.format(value)}</span>
    </div>
  );
}

function PeopleDistribution({ analytics }: { analytics: HRAnalytics }) {
  const genderTotal = analytics.byGender.reduce((sum, item) => sum + item.value, 0);
  const blocks = Array.from({ length: 36 }, (_, index) => {
    const running = analytics.byGender.reduce<Array<{ end: number; color: string }>>((acc, item) => {
      const previous = acc[acc.length - 1]?.end || 0;
      acc.push({ end: previous + item.value, color: item.color || infographicColors.teal });
      return acc;
    }, []);
    const position = Math.ceil(((index + 1) / 36) * Math.max(genderTotal, 1));
    return running.find((item) => position <= item.end)?.color || '#D9DEE7';
  });

  return (
    <InfographicPanel className="min-h-[286px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Distribucion</p>
          <h3 className="text-lg font-black text-slate-950">Sexo biologico</h3>
        </div>
        <Users className="h-5 w-5 text-slate-500" />
      </div>
      <div className="grid grid-cols-9 gap-2">
        {blocks.map((color, index) => (
          <span key={index} className="h-6 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {analytics.byGender.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 text-xs font-bold">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="truncate">{item.name}</span>
            </span>
            <span className="text-slate-950">{item.value} - {clampPercent((item.value / Math.max(genderTotal, 1)) * 100)}%</span>
          </div>
        ))}
      </div>
    </InfographicPanel>
  );
}

function NumberStep({ number, title, value, color }: { number: string; title: string; value: string; color: string }) {
  return (
    <div className="flex min-h-[118px] flex-col justify-between rounded-lg p-4 text-white shadow-sm" style={{ backgroundColor: color }}>
      <span className="text-4xl font-black leading-none">{number}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </div>
  );
}

function TimelineBubble({ index, title, value, color }: { index: number; title: string; value: string; color: string }) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white shadow-sm" style={{ backgroundColor: color }}>
        {index}
      </span>
      <p className="text-xs font-black uppercase tracking-wide text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{value}</p>
    </div>
  );
}

function InfographicsTab({ analytics }: { analytics: HRAnalytics }) {
  const maxMonthlyMovement = Math.max(
    ...analytics.turnoverTrend.map((item) => Math.max(item.hires, item.terminations)),
    1
  );
  const maxAreaEmployees = Math.max(...analytics.areaMetrics.map((item) => item.employees), 1);
  const retentionRate = clampPercent(100 - analytics.yearlyTurnoverRate);
  const healthRate = clampPercent(100 - analytics.absenteeismRate);
  const developmentRate = clampPercent((analytics.trainingComplianceRate + analytics.evaluationComplianceRate) / 2);
  const topAreas = analytics.areaMetrics.slice(0, 4);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F7F7FD] p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_1fr]">
        <InfographicPanel>
          <div className="grid gap-4 sm:grid-cols-2">
            <DonutInfographic value={retentionRate} label="Retencion" detail={`${formatNumber.format(analytics.yearlyTurnoverRate)}% rotacion anual`} color={infographicColors.violet} />
            <DonutInfographic value={healthRate} label="Salud laboral" detail={`${formatNumber.format(analytics.absenteeismRate)}% ausentismo`} color={infographicColors.teal} />
          </div>
        </InfographicPanel>

        <InfographicPanel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pulso mensual</p>
              <h3 className="text-lg font-black text-slate-950">Ingresos vs retiros</h3>
            </div>
            <LineChart className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-3">
            {analytics.turnoverTrend.map((item) => (
              <div key={item.month} className="grid grid-cols-[44px_1fr] items-center gap-3">
                <span className="text-xs font-black uppercase text-slate-500">{item.month}</span>
                <div className="space-y-1.5">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#10A5BC]" style={{ width: `${(item.hires / maxMonthlyMovement) * 100}%` }} />
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#F84D8A]" style={{ width: `${(item.terminations / maxMonthlyMovement) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#10A5BC]" />Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[#F84D8A]" />Retiros</span>
          </div>
        </InfographicPanel>

        <PeopleDistribution analytics={analytics} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NumberStep number="1" title="Activos" value={formatNumber.format(analytics.activeEmployees)} color={infographicColors.teal} />
        <NumberStep number="2" title="Nuevos YTD" value={formatNumber.format(analytics.newHiresYTD)} color={infographicColors.pink} />
        <NumberStep number="3" title="Capacitacion" value={`${analytics.trainingComplianceRate}%`} color={infographicColors.orange} />
        <NumberStep number="4" title="Evaluaciones" value={`${analytics.evaluationComplianceRate}%`} color={infographicColors.violet} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <InfographicPanel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ranking operativo</p>
              <h3 className="text-lg font-black text-slate-950">Areas con mayor poblacion</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-4">
            {topAreas.map((item, index) => (
              <MiniBar key={item.name} label={item.name} value={item.employees} max={maxAreaEmployees} color={[infographicColors.teal, infographicColors.pink, infographicColors.orange, infographicColors.violet][index % 4]} />
            ))}
          </div>
        </InfographicPanel>

        <InfographicPanel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indice mixto</p>
              <h3 className="text-lg font-black text-slate-950">Desarrollo</h3>
            </div>
            <Sparkles className="h-5 w-5 text-slate-500" />
          </div>
          <div className="flex items-center gap-5">
            <DonutInfographic value={developmentRate} label="Cumplimiento" detail="Capacitacion + desempeno" color={infographicColors.orange} />
            <div className="flex-1 space-y-3">
              <MiniBar label="Capacitacion" value={analytics.trainingComplianceRate} max={100} color={infographicColors.teal} />
              <MiniBar label="Evaluacion" value={analytics.evaluationComplianceRate} max={100} color={infographicColors.violet} />
              <MiniBar label="Pendientes" value={analytics.pendingEvaluations} max={Math.max(analytics.pendingEvaluations, 5)} color={infographicColors.pink} />
            </div>
          </div>
        </InfographicPanel>
      </div>

      <InfographicPanel>
        <div className="grid gap-5 xl:grid-cols-[220px_1fr] xl:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lectura ejecutiva</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Mapa del ciclo de talento</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Vista compacta para relacionar crecimiento, permanencia, desarrollo y salud laboral.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <TimelineBubble index={1} title="Entrada" value={`${analytics.newHiresYTD} ingresos YTD`} color={infographicColors.teal} />
            <TimelineBubble index={2} title="Permanencia" value={`${retentionRate}% retencion`} color={infographicColors.violet} />
            <TimelineBubble index={3} title="Desarrollo" value={`${developmentRate}% indice`} color={infographicColors.orange} />
            <TimelineBubble index={4} title="Salud" value={`${healthRate}% control`} color={infographicColors.pink} />
          </div>
        </div>
      </InfographicPanel>
    </div>
  );
}

export default function Analitica() {
  const { data: analytics, isLoading } = useHRAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground">
          Analítica de RRHH
        </h1>
        <p className="text-muted-foreground mt-1">
          Dashboard ejecutivo con métricas globales de gestión del talento humano.
        </p>
      </motion.div>

      <Tabs defaultValue="ejecutivo" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-[440px]">
          <TabsTrigger value="ejecutivo" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
            <Gauge className="h-4 w-4" />
            Ejecutivo
          </TabsTrigger>
          <TabsTrigger value="infografias" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white">
            <PieChart className="h-4 w-4" />
            Infografias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ejecutivo" className="mt-0 space-y-6">
      {/* Executive KPIs - All in one grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <AnalyticsKPICard
          title="Empleados Activos"
          value={analytics?.activeEmployees || 0}
          subtitle={`${analytics?.totalEmployees || 0} totales registrados`}
          icon={<Users className="w-5 h-5" />}
          href="/empleados"
          variant="primary"
        />
        <AnalyticsKPICard
          title="Contrataciones"
          value={analytics?.newHiresYTD || 0}
          subtitle="En el año actual"
          icon={<UserPlus className="w-5 h-5" />}
          variant="accent"
        />
        <AnalyticsKPICard
          title="Retiros del Año"
          value={analytics?.terminationsYTD || 0}
          subtitle="Finalizaciones de contrato"
          icon={<UserMinus className="w-5 h-5" />}
          variant="destructive"
        />
        <AnalyticsKPICard
          title="Antigüedad Prom."
          value={`${analytics?.avgTenureMonths || 0}m`}
          subtitle="De empleados activos"
          icon={<Clock className="w-5 h-5" />}
          variant="info"
        />
        <AnalyticsKPICard
          title="Rotación Anual"
          value={`${Number(analytics?.yearlyTurnoverRate || 0).toFixed(1)}%`}
          subtitle={`${Number(analytics?.monthlyTurnoverRate || 0).toFixed(1)}% este mes`}
          icon={<TrendingDown className="w-5 h-5" />}
          trend={analytics?.yearlyTurnoverRate ? {
            value: Number((analytics.yearlyTurnoverRate - 10).toFixed(1)),
            label: 'vs objetivo 10%',
            inverted: true
          } : undefined}
          variant={analytics?.yearlyTurnoverRate && analytics.yearlyTurnoverRate > 15 ? 'destructive' : 'warning'}
        />
        <AnalyticsKPICard
          title="Ausentismo"
          value={`${Number(analytics?.absenteeismRate || 0).toFixed(1)}%`}
          subtitle={`${Number(analytics?.avgIncapacityDaysPerEmployee || 0).toFixed(1)} días/emp.`}
          icon={<HeartPulse className="w-5 h-5" />}
          href="/incapacidades"
          variant={analytics?.absenteeismRate && analytics.absenteeismRate > 5 ? 'destructive' : 'warning'}
        />
        <AnalyticsKPICard
          title="Capacitación"
          value={`${analytics?.trainingComplianceRate || 0}%`}
          subtitle={`${analytics?.upcomingTrainingSessions || 0} sesiones prog.`}
          icon={<GraduationCap className="w-5 h-5" />}
          href="/capacitaciones"
          variant={analytics?.trainingComplianceRate && analytics.trainingComplianceRate >= 80 ? 'accent' : 'warning'}
        />
        <AnalyticsKPICard
          title="Evaluaciones"
          value={`${analytics?.evaluationComplianceRate || 0}%`}
          subtitle={`${analytics?.pendingEvaluations || 0} pendientes`}
          icon={<Target className="w-5 h-5" />}
          href="/evaluaciones"
          variant={analytics?.evaluationComplianceRate && analytics.evaluationComplianceRate >= 80 ? 'accent' : 'warning'}
        />
      </div>

      {/* Additional Alert KPI */}
      {analytics?.certificationExpiringCount != null && analytics.certificationExpiringCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              {analytics.certificationExpiringCount} certificaciones próximas a vencer
            </p>
            <p className="text-sm text-muted-foreground">
              Requieren renovación en los próximos 30 días
            </p>
          </div>
        </motion.div>
      )}

      {/* Charts Row 1 - Turnover & Absenteeism */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TurnoverChart data={analytics?.turnoverTrend || []} />
        <AbsenteeismChart data={analytics?.absenteeismTrend || []} />
      </div>

      {/* Charts Row 2 - Compliance */}
      <ComplianceChart 
        trainingData={analytics?.trainingByArea || []} 
        evaluationData={analytics?.evaluationsByArea || []}
      />

      {/* Distribution Charts */}
      <DistributionCharts
        byContractType={analytics?.byContractType || []}
        byGender={analytics?.byGender || []}
        byCenter={analytics?.byCenter || []}
      />

      {/* Selection Diversity */}
      <SelectionDiversityCharts />

      {/* Diversity Trends */}
      <DiversityTrendsChart />

      {/* Diversity Goals Progress */}
      <DiversityGoalsWidget />

      {/* Area Metrics Table */}
      <AreaMetricsTable data={analytics?.areaMetrics || []} />
        </TabsContent>

        <TabsContent value="infografias" className="mt-0">
          {analytics && <InfographicsTab analytics={analytics} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
