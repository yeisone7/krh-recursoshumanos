import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCycleGeneration } from '@/hooks/useCycleGeneration';
import { useShiftCycles, useEmployeeTimeConfigs } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';

const bulkSchema = z.object({
  employee_ids: z.array(z.string()).min(1, 'Seleccione al menos un empleado'),
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  end_date: z.date({ required_error: 'Fecha de fin requerida' }),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['end_date'],
});

type BulkFormData = z.infer<typeof bulkSchema>;

interface BulkCycleGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCycleGeneratorDialog({ open, onOpenChange }: BulkCycleGeneratorDialogProps) {
  const [search, setSearch] = useState('');

  const { currentCompanyId } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: shiftCycles = [] } = useShiftCycles();
  const { data: timeConfigs = [] } = useEmployeeTimeConfigs();

  const form = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      employee_ids: [],
      start_date: new Date(),
      end_date: addDays(new Date(), 14),
    },
  });

  const selectedEmployeeIds = form.watch('employee_ids');
  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');

  // Get all employees with active shift mode
  const shiftEmployeesWithConfig = useMemo(() => {
    return timeConfigs
      .filter(tc => tc.mode === 'shift' && tc.shift_cycle_id && (tc.is_active || tc.end_date) && (!endDate || tc.start_date <= format(endDate, 'yyyy-MM-dd')) && (!startDate || !tc.end_date || tc.end_date >= format(startDate, 'yyyy-MM-dd')))
      .map(tc => {
        const emp = employees.find(e => e.id === tc.employee_id);
        const cycle = shiftCycles.find(c => c.id === tc.shift_cycle_id);
        return emp?.is_active && cycle?.is_active ? { employee: emp, config: tc, cycle } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
  }, [timeConfigs, employees, shiftCycles, startDate, endDate]);

  const configuredEmployees = [...new Map(shiftEmployeesWithConfig.map(row => [row.employee.id, row])).values()];
  const visibleEmployees = configuredEmployees.filter(({ employee }) => getEmployeeFullName(employee).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const generation = useCycleGeneration({
    companyId: currentCompanyId || '', employeeIds: selectedEmployeeIds,
    start: startDate ? format(startDate, 'yyyy-MM-dd') : '', end: endDate ? format(endDate, 'yyyy-MM-dd') : '',
  }, open);
  const previewMode = !!generation.preview;
  const generatedAssignments = generation.preview?.assignments || [];
  const skippedCount = generation.preview?.absent || 0;
  const totalDays = startDate && endDate ? Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1) : 0;
  const generatePreview = () => generation.prepare();
  const handleGenerate = async () => {
    if (await generation.confirm()) { onOpenChange(false); form.reset(); setSearch(''); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) { generation.reset(); form.reset(); setSearch(''); }
    }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-start sm:items-center gap-2 text-base sm:text-lg">
            <Users className="w-5 h-5 text-primary" />
            Generar ciclos a empleados seleccionados
          </DialogTitle>
          <DialogDescription>
            Genera automáticamente asignaciones usando el ciclo configurado de cada empleado.
          </DialogDescription>
        </DialogHeader>

        {!previewMode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(generatePreview)} className="space-y-4 overflow-y-auto min-h-0 px-1 pb-1 sm:px-2">
              {/* Summary */}
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Se encontraron <strong>{configuredEmployees.length}</strong> empleado(s) con modalidad de turnos y ciclo asignado.
                  {configuredEmployees.length === 0 && (
                    <span className="block text-muted-foreground mt-1">
                      No hay empleados con ciclo de rotación configurado.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <Input aria-label="Buscar empleados para generar ciclos" placeholder="Buscar empleados..." value={search} onChange={event => setSearch(event.target.value)} />
              <p className="text-sm">{selectedEmployeeIds.length} empleados seleccionados</p>
              {form.formState.errors.employee_ids && <p role="alert" className="text-sm text-destructive">{form.formState.errors.employee_ids.message}</p>}
              {/* Employee list preview */}
              {configuredEmployees.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {visibleEmployees.map(({ employee, cycle }) => (
                    <label key={employee.id} className="flex items-start sm:items-center justify-between gap-2 text-sm py-1 px-2 hover:bg-background rounded">
                      <Checkbox aria-label={getEmployeeFullName(employee)} checked={selectedEmployeeIds.includes(employee.id)}
                        onCheckedChange={checked => form.setValue('employee_ids', checked ? [...selectedEmployeeIds, employee.id] : selectedEmployeeIds.filter(id => id !== employee.id), { shouldValidate: true })} />
                      <span className="min-w-0 truncate">{getEmployeeFullName(employee)}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{cycle.name}</Badge>
                    </label>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Inicio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
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
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < (startDate || new Date())} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {totalDays > 0 && configuredEmployees.length > 0 && (
                <Alert>
                  <AlertDescription>
                    Se generarán aproximadamente <strong>{totalDays * selectedEmployeeIds.length}</strong> asignaciones
                    ({selectedEmployeeIds.length} empleados × {totalDays} días)
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={generation.busy || selectedEmployeeIds.length === 0}>Vista Previa</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 overflow-y-auto min-h-0 px-1 pb-1 sm:px-2">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Se generarán <strong>{generatedAssignments.length}</strong> asignaciones de turno.
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-background rounded-lg text-sm space-y-1">
              <p><strong>Empleados seleccionados:</strong> {selectedEmployeeIds.length}</p>
              <p><strong>Periodo:</strong> {startDate && format(startDate, 'dd/MM/yyyy')} - {endDate && format(endDate, 'dd/MM/yyyy')}</p>
              <p><strong>Jornadas existentes conservadas:</strong> {generation.preview?.preserved || 0}</p>
              <p><strong>Fuera de configuración vigente:</strong> {generation.preview?.outsideConfig || 0}</p>
              {skippedCount > 0 && <p><strong>Omitidas por novedades:</strong> {skippedCount}</p>}
            </div>

            {skippedCount > 0 && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Se detectaron novedades activas. Los turnos laborales en esas fechas serán omitidos automáticamente.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => generation.reset()}>Volver</Button>
              <Button className="w-full sm:w-auto" onClick={handleGenerate} disabled={generation.busy || generatedAssignments.length === 0}>
                {generation.busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Generación
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
