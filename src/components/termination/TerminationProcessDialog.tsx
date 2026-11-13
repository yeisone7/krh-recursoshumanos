import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  CalendarIcon,
  ClipboardList,
  Save,
  FileType,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  TerminationType,
  TerminationDocumentType,
  selectableTerminationTypes,
  terminationDocumentLabels,
  terminationDocumentDescriptions,
  initiateTerminationSchema,
  InitiateTerminationFormData,
  calculateChecklistStatus,
} from '@/types/termination';
import {
  useContractTerminationProcess,
  useEmployeeTerminationProcess,
  useInitiateTermination,
  useMarkDocumentGenerated,
  useSetTerminationDocumentOmitted,
  useCancelPendingTermination,
  useCompleteTermination,
} from '@/hooks/useTerminations';
import { downloadTerminationDocument } from '@/lib/terminationPdfGenerator';
import type { TerminationDocumentData } from '@/types/termination';
import { Contract, contractTypeLabels } from '@/types/contract';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TransferEmployeeDialog } from '@/components/employees/TransferEmployeeDialog';
import { IssueCertificateDialog } from '@/components/employees/IssueCertificateDialog';
import { useEmployee } from '@/hooks/useEmployees';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { getEmployeeFullName } from '@/types/employee';
interface TerminationProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
  employee?: any;
}

