import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Stethoscope } from 'lucide-react';
import { useAbsenceConflicts } from '@/hooks/useAbsenceConflicts';
import { AbsenceConflictAlert } from '@/components/shared/AbsenceConflictAlert';
import { toast } from 'sonner';
import { Cie10SearchInput } from './Cie10SearchInput';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { useEmployees } from '@/hooks/useEmployees';
import { useCreateIncapacity, useUpdateIncapacity, useIncapacity, useEmployeeIncapacities } from '@/hooks/useIncapacities';
import { incapacityFormSchema, type IncapacityFormData, incapacityOriginLabels } from '@/types/incapacity';

interface IncapacityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacityId?: string | null;
  employeeId?: string; // Pre-select employee
  parentIncapacityId?: string; // For creating extensions
  onSuccess?: () => void;
}

export function IncapacityFormDialog({
  open,
  onOpenChange,
  incapacityId,
  employeeId,
  parentIncapacityId,
  onSuccess,
}: IncapacityFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: incapacity, isLoading: loadingIncapacity } = useIncapacity(incapacityId || undefined);
  const createMutation = useCreateIncapacity();
  const updateMutation = useUpdateIncapacity();
  
  const isEditing = !!incapacityId;
  const isExtension = !!parentIncapacityId;
  
  const form = useForm<IncapacityFormData>({
    resolver: zodResolver(incapacityFormSchema),
    defaultValues: {
      employee_id: employeeId || '',
      origin: 'comun',
      start_date: new Date(),
      end_date: new Date(),
      diagnosis: '',
      cie10_code: '',
      treating_doctor: '',
      certificate_number: '',
      medical_entity: '',
      daily_base_salary: 0,
      is_extension: isExtension,
      parent_incapacity_id: parentIncapacityId || undefined,
      observations: '',
    },
  });
  
  const watchEmployeeId = form.watch('employee_id');
  const watchStartDate = form.watch('start_date');
  const watchEndDate = form.watch('end_date');
  const { data: employeeIncapacities } = useEmployeeIncapacities(watchEmployeeId || undefined);

  // Unified absence conflict detection
  const { data: incapConflicts = [] } = useAbsenceConflicts(
    watchEmployeeId || undefined,
    watchStartDate,
    watchEndDate,
    incapacityId ? { type: 'incapacity', id: incapacityId } : undefined,
  );
  const hasIncapConflicts = incapConflicts.length > 0;
  
  // Load existing incapacity data for editing
  useEffect(() => {
    if (incapacity && isEditing) {
      form.reset({
        employee_id: incapacity.employee_id,
        origin: incapacity.origin,
        start_date: new Date(incapacity.start_date),
        end_date: new Date(incapacity.end_date),
        diagnosis: incapacity.diagnosis,
        cie10_code: incapacity.cie10_code || '',
        treating_doctor: incapacity.treating_doctor || '',
        certificate_number: incapacity.certificate_number || '',
        medical_entity: incapacity.medical_entity || '',
        daily_base_salary: incapacity.daily_base_salary || 0,
        is_extension: incapacity.is_extension,
        parent_incapacity_id: incapacity.parent_incapacity_id || undefined,
        observations: incapacity.observations || '',
      });
    }
  }, [incapacity, isEditing, form]);
  
  // Set extension defaults
  useEffect(() => {
    if (isExtension && parentIncapacityId) {
      form.setValue('is_extension', true);
      form.setValue('parent_incapacity_id', parentIncapacityId);
    }
  }, [isExtension, parentIncapacityId, form]);
  
  const onSubmit = async (data: IncapacityFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: incapacityId!, data });
        toast.success('Incapacidad actualizada exitosamente');
      } else {
        await createMutation.mutateAsync(data);
        toast.success(isExtension ? 'Prórroga registrada exitosamente' : 'Incapacidad registrada exitosamente');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving incapacity:', error);
      toast.error('Error al guardar la incapacidad');
    }
  };
  
  const isLoading = createMutation.isPending || updateMutation.isPending;
  
  // Get available parent incapacities for extension selection
  const availableParents = employeeIncapacities?.filter(inc => !inc.is_extension) || [];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  {isEditing ? 'EDICIÓN' : isExtension ? 'PRÓRROGA' : 'NUEVO'}
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {isEditing ? 'Editar Incapacidad' : isExtension ? 'Registrar Prórroga' : 'Nueva Incapacidad'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-background rounded-2xl mb-6">
                  <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="clinical" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    Clínico
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    Pago
                  </TabsTrigger>
                </TabsList>
                
                {/* General Tab */}
                <TabsContent value="general" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-6">
                    <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={isEditing || !!employeeId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {loadingEmployees ? (
                            <SelectItem value="__loading__" disabled>Cargando...</SelectItem>
                          ) : (
                            employees?.filter(e => e.is_active).map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name} - {emp.document_number}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origen *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(incapacityOriginLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        El origen determina quién asume el pago (EPS vs ARL)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Inicio *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP", { locale: es }) : "Seleccionar"}
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
                        <FormLabel>Fecha Fin *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP", { locale: es }) : "Seleccionar"}
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
                </div>
                
                {/* Extension fields */}
                {!isEditing && (
                  <FormField
                    control={form.control}
                    name="is_extension"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                            disabled={isExtension}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Es prórroga de incapacidad existente</FormLabel>
                          <FormDescription>
                            Marque si esta incapacidad es continuación de otra
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
                
                {form.watch('is_extension') && !isExtension && availableParents.length > 0 && (
                  <FormField
                    control={form.control}
                    name="parent_incapacity_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Incapacidad Original</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione la incapacidad original" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableParents.map((inc) => (
                              <SelectItem key={inc.id} value={inc.id}>
                                {format(new Date(inc.start_date), 'dd/MM/yyyy')} - {inc.diagnosis.substring(0, 30)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                  </div>
                </TabsContent>
                
                {/* Clinical Tab */}
                <TabsContent value="clinical" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-6">
                    <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Se completa automáticamente con el código CIE-10"
                          className="resize-none bg-background "
                          readOnly
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cie10_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código CIE-10</FormLabel>
                        <FormControl>
                          <Cie10SearchInput
                            value={field.value}
                            onChange={field.onChange}
                            onDiagnosisFound={(diagnosis: string) => {
                              form.setValue('diagnosis', diagnosis);
                            }}
                          />
                        </FormControl>
                        <FormDescription>Busque por código o descripción</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="certificate_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. Certificado</FormLabel>
                        <FormControl>
                          <Input placeholder="Número del certificado" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="treating_doctor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Médico Tratante</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del médico" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="medical_entity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entidad Médica</FormLabel>
                        <FormControl>
                          <Input placeholder="IPS, clínica, hospital" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observaciones</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notas adicionales"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>
                </TabsContent>
                
                {/* Payment Tab */}
                <TabsContent value="payment" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-6">
                    <FormField
                  control={form.control}
                  name="daily_base_salary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salario Base Diario (IBC)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Ingreso Base de Cotización diario para calcular el valor de la incapacidad
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="rounded-lg border bg-background p-4 space-y-2">
                  <h4 className="font-medium">Distribución de Pago (Ley Colombiana)</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>Origen Común:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Días 1-2: Empleador (100%)</li>
                      <li>Días 3-180: EPS (66.67%)</li>
                      <li>Días 181-540: AFP (50%)</li>
                    </ul>
                    <p className="mt-2"><strong>Origen Laboral:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      <li>Desde día 1: ARL (100%)</li>
                    </ul>
                  </div>
                </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Absence Conflict Alert */}
              <AbsenceConflictAlert conflicts={incapConflicts} />
              
              <div className="grid grid-cols-2 gap-3 pt-6 border-t sm:flex sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || hasIncapConflicts} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Actualizar' : 'Registrar'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
