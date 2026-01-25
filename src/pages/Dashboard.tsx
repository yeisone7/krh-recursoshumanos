import { motion } from 'framer-motion';
import { Users, FileText, Bell, Briefcase, TrendingUp, Clock, Award, UserMinus } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { VacanciesOverview } from '@/components/dashboard/VacanciesOverview';
import { ContractsChart } from '@/components/dashboard/ContractsChart';
import { ActiveTerminationsPanel } from '@/components/dashboard/ActiveTerminationsPanel';
import { EmployeeDistributionChart } from '@/components/dashboard/EmployeeDistributionChart';
import { useEmployeeKPIs } from '@/hooks/useEmployeeKPIs';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useEmployeeKPIs();
  const { data: alerts = [] } = useDashboardAlerts();

  const criticalAlerts = alerts.filter(a => a.level === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general de recursos humanos.</p>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <KPICard
              title="Empleados Activos"
              value={kpis?.totalActiveEmployees || 0}
              subtitle={`${kpis?.newHiresThisMonth || 0} nuevos este mes`}
              icon={<Users className="w-6 h-6" />}
              trend={kpis?.employeeTrend ? { value: kpis.employeeTrend, label: 'vs mes anterior' } : undefined}
              variant="primary"
            />
            <KPICard
              title="Contratos por Vencer"
              value={kpis?.expiringContractsCount || 0}
              subtitle="Próximos 30 días"
              icon={<FileText className="w-6 h-6" />}
              variant="warning"
            />
            <KPICard
              title="Alertas Críticas"
              value={criticalAlerts}
              subtitle="Requieren atención"
              icon={<Bell className="w-6 h-6" />}
              variant="destructive"
            />
            <KPICard
              title="Vacantes Abiertas"
              value={kpis?.activeCandidatesCount || 0}
              subtitle={`${kpis?.candidatesInFinalStage || 0} en proceso final`}
              icon={<Briefcase className="w-6 h-6" />}
              variant="accent"
            />
          </>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="card-elevated p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{kpis?.retentionRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Tasa de retención</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="card-elevated p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-info-light flex items-center justify-center">
                <Clock className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{kpis?.averageTenureMonths || 0} meses</p>
                <p className="text-sm text-muted-foreground">Antigüedad promedio</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="card-elevated p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-warning-light flex items-center justify-center">
                <Award className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{kpis?.expiringCertificationsCount || 0}</p>
                <p className="text-sm text-muted-foreground">Certificaciones por vencer</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="card-elevated p-5 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-destructive-light flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold text-foreground">{kpis?.employeesInRetirement || 0}</p>
                <p className="text-sm text-muted-foreground">Procesos de retiro</p>
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContractsChart />
        <EmployeeDistributionChart kpis={kpis} isLoading={kpisLoading} />
      </div>

      {/* Active Terminations and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveTerminationsPanel />
        <AlertsPanel />
      </div>

      {/* Vacancies Row */}
      <VacanciesOverview />

      {/* Activity */}
      <RecentActivity />
    </div>
  );
}