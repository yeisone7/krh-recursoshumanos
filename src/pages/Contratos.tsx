import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { cn } from '@/lib/utils';
import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import { useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

// Contract type is now dynamic (text in DB) - no longer using enum
type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';

const statusConfig: Record<ContractStatus, { label: string; class: string; icon: typeof CheckCircle }> = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-muted text-muted-foreground border-border', icon: FileText },
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

export default function Contratos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { currentCompanyId } = useAuth();
  const { data: contracts, isLoading } = useContracts();
  const { data: contractTypesConfig } = useContractTypes();

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
    
    return contracts.filter((contract) => {
      const employeeName = `${contract.employees?.first_name} ${contract.employees?.last_name}`.toLowerCase();
      const matchesSearch = employeeName.includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || contract.contract_type === typeFilter;
      const status = getContractStatus(contract);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contracts, searchQuery, typeFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expiring: 0, expired: 0, withExtensions: 0 };
    
    return {
      total: contracts.length,
      active: contracts.filter(c => getContractStatus(c) === 'active').length,
      expiring: contracts.filter(c => getContractStatus(c) === 'expiring').length,
      expired: contracts.filter(c => getContractStatus(c) === 'expired').length,
      withExtensions: contracts.filter(c => c.contract_extensions && c.contract_extensions.length > 0).length,
    };
  }, [contracts]);

  const handleContractClick = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsDetailOpen(true);
  };

  const selectedContract = contracts?.find(c => c.id === selectedContractId);

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
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground mt-1">Administra contratos y prórrogas de empleados</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="gradient-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Contrato
        </Button>
      </motion.div>

      {/* Contract Form Dialog */}
      <ContractFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {/* Contract Detail Dialog */}
      {selectedContract && (
        <ContractDetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          contract={{
            id: selectedContract.id,
            employeeId: selectedContract.employee_id,
            employeeName: `${selectedContract.employees?.first_name} ${selectedContract.employees?.last_name}`,
            employeeDocument: selectedContract.employees?.document_number || '',
            contractNumber: selectedContract.contract_number || undefined,
            // Keep the database value - no mapping needed since we now use dynamic types
            contractType: selectedContract.contract_type as any,
            startDate: new Date(selectedContract.start_date + 'T00:00:00'),
            originalEndDate: selectedContract.end_date ? new Date(selectedContract.end_date + 'T00:00:00') : null,
            currentEndDate: getEffectiveEndDate(selectedContract) ? new Date(getEffectiveEndDate(selectedContract)! + 'T00:00:00') : null,
            salary: Number(selectedContract.salary),
            salaryType: (selectedContract.salary_type === 'integral' ? 'integral' : 'monthly') as 'monthly' | 'integral',
            transportAllowance: Number(selectedContract.transport_allowance) > 0,
            operationCenter: selectedContract.employees?.operation_centers?.name || '',
            position: '',
            area: '',
            hasNonCompeteClause: selectedContract.has_non_compete_clause || false,
            hasConfidentialityClause: selectedContract.has_confidentiality_clause || false,
            extensions: (selectedContract.contract_extensions || []).map((ext) => ({
              id: ext.id,
              extensionNumber: ext.extension_number,
              startDate: new Date(ext.start_date + 'T00:00:00'),
              endDate: new Date(ext.end_date + 'T00:00:00'),
              extensionType: (ext as any).extension_type || 'pactada',
              createdAt: new Date(ext.created_at),
              notes: ext.reason || undefined,
            })),
            status: getContractStatus(selectedContract),
            isApproved: selectedContract.is_approved || false,
            approvedBy: selectedContract.approved_by || undefined,
            approvedAt: selectedContract.approved_at ? new Date(selectedContract.approved_at) : undefined,
            createdAt: new Date(selectedContract.created_at),
            updatedAt: new Date(selectedContract.updated_at),
          }}
        />
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Contratos activos</p>
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
            <p className="text-2xl font-display font-bold text-foreground">{stats.expiring}</p>
            <p className="text-sm text-muted-foreground">Por vencer (30 días)</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.expired}</p>
            <p className="text-sm text-muted-foreground">Vencidos</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.withExtensions}</p>
            <p className="text-sm text-muted-foreground">Con prórrogas</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="card-elevated p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por empleado..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px] h-10 text-sm border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos los tipos</SelectItem>
                {contractTypesConfig?.filter(ct => ct.is_active).map((ct) => (
                  <SelectItem key={ct.contract_type} value={ct.contract_type}>
                    {ct.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Vigentes</SelectItem>
                <SelectItem value="expiring">Por vencer</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

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
            {!searchQuery && typeFilter === 'all' && statusFilter === 'all' && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Contrato
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden md:table-cell">Nº Contrato</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Empleado</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden sm:table-cell">Tipo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden lg:table-cell">Fecha Inicio</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden sm:table-cell">Vigencia Actual</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden md:table-cell">Salario</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden lg:table-cell">Prórrogas</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm hidden lg:table-cell">Aprobación</th>
                  <th className="text-left p-4 font-medium text-muted-foreground text-sm">Estado</th>
                  <th className="text-right p-4 font-medium text-muted-foreground text-sm"></th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract, index) => {
                  const status = getContractStatus(contract);
                  const effectiveEndDate = getEffectiveEndDate(contract);
                  const daysRemaining = calculateDaysRemaining(effectiveEndDate);
                  const StatusIcon = statusConfig[status].icon;
                  const extensionsCount = contract.contract_extensions?.length || 0;
                  
                  return (
                    <motion.tr
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      onClick={() => handleContractClick(contract.id)}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="p-4 hidden md:table-cell">
                        <span className="text-sm font-mono text-primary font-medium">
                          {contract.contract_number || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-medium text-foreground">
                              {contract.employees?.first_name} {contract.employees?.last_name}
                            </span>
                            <p className="text-xs text-muted-foreground">{contract.employees?.document_number}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">{getContractTypeLabel(contract.contract_type)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(contract.start_date).toLocaleDateString('es-CO')}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-foreground">
                          {effectiveEndDate
                            ? new Date(effectiveEndDate).toLocaleDateString('es-CO')
                            : 'Sin fecha fin'}
                        </span>
                        {extensionsCount > 0 && (
                          <p className="text-xs text-accent">Extendido</p>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-foreground">{formatCurrency(Number(contract.salary))}</span>
                      </td>
                      <td className="p-4">
                        {extensionsCount > 0 ? (
                          <Badge variant="outline" className="bg-accent-light text-accent border-accent/20">
                            {extensionsCount} prórroga{extensionsCount > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {contract.is_approved ? (
                          <Badge variant="outline" className="bg-success-light text-success border-success/20 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Aprobado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning/20 gap-1">
                            <XCircle className="w-3 h-3" />
                            Pendiente
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className={cn("gap-1", statusConfig[status].class)}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[status].label}
                          {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                            <span className="ml-1">({daysRemaining}d)</span>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors inline-block" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
