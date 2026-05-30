import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { CalendarIcon, Download, FileSpreadsheet } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useOvertimeRecords, useCreateOvertimeExport } from '@/hooks/useOvertime';
import { OVERTIME_TYPE_LABELS } from '@/types/overtime';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const formSchema = z.object({
  start_date: z.date({ required_error: 'Seleccione fecha inicio' }),
  end_date: z.date({ required_error: 'Seleccione fecha fin' }),
  payroll_period: z.string().min(1, 'Ingrese el período'),
  notes: z.string().optional(),
});

interface OvertimeExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OvertimeExportDialog({ open, onOpenChange }: OvertimeExportDialogProps) {
  const createExport = useCreateOvertimeExport();
  const [previewRecords, setPreviewRecords] = useState<number>(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payroll_period: format(new Date(), 'yyyy-MM'),
      notes: '',
    },
  });

  const watchStartDate = form.watch('start_date');
  const watchEndDate = form.watch('end_date');

  // Get records for preview count
  const { data: records = [] } = useOvertimeRecords({
    status: 'aprobado',
    isExported: false,
    startDate: watchStartDate ? format(watchStartDate, 'yyyy-MM-dd') : undefined,
    endDate: watchEndDate ? format(watchEndDate, 'yyyy-MM-dd') : undefined,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const result = await createExport.mutateAsync({
        startDate: format(values.start_date, 'yyyy-MM-dd'),
        endDate: format(values.end_date, 'yyyy-MM-dd'),
        payrollPeriod: values.payroll_period,
        notes: values.notes,
      });

      // Generate Excel file
      const exportData = result.records.map((r: any) => ({
        'Documento': r.employees_v2?.document_number || '',
        'Empleado': r.employees_v2 ? `${r.employees_v2.first_name} ${r.employees_v2.last_name}` : '',
        'Fecha': formatDateOnly(r.work_date, 'dd/MM/yyyy'),
        'Hora Inicio': r.start_time.slice(0, 5),
        'Hora Fin': r.end_time.slice(0, 5),
        'Horas': r.total_hours,
        'Tipo': OVERTIME_TYPE_LABELS[r.overtime_type as keyof typeof OVERTIME_TYPE_LABELS],
        'Recargo %': r.surcharge_percentage,
        'Valor Hora': r.hourly_rate || '',
        'Valor Total': r.total_value || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Horas Extra');
      XLSX.writeFile(wb, `horas_extra_${values.payroll_period}.xlsx`);

      toast.success(`${result.records.length} registros exportados exitosamente`);
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar');
    }
  }

  const approvedCount = records.length;
  const totalHours = records.reduce((sum, r) => sum + Number(r.total_hours), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar para Nómina
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Inicio</FormLabel>
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
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Seleccione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Fin</FormLabel>
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
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>Seleccione</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => watchStartDate && date < watchStartDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payroll Period */}
            <FormField
              control={form.control}
              name="payroll_period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Período de Nómina</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: 2026-01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview */}
            {watchStartDate && watchEndDate && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-center">
                    <span>Registros a exportar:</span>
                    <span className="font-bold">{approvedCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Total horas:</span>
                    <span className="font-semibold">{totalHours.toFixed(2)}h</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notas adicionales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createExport.isPending || approvedCount === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {createExport.isPending ? 'Exportando...' : 'Exportar Excel'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
