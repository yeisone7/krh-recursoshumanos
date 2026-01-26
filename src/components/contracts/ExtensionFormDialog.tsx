import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileText, Plus, AlertTriangle, Info, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

import { extensionFormSchema, ExtensionFormData, ContractExtension } from '@/types/contract';
import {
  ExtensionType,
  validateExtension,
  getContractLegalStatus,
  calculateAutomaticExtensionEndDate,
  extensionTypeLabels,
  extensionTypeDescriptions,
  isPreavisoDeadlinePassed,
  COLOMBIAN_LABOR_LAW,
  ContractData,
} from '@/lib/colombianContractLaw';

interface ExtensionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  employeeName: string;
  currentEndDate: Date;
  extensionNumber: number;
  contractStartDate: Date;
  originalEndDate: Date | null;
  contractType: string;
  existingExtensions: ContractExtension[];
  onSubmit?: (data: ExtensionFormData & { contractId: string; extensionNumber: number }) => void;
}

export function ExtensionFormDialog({
  open,
  onOpenChange,
  contractId,
  employeeName,
  currentEndDate,
  extensionNumber,
  contractStartDate,
  originalEndDate,
  contractType,
  existingExtensions,
  onSubmit,
}: ExtensionFormDialogProps) {
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    info: string[];
  }>({ isValid: true, errors: [], warnings: [], info: [] });

  // Build contract data for validation
  const contractData: ContractData = {
    startDate: contractStartDate,
    originalEndDate,
    extensions: existingExtensions.map(ext => ({
      id: ext.id,
      extensionNumber: ext.extensionNumber,
      startDate: ext.startDate,
      endDate: ext.endDate,
      extensionType: ext.extensionType || 'pactada',
    })),
    contractType,
  };

  const legalStatus = getContractLegalStatus(contractData);
  const preavisoPassed = isPreavisoDeadlinePassed(currentEndDate);

  const form = useForm<ExtensionFormData>({
    resolver: zodResolver(extensionFormSchema),
    defaultValues: {
      startDate: currentEndDate,
      extensionType: preavisoPassed ? 'automatica' : 'pactada',
      notes: '',
    },
  });

  const watchedEndDate = form.watch('endDate');
  const watchedExtensionType = form.watch('extensionType');

  // When extension type changes to automatic, auto-calculate end date
  useEffect(() => {
    if (watchedExtensionType === 'automatica') {
      const autoEndDate = calculateAutomaticExtensionEndDate(contractData, currentEndDate);
      form.setValue('endDate', autoEndDate);
    }
  }, [watchedExtensionType]);

  // Validate extension whenever end date changes
  useEffect(() => {
    if (watchedEndDate) {
      const result = validateExtension(
        contractData,
        watchedEndDate,
        extensionNumber,
        currentEndDate
      );
      setValidationResult(result);
    }
  }, [watchedEndDate, extensionNumber]);

  // Helper function to calculate suggested end date (minimum 12 months if required)
  const getSuggestedMinEndDate = () => {
    if (legalStatus.requiresMinOneYear) {
      return addMonths(currentEndDate, 12);
    }
    return addMonths(currentEndDate, 1);
  };

  const handleSubmit = (data: ExtensionFormData) => {
    // Final validation before submit
    if (!validationResult.isValid) {
      toast({
        title: 'Error de validación',
        description: 'La prórroga no cumple con los requisitos legales. Revise los errores.',
        variant: 'destructive',
      });
      return;
    }

    if (onSubmit) {
      onSubmit({ ...data, contractId, extensionNumber });
    } else {
      console.log('Extension data:', data);
      toast({
        title: 'Prórroga registrada',
        description: `La prórroga #${extensionNumber} de ${employeeName} ha sido registrada. Nueva vigencia hasta ${format(data.endDate, 'PPP', { locale: es })}.`,
      });
      onOpenChange(false);
    }
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nueva Prórroga
          </DialogTitle>
          <DialogDescription>
            Prórroga #{extensionNumber} para el contrato de <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Current contract info */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vigencia actual:</span>
                <span className="font-medium">{format(currentEndDate, 'PPP', { locale: es })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Número de prórroga:</span>
                <span className="font-medium text-primary">#{extensionNumber}</span>
              </div>
              {contractType === 'fijo' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duración total acumulada:</span>
                  <span className="font-medium">{legalStatus.totalDurationYears.toFixed(1)} años</span>
                </div>
              )}
            </div>

            {/* Colombian Labor Law Info */}
            {contractType === 'fijo' && (
              <Alert variant="default" className="bg-primary/5 border-primary/20">
                <Scale className="h-4 w-4" />
                <AlertTitle>Ley Colombiana (Art. 46 CST)</AlertTitle>
                <AlertDescription className="text-sm space-y-1">
                  {preavisoPassed ? (
                    <p className="text-warning">
                      ⚠️ Ya pasó el plazo de {COLOMBIAN_LABOR_LAW.PREAVISO_DAYS} días de preaviso. 
                      El contrato se prorroga automáticamente.
                    </p>
                  ) : legalStatus.preavisoDeadline && (
                    <p>
                      Plazo para preaviso de no renovación: <strong>{format(legalStatus.preavisoDeadline, 'PPP', { locale: es })}</strong>
                    </p>
                  )}
                  {legalStatus.requiresMinOneYear && (
                    <p className="text-primary font-medium">
                      Esta prórroga debe tener una duración mínima de 1 año (contrato originalmente inferior a un año).
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Extension Type Selection */}
            <FormField
              control={form.control}
              name="extensionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Prórroga *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de prórroga" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pactada">
                        <div className="flex flex-col">
                          <span className="font-medium">{extensionTypeLabels.pactada}</span>
                          <span className="text-xs text-muted-foreground">{extensionTypeDescriptions.pactada}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="automatica">
                        <div className="flex flex-col">
                          <span className="font-medium">{extensionTypeLabels.automatica}</span>
                          <span className="text-xs text-muted-foreground">{extensionTypeDescriptions.automatica}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription className="text-xs">
                      Generalmente el día siguiente a la vigencia actual
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nueva Fecha de Fin *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            disabled={watchedExtensionType === 'automatica'}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date <= currentEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {watchedExtensionType === 'automatica' && (
                      <FormDescription className="text-xs text-muted-foreground">
                        Fecha calculada automáticamente según el término anterior
                      </FormDescription>
                    )}
                    {legalStatus.requiresMinOneYear && watchedExtensionType === 'pactada' && (
                      <FormDescription className="text-xs">
                        Fecha mínima sugerida: {format(getSuggestedMinEndDate(), 'PPP', { locale: es })}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Validation Messages */}
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errores de validación legal</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.warnings.length > 0 && (
              <Alert className="bg-warning-light border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Advertencias</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validationResult.info.length > 0 && (
              <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">Información</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResult.info.map((info, idx) => (
                      <li key={idx}>{info}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas sobre esta prórroga..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-warning-light border border-warning/20 p-3 rounded-lg">
              <div className="flex gap-2">
                <FileText className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-warning-foreground">
                  Recuerde adjuntar el documento de prórroga firmado desde la ficha del contrato una vez creada.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground"
                disabled={!validationResult.isValid}
              >
                Registrar Prórroga
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
