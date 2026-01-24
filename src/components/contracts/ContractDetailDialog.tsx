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
import { DocumentSection } from '@/components/documents/DocumentSection';
import { TerminationProcessDialog } from '@/components/termination/TerminationProcessDialog';
import { useCreateContractExtension } from '@/hooks/useContracts';
import { useContractTerminationProcess } from '@/hooks/useTerminations';
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
  contract: Contract | null;
}

const statusConfig = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-muted text-muted-foreground border-border', icon: FileText },
};

export function ContractDetailDialog({ open, onOpenChange, contract }: ContractDetailDialogProps) {
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const createExtension = useCreateContractExtension();
  
  // Fetch termination process status
  const { data: terminationProcess } = useContractTerminationProcess(contract?.id);

  if (!contract) return null;

  const handleCreateExtension = async (data: ExtensionFormData & { contractId: string; extensionNumber: number }) => {
    try {
      await createExtension.mutateAsync({
        contract_id: data.contractId,
        extension_number: data.extensionNumber,
        start_date: format(data.startDate, 'yyyy-MM-dd'),
        end_date: format(data.endDate, 'yyyy-MM-dd'),
        reason: data.notes || null,
      });
      
      toast({
        title: 'Prórroga registrada',
        description: `La prórroga #${data.extensionNumber} ha sido guardada. Nueva vigencia hasta ${format(data.endDate, 'PPP', { locale: es })}.`,
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
  const daysRemaining = calculateDaysRemaining(contract.currentEndDate);
  const StatusIcon = statusConfig[status].icon;
  const canAddExtension = contract.contractType !== 'indefinite' && status !== 'terminated';
  
  // Check if there's a pending termination process (initiated but not completed)
  const hasPendingTermination = terminationProcess && !terminationProcess.isCompleted;
  // Show termination button if contract is not fully terminated OR if there's a pending process
  const canTerminate = status !== 'terminated' || hasPendingTermination;

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
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-display text-xl">{contract.employeeName}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{contract.position}</p>
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
                {hasPendingTermination && (
                  <Badge variant="outline" className="bg-warning-light text-warning-foreground border-warning/20 gap-1">
                    <Clock className="w-3 h-3" />
                    Retiro en progreso
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="px-6 py-4 space-y-6">
              {/* Contract Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de Contrato</p>
                  <p className="font-medium">{contractTypeLabels[contract.contractType]}</p>
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
                    <p className="font-medium">{formatCurrency(contract.salary)}</p>
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
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Historial de Prórrogas
                    {contract.extensions.length > 0 && (
                      <Badge variant="outline" className="bg-accent-light text-accent border-accent/20">
                        {contract.extensions.length}
                      </Badge>
                    )}
                  </h3>
                  {canAddExtension && (
                    <Button
                      size="sm"
                      onClick={() => setShowExtensionForm(true)}
                      className="gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Nueva Prórroga
                    </Button>
                  )}
                </div>

                {contract.extensions.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No hay prórrogas registradas</p>
                    {canAddExtension && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowExtensionForm(true)}
                        className="mt-3 gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar primera prórroga
                      </Button>
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
                        <div className="flex-1 bg-muted/30 rounded-lg p-3">
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

              {/* Validity Calculation Info */}
              {contract.contractType !== 'indefinite' && (
                <>
                  <Separator />
                  <div className="bg-muted/30 rounded-lg p-4">
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
                showVersionHistory
              />
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-between">
            <div>
              {canTerminate && (
                <Button
                  variant="outline"
                  className={cn(
                    hasPendingTermination 
                      ? "border-warning/50 text-warning-foreground hover:bg-warning hover:text-warning-foreground"
                      : "border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  )}
                  onClick={() => setShowTerminationDialog(true)}
                >
                  {hasPendingTermination ? (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Continuar Retiro
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4 mr-2" />
                      Iniciar Retiro
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button className="gradient-primary text-primary-foreground">
                Editar Contrato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extension Form Dialog */}
      {contract.currentEndDate && (
        <ExtensionFormDialog
          open={showExtensionForm}
          onOpenChange={setShowExtensionForm}
          contractId={contract.id}
          employeeName={contract.employeeName}
          currentEndDate={contract.currentEndDate}
          extensionNumber={contract.extensions.length + 1}
          onSubmit={handleCreateExtension}
        />
      )}

      {/* Termination Process Dialog */}
      <TerminationProcessDialog
        open={showTerminationDialog}
        onOpenChange={setShowTerminationDialog}
        contract={contract}
      />
    </>
  );
}
