import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Package, Plus, Search, Filter, Eye, 
  AlertTriangle, CheckCircle, Clock, Calendar,
  Loader2, Warehouse, ClipboardList, ShieldCheck, Settings, FileDown, Users, Trash2
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { DotationFormDialog } from '@/components/dotation/DotationFormDialog';
import { DotationDetailDialog } from '@/components/dotation/DotationDetailDialog';
import { DotationAlertsCard } from '@/components/dotation/DotationAlertsCard';
import { DotationInventoryTab } from '@/components/dotation/DotationInventoryTab';
import { ProfesiogramaTab } from '@/components/dotation/ProfesiogramaTab';
import { DotationComplianceTab } from '@/components/dotation/DotationComplianceTab';
import { BulkDeliveryDialog } from '@/components/dotation/BulkDeliveryDialog';
import { getDotationStatus, getDaysRemaining } from '@/hooks/useDotation';
import { useDotationTransactions, useDeleteDotationTransaction } from '@/hooks/useDotationTransactions';
import type { DotationTransaction } from '@/hooks/useDotationTransactions';
import { useDotationInventory } from '@/hooks/useDotationInventory';
import { useOperationCenters } from '@/hooks/useCompanies';
import { usePositions, useSystemConfig, useUpdateSystemConfig } from '@/hooks/useSystemConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { generateActaEntregaPdf } from '@/lib/dotationPdfGenerator';
import { toast } from 'sonner';

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

function getTransactionStatus(transaction: DotationTransaction): DotationStatus {
  let worst: DotationStatus = 'vigente';
  for (const item of transaction.items) {
    if (!item.expiration_date) continue;
    const s = getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date }) as DotationStatus;
    if (s === 'vencida') return 'vencida';
    if (s === 'por_vencer') worst = 'por_vencer';
  }
  return worst;
}

function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}

