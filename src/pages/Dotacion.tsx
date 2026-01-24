import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Package, Plus, Search, Filter, Eye, 
  AlertTriangle, CheckCircle, Clock, Calendar,
  Loader2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { DotationFormDialog } from '@/components/dotation/DotationFormDialog';
import { DotationDetailDialog } from '@/components/dotation/DotationDetailDialog';
import { DotationAlertsCard } from '@/components/dotation/DotationAlertsCard';
import { useDotationDeliveries, getDotationStatus, getDaysRemaining } from '@/hooks/useDotation';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DotationItemType = Database['public']['Enums']['dotation_item_type'];

const dotationItemTypeLabels: Record<DotationItemType, string> = {
  uniforme_camisa: 'Camisa',
  uniforme_pantalon: 'Pantalón',
  uniforme_conjunto: 'Conjunto',
  calzado_seguridad: 'Calzado Seguridad',
  calzado_dielectrico: 'Calzado Dieléctrico',
  casco: 'Casco',
  guantes: 'Guantes',
  gafas_seguridad: 'Gafas Seguridad',
  protector_auditivo: 'Protector Auditivo',
  arnes: 'Arnés',
  overol: 'Overol',
  chaleco_reflectivo: 'Chaleco Reflectivo',
  impermeable: 'Impermeable',
  otros: 'Otros',
};

type DotationStatus = 'vigente' | 'por_vencer' | 'vencida';

const statusStyles: Record<DotationStatus, { bg: string; text: string; icon: typeof CheckCircle; label: string }> = {
  vigente: {
    bg: 'bg-success-light',
    text: 'text-success',
    icon: CheckCircle,
    label: 'Vigente',
  },
  por_vencer: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    icon: AlertTriangle,
    label: 'Por Vencer',
  },
  vencida: {
    bg: 'bg-destructive-light',
    text: 'text-destructive',
    icon: AlertTriangle,
    label: 'Vencida',
  },
};

function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}