export function TerminationProcessDialog({
  open,
  onOpenChange,
  contract,
  employee,
}: TerminationProcessDialogProps) {
  const { currentCompanyId } = useAuth();
  const [step, setStep] = useState<'initiate' | 'checklist'>('initiate');
  const [companyData, setCompanyData] = useState<any>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [certificateDocumentId, setCertificateDocumentId] = useState<string | null>(null);
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false);

  const employeeId = contract?.employeeId || employee?.id;
  const contractId = contract?.id || null;
  const { data: employeeData } = useEmployee(employeeId);
  const { data: systemConfig } = useSystemConfig();

  const { data: contractTermination, isLoading: isLoadingContractTermination } = useContractTerminationProcess(contract?.id);
  const { data: employeeTermination, isLoading: isLoadingEmployeeTermination } = useEmployeeTerminationProcess(contract ? undefined : employeeId);
  const termination = contractTermination || employeeTermination;
  const isLoading = isLoadingContractTermination || isLoadingEmployeeTermination;
  const initiateTermination = useInitiateTermination();
  const markDocumentGenerated = useMarkDocumentGenerated();
  const setDocumentOmitted = useSetTerminationDocumentOmitted();
  const completeTermination = useCompleteTermination();
  const cancelTermination = useCancelPendingTermination();
  const isUpdatingChecklist = isGeneratingDocument || markDocumentGenerated.isPending || setDocumentOmitted.isPending;
  const resolvedEmployee = employeeData || employee;
  const workInfo = resolvedEmployee?.work_info;
  const employeeName = contract?.employeeName || (resolvedEmployee ? getEmployeeFullName(resolvedEmployee) : 'Empleado');
  const employeeDocumentType = employeeData?.identification_types?.name || employeeData?.document_type || contract?.employeeDocumentType || resolvedEmployee?.document_type || 'C.C.';
  const employeeDocumentNumber = employeeData?.document_number || contract?.employeeDocument || resolvedEmployee?.document_number || 'SIN-DOC';
  const employeePosition = contract?.position || workInfo?.position_name || resolvedEmployee?.positions?.name || 'Sin cargo';
  const employeeArea = contract?.area || resolvedEmployee?.areas?.name || workInfo?.areas?.name || '';
  const employeeOperationCenter = contract?.operationCenter || resolvedEmployee?.operation_centers?.name || workInfo?.operation_centers?.name || '';
  const fallbackStartDate = workInfo?.hire_date ? new Date(workInfo.hire_date) : new Date();
  const isContractBacked = Boolean(contract);

  const form = useForm<InitiateTerminationFormData>({
    resolver: zodResolver(initiateTerminationSchema),
    defaultValues: {
      terminationDate: new Date(),
      effectiveDate: new Date(),
      reason: '',
    },
  });

  // Determine initial step based on existing termination
  useEffect(() => {
    if (termination && !termination.isCompleted) {
      setStep('checklist');
    }
  }, [termination]);

  useEffect(() => {
    setCertificateDocumentId(null);
  }, [contractId, employeeId]);

  // Calculate checklist if termination exists
  const checklist = termination
    ? calculateChecklistStatus(termination.terminationType, termination.documents)
    : null;

  // Check if there are pending documents
  const hasPendingDocuments = checklist && !checklist.canFinalize;

  // Fetch company data for PDF generation
  const fetchCompanyData = async () => {
    if (!currentCompanyId) return null;
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', currentCompanyId)
      .single();
    setCompanyData(data);
    return data;
  };

  // Handle dialog close attempt
  const handleCloseAttempt = () => {
    if (cancelTermination.isPending) return;
    if (step === 'checklist' && hasPendingDocuments) {
      setShowExitConfirmation(true);
    } else {
      onOpenChange(false);
    }
  };

  // Handle confirmed close
  const handleConfirmedClose = () => {
    setShowExitConfirmation(false);
    onOpenChange(false);
    toast.info('Proceso guardado', {
      description: 'Puede continuar el proceso de retiro en cualquier momento.',
    });
  };

  // Handle initiation
  const handleInitiate = async (data: InitiateTerminationFormData) => {
    try {
      await initiateTermination.mutateAsync({
        contractId,
        employeeId: employeeId!,
        terminationType: data.terminationType,
        terminationDate: data.terminationDate,
        effectiveDate: data.effectiveDate,
        reason: data.reason,
        resignationDate: data.resignationDate,
      });
      await fetchCompanyData();
      setStep('checklist');
    } catch (error) {
      console.error('Error initiating termination:', error);
    }
  };

  // Generate and download corporate PDF documents
  const handleGenerateDocument = async (docType: TerminationDocumentType, docId: string) => {
    if (!termination || !companyData) {
      await fetchCompanyData();
    }

    const company = companyData || await fetchCompanyData();
    if (!company || !termination) return;

    const documentTypeLabel = employeeDocumentType;
    const documentNumber = employeeDocumentNumber;
    const generatedAt = new Date();
    const cleanDocumentNumber = documentNumber.replace(/[^\w-]/g, '').toUpperCase();
    const documentCode = docType.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const signerName = systemConfig?.legal_signature_config?.signer_name || 'Representante Legal';
    const signerPosition = systemConfig?.legal_signature_config?.signer_position || 'Representante de la Empresa';

    const documentData: TerminationDocumentData = {
      companyName: company.name || 'Empresa',
      companyNit: company.nit || '',
      companyAddress: company.address,
      companyCity: 'Bucaramanga',
      companyPhone: company.phone,
      employeeFullName: employeeName || 'Sin nombre',
      employeeDocumentType: documentTypeLabel,
      employeeDocumentNumber: documentNumber,
      employeePosition,
      employeeArea,
      employeeOperationCenter,
      contractType: contract ? (contractTypeLabels[contract.contractType] || contract.contractType || 'No especificado') : 'Sin contrato registrado',
      contractStartDate: contract?.startDate || fallbackStartDate,
      contractEndDate: contract?.originalEndDate || undefined,
      salary: contract?.salary || 0,
      terminationType: termination.terminationType,
      terminationDate: termination.terminationDate,
      effectiveDate: termination.effectiveDate,
      reason: termination.reason,
      resignationDate: termination.resignationDate,
      hrManagerName: signerName,
      hrManagerPosition: 'Líder de Talento Humano',
      documentDate: new Date(),
      documentCity: 'Bucaramanga',
    };

    documentData.hrManagerPosition = signerPosition;
    documentData.representativeSignatureUrl = systemConfig?.legal_signature_config?.signature_url || undefined;
    documentData.folio = `RET-${format(generatedAt, 'yyyyMMdd')}-${documentCode}-${cleanDocumentNumber.slice(-8) || 'SINDOC'}`;
    documentData.archiveNumber = `TH-RET-${cleanDocumentNumber || 'SINDOC'}-${format(generatedAt, 'yyyyMMdd')}`;
    documentData.documentDate = generatedAt;

    try {
      await downloadTerminationDocument(docType, documentData);
      toast.success('Documento generado', {
        description: `${terminationDocumentLabels[docType]} descargado correctamente.`,
      });
      
      await markDocumentGenerated.mutateAsync({
        documentId: docId,
        documentData,
        contractId,
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar el documento');
    }
  };

  // Complete termination
  const handleComplete = async () => {
    if (!termination || !checklist?.canFinalize || isUpdatingChecklist || completeTermination.isPending || cancelTermination.isPending) return;
    
    try {
      await completeTermination.mutateAsync({
        terminationId: termination.id,
        contractId,
        employeeId: employeeId!,
        effectiveDate: termination.effectiveDate,
        reason: termination.reason,
      });
    } catch {
      return;
    }
    
    // If this is a transfer termination, open the transfer dialog
    if (termination.terminationType === 'traslado' && employeeData) {
      setShowTransferDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleCancelTermination = async () => {
    if (!termination || termination.isCompleted || completeTermination.isPending || isUpdatingChecklist || cancelTermination.isPending) return;

    try {
      await cancelTermination.mutateAsync(termination);
      setShowCancelConfirmation(false);
      setStep('initiate');
      form.reset();
      onOpenChange(false);
    } catch {
      // The mutation reports the error and leaves the checklist available.
    }
  };

  const handleLaborCertificateGenerated = () => {
    if (!certificateDocumentId) return;

    markDocumentGenerated.mutate({
      documentId: certificateDocumentId,
      contractId,
      documentData: {
        generatedFrom: 'labor_certificate_dialog',
        generatedAt: new Date().toISOString(),
      },
    }, {
      onError: () => toast.error('No se pudo registrar el certificado en el checklist de retiro'),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] lg:h-[85vh]">
          <DialogHeader className="shrink-0 border-b bg-muted/30 px-5 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Proceso de Retiro - {employeeName}
            </DialogTitle>
            <DialogDescription>
              {step === 'initiate'
                ? isContractBacked
                  ? 'Configure los detalles de la terminación del contrato.'
                  : 'Configure los detalles del retiro del empleado.'
                : 'Genere u omita cada formato para finalizar el retiro.'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1 px-5 py-4 sm:px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : step === 'initiate' && !termination ? (
              // Step 1: Initiate termination
              <Form {...form}>
                <form id="termination-initiate-form" onSubmit={form.handleSubmit(handleInitiate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="terminationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Terminación</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione el tipo de terminación" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {selectableTerminationTypes.map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="terminationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Notificación</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn('h-12 w-full justify-start rounded-xl border-border/60 bg-background px-4 text-left font-medium shadow-sm', !field.value && 'text-muted-foreground')}>
                                  <span className="min-w-0 flex-1 truncate">{field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}</span>
                                  <CalendarIcon className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="z-[70] w-auto rounded-2xl border-border/50 bg-popover p-0 shadow-2xl" align="start" sideOffset={8}>
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} className="rounded-2xl p-3" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Efectiva</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn('h-12 w-full justify-start rounded-xl border-border/60 bg-background px-4 text-left font-medium shadow-sm', !field.value && 'text-muted-foreground')}>
                                  <span className="min-w-0 flex-1 truncate">{field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}</span>
                                  <CalendarIcon className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="z-[70] w-auto rounded-2xl border-border/50 bg-popover p-0 shadow-2xl" align="start" sideOffset={8}>
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} className="rounded-2xl p-3" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('terminationType') === 'renuncia' && (
                    <FormField
                      control={form.control}
                      name="resignationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Carta de Renuncia</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn('h-12 w-full justify-start rounded-xl border-border/60 bg-background px-4 text-left font-medium shadow-sm', !field.value && 'text-muted-foreground')}>
                                  <span className="min-w-0 flex-1 truncate">{field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}</span>
                                  <CalendarIcon className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="z-[70] w-auto rounded-2xl border-border/50 bg-popover p-0 shadow-2xl" align="start" sideOffset={8}>
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} className="rounded-2xl p-3" />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch('terminationType') === 'traslado' && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-primary">Retiro por traslado</p>
                          <p className="text-muted-foreground mt-1">
                            Al finalizar el proceso de retiro, se abrirá el asistente de traslado para copiar los datos del empleado a la empresa destino.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo (opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describa el motivo de la terminación..." className="min-h-[80px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </form>
              </Form>
            ) : checklist ? (
              // Step 2: Checklist
              <div className="space-y-6">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progreso del checklist</span>
                    <span className="font-medium">{checklist.completedDocuments}/{checklist.totalDocuments} formatos resueltos</span>
                  </div>
                  <Progress value={(checklist.completedDocuments / checklist.totalDocuments) * 100} className="h-2" />
                </div>

                {/* Document list */}
                <div className="space-y-3">
                  {checklist.documents.map((doc) => {
                    const terminationDoc = termination?.documents.find((d) => d.documentType === doc.type);
                    const isLaborCertificate = doc.type === 'certificado_laboral';
                    const isOmitted = !doc.isGenerated && !doc.isRequired;
                    const changeOmission = () => {
                      if (!terminationDoc || !termination || !employeeId) return;
                      setDocumentOmitted.mutate({
                        documentId: terminationDoc.id,
                        terminationId: termination.id,
                        omitted: !isOmitted,
                        contractId,
                        employeeId,
                      });
                    };
                    
                    return (
                      <div
                        key={doc.type}
                        className={cn(
                          'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
                          doc.isGenerated ? 'bg-success-light border-success/20' : 'bg-background border-border'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {doc.isGenerated ? (
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{doc.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {doc.isGenerated ? 'Generado' : isOmitted ? 'Omitido' : 'Pendiente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2 pl-8 sm:justify-end sm:pl-0">
                          {!isOmitted && (
                            <Button
                              variant={doc.isGenerated ? 'outline' : 'default'}
                              size="sm"
                              disabled={isUpdatingChecklist || completeTermination.isPending || cancelTermination.isPending || !terminationDoc || (isLaborCertificate && !employeeData)}
                              onClick={async () => {
                                if (!terminationDoc) return;
                                if (isLaborCertificate) {
                                  setCertificateDocumentId(terminationDoc.id);
                                  setShowCertificateDialog(true);
                                  return;
                                }

                                setIsGeneratingDocument(true);
                                try {
                                  await handleGenerateDocument(doc.type, terminationDoc.id);
                                } finally {
                                  setIsGeneratingDocument(false);
                                }
                              }}
                            >
                              {doc.type === 'preaviso' ? (
                                <FileType className="mr-2 h-4 w-4" />
                              ) : (
                                <Download className="mr-2 h-4 w-4" />
                              )}
                              {doc.isGenerated ? 'Descargar' : isLaborCertificate ? 'Expedir' : 'Generar PDF'}
                            </Button>
                          )}
                          {!doc.isGenerated && !termination?.isCompleted && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={isOmitted ? `Deshacer omisión de ${doc.label}` : `Omitir ${doc.label}`}
                              disabled={isUpdatingChecklist || completeTermination.isPending || cancelTermination.isPending || !terminationDoc}
                              onClick={changeOmission}
                            >
                              {isOmitted ? 'Deshacer omisión' : 'Omitir'}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ) : null}
          </ScrollArea>

          {!isLoading && step === 'initiate' && !termination && (
            <div className="shrink-0 border-t bg-muted/40 px-5 py-3 sm:px-6">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" form="termination-initiate-form" disabled={initiateTermination.isPending}>
                  {initiateTermination.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Iniciar Proceso
                </Button>
              </div>
            </div>
          )}

          {!isLoading && checklist && (
            <div className="shrink-0 border-t bg-muted/40 px-5 py-3 sm:px-6">
              {!checklist.canFinalize && (
                <p className="mb-3 text-center text-sm text-warning-foreground">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Genere u omita los formatos pendientes para finalizar el proceso.
                </p>
              )}
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={handleCloseAttempt}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar y Continuar Después
                  </Button>
                  {termination && !termination.isCompleted && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setShowCancelConfirmation(true)}
                      disabled={isUpdatingChecklist || completeTermination.isPending || cancelTermination.isPending}
                    >
                      Cancelar proceso de retiro
                    </Button>
                  )}
                </div>
                <Button
                  onClick={handleComplete}
                  disabled={!checklist.canFinalize || isUpdatingChecklist || completeTermination.isPending || cancelTermination.isPending}
                  className={cn(!checklist.canFinalize && 'opacity-50')}
                >
                  {completeTermination.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {termination?.terminationType === 'traslado' ? (
                    <><ArrowRightLeft className="w-4 h-4 mr-2" /> Finalizar y Trasladar</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar Proceso</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirmation} onOpenChange={value => {
        if (!cancelTermination.isPending) setShowCancelConfirmation(value);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el proceso de retiro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se descartará el checklist guardado y se retirará la fecha provisional de este proceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelTermination.isPending}>Conservar proceso</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelTermination.isPending || completeTermination.isPending || !termination || termination.isCompleted}
              onClick={event => {
                event.preventDefault();
                void handleCancelTermination();
              }}
            >
              {cancelTermination.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Proceso Incompleto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Aún tiene formatos pendientes por generar u omitir. El proceso de retiro quedará guardado
              y podrá continuarlo en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedClose}>
              Guardar y Salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer dialog after termination completion */}
      {employeeData && (
        <TransferEmployeeDialog
          open={showTransferDialog}
          onOpenChange={(open) => {
            setShowTransferDialog(open);
            if (!open) onOpenChange(false);
          }}
          employee={employeeData}
        />
      )}

      {employeeData && (
        <IssueCertificateDialog
          open={showCertificateDialog}
          onOpenChange={setShowCertificateDialog}
          employee={employeeData}
          onGenerated={handleLaborCertificateGenerated}
        />
      )}
    </>
  );
}
