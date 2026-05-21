import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  XCircle,
  BriefcaseBusiness,
  Coins,
  FileClock,
  Handshake,
  Infinity,
  RotateCw,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useAuth } from '@/contexts/AuthContext';

// Contract type is now dynamic (text in DB) - no longer using enum
type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';

const statusConfig: Record<ContractStatus, { label: string; class: string; icon: typeof CheckCircle }> = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-background text-muted-foreground border-border', icon: FileText },
};

function getContractStatus(contract: { 
  contract_type: string; 
  end_date: string | null; 
  is_terminated: boolean | null;
  contract_extensions?: Array<{ end_date: string }>;
}): ContractStatus {
  if (contract.is_terminated) return 'terminated';
  if (contract.contract_type === 'indefinido') return 'active';
  
  // Get effective end date (latest extension or original)
  let effectiveEndDate = contract.end_date;
  if (contract.contract_extensions && contract.contract_extensions.length > 0) {
    const sortedExtensions = [...contract.contract_extensions].sort(
      (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    );
    effectiveEndDate = sortedExtensions[0].end_date;
  }
  
  if (!effectiveEndDate) return 'active';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(effectiveEndDate);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring';
  return 'active';
}

function calculateDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getEffectiveEndDate(contract: { 
  end_date: string | null; 
  contract_extensions?: Array<{ end_date: string; extension_number?: number }>;
}): string | null {
  if (contract.contract_extensions && contract.contract_extensions.length > 0) {
    // Sort by extension_number (preferred) or by end_date as fallback
    const sortedExtensions = [...contract.contract_extensions].sort((a, b) => {
      // If both have extension_number, sort by that (highest first)
      if (a.extension_number !== undefined && b.extension_number !== undefined) {
        return b.extension_number - a.extension_number;
      }
      // Fallback to date comparison
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
    });
    return sortedExtensions[0].end_date;
  }
  return contract.end_date;
}

function getContractTypeIcon(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('indefin')) return Infinity;
  if (normalized.includes('obra') || normalized.includes('labor')) return BriefcaseBusiness;
  if (normalized.includes('aprendiz')) return Handshake;
  if (normalized.includes('fijo')) return FileClock;
  return FileText;
}

function getContractTypeTone(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes('indefin')) return 'bg-success-light text-success border-success/20';
  if (normalized.includes('obra') || normalized.includes('labor')) return 'bg-accent-light text-accent border-accent/20';
  if (normalized.includes('aprendiz')) return 'bg-secondary text-secondary-foreground border-border';
  if (normalized.includes('fijo')) return 'bg-warning-light text-warning-foreground border-warning/20';
  return 'bg-primary-light text-primary border-primary/20';
}

