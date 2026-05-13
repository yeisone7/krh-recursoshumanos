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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative"
    >
      <div className={cn(
        "relative flex flex-col gap-4 rounded-[2rem] border-2 bg-background/50 backdrop-blur-xl p-6 transition-all duration-300 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.03)]",
        styles.border,
        "group-hover:border-primary/20"
      )}>
        {/* Decorative background icon */}
        <div className="absolute right-6 top-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none transform rotate-12 scale-150">
          <Icon className="h-20 w-20" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
          <div className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner",
            styles.bg
          )}>
            <Icon className={cn("w-7 h-7", styles.icon)} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-lg font-black tracking-tight text-foreground uppercase leading-tight">
                {alert.title}
              </h3>
              <Badge variant="outline" className={cn("rounded-lg px-2 py-0.5 font-black uppercase tracking-tighter text-[10px]", styles.badge)}>
                {isExpired ? `Vencido hace ${Math.abs(alert.daysRemaining)} días` : `En ${alert.daysRemaining} días`}
              </Badge>
              <Badge variant="secondary" className="rounded-lg px-2 py-0.5 font-black uppercase tracking-tighter text-[10px] bg-muted/50">
                {typeLabels[alert.type]}
              </Badge>
            </div>
            
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              <span className="font-black text-foreground uppercase tracking-tight mr-2">{alert.entityName}</span>
              <span className="opacity-60">•</span>
              <span className="ml-2">{alert.description}</span>
            </p>

            {alert.eventDate && (
              <div className="mt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <Clock className="h-3 w-3" />
                Fecha evento: {new Date(alert.eventDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}
          </div>

          <div className="flex shrink-0">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-12 px-6 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary group/btn"
              onClick={() => onNavigate(alert.navigateTo || '/')}
            >
              <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
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
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-8 sm:p-10 border border-primary/10 shadow-sm">
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
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl" />
      </div>

      {/* KPI Tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Críticas', value: stats.criticalCount, icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
          { label: 'Advertencias', value: stats.warningCount, icon: Clock, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
          { label: 'Informativas', value: stats.infoCount, icon: Bell, color: 'text-info', bg: 'bg-info/10', border: 'border-info/20' },
          { label: 'Total Activas', value: stats.totalActive, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-[2rem] border-2 bg-background/50 backdrop-blur-xl p-6 transition-all duration-300 hover:shadow-md",
              stat.border
            )}
          >
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : stat.value}
                </h2>
              </div>
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", stat.bg)}>
                <stat.icon className={cn("h-6 w-6", stat.color)} />
              </div>
            </div>
            {/* Decorative sparkline-like line */}
            <div className={cn("absolute bottom-0 left-0 right-0 h-1", stat.bg)} />
          </motion.div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative flex flex-col md:flex-row items-center gap-4 bg-background/60 backdrop-blur-xl p-3 rounded-[2rem] border border-border/50 shadow-md">
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
              <SelectTrigger className="h-12 w-full md:w-[220px] rounded-2xl bg-muted/30 border-none shadow-none font-black uppercase tracking-widest text-[10px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-border/50 backdrop-blur-xl bg-background/95">
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
        <div className="flex items-center justify-between mb-6">
          <TabsList className="flex h-auto w-fit gap-2 bg-muted/30 p-1.5 rounded-[1.5rem] border border-border/50">
            {[
              { value: 'all', label: 'TODAS' },
              { value: 'critical', label: 'CRÍTICAS', count: stats.criticalCount },
              { value: 'warning', label: 'ADVERTENCIAS' },
              { value: 'info', label: 'INFORMATIVAS' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-2xl px-6 py-2.5 font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all whitespace-nowrap relative"
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[8px] text-destructive-foreground">
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
