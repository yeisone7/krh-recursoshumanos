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
  terminationTypeLabels,
  terminationDocumentLabels,
  terminationDocumentDescriptions,
  initiateTerminationSchema,
  InitiateTerminationFormData,
  calculateChecklistStatus,
} from '@/types/termination';
import {
  useContractTerminationProcess,
  useInitiateTermination,
  useMarkDocumentGenerated,
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
interface TerminationProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: Contract;
}

export function TerminationProcessDialog({
  open,
  onOpenChange,
  contract,
}: TerminationProcessDialogProps) {
  const { currentCompanyId } = useAuth();
  const [step, setStep] = useState<'initiate' | 'checklist'>('initiate');
  const [companyData, setCompanyData] = useState<any>(null);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [laborCertificateGenerated, setLaborCertificateGenerated] = useState(false);
  const [certificateDocumentId, setCertificateDocumentId] = useState<string | null>(null);

  const { data: employeeData } = useEmployee(contract.employeeId);
  const { data: systemConfig } = useSystemConfig();

  const { data: termination, isLoading } = useContractTerminationProcess(contract.id);
  const initiateTermination = useInitiateTermination();
  const markDocumentGenerated = useMarkDocumentGenerated();
  const completeTermination = useCompleteTermination();

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
    setLaborCertificateGenerated(false);
    setCertificateDocumentId(null);
  }, [contract.id]);

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
        contractId: contract.id,
        employeeId: contract.employeeId,
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

    const documentTypeLabel = employeeData?.identification_types?.name || employeeData?.document_type || contract.employeeDocumentType || 'C.C.';
    const documentNumber = employeeData?.document_number || contract.employeeDocument || 'SIN-DOC';
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
      employeeFullName: contract.employeeName || 'Sin nombre',
      employeeDocumentType: documentTypeLabel,
      employeeDocumentNumber: documentNumber,
      employeePosition: contract.position || 'Sin cargo',
      employeeArea: contract.area || '',
      employeeOperationCenter: contract.operationCenter || '',
      contractType: contractTypeLabels[contract.contractType] || contract.contractType || 'No especificado',
      contractStartDate: contract.startDate,
      contractEndDate: contract.originalEndDate || undefined,
      salary: contract.salary,
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
        contractId: contract.id,
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Error al generar el documento');
    }
  };

  // Complete termination
  const handleComplete = async () => {
    if (!termination) return;
    
    await completeTermination.mutateAsync({
      terminationId: termination.id,
      contractId: contract.id,
      employeeId: contract.employeeId,
      effectiveDate: termination.effectiveDate,
      reason: termination.reason,
    });
    
    // If this is a transfer termination, open the transfer dialog
    if (termination.terminationType === 'traslado' && employeeData) {
      setShowTransferDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleLaborCertificateGenerated = async () => {
    setLaborCertificateGenerated(true);

    if (!certificateDocumentId) return;

    await markDocumentGenerated.mutateAsync({
      documentId: certificateDocumentId,
      contractId: contract.id,
      documentData: {
        generatedFrom: 'labor_certificate_dialog',
        generatedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] lg:h-[85vh]">
          <DialogHeader className="shrink-0 border-b bg-muted/30 px-5 py-4 sm:px-6">
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Proceso de Retiro - {contract.employeeName}
            </DialogTitle>
            <DialogDescription>
              {step === 'initiate'
                ? 'Configure los detalles de la terminación del contrato.'
                : 'Complete el checklist de documentos requeridos.'}
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
                            {Object.entries(terminationTypeLabels).map(([value, label]) => (
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="terminationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Notificación</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                  {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-background" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} />
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
                                <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                  {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-background" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} />
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
                                <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                  {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-background" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={es} />
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
                    <span className="font-medium">{checklist.completedDocuments}/{checklist.totalDocuments} documentos</span>
                  </div>
                  <Progress value={(checklist.completedDocuments / checklist.totalDocuments) * 100} className="h-2" />
                </div>

                {/* Document list */}
                <div className="space-y-3">
                  {checklist.documents.map((doc) => {
                    const terminationDoc = termination?.documents.find((d) => d.documentType === doc.type);
                    const isLaborCertificate = doc.type === 'certificado_laboral';
                    const isGenerated = doc.isGenerated || (isLaborCertificate && laborCertificateGenerated);
                    
                    return (
                      <div
                        key={doc.type}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border',
                          isGenerated ? 'bg-success-light border-success/20' : 'bg-background border-border'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {isGenerated ? (
                            <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{doc.label}</span>
                              {doc.isRequired && (
                                <Badge variant="secondary" className="text-xs">Requerido</Badge>
                              )}
                              {doc.type === 'preaviso' && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  <FileType className="w-3 h-3 mr-1" />
                                  PDF
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          </div>
                        </div>

                        <Button
                          variant={isGenerated ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => {
                            if (isLaborCertificate) {
                              setCertificateDocumentId(terminationDoc?.id || null);
                              setShowCertificateDialog(true);
                              return;
                            }

                            if (terminationDoc) {
                              handleGenerateDocument(doc.type, terminationDoc.id);
                            }
                          }}
                          disabled={markDocumentGenerated.isPending || (isLaborCertificate && !employeeData)}
                        >
                          {doc.type === 'preaviso' ? (
                            <FileType className="w-4 h-4 mr-2" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          {isGenerated ? 'Descargar' : isLaborCertificate ? 'Expedir' : 'Generar PDF'}
                        </Button>
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
                  Debe generar todos los documentos requeridos para finalizar el proceso.
                </p>
              )}
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" onClick={handleCloseAttempt}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar y Continuar Después
                  </Button>
                </div>
                <Button
                  onClick={handleComplete}
                  disabled={!checklist.canFinalize || completeTermination.isPending}
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

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Proceso Incompleto
            </AlertDialogTitle>
            <AlertDialogDescription>
              Aún tiene documentos pendientes por generar. El proceso de retiro quedará guardado 
              y podrá continuarlo en cualquier momento desde el detalle del contrato.
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
          onGenerated={() => {
            void handleLaborCertificateGenerated();
          }}
        />
      )}
    </>
  );
}
