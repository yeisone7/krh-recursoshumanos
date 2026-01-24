import { motion } from 'framer-motion';
import { Users, FileText, Bell, Briefcase, TrendingUp, Clock } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { VacanciesOverview } from '@/components/dashboard/VacanciesOverview';
import { ContractsChart } from '@/components/dashboard/ContractsChart';
import { ActiveTerminationsPanel } from '@/components/dashboard/ActiveTerminationsPanel';
export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Bienvenido de vuelta, Juan. Aquí está el resumen de hoy.</p>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Empleados Activos"
          value={247}
          subtitle="12 nuevos este mes"
          icon={<Users className="w-6 h-6" />}
          trend={{ value: 5.2, label: 'vs mes anterior' }}
          variant="primary"
        />
        <KPICard
          title="Contratos por Vencer"
          value={8}
          subtitle="Próximos 30 días"
          icon={<FileText className="w-6 h-6" />}
          variant="warning"
        />
        <KPICard
          title="Alertas Críticas"
          value={5}
          subtitle="Requieren atención"
          icon={<Bell className="w-6 h-6" />}
          variant="destructive"
        />
        <KPICard
          title="Vacantes Abiertas"
          value={12}
          subtitle="3 en proceso final"
          icon={<Briefcase className="w-6 h-6" />}
          trend={{ value: 15, label: 'vs mes anterior' }}
          variant="accent"
        />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <p className="text-2xl font-display font-bold text-foreground">94.2%</p>
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
            <p className="text-2xl font-display font-bold text-foreground">18 días</p>
            <p className="text-sm text-muted-foreground">Tiempo promedio contratación</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-light flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">32</p>
            <p className="text-sm text-muted-foreground">Candidatos en proceso</p>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <ContractsChart />

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