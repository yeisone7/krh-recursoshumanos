import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  Package, Plus, Search, Filter, Eye, 
  AlertTriangle, CheckCircle, Clock, Calendar,
  Loader2, Warehouse, ClipboardList, ShieldCheck, Settings, FileDown, Users, Trash2,
  TrendingUp, RotateCw, ChevronRight, User
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

  const kpis = useMemo(() => ([
    { label: 'TOTAL ENTREGAS', value: stats.totalTransactions, desc: `${stats.totalItems} artículos entregados`, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'VIGENTES', value: stats.vigentes, desc: 'En tiempo legal', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: 'POR VENCER', value: stats.porVencer, desc: 'Próximos 30 días', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    { label: 'VENCIDAS', value: stats.vencidas, desc: 'Acción requerida', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  ]), [stats]);

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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Premium Header */}
      <div className="relative shrink-0 overflow-hidden px-6 py-8 sm:px-10 sm:py-10 border-b border-border ">
        
        
        
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary shadow-sm shadow-primary/5 text-primary-foreground transform -rotate-3 transition-transform hover:rotate-0 duration-300">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-border font-bold uppercase tracking-[0.2em] text-[9px] px-2 py-0">
                  Control de Dotación
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mt-1">Gestión de EPP y Uniformes</h1>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground max-w-xl leading-relaxed">
              Administración de entregas, control de inventario y seguimiento de vigencias para cumplimiento de seguridad laboral.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 lg:min-w-[550px]">
            {kpis.map((stat, i) => (
              <div key={i} className="group relative overflow-hidden p-4 rounded-[1.5rem] bg-background border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-500">
                <div className={`absolute top-2 right-2 p-1.5 rounded-lg ${stat.bg} ${stat.color} opacity-30 group-hover:opacity-100 transition-opacity`}>
                   <stat.icon className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</p>
                  <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground/60 leading-none truncate">{stat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Sticky Bar */}
      <div className="sticky top-0 z-40 bg-background border-b border-border px-6 sm:px-10 py-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            {[
              { value: 'entregas', label: 'Entregas', icon: Package },
              { value: 'inventario', label: 'Inventario', icon: Warehouse, count: lowStockCount, enabled: inventoryEnabled },
              { value: 'profesiograma', label: 'Profesiograma', icon: ClipboardList, enabled: true },
              { value: 'cumplimiento', label: 'Cumplimiento', icon: ShieldCheck, enabled: true },
              { value: 'ajustes', label: 'Ajustes', icon: Settings, enabled: true },
            ].filter(t => t.enabled).map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group"
              >
                <div className="flex items-center gap-2">
                  <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.value ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === tab.value ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    {tab.label}
                  </span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge variant="destructive" className="h-4 px-1 text-[8px] font-black">{tab.count}</Badge>
                  )}
                </div>
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="activeTabDot"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 sm:p-10 space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="entregas" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Entregas Header & Actions */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-background p-4 rounded-[2rem] border border-border shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
                  <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Buscar por empleado o artículo..."
                      className="pl-11 h-12 rounded-2xl bg-background border-border focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-12 w-full sm:w-[160px] rounded-2xl bg-background border-border font-bold text-xs uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-primary" />
                        <SelectValue placeholder="Estado" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border shadow-2xl">
                      <SelectItem value="all" className="font-bold text-xs uppercase p-3">Todos los estados</SelectItem>
                      <SelectItem value="vigente" className="font-bold text-xs uppercase p-3 text-emerald-600">Vigente</SelectItem>
                      <SelectItem value="por_vencer" className="font-bold text-xs uppercase p-3 text-amber-600">Por Vencer</SelectItem>
                      <SelectItem value="vencida" className="font-bold text-xs uppercase p-3 text-destructive">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="h-12 px-6 rounded-2xl border-border font-black uppercase tracking-widest text-[11px]"
                    onClick={() => setIsBulkOpen(true)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Entrega Masiva
                  </Button>
                  <Button
                    className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-sm shadow-primary/5"
                    onClick={() => setIsFormOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Entrega
                  </Button>
                </div>
              </div>

              {/* Alerts & Table Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <DotationAlertsCard 
                    alerts={alerts} 
                    onAlertClick={(alert) => handleViewTransaction(alert.deliveryId)}
                  />
                </div>

                <div className="lg:col-span-2">
                  <div className="overflow-hidden rounded-[2.5rem] border border-border shadow-sm bg-background ">
                    {filteredTransactions.length === 0 ? (
                      <div className="text-center py-32">
                         <Package className="w-20 h-20 mx-auto mb-6 text-muted-foreground/20" />
                         <p className="text-xl font-black uppercase tracking-[0.2em] text-muted-foreground/40">Sin entregas registradas</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-background border-b border-border hover:bg-background">
                            <TableHead className="px-8 h-16 font-black text-[10px] uppercase tracking-[0.2em]">Empleado</TableHead>
                            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Artículos</TableHead>
                            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Fecha</TableHead>
                            <TableHead className="h-16 font-black text-[10px] uppercase tracking-[0.2em]">Estado</TableHead>
                            <TableHead className="px-8 h-16 text-right font-black text-[10px] uppercase tracking-[0.2em]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.map((tx) => {
                            const txStatus = getTransactionStatus(tx);
                            const sc = statusStyles[txStatus];
                            const StatusIcon = sc.icon;
                            const itemsSummary = tx.items.length <= 2
                              ? tx.items.map(i => i.item_name).join(', ')
                              : `${tx.items[0].item_name}, ${tx.items[1].item_name} +${tx.items.length - 2}`;

                            return (
                              <TableRow
                                key={tx.id}
                                className="group border-b border-border hover:bg-primary/[0.02] transition-colors cursor-pointer"
                                onClick={() => handleViewTransaction(tx.id)}
                              >
                                <TableCell className="px-8 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                                      <User className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-black tracking-tight text-foreground text-base leading-none mb-1">
                                        {tx.employees?.first_name} {tx.employees?.last_name}
                                      </p>
                                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest truncate">
                                        {tx.employees?.operation_centers?.name || 'General'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="min-w-0 max-w-[200px]">
                                    <p className="text-sm font-black tracking-tight text-foreground/80 truncate">{itemsSummary}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground/60">{tx.items.length} {tx.items.length === 1 ? 'artículo' : 'artículos'}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                     <span className="text-[11px] font-bold text-foreground/80">
                                        {tx.delivery_date ? format(new Date(tx.delivery_date), 'dd MMM yyyy') : '—'}
                                     </span>
                                     <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Entrega</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn("h-7 rounded-full text-[9px] font-black uppercase tracking-widest px-3 border-border shadow-sm", sc.bg, sc.text)}>
                                    <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                    {sc.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-8 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-10 w-10 rounded-xl hover:bg-primary text-primary hover:text-primary-foreground shadow-sm transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewTransaction(tx.id);
                                      }}
                                    >
                                      <Eye className="w-5 h-5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-10 w-10 rounded-xl bg-background hover:bg-foreground hover:text-background transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExportPdf(tx);
                                      }}
                                    >
                                      <FileDown className="w-5 h-5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-10 w-10 rounded-xl bg-destructive/5 hover:bg-destructive text-destructive hover:text-destructive-foreground transition-all"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmId(tx.id);
                                      }}
                                    >
                                      <Trash2 className="w-5 h-5" />
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
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inventario" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DotationInventoryTab />
            </TabsContent>

            <TabsContent value="profesiograma" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ProfesiogramaTab
                centers={operationCenters.map(c => ({ id: c.id, name: c.name }))}
                positions={(positionsData as any[]).map((p: any) => ({ id: p.id, name: p.name }))}
              />
            </TabsContent>

            <TabsContent value="cumplimiento" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <DotationComplianceTab />
            </TabsContent>

            <TabsContent value="ajustes" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="max-w-3xl mx-auto py-8">
                <div className="rounded-[2.5rem] border border-border shadow-sm bg-background p-8 space-y-8">
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <Settings className="w-6 h-6" />
                      </div>
                      Configuración del Módulo
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mt-2 leading-relaxed">
                      Personalice el comportamiento del sistema de dotación e inventarios para adaptarlo a su operación.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {[
                      { 
                        id: 'dotation_inventory_enabled', 
                        label: 'Habilitar Módulo de Inventario', 
                        desc: 'Control de existencias por centro, artículo y talla.', 
                        checked: inventoryEnabled,
                        onChange: async (checked: boolean) => {
                          await updateConfig.mutateAsync({
                            key: 'dotation_inventory_enabled',
                            value: { enabled: checked },
                            description: 'Habilitar/deshabilitar módulo de inventario de dotación',
                          });
                          if (!checked && activeTab === 'inventario') setActiveTab('entregas');
                        }
                      },
                      {
                        id: 'dotation_auto_deduct',
                        label: 'Descontar Automáticamente',
                        desc: 'Sincronizar entregas con existencias de bodega.',
                        checked: systemConfig?.dotation_auto_deduct?.enabled !== false,
                        enabled: inventoryEnabled,
                        onChange: async (checked: boolean) => {
                          await updateConfig.mutateAsync({
                            key: 'dotation_auto_deduct',
                            value: { enabled: checked },
                            description: 'Descontar inventario automáticamente al registrar entregas',
                          });
                        }
                      },
                      {
                        id: 'dotation_block_no_stock',
                        label: 'Bloquear Entregas sin Stock',
                        desc: 'Impedir registros si no hay disponibilidad en almacén.',
                        checked: systemConfig?.dotation_block_no_stock?.enabled === true,
                        enabled: inventoryEnabled,
                        onChange: async (checked: boolean) => {
                          await updateConfig.mutateAsync({
                            key: 'dotation_block_no_stock',
                            value: { enabled: checked },
                            description: 'Bloquear entregas sin stock disponible en inventario',
                          });
                        }
                      }
                    ].map((config) => (
                      <div key={config.id} className={cn("flex items-center justify-between p-6 rounded-[2rem] border transition-all", config.enabled === false ? "opacity-40 grayscale pointer-events-none border-transparent bg-background /10" : "bg-background border-border hover:border-primary/20 shadow-sm")}>
                        <div className="space-y-1">
                          <Label className="text-base font-black tracking-tight">{config.label}</Label>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{config.desc}</p>
                        </div>
                        <Switch
                          checked={config.checked}
                          onCheckedChange={config.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

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
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entrega de dotación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta entrega y todos sus artículos? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
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
