import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { useCreateContract, useUpdateContract, useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
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
  const updateContract = useUpdateContract();

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
  const contractTypeConfig = contractTypes.find(ct => ct.contract_type === selectedContractType);
  const needsEndDate = contractTypeConfig?.requires_end_date ?? false;

  const handleSubmit = async (data: ContractFormData) => {
    try {
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
    { value: 'salary', label: 'Salario', icon: DollarSign },
    { value: 'workplace', label: 'Lugar de Trabajo', icon: Building },
    { value: 'clauses', label: 'Cláusulas', icon: Briefcase },
  ];

  const isPending = createContract.isPending || updateContract.isPending;

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === selectedEmployeeId);
  }, [selectedEmployeeId, employees]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-3xl p-0 overflow-hidden sm:w-full border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">
          {isEditMode ? 'Editar Contrato' : 'Nuevo Contrato'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para la gestión de contratos laborales de empleados.
        </DialogDescription>

        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/10 px-6 pt-12 pb-10 sm:px-12 sm:pt-14">
          {/* Enhanced decorative patterns */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-primary/10 blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10">
            {/* Branded Avatar */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-24 h-24 rounded-2xl bg-background flex items-center justify-center text-primary font-black text-4xl shadow-xl border border-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                {selectedEmployee ? getEmployeeFullName(selectedEmployee).substring(0, 2).toUpperCase() : 'CT'}
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 py-0.5 px-3 rounded-full font-bold uppercase tracking-widest text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-2 animate-ping" />
                  {isEditMode ? 'Edición' : 'Nueva Vinculación'}
                </Badge>
                {selectedContractType && (
                  <Badge variant="outline" className="bg-success/5 text-success border-success/10 font-bold py-0.5 px-3 rounded-full text-[9px] uppercase tracking-widest">
                    {contractTypes.find(ct => ct.contract_type === selectedContractType)?.display_name || selectedContractType}
                  </Badge>
                )}
              </div>
              
              <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tighter leading-none">
                {selectedEmployee ? getEmployeeFullName(selectedEmployee) : (isEditMode ? 'Editar Contrato' : 'Nuevo Contrato')}
              </h2>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3 text-xs font-bold text-muted-foreground/80 uppercase tracking-tight">
                {selectedEmployee && (
                  <div className="flex items-center gap-2 group cursor-default">
                    <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary transition-colors">
                      <UserCheck className="w-4 h-4 group-hover:text-primary-foreground" />
                    </div>
                    {selectedEmployee.document_number}
                  </div>
                )}
                <div className="flex items-center gap-2 group cursor-default">
                   <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary transition-colors">
                    <CalendarIcon className="w-4 h-4 group-hover:text-primary-foreground" />
                  </div>
                  {format(new Date(), "MMMM yyyy", { locale: es })}
                </div>
                {form.watch('salary') && (
                  <div className="flex items-center gap-2 group cursor-default">
                    <div className="p-1 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500 transition-colors">
                      <DollarSign className="w-4 h-4 group-hover:text-white" />
                    </div>
                    ${form.watch('salary')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-8 pt-4 sm:px-12">
                <TabsList className="w-full h-12 bg-muted/30 p-1.5 rounded-2xl border border-primary/5">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(95dvh-400px)] px-8 py-8 sm:px-12 sm:py-10">
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-primary/[0.02] p-8 rounded-[2rem] border border-primary/10 space-y-8 shadow-inner">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground transform rotate-3">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-foreground tracking-tight">Colaborador Destino</h4>
                        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest leading-none">Vinculación de Talento Humano</p>
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
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter px-2 py-0 border-warning/50 text-warning bg-warning/10 ml-2 shrink-0">
                                      CONTRATO ACTIVO
                                    </Badge>
                                  ) : undefined,
                                };
                              })}
                              value={field.value}
                              onValueChange={field.onChange}
                              className="h-14 rounded-2xl bg-background border-primary/10 font-bold text-base"
                              placeholder="Seleccione el empleado para vincular..."
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold uppercase ml-1" />
                        </FormItem>
                      )}
                    />

                    {selectedEmployeeId && selectedEmployeeContracts.length > 0 && (
                      <div className="rounded-[1.5rem] border border-primary/10 bg-background/50 p-6 space-y-4">
                        <div className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary/80">
                          <History className="w-4 h-4" />
                          Historial Contractual
                        </div>
                        <div className="space-y-3">
                          {selectedEmployeeContracts.slice(0, 3).map((c: any) => {
                            const isActive = !c.is_terminated;
                            const ctConfig = contractTypes.find(ct => ct.contract_type === c.contract_type);
                            return (
                              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-muted/20 rounded-2xl px-5 py-4 border border-primary/5 hover:border-primary/20 transition-colors gap-3">
                                <div className="flex items-center gap-4">
                                  <div className={`w-2.5 h-2.5 shrink-0 rounded-full ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-muted-foreground/30'}`} />
                                  <div className="flex flex-col">
                                    <span className="font-black text-foreground tracking-tight uppercase">{ctConfig?.display_name || c.contract_type}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono font-bold tracking-widest">{c.contract_number || 'SIN CONSECUTIVO'}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                  <span className="text-[11px] font-bold text-muted-foreground/80">
                                    {format(new Date(c.start_date), 'dd MMM yyyy', { locale: es })}
                                    {c.end_date ? ` — ${format(new Date(c.end_date), 'dd MMM yyyy', { locale: es })}` : ' — INDEFINIDO'}
                                  </span>
                                  {isActive ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-black tracking-widest h-6">ACTIVO</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground/60 border-muted-foreground/20 text-[9px] font-black tracking-widest h-6">CESADO</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Briefcase className="w-3.5 h-3.5" />
                            Tipología de Contrato <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold">
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background/95 backdrop-blur-xl">
                              {contractTypes.filter(ct => ct.is_active).map((ct) => (
                                <SelectItem key={ct.id} value={ct.contract_type} className="rounded-xl m-1.5 font-bold">
                                  {ct.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-[10px] font-bold uppercase" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trialPeriodDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Clock className="w-3.5 h-3.5" />
                            Periodo de Prueba (Días)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold"
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
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1 mb-2">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Fecha de Inicio <span className="text-destructive">*</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full pl-4 text-left font-bold h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all',
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
                            <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border-primary/10" align="start">
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
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1 mb-2">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              Fecha de Finalización <span className="text-destructive">*</span>
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-4 text-left font-bold h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all',
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
                              <PopoverContent className="w-auto p-0 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl border-primary/10" align="start">
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
                    )}
                  </div>

                  {selectedContractType === 'obra_labor' && (
                    <div className="relative overflow-hidden bg-gradient-to-r from-primary/[0.05] to-transparent p-8 rounded-[2rem] border border-primary/10">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.05]">
                         <Award className="w-24 h-24" />
                      </div>
                      <FormField
                        control={form.control}
                        name="workLaborDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                              <Award className="w-3.5 h-3.5" />
                              Objeto de la Obra o Labor
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Especifique el proyecto o tarea puntual que justifica este contrato temporal..."
                                className="min-h-[140px] resize-none bg-background rounded-2xl border-primary/10 focus-visible:ring-primary/20 font-medium leading-relaxed"
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
                <TabsContent value="salary" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                      control={form.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            Remuneración Base Mensual <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-lg">$</span>
                              <Input placeholder="3.500.000" className="h-14 pl-10 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-black text-xl tracking-tight" {...field} />
                              <div className="absolute bottom-0 left-6 right-6 h-1 bg-emerald-500 scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left rounded-full" />
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
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Target className="w-3.5 h-3.5" />
                            Modalidad de Pago
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background/95 backdrop-blur-xl">
                              <SelectItem value="monthly" className="rounded-xl m-1.5 font-bold">Sueldo Mensual Ordinario</SelectItem>
                              <SelectItem value="integral" className="rounded-xl m-1.5 font-bold">Sueldo Mensual Integral</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-transparent p-10 rounded-[2.5rem] border border-emerald-500/10 shadow-inner group">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                       <ShieldCheck className="w-32 h-32" />
                    </div>
                    <FormField
                      control={form.control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-6 space-y-0 relative z-10">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="w-8 h-8 rounded-xl border-emerald-500/50 data-[state=checked]:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                            />
                          </FormControl>
                          <div className="space-y-1.5">
                            <FormLabel className="text-xl font-black text-foreground tracking-tight">Vincular Auxilio de Transporte</FormLabel>
                            <FormDescription className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest">
                               Valor Legal 2024: $140.606 COP
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Workplace Tab */}
                <TabsContent value="workplace" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <FormField
                      control={form.control}
                      name="operationCenter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Building className="w-3.5 h-3.5" />
                            Unidad de Operación
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold">
                                <SelectValue placeholder="Seleccionar sede..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background/95 backdrop-blur-xl">
                              {operationCenters.map((center) => (
                                <SelectItem key={center.id} value={center.id} className="rounded-xl m-1.5 font-bold">
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
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Globe className="w-3.5 h-3.5" />
                            Ciudad de Ejecución
                          </FormLabel>
                          <FormControl>
                            <CitySelect 
                              value={field.value} 
                              onValueChange={(city) => field.onChange(city)}
                              placeholder="Buscar municipio..."
                              className="h-12 rounded-2xl bg-muted/30 border-primary/5"
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
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Dirección de Prestación de Servicios
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Calle 100 # 15-20, Piso 5" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-5">
                     <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-600">
                        <AlertTriangle className="w-6 h-6" />
                     </div>
                     <div className="space-y-1">
                        <h5 className="font-black text-amber-800 tracking-tight text-sm uppercase">Verificación de ARL</h5>
                        <p className="text-[11px] font-medium text-amber-700/80 leading-relaxed italic">
                           Asegúrese de que el centro de operación y la ciudad correspondan a los registros de riesgos laborales para garantizar la cobertura total del empleado.
                        </p>
                     </div>
                  </div>
                </TabsContent>

                {/* Clauses Tab */}
                <TabsContent value="clauses" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="hasConfidentialityClause"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-5 space-y-0 rounded-[2rem] border-2 border-primary/5 p-8 bg-background/50 hover:border-primary/20 transition-all group cursor-pointer">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="w-7 h-7 rounded-xl border-primary/20 data-[state=checked]:bg-primary shadow-lg shadow-primary/10"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-base font-black flex items-center gap-3 text-foreground tracking-tight">
                              <ShieldCheck className="w-5 h-5 text-primary" />
                              Confidencialidad
                            </FormLabel>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">Protección IP & Datos</p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasNonCompeteClause"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-5 space-y-0 rounded-[2rem] border-2 border-primary/5 p-8 bg-background/50 hover:border-primary/20 transition-all group cursor-pointer">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="w-7 h-7 rounded-xl border-primary/20 data-[state=checked]:bg-primary shadow-lg shadow-primary/10"
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-base font-black flex items-center gap-3 text-foreground tracking-tight">
                              <Target className="w-5 h-5 text-primary" />
                              No Competencia
                            </FormLabel>
                            <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest leading-none">Restricción Post-Contrato</p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-primary/[0.03] p-10 rounded-[2.5rem] border border-primary/10 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                       <FileText className="w-32 h-32" />
                    </div>
                    <FormField
                      control={form.control}
                      name="specialClauses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <FileText className="w-3.5 h-3.5" />
                            Estipulaciones Contractuales Adicionales
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Redacte aquí pactos de exclusividad, beneficios extralegales o condiciones particulares del cargo..."
                              className="min-h-[200px] resize-none bg-background rounded-2xl border-primary/10 focus-visible:ring-primary/20 font-medium leading-relaxed"
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

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-8 py-8 sm:px-12 sm:py-10 bg-muted/5 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-10 rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all font-black uppercase tracking-widest text-[11px] order-2 sm:order-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="h-12 px-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/30 active:scale-95 transition-all font-black uppercase tracking-widest text-[11px] order-1 sm:order-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    isEditMode ? 'Guardar Cambios' : 'Finalizar Registro'
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
