import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, Search, Filter, AlertTriangle, Clock, FileText, 
  Stethoscope, Package, CheckCircle, Award, Palmtree, 
  HeartPulse, Landmark, ExternalLink, Loader2, Warehouse
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

export default function Alertas() {
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
    if (activeTab !== 'all') {
      filtered = filtered.filter(a => a.level === activeTab);
    }
    
    return filtered;
  }, [alerts, searchTerm, typeFilter, activeTab]);

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
    <div className="flex h-full min-h-0 flex-col space-y-6 sm:space-y-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-border shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-md shadow-primary/10">
            <Bell className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl text-foreground uppercase">
              Centro de <span className="text-primary">Alertas</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
              Monitoreo centralizado de vencimientos y eventos críticos. Mantén el control total sobre los hitos operativos de tu organización.
            </p>
          </div>
        </div>
        {/* Decorative elements */}
        
        
      </div>

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
          <TabsList className="grid h-auto min-w-[520px] grid-cols-4 gap-1 rounded-xl border border-border/70 bg-slate-50 p-1 shadow-sm md:min-w-0 md:w-[640px]">
            {[
              { value: 'all', label: 'TODAS', icon: Bell },
              { value: 'critical', label: 'CRÍTICAS', icon: AlertTriangle, count: stats.criticalCount },
              { value: 'warning', label: 'ADVERTENCIAS', icon: Clock },
              { value: 'info', label: 'INFORMATIVAS', icon: CheckCircle },
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
