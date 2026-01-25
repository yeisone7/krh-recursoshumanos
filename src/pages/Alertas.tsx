import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bell, Search, Filter, AlertTriangle, Clock, FileText, 
  Stethoscope, Package, CheckCircle, Award, Palmtree, 
  HeartPulse, Landmark, ExternalLink, Loader2
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:shadow-md card-elevated",
        styles.border
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", styles.bg)}>
        <Icon className={cn("w-6 h-6", styles.icon)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-semibold text-foreground">{alert.title}</p>
          <Badge variant="outline" className={cn("text-xs", styles.badge)}>
            {isExpired ? `Vencido hace ${Math.abs(alert.daysRemaining)} días` : `${alert.daysRemaining} días`}
          </Badge>
          <Badge variant="outline" className="text-xs bg-muted">
            {typeLabels[alert.type]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{alert.entityName}</span>
          {' • '}
          {alert.description}
        </p>
        {alert.eventDate && (
          <p className="text-xs text-muted-foreground mt-1">
            Fecha evento: {new Date(alert.eventDate).toLocaleDateString('es-CO')}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1.5"
          onClick={() => onNavigate(alert.navigateTo || '/')}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Gestionar
        </Button>
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
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Centro de Alertas</h1>
          <p className="text-muted-foreground mt-1">Monitoreo centralizado de vencimientos y eventos críticos</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.criticalCount}
            </p>
            <p className="text-sm text-muted-foreground">Críticas</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.warningCount}
            </p>
            <p className="text-sm text-muted-foreground">Advertencias</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.infoCount}
            </p>
            <p className="text-sm text-muted-foreground">Informativas</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.totalActive}
            </p>
            <p className="text-sm text-muted-foreground">Total Activas</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="card-elevated p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar alertas por empleado, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="contract">Contratos</SelectItem>
                <SelectItem value="extension">Prórrogas</SelectItem>
                <SelectItem value="medical">Exámenes Médicos</SelectItem>
                <SelectItem value="dotation">Dotación</SelectItem>
                <SelectItem value="certification">Certificaciones</SelectItem>
                <SelectItem value="incapacity">Incapacidades</SelectItem>
                <SelectItem value="vacation">Vacaciones</SelectItem>
                <SelectItem value="cesantias">Cesantías</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Tabs and Alerts List */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="critical" className="gap-1">
            Críticas
            {stats.criticalCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {stats.criticalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="warning">Advertencias</TabsTrigger>
          <TabsTrigger value="info">Informativas</TabsTrigger>
        </TabsList>

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