export default function Dotacion() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('entregas');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { currentCompanyId } = useAuth();
  const { data: company } = useCompany(currentCompanyId || undefined);
  const { data: transactions, isLoading } = useDotationTransactions();
  const deleteMutation = useDeleteDotationTransaction();
  const { data: inventory = [] } = useDotationInventory();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: positionsData = [] } = usePositions();
  const { data: systemConfig } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();

  const inventoryEnabled = systemConfig?.dotation_inventory_enabled?.enabled !== false;

  // Handle deep link from dashboard alerts
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (detailId && transactions) {
      // Try to find by transaction ID or by item ID
      const tx = transactions.find(t => t.id === detailId || t.items.some(i => i.id === detailId));
      if (tx) {
        setSelectedTransactionId(tx.id);
        setIsDetailOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, transactions, setSearchParams]);

  // Generate alerts from transaction items
  const alerts = useMemo(() => {
    if (!transactions) return [];
    
    const alertList: any[] = [];
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!item.expiration_date) continue;
        const status = getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date });
        if (status === 'por_vencer' || status === 'vencida') {
          const daysRemaining = getDaysRemaining(item.expiration_date);
          alertList.push({
            id: `alert-${item.id}`,
            deliveryId: tx.id,
            employeeId: tx.employee_id,
            employeeName: `${tx.employees?.first_name} ${tx.employees?.last_name}`,
            itemName: item.item_name,
            expirationDate: item.expiration_date,
            daysRemaining: Math.max(0, daysRemaining),
            level: getAlertLevel(daysRemaining),
          });
        }
      }
    }
    return alertList.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [transactions]);

  // Stats (count total items across all transactions)
  const lowStockCount = inventoryEnabled ? inventory.filter((i: any) => i.minimum_stock > 0 && i.quantity_available <= i.minimum_stock).length : 0;
  const stats = useMemo(() => {
    if (!transactions) return { totalTransactions: 0, totalItems: 0, vigentes: 0, porVencer: 0, vencidas: 0 };
    
    let totalItems = 0, vigentes = 0, porVencer = 0, vencidas = 0;
    for (const tx of transactions) {
      for (const item of tx.items) {
        totalItems++;
        if (!item.expiration_date) { vigentes++; continue; }
        const s = getDotationStatus({ delivery_date: item.delivery_date, expiration_date: item.expiration_date });
        if (s === 'vigente') vigentes++;
        else if (s === 'por_vencer') porVencer++;
        else vencidas++;
      }
    }
    return { totalTransactions: transactions.length, totalItems, vigentes, porVencer, vencidas };
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(tx => {
      const employeeName = `${tx.employees?.first_name} ${tx.employees?.last_name}`.toLowerCase();
      const itemNames = tx.items.map(i => i.item_name.toLowerCase()).join(' ');
      const matchesSearch = 
        employeeName.includes(searchQuery.toLowerCase()) ||
        itemNames.includes(searchQuery.toLowerCase());
      
      const txStatus = getTransactionStatus(tx);
      const matchesStatus = statusFilter === 'all' || txStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  const handleViewTransaction = (txId: string) => {
    setSelectedTransactionId(txId);
    setIsDetailOpen(true);
  };

  const handleExportPdf = async (tx: DotationTransaction) => {
    const deliveries = tx.items.map(item => ({
      id: item.id,
      employee_id: tx.employee_id,
      item_type: item.item_type,
      item_name: item.item_name,
      quantity: item.quantity,
      size: item.size,
      delivery_date: item.delivery_date,
      expiration_date: item.expiration_date,
      delivered_by: tx.delivered_by,
      observations: tx.observations,
      employees: tx.employees,
    }));

    try {
      await generateActaEntregaPdf({
        companyName: company?.name || 'Empresa',
        companyNit: company?.nit || '',
        deliveries,
        signatureDataUrl: tx.signature_url || null,
      });
      toast.success('Acta de entrega generada');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al generar el PDF');
    }
  };

  const selectedTransaction = transactions?.find(t => t.id === selectedTransactionId) || null;

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
        {activeTab === 'entregas' && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)} className="gap-2">
              <Users className="w-4 h-4" />
              Entrega Masiva
            </Button>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Entrega
            </Button>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entregas" className="gap-2">
            <Package className="w-4 h-4" /> Entregas
          </TabsTrigger>
          {inventoryEnabled && (
            <TabsTrigger value="inventario" className="gap-2">
              <Warehouse className="w-4 h-4" /> Inventario
              {lowStockCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{lowStockCount}</Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="profesiograma" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Profesiograma
          </TabsTrigger>
          <TabsTrigger value="cumplimiento" className="gap-2">
            <ShieldCheck className="w-4 h-4" /> Cumplimiento
          </TabsTrigger>
          <TabsTrigger value="ajustes" className="gap-2">
            <Settings className="w-4 h-4" /> Ajustes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entregas" className="mt-6 space-y-6">

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
            <p className="text-2xl font-display font-bold text-foreground">{stats.totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Entregas ({stats.totalItems} artículos)</p>
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
            onAlertClick={(alert) => handleViewTransaction(alert.deliveryId)}
          />
        </motion.div>

        {/* Transactions Table */}
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
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>
                  {searchQuery || statusFilter !== 'all'
                    ? 'No se encontraron entregas con los filtros seleccionados'
                    : 'No hay entregas de dotación registradas'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <Button onClick={() => setIsFormOpen(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Entrega
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden sm:table-cell">Artículos</TableHead>
                    <TableHead className="hidden md:table-cell">Fecha Entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const hasValidDate = tx.delivery_date && !isNaN(new Date(tx.delivery_date).getTime());
                    const txStatus = getTransactionStatus(tx);
                    const sc = statusStyles[txStatus];
                    const StatusIcon = sc.icon;

                    // Build items summary
                    const itemsSummary = tx.items.length <= 2
                      ? tx.items.map(i => i.item_name).join(', ')
                      : `${tx.items[0].item_name}, ${tx.items[1].item_name} +${tx.items.length - 2} más`;

                    return (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {tx.employees?.first_name} {tx.employees?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {tx.employees?.operation_centers?.name || 'Sin centro'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div>
                            <p className="font-medium text-sm">{itemsSummary}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.items.length} artículo(s)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {hasValidDate ? format(new Date(tx.delivery_date), 'dd/MM/yyyy') : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn("gap-1", sc.bg, sc.text)}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTransaction(tx.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportPdf(tx)}
                              title="Exportar acta de entrega"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteConfirmId(tx.id)}
                              title="Eliminar entrega"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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
        </TabsContent>

        {inventoryEnabled && (
          <TabsContent value="inventario" className="mt-6">
            <DotationInventoryTab />
          </TabsContent>
        )}

        <TabsContent value="profesiograma" className="mt-6">
          <ProfesiogramaTab
            centers={operationCenters.map(c => ({ id: c.id, name: c.name }))}
            positions={(positionsData as any[]).map((p: any) => ({ id: p.id, name: p.name }))}
          />
        </TabsContent>

        <TabsContent value="cumplimiento" className="mt-6">
          <DotationComplianceTab />
        </TabsContent>

        <TabsContent value="ajustes" className="mt-6">
          <div className="max-w-2xl space-y-6">
            <div className="card-elevated p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-primary" />
                  Módulo de Inventario
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Activa o desactiva el control de inventario de dotación. Si se desactiva, la pestaña de inventario no será visible y no se descontarán existencias al registrar entregas.
                </p>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Habilitar inventario de dotación</Label>
                  <p className="text-xs text-muted-foreground">Controla existencias por centro, artículo y talla</p>
                </div>
                <Switch
                  checked={inventoryEnabled}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateConfig.mutateAsync({
                        key: 'dotation_inventory_enabled',
                        value: { enabled: checked },
                        description: 'Habilitar/deshabilitar módulo de inventario de dotación',
                      });
                      if (!checked && activeTab === 'inventario') {
                        setActiveTab('entregas');
                      }
                    } catch {
                      // error handled by mutation
                    }
                  }}
                />
              </div>

              {inventoryEnabled && (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Descontar inventario automáticamente</Label>
                      <p className="text-xs text-muted-foreground">Al registrar una entrega, se descuenta automáticamente del stock disponible</p>
                    </div>
                    <Switch
                      checked={systemConfig?.dotation_auto_deduct?.enabled !== false}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateConfig.mutateAsync({
                            key: 'dotation_auto_deduct',
                            value: { enabled: checked },
                            description: 'Descontar inventario automáticamente al registrar entregas',
                          });
                        } catch {
                          // error handled by mutation
                        }
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Bloquear entregas sin stock suficiente</Label>
                      <p className="text-xs text-muted-foreground">Impide registrar entregas cuando no hay existencias suficientes en el inventario</p>
                    </div>
                    <Switch
                      checked={systemConfig?.dotation_block_no_stock?.enabled === true}
                      onCheckedChange={async (checked) => {
                        try {
                          await updateConfig.mutateAsync({
                            key: 'dotation_block_no_stock',
                            value: { enabled: checked },
                            description: 'Bloquear entregas sin stock disponible en inventario',
                          });
                        } catch {
                          // error handled by mutation
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <DotationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
      
      <DotationDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        transaction={selectedTransaction}
      />

      <BulkDeliveryDialog
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrega de dotación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta entrega y todos sus artículos? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId, {
                    onSuccess: () => toast.success('Entrega eliminada'),
                    onError: () => toast.error('Error al eliminar'),
                  });
                  setDeleteConfirmId(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
