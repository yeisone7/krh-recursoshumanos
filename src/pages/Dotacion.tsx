import { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, Plus, Search, Filter, Eye, 
  AlertTriangle, CheckCircle, Clock, Calendar
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

import {
  DotationDelivery,
  DotationAlert,
  DotationStatus,
  dotationItemTypeLabels,
  dotationStatusLabels,
  calculateDaysRemaining,
  getDotationStatus,
  getAlertLevel,
} from '@/types/dotation';

// Mock data
const mockDeliveries: DotationDelivery[] = [
  {
    id: 'dot-001',
    employeeId: 'emp-001',
    employeeName: 'María García',
    employeeDocument: '1234567890',
    operationCenter: 'Centro Norte',
    itemType: 'uniform_set',
    itemName: 'Uniforme corporativo completo',
    quantity: 2,
    size: 'M',
    deliveryDate: new Date('2024-01-15'),
    expirationDate: new Date('2024-05-15'),
    status: 'expiring',
    deliveredBy: 'Juan Pérez',
    notes: 'Incluye 2 camisas y 2 pantalones',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'dot-002',
    employeeId: 'emp-002',
    employeeName: 'Carlos Rodríguez',
    employeeDocument: '0987654321',
    operationCenter: 'Centro Sur',
    itemType: 'boots',
    itemName: 'Botas de seguridad punta de acero',
    quantity: 1,
    size: '42',
    deliveryDate: new Date('2024-01-20'),
    expirationDate: new Date('2024-02-05'),
    status: 'expired',
    deliveredBy: 'Ana López',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'dot-003',
    employeeId: 'emp-003',
    employeeName: 'Ana Martínez',
    employeeDocument: '1122334455',
    operationCenter: 'Centro Este',
    itemType: 'helmet',
    itemName: 'Casco de seguridad industrial',
    quantity: 1,
    deliveryDate: new Date('2024-02-01'),
    expirationDate: new Date('2024-06-01'),
    status: 'delivered',
    deliveredBy: 'Pedro Gómez',
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'dot-004',
    employeeId: 'emp-004',
    employeeName: 'Pedro López',
    employeeDocument: '5566778899',
    operationCenter: 'Centro Oeste',
    itemType: 'gloves',
    itemName: 'Guantes de trabajo reforzados',
    quantity: 3,
    size: 'L',
    deliveryDate: new Date('2024-02-10'),
    expirationDate: new Date('2024-06-10'),
    status: 'delivered',
    deliveredBy: 'María Torres',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-10'),
  },
  {
    id: 'dot-005',
    employeeId: 'emp-001',
    employeeName: 'María García',
    employeeDocument: '1234567890',
    operationCenter: 'Centro Norte',
    itemType: 'shoes',
    itemName: 'Zapatos de dotación',
    quantity: 1,
    size: '38',
    deliveryDate: new Date('2024-01-28'),
    expirationDate: new Date('2024-02-10'),
    status: 'expired',
    deliveredBy: 'Juan Pérez',
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-01-28'),
  },
];

// Generate alerts from deliveries
const generateAlerts = (deliveries: DotationDelivery[]): DotationAlert[] => {
  return deliveries
    .filter(d => d.status === 'expiring' || d.status === 'expired' || getDotationStatus(d) === 'expiring')
    .map(d => {
      const daysRemaining = calculateDaysRemaining(d.expirationDate);
      return {
        id: `alert-${d.id}`,
        deliveryId: d.id,
        employeeId: d.employeeId,
        employeeName: d.employeeName,
        itemName: d.itemName,
        expirationDate: d.expirationDate,
        daysRemaining,
        level: getAlertLevel(daysRemaining),
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
};

const statusStyles: Record<DotationStatus, { bg: string; text: string; icon: typeof CheckCircle }> = {
  pending: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    icon: Clock,
  },
  delivered: {
    bg: 'bg-success-light',
    text: 'text-success',
    icon: CheckCircle,
  },
  expiring: {
    bg: 'bg-warning-light',
    text: 'text-warning',
    icon: AlertTriangle,
  },
  expired: {
    bg: 'bg-destructive-light',
    text: 'text-destructive',
    icon: AlertTriangle,
  },
};

export default function Dotacion() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<DotationDelivery | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');

  const alerts = generateAlerts(mockDeliveries);
  
  // Stats
  const totalDeliveries = mockDeliveries.length;
  const deliveredCount = mockDeliveries.filter(d => d.status === 'delivered').length;
  const expiringCount = mockDeliveries.filter(d => d.status === 'expiring').length;
  const expiredCount = mockDeliveries.filter(d => d.status === 'expired').length;

  // Filter deliveries
  const filteredDeliveries = mockDeliveries.filter(d => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (itemTypeFilter !== 'all' && d.itemType !== itemTypeFilter) return false;
    return true;
  });

  const handleViewDelivery = (delivery: DotationDelivery) => {
    setSelectedDelivery(delivery);
    setIsDetailOpen(true);
  };

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
            <p className="text-2xl font-display font-bold text-foreground">{totalDeliveries}</p>
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
            <p className="text-2xl font-display font-bold text-foreground">{deliveredCount}</p>
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
            <p className="text-2xl font-display font-bold text-foreground">{expiringCount}</p>
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
            <p className="text-2xl font-display font-bold text-foreground">{expiredCount}</p>
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
            onAlertClick={(alert) => {
              const delivery = mockDeliveries.find(d => d.id === alert.deliveryId);
              if (delivery) handleViewDelivery(delivery);
            }}
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
                      <SelectItem value="delivered">Vigentes</SelectItem>
                      <SelectItem value="expiring">Por Vencer</SelectItem>
                      <SelectItem value="expired">Vencidas</SelectItem>
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
                  const statusConfig = statusStyles[delivery.status];
                  const StatusIcon = statusConfig.icon;
                  const daysRemaining = calculateDaysRemaining(delivery.expirationDate);

                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{delivery.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{delivery.operationCenter}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{delivery.itemName}</p>
                          <p className="text-sm text-muted-foreground">
                            {dotationItemTypeLabels[delivery.itemType]}
                            {delivery.size && ` • Talla: ${delivery.size}`}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(delivery.deliveryDate, 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          {format(delivery.expirationDate, 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("gap-1", statusConfig.bg, statusConfig.text)}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {dotationStatusLabels[delivery.status]}
                          {delivery.status === 'expiring' && daysRemaining > 0 && (
                            <span className="ml-1">({daysRemaining}d)</span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDelivery(delivery)}
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

            {filteredDeliveries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No se encontraron entregas con los filtros seleccionados</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <DotationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      <DotationDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        delivery={selectedDelivery}
      />
    </div>
  );
}
