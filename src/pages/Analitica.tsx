import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  TrendingDown, 
  Clock, 
  HeartPulse,
  GraduationCap,
  Target,
  Award,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { useHRAnalytics } from '@/hooks/useHRAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
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
    </div>
  );
}