export default function Contratos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { currentCompanyId, canView, canCreate, isAdmin, isRRHH, isSuperAdmin } = useAuth();
  const isMobile = useIsMobile();
  const { data: contracts, isLoading, refetch } = useContracts();
  const { data: contractTypesConfig } = useContractTypes();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const canCreateContracts = isAdmin || isRRHH || isSuperAdmin || canCreate('contratos');

  // Helper to get contract type label from catalog
  const getContractTypeLabel = (type: string) => {
    const config = contractTypesConfig?.find(ct => ct.contract_type === type);
    return config?.display_name || type;
  };

  // Handle deep link from dashboard alerts
  useEffect(() => {
    const detailId = searchParams.get('detail');
    if (detailId && contracts) {
      const contractExists = contracts.some(c => c.id === detailId);
      if (contractExists) {
        setSelectedContractId(detailId);
        setIsDetailOpen(true);
        // Clear the query param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, contracts, setSearchParams]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filter contracts
  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
    
    return contracts.filter((contract) => {
      const searchableText = [
        contract.employees?.first_name,
        contract.employees?.middle_name,
        contract.employees?.last_name,
        contract.employees?.second_last_name,
        contract.employees?.document_number,
        contract.contract_number,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || contract.contract_type === typeFilter;
      const status = getContractStatus(contract);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contracts, deferredSearchQuery, typeFilter, statusFilter]);

  const {
    visibleItems: visibleContracts,
    hasMore,
    sentinelRef,
    visibleCount,
    totalCount,
  } = useInfiniteScroll({
    items: filteredContracts,
    pageSize: isMobile ? 12 : 40,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expiring: 0, expired: 0, withExtensions: 0 };
    
    return contracts.reduce((acc, contract) => {
      const status = getContractStatus(contract);
      acc.total += 1;
      if (status === 'active') acc.active += 1;
      if (status === 'expiring') acc.expiring += 1;
      if (status === 'expired') acc.expired += 1;
      if (contract.contract_extensions && contract.contract_extensions.length > 0) acc.withExtensions += 1;
      return acc;
    }, { total: 0, active: 0, expiring: 0, expired: 0, withExtensions: 0 });
  }, [contracts]);

  const handleContractClick = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsDetailOpen(true);
  };

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground mb-4" />
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
      {/* Premium Header */}
      <div className="bg-card border-none shadow-sm rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-10 bg-primary rounded-full" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Módulo de Talento</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Contratos Laborales
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed font-medium">
              Gestión centralizada de vinculaciones, prórrogas y estados contractuales.
            </p>
          </div>

          {canCreateContracts && (
            <div className="flex gap-2 shrink-0">
              <Button className="h-11 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95" onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Contrato</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards - Clean Sky Flat Design */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Vigentes', value: stats.active, desc: 'Contratos activos', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Por Vencer', value: stats.expiring, desc: 'Próximos 30 días', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Vencidos', value: stats.expired, desc: 'Requieren acción', icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Con Prórrogas', value: stats.withExtensions, desc: 'Historial de cambios', icon: RotateCw, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        ].map((kpi, i) => (
          <Card key={i} className="border-none shadow-sm bg-card hover:shadow-md transition-all duration-300 group rounded-2xl overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${kpi.bg} group-hover:scale-110 transition-transform shrink-0`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black tracking-tight truncate leading-none mb-1">{kpi.value}</p>
                  <p className="text-[11px] font-bold text-foreground/80 leading-tight uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{kpi.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-2">
        <div className="flex flex-col lg:flex-row gap-2 p-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar por empleado..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-10 pl-11 bg-background border-none rounded-xl shadow-sm focus-visible:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background border-none rounded-xl shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder="Tipo" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-background rounded-xl">
                <SelectItem value="all" className="rounded-lg">Todos los tipos</SelectItem>
                {contractTypesConfig?.filter(ct => ct.is_active).map((ct) => (
                  <SelectItem key={ct.contract_type} value={ct.contract_type} className="rounded-lg">
                    {ct.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 bg-background border-none rounded-xl shadow-sm">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-background rounded-xl">
                <SelectItem value="all" className="rounded-lg">Todos</SelectItem>
                <SelectItem value="active" className="rounded-lg">Vigentes</SelectItem>
                <SelectItem value="expiring" className="rounded-lg">Por vencer</SelectItem>
                <SelectItem value="expired" className="rounded-lg">Vencidos</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center px-3 h-10 bg-primary/10 rounded-xl border border-border shrink-0">
              <span className="text-[11px] font-bold text-primary whitespace-nowrap">
                {visibleCount < totalCount ? `${visibleCount}/${totalCount}` : totalCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="card-elevated overflow-hidden"
      >
        {filteredContracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay contratos</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'No se encontraron contratos con los filtros seleccionados'
                : 'Comienza agregando tu primer contrato'}
            </p>
            {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && canCreateContracts && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Contrato
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="p-3">
            <PullToRefresh onRefresh={async () => { await refetch(); }}>
              <div className="space-y-3">
                {visibleContracts.map((contract, index) => {
                  const status = getContractStatus(contract);
                  const effectiveEndDate = getEffectiveEndDate(contract);
                  const daysRemaining = calculateDaysRemaining(effectiveEndDate);
                  const StatusIcon = statusConfig[status].icon;
                  const ContractTypeIcon = getContractTypeIcon(contract.contract_type);
                  const extensionsCount = contract.contract_extensions?.length || 0;

                  return (
                    <motion.button
                      key={contract.id}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, delay: Math.min(index * 0.01, 0.12) }}
                      onClick={() => handleContractClick(contract.id)}
                      className="w-full overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-all active:scale-[0.99]"
                    >
                      <div className={cn('h-1 w-full', status === 'expired' ? 'bg-destructive' : status === 'expiring' ? 'bg-warning' : status === 'terminated' ? 'bg-background -foreground' : 'bg-success')} />
                      <div className="space-y-4 p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border', getContractTypeTone(contract.contract_type))}>
                            <ContractTypeIcon className="h-6 w-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold text-foreground">
                                  {contract.employees?.first_name} {contract.employees?.last_name}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">CC {contract.employees?.document_number}</p>
                              </div>
                              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                            </div>
                            <TooltipProvider delayDuration={150}>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      onClick={(event) => event.stopPropagation()}
                                      className={cn('gap-1', statusConfig[status].class)}
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {statusConfig[status].label}
                                      {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && <span>({daysRemaining}d)</span>}
                                      <Info className="h-3 w-3 opacity-70" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                    Indica si el contrato está vigente, próximo a vencer, vencido o terminado según sus fechas.
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      onClick={(event) => event.stopPropagation()}
                                      className={cn('gap-1', contract.is_approved ? 'bg-success-light text-success border-success/20' : 'bg-warning-light text-warning-foreground border-warning/20')}
                                    >
                                      {contract.is_approved ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                      {contract.is_approved ? 'Aprobado' : 'Pendiente'}
                                      <Info className="h-3 w-3 opacity-70" />
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                                    Indica si el contrato ya fue validado en el flujo interno de aprobación.
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border bg-background p-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="truncate">{getContractTypeLabel(contract.contract_type)}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Inicio</p>
                              <p className="mt-0.5 font-medium text-foreground">{new Date(contract.start_date).toLocaleDateString('es-CO')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Vigencia</p>
                              <p className="mt-0.5 font-medium text-foreground">{effectiveEndDate ? new Date(effectiveEndDate).toLocaleDateString('es-CO') : 'Indefinido'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Salario</p>
                              <p className="mt-0.5 font-medium text-foreground">
                                {canView('salarios') ? formatCurrency(Number(contract.salary)) : '••••••'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Prórrogas</p>
                              <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                                <RotateCw className="h-3.5 w-3.5 text-accent" />
                                {extensionsCount > 0 ? `${extensionsCount} registrada${extensionsCount > 1 ? 's' : ''}` : 'Sin prórrogas'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{contract.contract_number || 'Sin consecutivo'}</span>
                          </span>
                          {status === 'expiring' && daysRemaining !== null && (
                            <span className="shrink-0 font-medium text-warning-foreground">Vence en {daysRemaining} días</span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </PullToRefresh>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background">
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Nº Contrato</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Empleado</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Tipo</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Vigencia</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden md:table-cell">Salario</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Aprobación</th>
                  <th className="text-left p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="text-right p-4 font-bold text-[10px] uppercase tracking-wider text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {visibleContracts.map((contract, index) => {
                  const status = getContractStatus(contract);
                  const effectiveEndDate = getEffectiveEndDate(contract);
                  const daysRemaining = calculateDaysRemaining(effectiveEndDate);
                  const StatusIcon = statusConfig[status].icon;
                  const extensionsCount = contract.contract_extensions?.length || 0;
                  const ContractTypeIcon = getContractTypeIcon(contract.contract_type);
                  
                  return (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.12, delay: Math.min(index * 0.006, 0.08) }}
                      onClick={() => handleContractClick(contract.id)}
                      className="group hover:bg-primary/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="p-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Coins className="w-3.5 h-3.5 text-primary/40" />
                          <span className="text-sm font-mono text-primary/70 font-semibold">
                            {contract.contract_number || 'S/C'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate">
                              {contract.employees?.first_name} {contract.employees?.last_name}
                            </span>
                            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">CC {contract.employees?.document_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <ContractTypeIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground/80">{getContractTypeLabel(contract.contract_type)}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary/60" />
                            {new Date(contract.start_date).toLocaleDateString('es-CO')}
                          </div>
                          <p className="text-[11px] font-medium text-foreground/60">
                            → {effectiveEndDate ? new Date(effectiveEndDate).toLocaleDateString('es-CO') : 'Indefinido'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-foreground">
                            {canView('salarios') ? formatCurrency(Number(contract.salary)) : '••••••'}
                          </span>
                          {extensionsCount > 0 && (
                            <p className="text-[10px] font-bold text-accent uppercase flex items-center gap-1">
                              <RotateCw className="w-2.5 h-2.5" /> {extensionsCount} prórrogas
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        {contract.is_approved ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 text-[10px] font-bold uppercase py-0 px-2">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 text-[10px] font-bold uppercase py-0 px-2">
                            <XCircle className="w-3 h-3" />
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("gap-1 text-[10px] font-bold uppercase py-0.5 px-2 border-border shadow-sm", statusConfig[status].class)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[status].label}
                          {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                            <span className="ml-1 opacity-70">({daysRemaining}d)</span>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                           <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary">
                             <ChevronRight className="w-4 h-4" />
                           </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center gap-2 border-t border-border py-4 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Cargando más contratos
              </div>
            )}
          </div>
        )}
      </motion.div>

      <ContractFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
      />

      {selectedContractId && (
        <ContractDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          contractId={selectedContractId}
        />
      )}
    </div>
  );
}
