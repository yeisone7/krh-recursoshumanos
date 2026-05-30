import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, addMonths, differenceInMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { CalendarIcon, FileText, Building, DollarSign, Briefcase, AlertTriangle, History, Loader2, Globe, Target, ShieldCheck, Award, Clock, UserCheck, MapPin } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

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
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
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
import { useCreateContract, useUpdateContract, useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { CitySelect } from '@/components/ui/city-department-select';

// Contract type is now dynamic (text in DB) - no longer using enum
type DbContract = Database['public']['Tables']['contracts']['Row'];

export interface ContractPrefilledData {
  employeeId: string;
  employeeName: string;
  operationCenterId?: string;
  positionName?: string;
  areaId?: string;
  workCity?: string;
}

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  contractToEdit?: DbContract;
  preselectedEmployeeId?: string;
  preselectedEmployeeName?: string;
  prefilledData?: ContractPrefilledData;
}

export function ContractFormDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  contractToEdit,
  preselectedEmployeeId,
  preselectedEmployeeName,
  prefilledData,
}: ContractFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { data: employees = [] } = useEmployees();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: contractTypes = [] } = useContractTypes();
  const { data: allContracts = [] } = useContracts();
  const createContract = useCreateContract();
  const { currentCompanyId, canView, canUpdate } = useAuth();
  const updateContract = useUpdateContract();

  const canViewSalaries = canView('salarios');
  const canManageSalaries = canUpdate('salarios');

  const isEditMode = !!contractToEdit;

  // Map of employee IDs that have active contracts
  const employeesWithActiveContract = useMemo(() => {
    const map = new Map<string, { contract_number: string | null; contract_type: string }>();
    for (const c of allContracts) {
      if (!c.is_terminated) {
        map.set(c.employee_id, { contract_number: c.contract_number, contract_type: c.contract_type });
      }
    }
    // If editing, don't block the current contract's employee
    if (contractToEdit) {
      map.delete(contractToEdit.employee_id);
    }
    return map;
  }, [allContracts, contractToEdit]);

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

  const selectedEmployeeId = form.watch('employeeId');

  // Contract history for the selected employee
  const selectedEmployeeContracts = useMemo(() => {
    if (!selectedEmployeeId) return [];
    return allContracts
      .filter((c: any) => c.employee_id === selectedEmployeeId)
      .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
  }, [selectedEmployeeId, allContracts]);

  // Set form values when editing or when dialog opens with contract to edit
  useEffect(() => {
    if (open && contractToEdit) {
      form.reset({
        employeeId: contractToEdit.employee_id,
        contractType: contractToEdit.contract_type,
        startDate: new Date(contractToEdit.start_date + 'T00:00:00'),
        endDate: contractToEdit.end_date ? new Date(contractToEdit.end_date + 'T00:00:00') : undefined,
        durationMonths: contractToEdit.end_date
          ? Math.max(
              1,
              differenceInMonths(
                addDays(new Date(contractToEdit.end_date + 'T00:00:00'), 1),
                new Date(contractToEdit.start_date + 'T00:00:00')
              )
            )
          : undefined,
        salary: contractToEdit.salary.toString(),
        salaryType: contractToEdit.salary_type === 'integral' ? 'integral' : 'monthly',
        transportAllowance: (contractToEdit.transport_allowance || 0) > 0,
        trialPeriodDays: contractToEdit.trial_period_days || 0,
        workCity: contractToEdit.work_city || undefined,
        workAddress: contractToEdit.work_address || undefined,
        hasNonCompeteClause: contractToEdit.has_non_compete_clause || false,
        hasConfidentialityClause: contractToEdit.has_confidentiality_clause || false,
        specialClauses: contractToEdit.special_clauses || undefined,
        workLaborDescription: contractToEdit.work_labor_description || undefined,
      });
    } else if (open && prefilledData) {
      form.setValue('employeeId', prefilledData.employeeId);
      if (prefilledData.operationCenterId) form.setValue('operationCenter', prefilledData.operationCenterId);
      if (prefilledData.positionName) form.setValue('position', prefilledData.positionName);
      if (prefilledData.areaId) form.setValue('area', prefilledData.areaId);
      if (prefilledData.workCity) form.setValue('workCity', prefilledData.workCity);
    } else if (open && preselectedEmployeeId) {
      form.setValue('employeeId', preselectedEmployeeId);
    } else if (!open) {
      // Reset form when dialog closes
      form.reset({
        salaryType: 'monthly',
        transportAllowance: true,
        hasNonCompeteClause: false,
        hasConfidentialityClause: true,
        trialPeriodDays: 0,
      });
    }
  }, [open, contractToEdit, preselectedEmployeeId, prefilledData, form]);

  const selectedContractType = form.watch('contractType');
  const selectedStartDate = form.watch('startDate');
  const selectedDurationMonths = form.watch('durationMonths');
  const contractTypeConfig = contractTypes.find(ct => ct.contract_type === selectedContractType);
  const needsEndDate = contractTypeConfig?.requires_end_date ?? false;

  useEffect(() => {
    if (!selectedContractType) return;

    if (!needsEndDate) {
      form.setValue('durationMonths', undefined);
      form.setValue('endDate', undefined);
      return;
    }

    if (selectedStartDate && selectedDurationMonths && selectedDurationMonths > 0) {
      form.setValue('endDate', addDays(addMonths(selectedStartDate, selectedDurationMonths), -1), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, needsEndDate, selectedDurationMonths, selectedStartDate]);

  const handleSubmit = async (data: ContractFormData) => {
    try {
      if (needsEndDate && (!data.durationMonths || !data.endDate)) {
        form.setError('durationMonths', {
          type: 'manual',
          message: 'Ingrese la duración para calcular la fecha de finalización',
        });
        toast.error('Duración requerida', {
          description: 'Ingrese el número de meses que dura el contrato.',
        });
        return;
      }

      // Parse salary to number
      const salaryNumber = parseFloat(data.salary.replace(/[^0-9.-]+/g, ''));
      
      // Use the contract_type code directly from catalog (now text, not enum)
      const dbContractType = data.contractType || 'indefinido';

      const contractData = {
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
        work_labor_description: data.workLaborDescription || null,
      };

      if (isEditMode && contractToEdit) {
        await updateContract.mutateAsync({
          id: contractToEdit.id,
          ...contractData,
        });
        toast.success('Contrato actualizado', {
          description: 'Los cambios han sido guardados exitosamente.',
        });
      } else {
        await createContract.mutateAsync(contractData);
        const employee = employees.find(e => e.id === data.employeeId);
        const employeeName = employee ? getEmployeeFullName(employee) : 'el empleado';
        toast.success('Contrato creado', {
          description: `El contrato de ${employeeName} ha sido registrado exitosamente.`,
        });
      }
      
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving contract:', error);
      toast.error(isEditMode ? 'Error al actualizar contrato' : 'Error al crear contrato', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const tabItems = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'workplace', label: 'Ubicacion', icon: MapPin },
    { value: 'contract', label: 'Contrato', icon: Briefcase },
  ];

  const isPending = createContract.isPending || updateContract.isPending;

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-xl sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-[920px] sm:rounded-xl sm:border [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 sm:[&>button]:right-4 sm:[&>button]:top-4">
        <DialogTitle className="sr-only">
          {isEditMode ? 'Editar Contrato' : 'Nuevo Contrato'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para la gestión de contratos laborales de empleados.
        </DialogDescription>

        <div className="border-b bg-muted/30 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-start gap-4 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-sm font-bold text-primary sm:h-12 sm:w-12 sm:text-base">
                {selectedEmployee ? getEmployeeFullName(selectedEmployee).substring(0, 2).toUpperCase() : 'CT'}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {isEditMode ? 'Edición' : 'Nueva Vinculación'}
                </Badge>
                {selectedContractType && (
                  <Badge variant="outline" className="border-success/20 bg-success/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                    {contractTypes.find(ct => ct.contract_type === selectedContractType)?.display_name || selectedContractType}
                  </Badge>
                )}
              </div>
              
              <h2 className="truncate text-xl font-bold leading-tight text-foreground sm:text-2xl">
                {selectedEmployee ? getEmployeeFullName(selectedEmployee) : (isEditMode ? 'Editar Contrato' : 'Nuevo Contrato')}
              </h2>
              
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
                {selectedEmployee && (
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    {selectedEmployee.document_number}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                  {format(new Date(), "MMMM yyyy", { locale: es })}
                </div>
                {form.watch('salary') && canViewSalaries && (
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-success" />
                    ${form.watch('salary')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
              <div className="border-b bg-muted/30 px-4 py-4 sm:px-7">
                <div className="overflow-x-auto">
                <TabsList className="grid h-12 w-full min-w-[420px] grid-cols-3 gap-1 rounded-xl border border-border/80 bg-background p-1 shadow-none sm:min-w-0">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-10 gap-2 rounded-lg px-3 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground shadow-none transition-colors hover:text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1 px-4 py-4 sm:px-7 sm:py-5">
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-5">
                  <div className="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">Colaborador Destino</h4>
                        <p className="text-xs font-medium text-muted-foreground">Vinculación de Talento Humano</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormControl>
                            <SearchableSelect
                              options={employees.filter(e => e.is_active).map((emp) => {
                                const hasActive = employeesWithActiveContract.has(emp.id);
                                return {
                                  value: emp.id,
                                  label: `${getEmployeeFullName(emp)} - ${emp.document_number}`,
                                  disabled: hasActive && !isEditMode,
                                  suffix: hasActive ? (
                                    <Badge variant="outline" className="ml-2 shrink-0 border-warning/50 bg-warning/10 px-2 py-0 text-[9px] font-bold uppercase tracking-wider text-warning">
                                      CONTRATO ACTIVO
                                    </Badge>
                                  ) : undefined,
                                };
                              })}
                              value={field.value}
                              onValueChange={field.onChange}
                              className="z-[70] rounded-lg border-border bg-background p-0"
                              triggerClassName="h-11 rounded-lg border-border bg-background font-medium"
                              placeholder="Seleccione el empleado para vincular..."
                            />
                          </FormControl>
                          <FormMessage className="ml-1 text-xs font-medium" />
                        </FormItem>
                      )}
                    />

                    {selectedEmployeeId && selectedEmployeeContracts.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <History className="h-4 w-4" />
                          Historial Contractual
                        </div>
                        <div className="space-y-3">
                          {selectedEmployeeContracts.slice(0, 3).map((c: any) => {
                            const isActive = !c.is_terminated;
                            const ctConfig = contractTypes.find(ct => ct.contract_type === c.contract_type);
                            return (
                              <div key={c.id} className="flex flex-col justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-xs transition-colors hover:border-primary/30 sm:flex-row sm:items-center">
                                <div className="flex items-center gap-4">
                                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                                  <div className="flex flex-col">
                                    <span className="font-bold uppercase text-foreground">{ctConfig?.display_name || c.contract_type}</span>
                                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{c.contract_number || 'SIN CONSECUTIVO'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    {formatDateOnly(c.start_date, 'dd MMM yyyy', { locale: es })}
                                    {c.end_date ? ` — ${formatDateOnly(c.end_date, 'dd MMM yyyy', { locale: es })}` : ' — INDEFINIDO'}
                                  </span>
                                  {isActive ? (
                                    <Badge className="h-6 border-emerald-500/20 bg-emerald-500/10 text-[9px] font-bold tracking-wider text-emerald-600">ACTIVO</Badge>
                                  ) : (
                                    <Badge variant="outline" className="h-6 border-muted-foreground/20 text-[9px] font-bold tracking-wider text-muted-foreground">CESADO</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <Briefcase className="h-3.5 w-3.5" />
                            Tipología de Contrato <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {contractTypes.filter(ct => ct.is_active).map((ct) => (
                                <SelectItem key={ct.id} value={ct.contract_type} className="m-1 rounded-lg font-medium">
                                  {ct.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trialPeriodDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <Clock className="h-3.5 w-3.5" />
                            Periodo de Prueba (Días)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              className="h-11 rounded-lg border-border bg-background font-medium"
                              placeholder="Ej: 60"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="mb-2 ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Fecha de Inicio <span className="text-destructive">*</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'h-11 w-full rounded-lg border-border bg-background pl-4 text-left font-medium',
                                    !field.value && 'text-muted-foreground font-normal'
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, 'dd MMMM yyyy', { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto rounded-lg border-border bg-background p-0 shadow-xl" align="start">
                              <DatePickerWithDropdowns
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                fromYear={1940}
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
                        name="durationMonths"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                              <Clock className="h-3.5 w-3.5" />
                              Duración (meses) <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                step="1"
                                className="h-11 rounded-lg border-border bg-background font-medium"
                                placeholder="Ej: 6"
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? undefined : parseInt(value, 10));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {needsEndDate && (
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="mb-2 ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              Fecha de Finalización <span className="text-destructive">*</span>
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                    className={cn(
                                      'h-11 w-full rounded-lg border-border bg-muted/40 pl-4 text-left font-medium disabled:cursor-default disabled:opacity-100',
                                      !field.value && 'text-muted-foreground font-normal'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd MMMM yyyy', { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto rounded-lg border-border bg-background p-0 shadow-xl" align="start">
                                <DatePickerWithDropdowns
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  fromYear={1940}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {selectedContractType === 'obra_labor' && (
                    <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                      <FormField
                        control={form.control}
                        name="workLaborDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                              <Award className="h-3.5 w-3.5" />
                              Objeto de la Obra o Labor
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Especifique el proyecto o tarea puntual que justifica este contrato temporal..."
                                className="min-h-[120px] resize-none rounded-lg border-border bg-background font-medium leading-relaxed focus-visible:ring-primary/20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="contract" className="mt-0 space-y-5">
                  {canViewSalaries && (
                    <>
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:p-5 lg:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ml-1 block text-[10px] font-bold uppercase leading-tight tracking-wide text-primary sm:text-[11px]">
                            Remuneración Base Mensual <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="3.500.000" 
                                className="h-11 rounded-lg border-border bg-background text-base font-semibold" 
                                {...field} 
                                disabled={!canManageSalaries}
                              />
                            </div>
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
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <Target className="h-3.5 w-3.5" />
                            Modalidad de Pago
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium" disabled={!canManageSalaries}>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="monthly" className="m-1 rounded-lg font-medium">Sueldo Mensual Ordinario</SelectItem>
                              <SelectItem value="integral" className="m-1 rounded-lg font-medium">Sueldo Mensual Integral</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
                    <FormField
                      control={form.control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-4 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="h-5 w-5 rounded-md border-emerald-500/50 data-[state=checked]:bg-emerald-500"
                              disabled={!canManageSalaries}
                            />
                          </FormControl>
                          <div className="space-y-1.5">
                            <FormLabel className="text-sm font-bold text-foreground">Vincular Auxilio de Transporte</FormLabel>
                            <FormDescription className="text-xs font-medium text-emerald-700">
                               Valor Legal 2024: $140.606 COP
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                    </>
                  )}
                </TabsContent>

                {/* Workplace Tab */}
                <TabsContent value="workplace" className="mt-0 space-y-5">
                  <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:p-5 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="operationCenter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <Building className="h-3.5 w-3.5" />
                            Unidad de Operación
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 rounded-lg border-border bg-background font-medium">
                                <SelectValue placeholder="Seleccionar sede..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {operationCenters.map((center) => (
                                <SelectItem key={center.id} value={center.id} className="m-1 rounded-lg font-medium">
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
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <Globe className="h-3.5 w-3.5" />
                            Ciudad de Ejecución
                          </FormLabel>
                          <FormControl>
                            <CitySelect 
                              value={field.value} 
                              onValueChange={(city) => field.onChange(city)}
                              placeholder="Buscar municipio..."
                              className="h-11 rounded-lg border-border bg-background"
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
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <MapPin className="h-3.5 w-3.5" />
                            Dirección de Prestación de Servicios
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Calle 100 # 15-20, Piso 5" className="h-11 rounded-lg border-border bg-background font-medium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                     <div className="rounded-lg bg-amber-500/15 p-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                     </div>
                     <div className="space-y-1">
                        <h5 className="text-sm font-bold uppercase tracking-wider text-amber-800">Verificación de ARL</h5>
                        <p className="text-[11px] font-medium text-amber-700/80 leading-relaxed italic">
                           Asegúrese de que el centro de operación y la ciudad correspondan a los registros de riesgos laborales para garantizar la cobertura total del empleado.
                        </p>
                     </div>
                  </div>
                </TabsContent>

                {/* Clauses Tab */}
                <TabsContent value="contract" className="mt-0 space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="hasConfidentialityClause"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-4 space-y-0 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="h-5 w-5 rounded-md border-primary/30 data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <ShieldCheck className="h-4 w-4 text-primary" />
                              Confidencialidad
                            </FormLabel>
                            <p className="text-xs font-medium text-muted-foreground">Protección IP & Datos</p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasNonCompeteClause"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-4 space-y-0 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="h-5 w-5 rounded-md border-primary/30 data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="flex items-center gap-2 text-sm font-bold text-foreground">
                              <Target className="h-4 w-4 text-primary" />
                              No Competencia
                            </FormLabel>
                            <p className="text-xs font-medium text-muted-foreground">Restricción Post-Contrato</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                    <FormField
                      control={form.control}
                      name="specialClauses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="ml-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
                            <FileText className="h-3.5 w-3.5" />
                            Estipulaciones Contractuales Adicionales
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Redacte aquí pactos de exclusividad, beneficios extralegales o condiciones particulares del cargo..."
                              className="min-h-[160px] resize-none rounded-lg border-border bg-background font-medium leading-relaxed focus-visible:ring-primary/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </ScrollArea>

              <div className="flex shrink-0 flex-col gap-2 border-t bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end sm:px-7">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="order-2 h-10 rounded-lg px-5 text-sm font-semibold sm:order-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="order-1 h-10 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:order-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    isEditMode ? 'Guardar Cambios' : 'Crear Contrato'
                  )}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
