import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  FileText,
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
import { generateAndDownloadPreaviso } from '@/lib/preavisoDocumentGenerator';
import type { TerminationDocumentData } from '@/types/termination';
import { Contract, contractTypeLabels } from '@/types/contract';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TransferEmployeeDialog } from '@/components/employees/TransferEmployeeDialog';
import { useEmployee } from '@/hooks/useEmployees';
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

  const { data: employeeData } = useEmployee(contract.employeeId);

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

  // Generate and download document (PDF or DOCX for preaviso)
  const handleGenerateDocument = async (docType: TerminationDocumentType, docId: string) => {
    if (!termination || !companyData) {
      await fetchCompanyData();
    }

    const company = companyData || await fetchCompanyData();
    if (!company || !termination) return;

    const documentData: TerminationDocumentData = {
      companyName: company.name || 'Empresa',
      companyNit: company.nit || '',
      companyAddress: company.address,
      companyCity: 'Bucaramanga',
      companyPhone: company.phone,
      employeeFullName: contract.employeeName || 'Sin nombre',
      employeeDocumentType: 'C.C.',
      employeeDocumentNumber: '---',
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
      hrManagerName: 'Director(a) de Talento Humano',
      hrManagerPosition: 'Líder de Talento Humano',
      documentDate: new Date(),
      documentCity: 'Bucaramanga',
    };

    try {
      // Use DOCX template for preaviso, PDF for others
      if (docType === 'preaviso') {
        await generateAndDownloadPreaviso(documentData);
        toast.success('Documento generado', {
          description: 'Carta de Preaviso (DOCX) descargada correctamente.',
        });
      } else {
        downloadTerminationDocument(docType, documentData);
        toast.success('Documento generado', {
          description: `${terminationDocumentLabels[docType]} descargado correctamente.`,
        });
      }
      
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

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
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

          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : step === 'initiate' && !termination ? (
              // Step 1: Initiate termination
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleInitiate)} className="space-y-4">
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
                  )

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

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={initiateTermination.isPending}>
                      {initiateTermination.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Iniciar Proceso
                    </Button>
                  </div>
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
                    
                    return (
                      <div
                        key={doc.type}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border',
                          doc.isGenerated ? 'bg-success-light border-success/20' : 'bg-muted/30 border-border'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {doc.isGenerated ? (
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
                                  DOCX
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                          </div>
                        </div>

                        <Button
                          variant={doc.isGenerated ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => terminationDoc && handleGenerateDocument(doc.type, terminationDoc.id)}
                          disabled={markDocumentGenerated.isPending}
                        >
                          {doc.type === 'preaviso' ? (
                            <FileType className="w-4 h-4 mr-2" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          {doc.isGenerated ? 'Descargar' : doc.type === 'preaviso' ? 'Generar DOCX' : 'Generar PDF'}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={handleCloseAttempt}>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar y Continuar Después
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={!checklist.canFinalize || completeTermination.isPending}
                    className={cn(!checklist.canFinalize && 'opacity-50')}
                  >
                    {completeTermination.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Finalizar Proceso
                  </Button>
                </div>

                {!checklist.canFinalize && (
                  <p className="text-sm text-center text-warning-foreground">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    Debe generar todos los documentos requeridos para finalizar el proceso.
                  </p>
                )}
              </div>
            ) : null}
          </ScrollArea>
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
    </>
  );
}
