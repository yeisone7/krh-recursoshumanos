import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileText, Building, DollarSign, Briefcase } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  contractFormSchema,
  ContractFormData,
} from '@/types/contract';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useCreateContract } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import type { Database } from '@/integrations/supabase/types';
import { CitySelect } from '@/components/ui/city-department-select';

type ContractType = Database['public']['Enums']['contract_type'];


interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ContractFormDialog({ open, onOpenChange, onSuccess }: ContractFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { data: employees = [] } = useEmployees();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: contractTypes = [] } = useContractTypes();
  const createContract = useCreateContract();

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      salaryType: 'monthly',
      transportAllowance: true,
      hasNonCompeteClause: false,
      hasConfidentialityClause: true,
      trialPeriodDays: 0,
    },
  });

  const selectedContractType = form.watch('contractType');
  const contractTypeConfig = contractTypes.find(ct => ct.contract_type === selectedContractType);
  const needsEndDate = contractTypeConfig?.requires_end_date ?? false;

  const handleSubmit = async (data: ContractFormData) => {
    try {
      // Parse salary to number
      const salaryNumber = parseFloat(data.salary.replace(/[^0-9.-]+/g, ''));
      
      // Use the contract_type code directly from catalog
      const dbContractType = (data.contractType || 'indefinido') as ContractType;

      await createContract.mutateAsync({
        employee_id: data.employeeId,
        contract_type: dbContractType,
        start_date: format(data.startDate, 'yyyy-MM-dd'),
        end_date: data.endDate ? format(data.endDate, 'yyyy-MM-dd') : null,
        salary: salaryNumber,
        salary_type: data.salaryType === 'monthly' ? 'mensual' : 'integral',
        transport_allowance: data.transportAllowance ? 140606 : 0, // 2024 Colombian value
        trial_period_days: data.trialPeriodDays,
        work_city: data.workCity,
        work_address: data.workAddress,
        has_non_compete_clause: data.hasNonCompeteClause,
        has_confidentiality_clause: data.hasConfidentialityClause,
        special_clauses: data.specialClauses,
      });

      const employee = employees.find(e => e.id === data.employeeId);
      const employeeName = employee ? getEmployeeFullName(employee) : 'el empleado';
      
      toast.success('Contrato creado', {
        description: `El contrato de ${employeeName} ha sido registrado exitosamente.`,
      });
      
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast.error('Error al crear contrato', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const tabItems = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'salary', label: 'Salario', icon: DollarSign },
    { value: 'workplace', label: 'Lugar de Trabajo', icon: Building },
    { value: 'clauses', label: 'Cláusulas', icon: Briefcase },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nuevo Contrato
          </DialogTitle>
          <DialogDescription>
            Complete la información del contrato laboral.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-2">
                <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(90vh-260px)] px-6 py-4">
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Empleado y Tipo de Contrato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empleado *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar empleado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background max-h-[200px]">
                                {employees.filter(e => e.is_active).map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {getEmployeeFullName(emp)} - {emp.document_number}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contractType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Contrato *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {contractTypes.filter(ct => ct.is_active).map((ct) => (
                                  <SelectItem key={ct.id} value={ct.contract_type}>
                                    {ct.display_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Fechas del Contrato</h3>
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
                                      <span>Seleccionar fecha</span>
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {needsEndDate && (
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Fecha de Fin *</FormLabel>
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
                                        <span>Seleccionar fecha</span>
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
                                Esta fecha puede extenderse con prórrogas
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    {!needsEndDate && selectedContractType && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        Este tipo de contrato no requiere fecha de finalización.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Período de Prueba</h3>
                    <FormField
                      control={form.control}
                      name="trialPeriodDays"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel>Días de Período de Prueba</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Máximo 60 días según legislación colombiana
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Información Salarial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salario Mensual *</FormLabel>
                            <FormControl>
                              <Input placeholder="$3.500.000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salaryType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Salario *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="monthly">Salario Ordinario</SelectItem>
                                <SelectItem value="integral">Salario Integral</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Auxilio de Transporte</FormLabel>
                            <FormDescription className="text-xs">
                              Aplica para salarios hasta 2 SMLV
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Workplace Tab */}
                <TabsContent value="workplace" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Lugar de Trabajo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="operationCenter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Operación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar centro" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {operationCenters.map((center) => (
                                  <SelectItem key={center.id} value={center.id}>
                                    {center.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad de Trabajo</FormLabel>
                            <FormControl>
                              <CitySelect 
                                value={field.value} 
                                onValueChange={(city) => field.onChange(city)}
                                placeholder="Buscar ciudad..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workAddress"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Dirección de Trabajo</FormLabel>
                            <FormControl>
                              <Input placeholder="Calle 100 # 15-20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Clauses Tab */}
                <TabsContent value="clauses" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Cláusulas Especiales</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="hasConfidentialityClause"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cláusula de Confidencialidad</FormLabel>
                              <FormDescription className="text-xs">
                                El empleado se compromete a mantener la confidencialidad de la información de la empresa.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hasNonCompeteClause"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cláusula de No Competencia</FormLabel>
                              <FormDescription className="text-xs">
                                El empleado se compromete a no trabajar con la competencia durante un período determinado.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Cláusulas Adicionales</h3>
                    <FormField
                      control={form.control}
                      name="specialClauses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cláusulas Especiales</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Escriba cualquier cláusula adicional que aplique al contrato..."
                              className="min-h-[120px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Estas cláusulas se agregarán al contrato laboral.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </ScrollArea>

              {/* Footer with submit button */}
              <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createContract.isPending}>
                  {createContract.isPending ? 'Guardando...' : 'Crear Contrato'}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
