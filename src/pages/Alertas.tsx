import { motion } from 'framer-motion';
import { Bell, Search, Filter, AlertTriangle, Clock, FileText, Stethoscope, Package, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

interface Alert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  entityName: string;
  entityId: string;
  eventDate: string;
  daysRemaining: number;
  status: 'pending' | 'notified' | 'closed';
  createdAt: string;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'contract',
    level: 'critical',
    title: 'Contrato por vencer',
    description: 'Contrato a término fijo vence en 3 días',
    entityName: 'María García',
    entityId: 'emp-001',
    eventDate: '2024-02-01',
    daysRemaining: 3,
    status: 'pending',
    createdAt: '2024-01-28',
  },
  {
    id: '2',
    type: 'extension',
    level: 'critical',
    title: 'Prórroga por vencer',
    description: 'Prórroga #2 vence en 5 días',
    entityName: 'Ana Martínez',
    entityId: 'emp-003',
    eventDate: '2024-02-05',
    daysRemaining: 5,
    status: 'pending',
    createdAt: '2024-01-30',
  },
  {
    id: '3',
    type: 'medical',
    level: 'warning',
    title: 'Examen médico pendiente',
    description: 'Examen periódico vence en 15 días',
    entityName: 'Carlos Rodríguez',
    entityId: 'emp-002',
    eventDate: '2024-02-14',
    daysRemaining: 15,
    status: 'notified',
    createdAt: '2024-01-25',
  },
  {
    id: '4',
    type: 'dotation',
    level: 'info',
    title: 'Dotación por entregar',
    description: 'Entrega programada en 30 días',
    entityName: 'Pedro López',
    entityId: 'emp-004',
    eventDate: '2024-03-01',
    daysRemaining: 30,
    status: 'pending',
    createdAt: '2024-01-28',
  },
  {
    id: '5',
    type: 'medical',
    level: 'critical',
    title: 'Examen de egreso requerido',
    description: 'Pendiente examen de egreso',
    entityName: 'Luis Ramírez',
    entityId: 'emp-010',
    eventDate: '2024-01-28',
    daysRemaining: 0,
    status: 'pending',
    createdAt: '2024-01-28',
  },
];

const typeIcons = {
  contract: FileText,
  extension: Clock,
  medical: Stethoscope,
  dotation: Package,
};

const typeLabels = {
  contract: 'Contrato',
  extension: 'Prórroga',
  medical: 'Examen Médico',
  dotation: 'Dotación',
};

const levelStyles = {
  info: {
    bg: 'bg-info-light',
    border: 'border-info/20',
    icon: 'text-info',
    badge: 'bg-info/10 text-info',
  },
  warning: {
    bg: 'bg-warning-light',
    border: 'border-warning/20',
    icon: 'text-warning',
    badge: 'bg-warning/10 text-warning-foreground',
  },
  critical: {
    bg: 'bg-destructive-light',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
};

const statusConfig = {
  pending: { label: 'Pendiente', class: 'bg-warning-light text-warning-foreground' },
  notified: { label: 'Notificada', class: 'bg-info-light text-info' },
  closed: { label: 'Cerrada', class: 'bg-muted text-muted-foreground' },
};

export default function Alertas() {
  const criticalCount = mockAlerts.filter(a => a.level === 'critical' && a.status !== 'closed').length;
  const warningCount = mockAlerts.filter(a => a.level === 'warning' && a.status !== 'closed').length;
  const infoCount = mockAlerts.filter(a => a.level === 'info' && a.status !== 'closed').length;

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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Marcar leídas
          </Button>
          <Button variant="outline" className="gap-2">
            <XCircle className="w-4 h-4" />
            Cerrar resueltas
          </Button>
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
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{criticalCount}</p>
            <p className="text-sm text-muted-foreground">Críticas</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{warningCount}</p>
            <p className="text-sm text-muted-foreground">Advertencias</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
            <Bell className="w-5 h-5 text-info" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{infoCount}</p>
            <p className="text-sm text-muted-foreground">Informativas</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">12</p>
            <p className="text-sm text-muted-foreground">Resueltas hoy</p>
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
            <input
              type="text"
              placeholder="Buscar alertas por empleado, tipo..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="contract">Contratos</SelectItem>
                <SelectItem value="extension">Prórrogas</SelectItem>
                <SelectItem value="medical">Exámenes</SelectItem>
                <SelectItem value="dotation">Dotación</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="pending">
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="notified">Notificadas</SelectItem>
                <SelectItem value="closed">Cerradas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="critical" className="gap-1">
            Críticas
            {criticalCount > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full">
                {criticalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="warning">Advertencias</TabsTrigger>
          <TabsTrigger value="info">Informativas</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {mockAlerts.map((alert, index) => {
            const Icon = typeIcons[alert.type];
            const styles = levelStyles[alert.level];

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md card-elevated",
                  styles.border
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", styles.bg)}>
                  <Icon className={cn("w-6 h-6", styles.icon)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{alert.title}</p>
                    <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                      {alert.daysRemaining > 0 ? `${alert.daysRemaining} días` : 'Vencido'}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Evento: {new Date(alert.eventDate).toLocaleDateString('es-CO')}
                    {' • '}
                    Creada: {new Date(alert.createdAt).toLocaleDateString('es-CO')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={statusConfig[alert.status].class}>
                    {statusConfig[alert.status].label}
                  </Badge>
                  <Button variant="outline" size="sm">
                    Gestionar
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="critical" className="space-y-3">
          {mockAlerts.filter(a => a.level === 'critical').map((alert, index) => {
            const Icon = typeIcons[alert.type];
            const styles = levelStyles[alert.level];

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md card-elevated",
                  styles.border
                )}
              >
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", styles.bg)}>
                  <Icon className={cn("w-6 h-6", styles.icon)} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-foreground">{alert.title}</p>
                    <Badge variant="outline" className={cn("text-xs", styles.badge)}>
                      {alert.daysRemaining > 0 ? `${alert.daysRemaining} días` : 'Vencido'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{alert.entityName}</span>
                    {' • '}
                    {alert.description}
                  </p>
                </div>

                <Button variant="outline" size="sm">
                  Gestionar
                </Button>
              </motion.div>
            );
          })}
        </TabsContent>

        <TabsContent value="warning" className="space-y-3">
          <p className="text-muted-foreground text-center py-8">
            {mockAlerts.filter(a => a.level === 'warning').length} alertas de advertencia
          </p>
        </TabsContent>

        <TabsContent value="info" className="space-y-3">
          <p className="text-muted-foreground text-center py-8">
            {mockAlerts.filter(a => a.level === 'info').length} alertas informativas
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}