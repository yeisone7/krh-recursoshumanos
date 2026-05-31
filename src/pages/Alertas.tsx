import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, Search, Filter, AlertTriangle, Clock, FileText, 
  Stethoscope, Package, CheckCircle, Award, Palmtree, 
  HeartPulse, Landmark, ExternalLink, Loader2, Warehouse,
  BarChart3, PieChart, Activity, Gauge, ShieldAlert, TrendingUp, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useUnifiedAlerts, useAlertStats, UnifiedAlert } from '@/hooks/useUnifiedAlerts';

const typeIcons: Record<UnifiedAlert['type'], React.ElementType> = {
  contract: FileText,
  extension: Clock,
  medical: Stethoscope,
  dotation: Package,
  certification: Award,
  incapacity: HeartPulse,
  vacation: Palmtree,
  cesantias: Landmark,
  document: FileText,
  inventory_low_stock: Warehouse,
  dotation_renewal: Package,
};

const typeLabels: Record<UnifiedAlert['type'], string> = {
  contract: 'Contrato',
  extension: 'Prórroga',
  medical: 'Examen Médico',
  dotation: 'Dotación',
  certification: 'Certificación',
  incapacity: 'Incapacidad',
  vacation: 'Vacaciones',
  cesantias: 'Cesantías',
  document: 'Documento',
  inventory_low_stock: 'Stock Bajo',
  dotation_renewal: 'Renovación Dotación',
};

const levelStyles = {
  info: {
    bg: 'bg-info/10',
    border: 'border-info/20',
    icon: 'text-info',
    badge: 'bg-info/10 text-info',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning-foreground',
  },
  critical: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
};