export default function Dotacion() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { currentCompanyId } = useAuth();
  const { data: deliveries, isLoading } = useDotationDeliveries();

  // Generate alerts from deliveries
  const alerts = useMemo(() => {
    if (!deliveries) return [];
    
    return deliveries
      .filter(d => {
        const status = getDotationStatus(d);
        return status === 'por_vencer' || status === 'vencida';
      })
      .map(d => {
        const daysRemaining = getDaysRemaining(d.expiration_date);
        return {
          id: `alert-${d.id}`,
          deliveryId: d.id,
          employeeId: d.employee_id,
          employeeName: `${d.employees?.first_name} ${d.employees?.last_name}`,
          itemName: d.item_name,
          expirationDate: d.expiration_date,
          daysRemaining: Math.max(0, daysRemaining),
          level: getAlertLevel(daysRemaining),
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [deliveries]);

  // Stats
  const stats = useMemo(() => {
    if (!deliveries) return { total: 0, vigentes: 0, porVencer: 0, vencidas: 0 };
    
    return {
      total: deliveries.length,
      vigentes: deliveries.filter(d => getDotationStatus(d) === 'vigente').length,
      porVencer: deliveries.filter(d => getDotationStatus(d) === 'por_vencer').length,
      vencidas: deliveries.filter(d => getDotationStatus(d) === 'vencida').length,
    };
  }, [deliveries]);

  // Filter deliveries
  const filteredDeliveries = useMemo(() => {
    if (!deliveries) return [];
    
    return deliveries.filter(d => {
      const employeeName = `${d.employees?.first_name} ${d.employees?.last_name}`.toLowerCase();
      const matchesSearch = 
        employeeName.includes(searchQuery.toLowerCase()) ||
        d.item_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const status = getDotationStatus(d);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesType = itemTypeFilter === 'all' || d.item_type === itemTypeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [deliveries, searchQuery, statusFilter, itemTypeFilter]);

  const handleViewDelivery = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setIsDetailOpen(true);
  };

  const selectedDelivery = deliveries?.find(d => d.id === selectedDeliveryId);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne a una empresa.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          <h1 className="font-display text-2xl font-bold text-foreground">Gestión de Dotación</h1>
          <p className="text-muted-foreground mt-1">
            Administra las entregas de dotación, controla vencimientos y genera alertas automáticas
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva Entrega
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Entregas</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.vigentes}</p>
            <p className="text-sm text-muted-foreground">Vigentes</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.porVencer}</p>
            <p className="text-sm text-muted-foreground">Por Vencer</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.vencidas}</p>
            <p className="text-sm text-muted-foreground">Vencidas</p>
          </div>
        </motion.div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="lg:col-span-1"
        >
          <DotationAlertsCard 
            alerts={alerts} 
            onAlertClick={(alert) => handleViewDelivery(alert.deliveryId)}
          />
        </motion.div>

        {/* Deliveries Table */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="lg:col-span-2"
        >
          <div className="card-elevated">
            {/* Filters */}
            <div className="p-4 border-b border-border">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por empleado, artículo..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-10 text-sm border-border">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="vigente">Vigentes</SelectItem>
                      <SelectItem value="por_vencer">Por Vencer</SelectItem>
                      <SelectItem value="vencida">Vencidas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-[140px] h-10 text-sm border-border">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(dotationItemTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {searchQuery || statusFilter !== 'all' || itemTypeFilter !== 'all'
                    ? 'No se encontraron entregas con los filtros seleccionados'
                    : 'No hay entregas de dotación registradas'}
                </p>
                {!searchQuery && statusFilter === 'all' && itemTypeFilter === 'all' && (
                  <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Entrega
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Artículo</TableHead>
                    <TableHead>Entrega</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => {
                    const status = getDotationStatus(delivery) as DotationStatus;
                    const statusConfig = statusStyles[status];
                    const StatusIcon = statusConfig.icon;
                    const daysRemaining = getDaysRemaining(delivery.expiration_date);

                    return (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {delivery.employees?.first_name} {delivery.employees?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {delivery.employees?.operation_centers?.name || 'Sin centro'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{delivery.item_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {dotationItemTypeLabels[delivery.item_type]}
                              {delivery.size && ` • Talla: ${delivery.size}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(delivery.delivery_date), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {format(new Date(delivery.expiration_date), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("gap-1", statusConfig.bg, statusConfig.text)}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                            {status === 'por_vencer' && daysRemaining > 0 && (
                              <span className="ml-1">({daysRemaining}d)</span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDelivery(delivery.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <DotationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      
      {selectedDelivery && (
        <DotationDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          delivery={{
            id: selectedDelivery.id,
            employeeId: selectedDelivery.employee_id,
            employeeName: `${selectedDelivery.employees?.first_name} ${selectedDelivery.employees?.last_name}`,
            employeeDocument: selectedDelivery.employees?.document_number || '',
            operationCenter: selectedDelivery.employees?.operation_centers?.name || '',
            itemType: selectedDelivery.item_type.replace('uniforme_', 'uniform_').replace('calzado_seguridad', 'boots').replace('casco', 'helmet').replace('guantes', 'gloves') as any,
            itemName: selectedDelivery.item_name,
            quantity: selectedDelivery.quantity,
            size: selectedDelivery.size || undefined,
            deliveryDate: new Date(selectedDelivery.delivery_date),
            expirationDate: new Date(selectedDelivery.expiration_date),
            status: getDotationStatus(selectedDelivery) === 'vigente' ? 'delivered' : 
                   getDotationStatus(selectedDelivery) === 'por_vencer' ? 'expiring' : 'expired',
            deliveredBy: selectedDelivery.delivered_by || undefined,
            notes: selectedDelivery.observations || undefined,
            createdAt: new Date(selectedDelivery.created_at),
            updatedAt: new Date(selectedDelivery.updated_at),
          }}
        />
      )}
    </div>
  );
}
