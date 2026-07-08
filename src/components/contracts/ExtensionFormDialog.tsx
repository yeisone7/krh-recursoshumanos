import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMonths, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileText, Plus, AlertTriangle, Info, Scale, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  extensionToEdit?: ContractExtension | null;
  maxEndDate?: Date | null;
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
  extensionToEdit,
  maxEndDate,
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
  const isWorkLaborContract = contractType === 'obra_labor';
  const extensionLabel = isWorkLaborContract ? 'Adición' : 'Prórroga';
  const extensionLabelLower = isWorkLaborContract ? 'adición' : 'prórroga';

  const isEditMode = !!extensionToEdit;
  const extensionStartDate = useMemo(
    () => extensionToEdit?.startDate || addDays(currentEndDate, 1),
    [extensionToEdit?.id, currentEndDate]
  );

  const form = useForm<ExtensionFormData>({
    resolver: zodResolver(extensionFormSchema),
    defaultValues: {
      startDate: extensionStartDate,
      endDate: extensionToEdit?.endDate,
      extensionType: extensionToEdit?.extensionType || (preavisoPassed ? 'automatica' : 'pactada'),
      notes: extensionToEdit?.notes || '',
    },
  });

  const watchedEndDate = form.watch('endDate');
  const watchedExtensionType = form.watch('extensionType');

  useEffect(() => {
    if (!open) return;

    form.reset({
      startDate: extensionStartDate,
      endDate: extensionToEdit?.endDate,
      extensionType: extensionToEdit?.extensionType || (preavisoPassed ? 'automatica' : 'pactada'),
      notes: extensionToEdit?.notes || '',
    });
  }, [open, extensionToEdit?.id, extensionStartDate, preavisoPassed]);

  // When extension type changes to automatic, auto-calculate end date
  useEffect(() => {
    if (!isEditMode && watchedExtensionType === 'automatica') {
      const autoEndDate = calculateAutomaticExtensionEndDate(contractData, currentEndDate);
      form.setValue('endDate', autoEndDate);
    }
  }, [watchedExtensionType, isEditMode]);

  // Validate extension whenever end date changes
  useEffect(() => {
    if (watchedEndDate) {
      const result = validateExtension(
        contractData,
        watchedEndDate,
        extensionNumber,
        currentEndDate
      );
      const maxDateErrors = maxEndDate && watchedEndDate >= maxEndDate
        ? [`La fecha fin debe ser anterior al inicio de la siguiente ${extensionLabelLower} (${format(maxEndDate, 'PPP', { locale: es })}).`]
        : [];

      setValidationResult({
        ...result,
        isValid: result.isValid && maxDateErrors.length === 0,
        errors: [...result.errors, ...maxDateErrors],
      });
    }
  }, [watchedEndDate, extensionNumber, maxEndDate]);

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
        description: `La ${extensionLabelLower} no cumple con los requisitos legales. Revise los errores.`,
        variant: 'destructive',
      });
      return;
    }

    if (onSubmit) {
      onSubmit({ ...data, contractId, extensionNumber });
    } else {
      console.log('Extension data:', data);
      toast({
        title: `${extensionLabel} registrada`,
        description: `La ${extensionLabelLower} #${extensionNumber} de ${employeeName} ha sido registrada. Nueva vigencia hasta ${format(data.endDate, 'PPP', { locale: es })}.`,
      });
      onOpenChange(false);
    }
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-xl sm:h-auto sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-xl sm:border [&>button]:right-3 [&>button]:top-3 sm:[&>button]:right-4 sm:[&>button]:top-4">
        <DialogHeader className="shrink-0 border-b bg-muted/30 px-5 py-4 pr-12 sm:px-6 sm:py-5">
          <DialogTitle className="font-display text-lg sm:text-xl flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {isEditMode ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </span>
            {isEditMode ? `Editar ${extensionLabel}` : `Nueva ${extensionLabel}`}
          </DialogTitle>
          <DialogDescription className="pl-[52px] text-sm">
            {extensionLabel} #{extensionNumber} para el contrato de <strong>{employeeName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            {/* Current contract info */}
            <div className="rounded-xl border bg-muted/35 p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Vigencia actual:</span>
                <span className="text-right font-medium">{format(currentEndDate, 'PPP', { locale: es })}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Número de {extensionLabelLower}:</span>
                <span className="font-medium text-primary">#{extensionNumber}</span>
              </div>
              {contractType === 'fijo' && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Duración total acumulada:</span>
                  <span className="font-medium">{legalStatus.totalDurationYears.toFixed(1)} años</span>
                </div>
              )}
            </div>

            {/* Colombian Labor Law Info */}
            {contractType === 'fijo' && (
              <Alert variant="default" className="border-primary/20 bg-primary/5">
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
                  <FormLabel>Tipo de {extensionLabel} *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-auto min-h-12 py-2">
                        <SelectValue placeholder={`Seleccione el tipo de ${extensionLabelLower}`} />
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
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal cursor-not-allowed opacity-70'
                        )}
                        disabled
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: es })
                        ) : (
                          <span>Seleccionar</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                    <FormDescription className="text-xs">
                      {isEditMode
                        ? 'La fecha de inicio se conserva para no romper la continuidad del historial'
                        : 'Día siguiente a la vigencia actual (calculado automáticamente)'}
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
                            disabled={!isEditMode && watchedExtensionType === 'automatica'}
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
                          disabled={(date) => date <= currentEndDate || (maxEndDate ? date >= maxEndDate : false)}
                          defaultMonth={currentEndDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    {!isEditMode && watchedExtensionType === 'automatica' && (
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
              <Alert className="border-primary/20">
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
                      placeholder={`Notas sobre esta ${extensionLabelLower}...`}
                      className="min-h-[76px]"
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
                  Recuerde adjuntar el documento de {extensionLabelLower} firmado desde la ficha del contrato una vez creada.
                </p>
              </div>
            </div>

            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="gradient-primary text-primary-foreground w-full sm:w-auto"
                disabled={!validationResult.isValid}
              >
                {isEditMode ? 'Guardar Cambios' : `Registrar ${extensionLabel}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
