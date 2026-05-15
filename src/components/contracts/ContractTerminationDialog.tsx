import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertTriangle,
  CheckCircle,
  FileWarning,
  Loader2,
  Stethoscope,
  CalendarIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useTerminateContract } from '@/hooks/useContractTermination';

const terminationSchema = z.object({
  terminationDate: z.date({
    required_error: 'La fecha de terminación es requerida',
  }),
  terminationReason: z.string().min(10, 'Ingrese el motivo de terminación (mínimo 10 caracteres)'),
  autoCreateExitExam: z.boolean().default(true),
  confirmTermination: z.boolean().refine((val) => val === true, {
    message: 'Debe confirmar la terminación del contrato',
  }),
});

type TerminationFormData = z.infer<typeof terminationSchema>;

interface ContractTerminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  employeeId: string;
  employeeName: string;
}

interface ExitExamInfo {
  hasExam: boolean;
  exam?: {
    id: string;
    result: string;
    exam_date: string;
  };
  loading: boolean;
}

export function ContractTerminationDialog({
  open,
  onOpenChange,
  contractId,
  employeeId,
  employeeName,
}: ContractTerminationDialogProps) {
  const [exitExamInfo, setExitExamInfo] = useState<ExitExamInfo>({
    hasExam: false,
    loading: true,
  });

  const terminateContract = useTerminateContract();

  const form = useForm<TerminationFormData>({
    resolver: zodResolver(terminationSchema),
    defaultValues: {
      terminationDate: new Date(),
      terminationReason: '',
      autoCreateExitExam: true,
      confirmTermination: false,
    },
  });

  // Check for existing exit exam
  useEffect(() => {
    if (open && employeeId) {
      checkExitExam();
    }
  }, [open, employeeId]);

  const checkExitExam = async () => {
    setExitExamInfo({ hasExam: false, loading: true });
    
    try {
      const { data: exitExams, error } = await supabase
        .from('medical_exams')
        .select('id, result, exam_date')
        .eq('employee_id', employeeId)
        .eq('exam_type', 'egreso')
        .order('exam_date', { ascending: false })
        .limit(1);

      if (error) throw error;

      const hasExam = exitExams && exitExams.length > 0;
      setExitExamInfo({
        hasExam,
        exam: hasExam ? exitExams[0] : undefined,
        loading: false,
      });

      // If exam exists, disable auto-create
      if (hasExam) {
        form.setValue('autoCreateExitExam', false);
      }
    } catch (error) {
      console.error('Error checking exit exam:', error);
      setExitExamInfo({ hasExam: false, loading: false });
    }
  };

  const onSubmit = async (data: TerminationFormData) => {
    try {
      const result = await terminateContract.mutateAsync({
        contractId,
        employeeId,
        terminationDate: data.terminationDate,
        terminationReason: data.terminationReason,
        autoCreateExitExam: data.autoCreateExitExam && !exitExamInfo.hasExam,
      });

      toast.success('Contrato terminado', {
        description: result.exitExamAutoCreated
          ? 'El contrato ha sido terminado y se creó un examen de egreso pendiente.'
          : 'El contrato ha sido terminado exitosamente.',
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error terminating contract:', error);
      toast.error('Error', {
        description: 'No se pudo terminar el contrato. Intente nuevamente.',
      });
    }
  };

  const getExamResultLabel = (result: string) => {
    const labels: Record<string, string> = {
      apto: 'Apto',
      apto_restricciones: 'Apto con Restricciones',
      no_apto: 'No Apto',
      pendiente: 'Pendiente',
    };
    return labels[result] || result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Terminar Contrato
          </DialogTitle>
          <DialogDescription>
            Esta acción terminará el contrato de <strong>{employeeName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Exit Exam Status */}
        <div className="space-y-4">
          {exitExamInfo.loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Verificando examen de egreso...</span>
            </div>
          ) : exitExamInfo.hasExam ? (
            <Alert className="bg-success-light border-success/20">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">Examen de egreso registrado</AlertTitle>
              <AlertDescription className="text-success/80">
                El empleado tiene un examen de egreso del{' '}
                <strong>
                  {format(new Date(exitExamInfo.exam!.exam_date), 'dd MMM yyyy', { locale: es })}
                </strong>{' '}
                con resultado: <strong>{getExamResultLabel(exitExamInfo.exam!.result)}</strong>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-warning-light border-warning/20">
              <FileWarning className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning-foreground">Sin examen de egreso</AlertTitle>
              <AlertDescription className="text-warning-foreground/80">
                No se encontró un examen de egreso para este empleado. 
                Según la normativa colombiana, es obligatorio realizar el examen médico de egreso.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="terminationDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Terminación</FormLabel>
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
                              format(field.value, 'dd MMMM yyyy', { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date('2020-01-01')
                          }
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terminationReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Terminación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el motivo de la terminación del contrato..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!exitExamInfo.hasExam && !exitExamInfo.loading && (
                <FormField
                  control={form.control}
                  name="autoCreateExitExam"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-4 bg-background">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-primary" />
                          Generar examen de egreso automáticamente
                        </FormLabel>
                        <FormDescription>
                          Se creará un examen de egreso con estado "Pendiente" que deberá ser completado.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="confirmTermination"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-destructive/30 p-4 bg-destructive-light">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-destructive">
                        Confirmo que deseo terminar este contrato
                      </FormLabel>
                      <FormDescription className="text-destructive/70">
                        Esta acción no se puede deshacer.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={terminateContract.isPending}
                >
                  {terminateContract.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Terminar Contrato
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