function AlertCard({ alert, onNavigate }: { alert: UnifiedAlert; onNavigate: (path: string) => void }) {
  const Icon = typeIcons[alert.type];
  const styles = levelStyles[alert.level];
  const isExpired = alert.daysRemaining < 0;
  const dueLabel = isExpired
    ? `Vencido hace ${Math.abs(alert.daysRemaining)} días`
    : alert.daysRemaining === 0
      ? 'Vence hoy'
      : `Vence en ${alert.daysRemaining} días`;
  const levelLabel = alert.level === 'critical' ? 'Crítica' : alert.level === 'warning' ? 'Advertencia' : 'Informativa';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div className={cn(
        "relative overflow-hidden rounded-xl border bg-background p-4 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md sm:p-5",
        styles.border
      )}>
        <div className={cn(
          "absolute inset-y-0 left-0 w-1",
          alert.level === 'critical' ? 'bg-destructive' : alert.level === 'warning' ? 'bg-warning' : 'bg-info'
        )} />

        <div className="relative z-10 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 gap-4">
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-inner",
            styles.bg
          )}>
            <Icon className={cn("h-5 w-5", styles.icon)} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="line-clamp-2 text-base font-black leading-tight text-foreground sm:text-lg">
                {alert.title}
              </h3>
              <Badge variant="outline" title={levelLabel} className={cn("rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", styles.badge)}>
                {isExpired ? `Vencido hace ${Math.abs(alert.daysRemaining)} días` : `En ${alert.daysRemaining} días`}
              </Badge>
              <Badge variant="secondary" className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                {typeLabels[alert.type]}
              </Badge>
            </div>
            
            <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">{alert.entityName}</span>
              <span className="opacity-60">•</span>
              <span className="ml-2 text-muted-foreground">{alert.description}</span>
            </p>

            {alert.eventDate && (
              <div className="mt-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" />
                Fecha evento: {new Date(alert.eventDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          </div>

          <div className="grid gap-3 sm:grid-cols-[150px_auto] lg:grid-cols-1 xl:grid-cols-[150px_auto]">
            <div className={cn("rounded-lg border px-4 py-3 text-center", styles.bg, styles.border)}>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Vencimiento</p>
              <p className={cn("mt-1 text-sm font-black", styles.icon)}>{dueLabel}</p>
            </div>
            <Button 
              variant="outline" 
              className="h-12 rounded-lg px-5 text-[10px] font-black uppercase tracking-widest transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => onNavigate(alert.navigateTo || '/')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Gestionar
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AlertInfographics({ alerts, stats }: { alerts: UnifiedAlert[]; stats: ReturnType<typeof useAlertStats> }) {
  const data = useMemo(() => {
    const total = alerts.length;
    const levelCounts = {
      critical: alerts.filter((alert) => alert.level === 'critical').length,
      warning: alerts.filter((alert) => alert.level === 'warning').length,
      info: alerts.filter((alert) => alert.level === 'info').length,
    };
    const overdue = alerts.filter((alert) => alert.daysRemaining < 0).length;
    const today = alerts.filter((alert) => alert.daysRemaining === 0).length;
    const next7 = alerts.filter((alert) => alert.daysRemaining > 0 && alert.daysRemaining <= 7).length;
    const next15 = alerts.filter((alert) => alert.daysRemaining > 7 && alert.daysRemaining <= 15).length;
    const next30 = alerts.filter((alert) => alert.daysRemaining > 15 && alert.daysRemaining <= 30).length;
    const pressure = total > 0
      ? Math.min(100, Math.round(((levelCounts.critical * 1.4 + levelCounts.warning * 0.8 + overdue * 1.8 + today) / Math.max(total, 1)) * 45))
      : 0;

    const typeDistribution = Object.entries(
      alerts.reduce<Record<string, number>>((acc, alert) => {
        const label = typeLabels[alert.type] || alert.type;
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([label, value]) => ({
        label,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const nearest = [...alerts]
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);

    return {
      total,
      levelCounts,
      overdue,
      today,
      next7,
      next15,
      next30,
      pressure,
      typeDistribution,
      nearest,
    };
  }, [alerts]);

  const severityItems = [
    { label: 'Críticas', value: data.levelCounts.critical, color: 'bg-[#ef4444]', text: 'text-[#ef4444]' },
    { label: 'Advertencias', value: data.levelCounts.warning, color: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' },
    { label: 'Informativas', value: data.levelCounts.info, color: 'bg-[#0ea5e9]', text: 'text-[#0ea5e9]' },
  ];
  const timingItems = [
    { label: 'Vencidas', value: data.overdue, color: 'bg-[#ef4444]' },
    { label: 'Hoy', value: data.today, color: 'bg-[#f97316]' },
    { label: '1-7 días', value: data.next7, color: 'bg-[#f59e0b]' },
    { label: '8-15 días', value: data.next15, color: 'bg-[#22c55e]' },
    { label: '16-30 días', value: data.next30, color: 'bg-[#0ea5e9]' },
  ];
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const criticalDash = data.total > 0 ? (data.levelCounts.critical / data.total) * circumference : 0;
  const warningDash = data.total > 0 ? (data.levelCounts.warning / data.total) * circumference : 0;
  const infoDash = data.total > 0 ? (data.levelCounts.info / data.total) * circumference : 0;

  if (data.total === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background p-8 text-center">
        <CheckCircle className="mx-auto mb-3 h-12 w-12 text-success" />
        <h3 className="text-lg font-black text-foreground">Sin alertas activas</h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">No hay datos pendientes para construir la infografía.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Badge className="rounded-md bg-primary px-2 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">Mapa ejecutivo</Badge>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-foreground">Radar de vencimientos</h3>
              <p className="text-sm font-medium text-muted-foreground">Concentración real por criticidad y horizonte operativo.</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PieChart className="h-6 w-6" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="relative mx-auto h-56 w-56">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${criticalDash} ${circumference}`} />
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#f59e0b" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${warningDash} ${circumference}`} strokeDashoffset={-criticalDash} />
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#0ea5e9" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${infoDash} ${circumference}`} strokeDashoffset={-(criticalDash + warningDash)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-black leading-none text-foreground">{data.total}</span>
                <span className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">alertas activas</span>
              </div>
            </div>

            <div className="grid content-center gap-3">
              {severityItems.map((item, index) => {
                const percent = data.total > 0 ? Math.round((item.value / data.total) * 100) : 0;
                return (
                  <div key={item.label} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl border border-border bg-slate-50/60 p-3">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-sm font-black text-white", item.color)}>
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-foreground">{item.label}</span>
                        <span className={cn("text-xs font-black", item.text)}>{percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-background">
                        <div className={cn("h-full rounded-full", item.color)} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-foreground">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <div className="overflow-hidden rounded-2xl border border-border bg-slate-950 p-5 text-white shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200">Índice de presión</p>
                <h3 className="mt-2 text-5xl font-black leading-none">{data.pressure}%</h3>
              </div>
              <Gauge className="h-10 w-10 text-cyan-300" />
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-400" style={{ width: `${data.pressure}%` }} />
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-300">
              {data.overdue + data.today > 0
                ? `${data.overdue + data.today} alerta(s) requieren gestión inmediata.`
                : 'No hay vencimientos para hoy ni vencidos.'}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Horizonte</p>
                <h3 className="text-lg font-black text-foreground">Cuándo actuar</h3>
              </div>
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3">
              {timingItems.map((item) => {
                const percent = data.total > 0 ? Math.round((item.value / data.total) * 100) : 0;
                return (
                  <div key={item.label} className="grid grid-cols-[72px_1fr_38px] items-center gap-3">
                    <span className="text-xs font-black text-muted-foreground">{item.label}</span>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", item.color)} style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-right text-sm font-black text-foreground">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Módulos con más alertas</p>
              <h3 className="text-xl font-black text-foreground">Distribución por tipo</h3>
            </div>
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-3">
            {data.typeDistribution.slice(0, 6).map((item, index) => (
              <div key={item.label} className="grid grid-cols-[32px_1fr_auto] items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white",
                  index % 4 === 0 && "bg-[#0ea5e9]",
                  index % 4 === 1 && "bg-[#8b5cf6]",
                  index % 4 === 2 && "bg-[#f97316]",
                  index % 4 === 3 && "bg-[#10b981]"
                )}>
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-xs font-black uppercase tracking-wider text-foreground">{item.label}</span>
                    <span className="text-xs font-black text-muted-foreground">{item.percent}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
                <span className="text-lg font-black text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioridad operativa</p>
              <h3 className="text-xl font-black text-foreground">Próximas gestiones</h3>
            </div>
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.nearest.map((alert, index) => {
              const styles = levelStyles[alert.level];
              return (
                <div key={alert.id} className={cn("relative overflow-hidden rounded-xl border p-4", styles.border, styles.bg)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">#{index + 1} {typeLabels[alert.type]}</span>
                      <h4 className="mt-1 line-clamp-2 text-sm font-black text-foreground">{alert.entityName}</h4>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">{alert.title}</p>
                    </div>
                    <Badge className={cn("shrink-0 rounded-md px-2 py-1 text-[10px] font-black", styles.badge)}>
                      {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)}d vencida` : `${alert.daysRemaining}d`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        {[
          { label: 'Total radar', value: stats.totalActive, icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Vencidas', value: data.overdue, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Vencen hoy', value: data.today, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Próximas 7 días', value: data.next7, icon: TrendingUp, color: 'text-info', bg: 'bg-info/10' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-background p-5 shadow-sm">
            <div className={cn("mb-4 flex h-11 w-11 items-center justify-center rounded-xl", item.bg)}>
              <item.icon className={cn("h-5 w-5", item.color)} />
            </div>
            <p className="text-3xl font-black leading-none text-foreground">{item.value}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AlertasProps {
  embedded?: boolean;
}

export default function Alertas({ embedded = false }: AlertasProps = {}) {
  const navigate = useNavigate();
  const { data: alerts, isLoading, error } = useUnifiedAlerts();
  const stats = useAlertStats(alerts);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    
    let filtered = [...alerts];
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.entityName.toLowerCase().includes(term) ||
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term)
      );
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter(a => a.type === typeFilter);
    }
    
    // Filter by level (tab)
    if (activeTab !== 'all' && activeTab !== 'infographics') {
      filtered = filtered.filter(a => a.level === activeTab);
    }
    
    return filtered;
  }, [alerts, searchTerm, typeFilter, activeTab]);

  const filteredStats = useAlertStats(filteredAlerts);

  const alertHighlights = useMemo(() => {
    const source = alerts || [];
    const overdueCount = source.filter((alert) => alert.daysRemaining < 0).length;
    const dueTodayCount = source.filter((alert) => alert.daysRemaining === 0).length;
    const nextSevenCount = source.filter((alert) => alert.daysRemaining >= 0 && alert.daysRemaining <= 7).length;
    const nearestAlert = source
      .filter((alert) => alert.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

    return {
      overdueCount,
      dueTodayCount,
      nextSevenCount,
      nearestLabel: nearestAlert ? `${nearestAlert.entityName} / ${nearestAlert.daysRemaining} días` : 'Sin vencimientos próximos',
    };
  }, [alerts]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error al cargar alertas: {error.message}</p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col space-y-4 sm:space-y-5", !embedded && "h-full")}>
      {/* Premium Header */}
      {!embedded && <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent px-5 py-4 shadow-sm sm:px-7 sm:py-5">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/10 sm:h-14 sm:w-14">
            <Bell className="h-6 w-6 text-primary-foreground sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
              Centro de <span className="text-primary">Alertas</span>
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium leading-snug text-muted-foreground sm:text-base">
              Monitoreo centralizado de vencimientos y eventos críticos. Mantén el control total sobre los hitos operativos de tu organización.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        
        
      </div>}

      {/* KPI Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Críticas', value: stats.criticalCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/25', accent: 'bg-destructive', status: 'Atención inmediata', detail: `${alertHighlights.overdueCount} vencidas / ${alertHighlights.nextSevenCount} en 7 días` },
          { label: 'Advertencias', value: stats.warningCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/25', accent: 'bg-warning', status: 'Seguimiento próximo', detail: 'Entre 8 y 15 días para vencer' },
          { label: 'Informativas', value: stats.infoCount, icon: Bell, color: 'text-info', bg: 'bg-info/10', border: 'border-info/25', accent: 'bg-info', status: 'Control preventivo', detail: 'Seguimiento preventivo activo' },
          { label: 'Total Activas', value: stats.totalActive, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success/25', accent: 'bg-success', status: 'Radar general', detail: alertHighlights.dueTodayCount > 0 ? `${alertHighlights.dueTodayCount} vencen hoy` : alertHighlights.nearestLabel },
        ].map((stat, i) => {
          const percent = stats.totalActive > 0
            ? Math.min(100, Math.round((Number(stat.value) / stats.totalActive) * 100))
            : 0;

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-background p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
                stat.border
              )}
            >
              <div className={cn("absolute inset-x-0 top-0 h-1.5", stat.accent)} />
              <div className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl", stat.bg)} />

              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <div className="mt-2 flex items-end gap-2">
                    <h2 className="text-4xl font-black leading-none tracking-tight text-foreground">
                      {isLoading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : stat.value}
                    </h2>
                    <span className={cn("mb-1 rounded-full px-2 py-0.5 text-[10px] font-black", stat.bg, stat.color)}>
                      {percent}%
                    </span>
                  </div>
                </div>
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner", stat.bg)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
              </div>

              <div className="relative z-10 mt-4">
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", stat.accent)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider", stat.bg, stat.color)}>
                    {stat.status}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-muted-foreground">
                    {stat.detail}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Advanced Filters */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-4 bg-background p-3 rounded-[2rem] border border-border/50 shadow-md">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Buscar por empleado, tipo o descripción..."
              className="h-14 pl-12 bg-transparent border-none shadow-none focus-visible:ring-0 text-base font-medium placeholder:text-muted-foreground/40"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3 pr-2">
            <div className="h-10 w-px bg-border/40 hidden md:block mx-2" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-12 w-full md:w-[220px] rounded-2xl bg-background border-none shadow-none font-black uppercase tracking-widest text-[10px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 bg-background">
                <SelectItem value="all">TODOS LOS TIPOS</SelectItem>
                <SelectItem value="contract">CONTRATOS</SelectItem>
                <SelectItem value="extension">PRÓRROGAS</SelectItem>
                <SelectItem value="medical">EXÁMENES MÉDICOS</SelectItem>
                <SelectItem value="dotation">DOTACIÓN</SelectItem>
                <SelectItem value="certification">CERTIFICACIONES</SelectItem>
                <SelectItem value="incapacity">INCAPACIDADES</SelectItem>
                <SelectItem value="vacation">VACACIONES</SelectItem>
                <SelectItem value="cesantias">CESANTÍAS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mb-6 overflow-x-auto pb-1">
          <TabsList className="grid h-auto min-w-[680px] grid-cols-5 gap-1 rounded-xl border border-border/70 bg-slate-50 p-1 shadow-sm md:min-w-0 md:w-[820px]">
            {[
              { value: 'all', label: 'TODAS', icon: Bell },
              { value: 'critical', label: 'CRÍTICAS', icon: AlertTriangle, count: stats.criticalCount },
              { value: 'warning', label: 'ADVERTENCIAS', icon: Clock },
              { value: 'info', label: 'INFORMATIVAS', icon: CheckCircle },
              { value: 'infographics', label: 'INFOGRAFÍAS', icon: BarChart3 },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative gap-2 rounded-lg px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-none transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                {(() => {
                  const TabIcon = tab.icon;
                  return <TabIcon className="h-3.5 w-3.5" />;
                })()}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[8px] text-destructive-foreground">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : activeTab === 'infographics' ? (
            <AlertInfographics alerts={filteredAlerts} stats={filteredStats} />
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || typeFilter !== 'all' 
                  ? 'No se encontraron alertas con los filtros seleccionados'
                  : 'No hay alertas pendientes'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <AlertCard alert={alert} onNavigate={handleNavigate} />
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
