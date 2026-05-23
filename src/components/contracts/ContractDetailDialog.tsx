import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  User,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  UserX,
  PlayCircle,
  Download,
  Scale,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

import { ExtensionFormDialog } from './ExtensionFormDialog';
import { ContractFormDialog } from './ContractFormDialog';
import { FourYearLimitGauge } from './FourYearLimitGauge';
import { DocumentSection } from '@/components/documents/DocumentSection';
import { TerminationProcessDialog } from '@/components/termination/TerminationProcessDialog';
import { GenerateContractDialog } from './GenerateContractDialog';
import { useCreateContractExtension, useApproveContract, useContract } from '@/hooks/useContracts';
import { useContractTerminationProcess } from '@/hooks/useTerminations';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useAuth } from '@/contexts/AuthContext';
import {
  Contract,
  ContractExtension,
  contractTypeLabels,
  getContractStatus,
  calculateDaysRemaining,
  ExtensionFormData,
} from '@/types/contract';

interface ContractDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  contract?: Contract | null;
}

const statusConfig = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-background text-muted-foreground border-border', icon: FileText },
};

export function ContractDetailDialog({ open, onOpenChange, contractId, contract: initialContract }: ContractDetailDialogProps) {
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const { data: dbContract, isLoading: isDbContractLoading } = useContract(contractId || undefined);

  const createExtension = useCreateContractExtension();
  const approveContract = useApproveContract();
  const { isAdmin, isRRHH, isSuperAdmin, canView, canUpdate } = useAuth();
  const { data: contractTypes = [] } = useContractTypes();
  const canUpdateContracts = isAdmin || isRRHH || isSuperAdmin || canUpdate('contratos');
  const canRetireContract = canUpdateContracts || canUpdate('empleados');
  
  // Map DB contract to UI Contract interface
  const contract = initialContract || (dbContract ? {
    id: dbContract.id,
    employeeId: dbContract.employee_id,
    employeeName: dbContract.employees ? `${dbContract.employees.first_name} ${dbContract.employees.last_name}` : 'Empleado',
    employeeDocument: dbContract.employees?.document_number,
    contractNumber: dbContract.contract_number,
    contractType: (dbContract.contract_type === 'indefinido' ? 'indefinite' : 
                   dbContract.contract_type === 'fijo' ? 'fixed' :
                   dbContract.contract_type === 'obra_labor' ? 'work_labor' :
                   dbContract.contract_type === 'aprendizaje' ? 'apprenticeship' : 'services') as any,
    startDate: new Date(dbContract.start_date + 'T00:00:00'),
    originalEndDate: dbContract.end_date ? new Date(dbContract.end_date + 'T00:00:00') : null,
    currentEndDate: dbContract.contract_extensions?.length 
      ? new Date([...dbContract.contract_extensions].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0].end_date + 'T00:00:00')
      : (dbContract.end_date ? new Date(dbContract.end_date + 'T00:00:00') : null),
    salary: Number(dbContract.salary),
    salaryType: dbContract.salary_type === 'integral' ? 'integral' : 'monthly',
    transportAllowance: (dbContract.transport_allowance || 0) > 0,
    operationCenter: dbContract.employees?.operation_centers?.name || 'No asignado',
    position: dbContract.employees?.employee_work_info?.[0]?.position_name || 'No asignada',
    area: 'No asignada', 
    extensions: (dbContract.contract_extensions || []).map((ext: any) => ({
      id: ext.id,
      extensionNumber: ext.extension_number,
      startDate: new Date(ext.start_date + 'T00:00:00'),
      endDate: new Date(ext.end_date + 'T00:00:00'),
      extensionType: ext.extension_type as any,
      createdAt: new Date(ext.created_at),
      notes: ext.reason
    })),
    status: getContractStatus({
      contractType: (dbContract.contract_type === 'indefinido' ? 'indefinite' : 'fixed') as any, 
      currentEndDate: dbContract.end_date ? new Date(dbContract.end_date + 'T00:00:00') : null,
      status: dbContract.is_terminated ? 'terminated' : undefined
    }),
    isApproved: dbContract.is_approved || false,
    approvedBy: dbContract.approved_by,
    approvedAt: dbContract.approved_at ? new Date(dbContract.approved_at) : undefined,
    createdAt: new Date(dbContract.created_at),
    updatedAt: new Date(dbContract.updated_at),
    documentUrl: dbContract.document_url,
    notes: dbContract.special_clauses,
    hasNonCompeteClause: dbContract.has_non_compete_clause || false,
    hasConfidentialityClause: dbContract.has_confidentiality_clause || false,
  } as Contract : null);

  // Fetch termination process status
  const { data: terminationProcess } = useContractTerminationProcess(contract?.id);
  
  // Get dynamic contract type label from catalog - map UI type back to DB type
  const getContractTypeLabel = (type: string): string => {
    const dbType = type === 'indefinite' ? 'indefinido' :
                   type === 'fixed' ? 'fijo' :
                   type === 'work_labor' ? 'obra_labor' :
                   type === 'apprenticeship' ? 'aprendizaje' :
                   type === 'services' ? 'servicios' : type;
    const config = contractTypes.find(ct => ct.contract_type === dbType);
    return config?.display_name || contractTypeLabels[type as keyof typeof contractTypeLabels] || type;
  };

  if (isDbContractLoading && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium">Cargando detalles del contrato...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (!contract) return null;

  const handleCreateExtension = async (data: ExtensionFormData & { contractId: string; extensionNumber: number }) => {
    try {
      await createExtension.mutateAsync({
        contract_id: data.contractId,
        extension_number: data.extensionNumber,
        start_date: format(data.startDate, 'yyyy-MM-dd'),
        end_date: format(data.endDate, 'yyyy-MM-dd'),
        reason: data.notes || null,
        extension_type: data.extensionType,
      });
      
      const extensionLabel = data.extensionType === 'automatica' ? 'automática' : 'pactada';
      toast({
        title: 'Prórroga registrada',
        description: `La prórroga ${extensionLabel} #${data.extensionNumber} ha sido guardada. Nueva vigencia hasta ${format(data.endDate, 'PPP', { locale: es })}.`,
      });
      
      setShowExtensionForm(false);
    } catch (error) {
      console.error('Error creating extension:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar la prórroga. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const status = getContractStatus(contract);
  const isTerminated = status === 'terminated';
  const daysRemaining = calculateDaysRemaining(contract.currentEndDate);
  const StatusIcon = statusConfig[status].icon;
  const isApproved = contract.isApproved;
  const canManageExtensions = canUpdateContracts && contract.contractType !== 'indefinite' && !isTerminated;
  const canAddExtension = canManageExtensions && isApproved && status !== 'expired' && !!contract.currentEndDate;
  const extensionBlockedReason = !isApproved
    ? 'El contrato debe estar aprobado para registrar una prórroga.'
    : status === 'expired'
      ? 'No se pueden registrar prórrogas sobre contratos vencidos.'
      : !contract.currentEndDate
        ? 'Define la fecha fin actual del contrato para registrar una prórroga.'
        : null;
  
  // Check if there's a pending termination process (initiated but not completed)
  const hasPendingTermination = terminationProcess && !terminationProcess.isCompleted;
  const hasCompletedTermination = terminationProcess && terminationProcess.isCompleted;
  // Show termination button if contract is not fully terminated OR if there's a pending process (but not if already completed)
  const canTerminate = canRetireContract && !hasCompletedTermination && (!isTerminated || hasPendingTermination);
  
  // Approval status
  const canApprove = isAdmin && !isApproved && !isTerminated;

  const handleApproveContract = async () => {
    try {
      await approveContract.mutateAsync(contract.id);
      toast({
        title: 'Contrato aprobado',
        description: 'El contrato ha sido aprobado exitosamente. Ahora puede generar el documento.',
      });
    } catch (error) {
      console.error('Error approving contract:', error);
      toast({
        title: 'Error',
        description: 'No se pudo aprobar el contrato. Intente nuevamente.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenExtensionForm = () => {
    if (!canUpdateContracts) {
      toast({
        title: 'Sin permiso',
        description: 'No tienes permisos para registrar prórrogas de contratos.',
        variant: 'destructive',
      });
      return;
    }

    if (isTerminated) {
      toast({
        title: 'Contrato terminado',
        description: 'No se pueden registrar prórrogas en un contrato terminado.',
        variant: 'destructive',
      });
      return;
    }

    if (contract.contractType === 'indefinite') {
      toast({
        title: 'Contrato indefinido',
        description: 'Los contratos indefinidos no requieren prórrogas.',
      });
      return;
    }

    if (!isApproved) {
      toast({
        title: 'Contrato pendiente de aprobación',
        description: 'Para registrar una prórroga, el contrato debe estar aprobado.',
        variant: 'destructive',
      });
      return;
    }

    if (status === 'expired') {
      toast({
        title: 'Contrato vencido',
        description: 'No se pueden registrar prórrogas sobre contratos vencidos. Revisa el estado contractual antes de continuar.',
        variant: 'destructive',
      });
      return;
    }

    if (!contract.currentEndDate) {
      toast({
        title: 'Falta fecha de fin',
        description: 'Para crear una prórroga primero debes definir la fecha fin actual del contrato desde Editar Contrato.',
        variant: 'destructive',
      });
      return;
    }

    setShowExtensionForm(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-display text-xl">{contract.employeeName}</DialogTitle>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{contract.position}</p>
                    {contract.contractNumber && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-sm font-mono text-primary">{contract.contractNumber}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={cn("gap-1", statusConfig[status].class)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig[status].label}
                  {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                    <span className="ml-1">({daysRemaining}d)</span>
                  )}
                </Badge>
                {/* Approval Status Badge */}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1",
                    isApproved 
                      ? "bg-success-light text-success border-success/20" 
                      : "bg-warning-light text-warning-foreground border-warning/20"
                  )}
                >
                  {isApproved ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      Aprobado
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Pendiente Aprobación
                    </>
                  )}
                </Badge>
                {hasPendingTermination && (
                  <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning/20 gap-1">
                    <Clock className="w-3 h-3" />
                    Retiro en progreso
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0 overflow-auto">
            <div className="px-6 py-4 space-y-6">
              {/* Contract Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Contrato</p>
                  <p className="font-medium">{getContractTypeLabel(contract.contractType)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Fecha Inicio</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{format(contract.startDate, 'dd MMM yyyy', { locale: es })}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Vigencia Actual</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {contract.currentEndDate
                        ? format(contract.currentEndDate, 'dd MMM yyyy', { locale: es })
                        : 'Sin fecha fin'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Salario</p>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {canView('salarios') ? formatCurrency(contract.salary) : '••••••'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Centro de Operación</p>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">{contract.operationCenter}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Área</p>
                  <p className="font-medium">{contract.area}</p>
                </div>
              </div>

              <Separator />

              {/* Extensions Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Historial de Prórrogas
                      {contract.extensions.length > 0 && (
                        <Badge variant="outline" className="bg-accent-light text-accent border-accent/20">
                          {contract.extensions.length}
                        </Badge>
                      )}
                    </h3>
                    {/* Legal Compliance Badge - Art. 46 CST */}
                    {contract.contractType !== 'indefinite' && (
                      <Badge 
                        variant="outline" 
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 text-xs font-medium"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Art. 46 CST
                      </Badge>
                    )}
                  </div>
                  {canManageExtensions && (
                    <Button
                      size="sm"
                      onClick={handleOpenExtensionForm}
                      className="gap-1"
                      variant={canAddExtension ? 'default' : 'outline'}
                      title={extensionBlockedReason || undefined}
                    >
                      <Plus className="w-4 h-4" />
                      Nueva Prórroga
                    </Button>
                  )}
                </div>

                {contract.extensions.length === 0 ? (
                  <div className="text-center py-8 bg-background rounded-lg">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay prórrogas registradas</p>
                    {canManageExtensions && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleOpenExtensionForm}
                        className="mt-3 gap-1"
                        title={extensionBlockedReason || undefined}
                      >
                        <Plus className="w-4 h-4" />
                        Agregar primera prórroga
                      </Button>
                    )}
                    {canManageExtensions && extensionBlockedReason && (
                      <p className="mx-auto mt-3 max-w-md text-xs text-muted-foreground">
                        {extensionBlockedReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Timeline of extensions */}
                    <div className="relative">
                      {/* Original contract */}
                      <div className="flex items-start gap-3 pb-4">
                        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0 z-10">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 bg-background rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">Contrato Original</p>
                            <span className="text-xs text-muted-foreground">
                              {format(contract.startDate, 'dd MMM yyyy', { locale: es })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(contract.startDate, 'dd/MM/yyyy')}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>
                              {contract.originalEndDate
                                ? format(contract.originalEndDate, 'dd/MM/yyyy')
                                : 'Sin fecha fin'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Extensions */}
                      {contract.extensions
                        .sort((a, b) => a.extensionNumber - b.extensionNumber)
                        .map((ext, index) => (
                          <div key={ext.id} className="flex items-start gap-3 pb-4 relative">
                            {/* Connector line */}
                            <div className="absolute left-4 -top-4 w-0.5 h-4 bg-border" />
                            <div className="w-8 h-8 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0 z-10">
                              <span className="text-xs font-bold text-accent">{ext.extensionNumber}</span>
                            </div>
                            <div className="flex-1 bg-accent-light/30 border border-accent/10 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm">Prórroga #{ext.extensionNumber}</p>
                                <span className="text-xs text-muted-foreground">
                                  {format(ext.createdAt, 'dd MMM yyyy', { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{format(ext.startDate, 'dd/MM/yyyy')}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="font-medium text-foreground">{format(ext.endDate, 'dd/MM/yyyy')}</span>
                                <span className="text-xs">
                                  ({differenceInDays(ext.endDate, ext.startDate)} días)
                                </span>
                              </div>
                              {ext.notes && (
                                <p className="text-xs text-muted-foreground mt-2 italic">{ext.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Four Year Limit Gauge - Colombian Labor Law */}
              {contract.contractType !== 'indefinite' && (
                <>
                  <Separator />
                  <FourYearLimitGauge
                    startDate={contract.startDate}
                    currentEndDate={contract.currentEndDate}
                    originalEndDate={contract.originalEndDate}
                    extensionCount={contract.extensions.length}
                    contractType={contract.contractType}
                  />
                </>
              )}

              {/* Validity Calculation Info */}
              {contract.contractType !== 'indefinite' && (
                <>
                  <Separator />
                  <div className="bg-background rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Cálculo de Vigencia
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fecha fin original:</p>
                        <p className="font-medium">
                          {contract.originalEndDate
                            ? format(contract.originalEndDate, 'dd MMM yyyy', { locale: es })
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vigencia actual (con prórrogas):</p>
                        <p className="font-medium text-primary">
                          {contract.currentEndDate
                            ? format(contract.currentEndDate, 'dd MMM yyyy', { locale: es })
                            : 'N/A'}
                        </p>
                      </div>
                      {daysRemaining !== null && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Días restantes:</p>
                          <p className={cn(
                            "font-bold text-lg",
                            daysRemaining < 0 ? "text-destructive" :
                            daysRemaining <= 30 ? "text-warning" : "text-success"
                          )}>
                            {daysRemaining < 0 ? `Vencido hace ${Math.abs(daysRemaining)} días` :
                             daysRemaining === 0 ? 'Vence hoy' :
                             `${daysRemaining} días`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Document Section */}
              <Separator />
              <DocumentSection
                entityType="contract"
                entityId={contract.id}
                title="Documento del Contrato"
                allowUpload={!isTerminated}
                showVersionHistory
              />
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t border-border bg-background flex flex-col gap-3 flex-shrink-0">
            {/* Primary actions row */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowGenerateDialog(true)}
                className="gap-1"
                disabled={!isApproved || isTerminated}
                title={
                  isTerminated
                    ? 'El contrato terminado no permite generar nuevos documentos'
                    : !isApproved
                      ? 'El contrato debe estar aprobado para generar el documento'
                      : undefined
                }
              >
                <Download className="w-4 h-4" />
                Generar Documento
              </Button>
              <Button 
                className="gradient-primary text-primary-foreground"
                onClick={() => setShowEditDialog(true)}
                disabled={isTerminated || !canUpdateContracts}
                title={
                  isTerminated
                    ? 'El contrato terminado no permite edición'
                    : !canUpdateContracts
                      ? 'No tienes permisos para editar contratos'
                      : undefined
                }
              >
                Editar Contrato
              </Button>
            </div>
            {/* Secondary actions row */}
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                {canTerminate && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      hasPendingTermination 
                        ? "border-warning/50 text-warning-foreground hover:bg-warning hover:text-warning-foreground"
                        : "border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    )}
                    onClick={() => setShowTerminationDialog(true)}
                    disabled={!isApproved && !hasPendingTermination}
                    title={!isApproved && !hasPendingTermination ? 'El contrato debe estar aprobado para iniciar el retiro' : undefined}
                  >
                    {hasPendingTermination ? (
                      <>
                        <PlayCircle className="w-4 h-4 mr-1.5" />
                        Continuar Retiro
                      </>
                    ) : (
                      <>
                        <UserX className="w-4 h-4 mr-1.5" />
                        Iniciar Retiro
                      </>
                    )}
                  </Button>
                )}
              </div>
              {canApprove && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-success/50 text-success hover:bg-success hover:text-success-foreground"
                  onClick={handleApproveContract}
                  disabled={approveContract.isPending}
                >
                  {approveContract.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  )}
                  Aprobar Contrato
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extension Form Dialog */}
      {contract && contract.currentEndDate && (
        <ExtensionFormDialog
          open={showExtensionForm}
          onOpenChange={setShowExtensionForm}
          contractId={contract.id}
          employeeName={contract.employeeName}
          currentEndDate={contract.currentEndDate}
          extensionNumber={contract.extensions.length + 1}
          contractStartDate={contract.startDate}
          originalEndDate={contract.originalEndDate}
          contractType={contract.contractType === 'fixed' ? 'fijo' : 
                        contract.contractType === 'indefinite' ? 'indefinido' :
                        contract.contractType === 'work_labor' ? 'obra_labor' :
                        contract.contractType === 'apprenticeship' ? 'aprendizaje' : 'servicios'}
          existingExtensions={contract.extensions}
          onSubmit={handleCreateExtension}
        />
      )}

      {/* Termination Process Dialog */}
      <TerminationProcessDialog
        open={showTerminationDialog}
        onOpenChange={setShowTerminationDialog}
        contract={contract}
      />

      {dbContract && (
        <GenerateContractDialog
          open={showGenerateDialog}
          onOpenChange={setShowGenerateDialog}
          contract={{
            id: dbContract.id,
            employee_id: dbContract.employee_id,
            contract_type: dbContract.contract_type,
            contract_number: dbContract.contract_number || null,
            start_date: dbContract.start_date,
            end_date: dbContract.end_date || null,
            salary: Number(dbContract.salary),
            salary_type: dbContract.salary_type || 'mensual',
            transport_allowance: Number(dbContract.transport_allowance) || 0,
            trial_period_days: dbContract.trial_period_days || null,
            work_city: dbContract.work_city || null,
            work_address: dbContract.work_address || null,
            has_non_compete_clause: dbContract.has_non_compete_clause,
            has_confidentiality_clause: dbContract.has_confidentiality_clause,
            special_clauses: dbContract.special_clauses,
            employees: {
              id: dbContract.employee_id,
              first_name: dbContract.employees?.first_name || '',
              middle_name: dbContract.employees?.middle_name || '',
              last_name: dbContract.employees?.last_name || '',
              second_last_name: dbContract.employees?.second_last_name || '',
              document_number: dbContract.employees?.document_number || '',
              operation_centers: dbContract.employees?.operation_centers ? { name: dbContract.employees.operation_centers.name } : null,
            },
          }}
        />
      )}

      {/* Edit Contract Dialog */}
      {dbContract && (
        <ContractFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          preselectedEmployeeId={dbContract.employee_id}
          preselectedEmployeeName={contract.employeeName}
          contractToEdit={dbContract as any}
          onSuccess={() => {
            // Close both dialogs and trigger refresh
            setShowEditDialog(false);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
