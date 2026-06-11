import { useState, useEffect, useMemo } from 'react';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarIcon, User, Briefcase, MapPin, Heart, Building, 
  CreditCard, Shield, Clock, Users as UsersIcon, Camera, AlertCircle,
  RotateCcw, GraduationCap, BookOpen, Loader2
} from 'lucide-react';

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

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { parseDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';

// Field to tab mapping for navigation on errors
const fieldToTabMap: Record<string, string> = {
  // Identity tab
  identificationTypeId: 'identity',
  documentType: 'identity',
  documentNumber: 'identity',
  documentIssueCity: 'identity',
  documentIssueDate: 'identity',
  firstName: 'identity',
  middleName: 'identity',
  lastName: 'identity',
  secondLastName: 'identity',
  birthCountry: 'identity',
  birthDepartment: 'identity',
  birthCity: 'identity',
  birthDate: 'identity',
  gender: 'identity',
  genderIdentity: 'identity',
  genderIdentityOther: 'identity',
  bloodType: 'identity',
  maritalStatus: 'identity',
  // Contact tab
  residenceDepartment: 'contact',
  residenceCity: 'contact',
  residenceAddress: 'contact',
  residenceNeighborhood: 'contact',
  email: 'contact',
  personalEmail: 'contact',
  phone: 'contact',
  mobile: 'contact',
  emergencyContactName: 'contact',
  emergencyContactPhone: 'contact',
  emergencyContactRelationship: 'contact',
  // Family tab
  familyMembers: 'family',
  // Labor tab
  operationCenterId: 'labor',
  costCenter: 'labor',
  areaId: 'labor',
  positionId: 'labor',
  positionName: 'labor',
  workCity: 'labor',
  hireDate: 'labor',
  linkType: 'labor',
  observations: 'labor',
  // Security tab
  riskLevel: 'security',
  arl: 'security',
  eps: 'security',
  afp: 'security',
  ccf: 'security',
  afc: 'security',
  ips: 'security',
  // Bank tab
  bankName: 'bank',
  accountType: 'bank',
  accountNumber: 'bank',
  accountRegistered: 'bank',
  // Schedule tab
  payrollType: 'schedule',
  shiftTypeId: 'timemode',
  isOfficeSchedule: 'schedule',
  restDay: 'schedule',
  // TimeMode tab
  timeMode: 'timemode',
  workScheduleId: 'timemode',
  shiftCycleId: 'timemode',
  cycleStartDate: 'timemode',
  timeModeStartDate: 'timemode',
  timeModeNotes: 'timemode',
  // Person Specifications
  isFirstJob: 'identity',
  isHeadOfHousehold: 'identity',
  disabilityType: 'identity',
  ethnicGroup: 'identity',
  isConflictVictim: 'identity',
  isDemobilized: 'identity',
};

import {
  employeeFullFormSchema,
  type EmployeeFullFormData,
  type EmployeeV2WithRelations,
  type DocumentType,
  documentTypeLabels,
  genderLabels,
  bloodTypeLabels,
  maritalStatusLabels,
  linkTypeLabels,
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels,
  familyRelationshipOptions,
} from '@/types/employee';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useCreateEmployee, useUpdateEmployee, useEmployee } from '@/hooks/useEmployees';
import { useAreas, usePositions, useIdentificationTypes } from '@/hooks/useSystemConfig';
import { useAuth } from '@/contexts/AuthContext';
import { CitySelect, CityDepartmentSelect } from '@/components/ui/city-department-select';
import { 
  useARLCatalog, 
  useEPSCatalog, 
  useAFPCatalog, 
  useCCFCatalog, 
  useAFCCatalog, 
  useIPSCatalog 
} from '@/hooks/useSocialSecurityCatalogs';
import { useBanksCatalog } from '@/hooks/useBanksCatalog';
import { useWorkSchedules, useShiftCycles } from '@/hooks/useSchedules';
import { useShifts } from '@/hooks/useSchedules';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import { useProfessions } from '@/hooks/useProfessions';
import { MultiSelect } from '@/components/ui/multi-select';
import { AvatarUpload } from './AvatarUpload';

const DOCUMENT_TYPE_VALUES = ['CC', 'CE', 'TI', 'PA', 'PEP'] as const;

function resolveDocumentType(type?: { code?: string | null; name?: string | null }): DocumentType {
  const normalize = (value?: string | null) =>
    (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();

  const code = normalize(type?.code);
  if ((DOCUMENT_TYPE_VALUES as readonly string[]).includes(code)) {
    return code as DocumentType;
  }

  const name = normalize(type?.name);
  if (name.includes('EXTRANJ')) return 'CE';
  if (name.includes('TARJETA')) return 'TI';
  if (name.includes('PASAPORTE')) return 'PA';
  if (name.includes('PEP') || name.includes('PERMISO ESPECIAL')) return 'PEP';
  return 'CC';
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeV2WithRelations | null;
  onSuccess?: () => void;
}

export function EmployeeFormDialog({ open, onOpenChange, employee, onSuccess }: EmployeeFormDialogProps) {
  const [activeTab, setActiveTab] = useState('identity');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { currentCompanyId } = useAuth();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const { data: identificationTypes = [] } = useIdentificationTypes();
  const { data: arlOptions = [] } = useARLCatalog();
  const { data: epsOptions = [] } = useEPSCatalog();
  const { data: afpOptions = [] } = useAFPCatalog();
  const { data: ccfOptions = [] } = useCCFCatalog();
  const { data: afcOptions = [] } = useAFCCatalog();
  const { data: ipsOptions = [] } = useIPSCatalog();
  const { data: workSchedules = [] } = useWorkSchedules();
  const { data: shiftCycles = [] } = useShiftCycles();
  const { data: shifts = [] } = useShifts();
  const { data: educationLevels = [] } = useEducationLevels();
  const { data: professions = [] } = useProfessions();
  const { data: bankOptions = [] } = useBanksCatalog();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  
  const isEditMode = !!employee;

  // Load full employee details when editing
  const { data: fullEmployee, isLoading: isLoadingEmployee } = useEmployee(
    open && employee?.id ? employee.id : undefined
  );

  const currentEmployeeData = fullEmployee || employee;

  // Filter active schedules and cycles
  const activeSchedules = workSchedules.filter(s => s.is_active);
  const activeCycles = shiftCycles.filter(c => c.is_active);
  const activeShiftTypes = shifts.filter((s: any) => s.is_active !== false);
  const activeEducationLevels = educationLevels.filter(level => level.is_active);
  const activeProfessions = professions.filter(prof => prof.is_active);

  // Sync avatar URL when employee changes
  useEffect(() => {
    setAvatarUrl(currentEmployeeData?.avatar_url || null);
  }, [currentEmployeeData]);

  const form = useForm<EmployeeFullFormData>({
    resolver: zodResolver(employeeFullFormSchema),
    defaultValues: {
      birthCountry: 'Colombia',
      linkType: 'indefinido',
      payrollType: 'quincenal',
      isOfficeSchedule: true,
      familyMembers: [],
      bankName: '',
      accountType: undefined,
      accountNumber: '',
      accountRegistered: false,
      timeMode: 'administrative',
      timeModeStartDate: new Date(),
      isFirstJob: false,
      isHeadOfHousehold: false,
      disabilityType: 'ninguna',
      ethnicGroup: 'ninguno',
      isConflictVictim: false,
      isDemobilized: false,
      educationLevelIds: [],
    },
  });

  // Watch time mode for conditional fields
  const selectedTimeMode = form.watch('timeMode');

  // Reset form with employee data when editing
  useEffect(() => {
    if (currentEmployeeData && open) {
      form.reset({
        // A. Core Identity
        identificationTypeId: currentEmployeeData.identification_type_id || '',
        documentType: currentEmployeeData.document_type as any,
        documentNumber: currentEmployeeData.document_number,
        documentIssueCity: currentEmployeeData.document_issue_city || undefined,
        documentIssueDate: parseDateOnly(currentEmployeeData.document_issue_date),
        firstName: currentEmployeeData.first_name,
        middleName: currentEmployeeData.middle_name || undefined,
        lastName: currentEmployeeData.last_name,
        secondLastName: currentEmployeeData.second_last_name || undefined,
        birthCountry: currentEmployeeData.birth_country || 'Colombia',
        birthDepartment: currentEmployeeData.birth_department || undefined,
        birthCity: currentEmployeeData.birth_city || undefined,
        birthDate: parseDateOnly(currentEmployeeData.birth_date),
        gender: currentEmployeeData.gender as any,
        genderIdentity: (currentEmployeeData as any).gender_identity || undefined,
        genderIdentityOther: (currentEmployeeData as any).gender_identity_other || undefined,
        bloodType: currentEmployeeData.blood_type as any,
        maritalStatus: currentEmployeeData.marital_status as any,
        educationLevelIds: currentEmployeeData.education_level_ids || [],
        professionId: currentEmployeeData.profession_id || undefined,
        
        // B. Contact
        residenceDepartment: currentEmployeeData.contact?.residence_department || undefined,
        residenceCity: currentEmployeeData.contact?.residence_city || undefined,
        residenceAddress: currentEmployeeData.contact?.residence_address || undefined,
        residenceNeighborhood: currentEmployeeData.contact?.residence_neighborhood || undefined,
        email: currentEmployeeData.contact?.email || undefined,
        personalEmail: currentEmployeeData.contact?.personal_email || undefined,
        phone: currentEmployeeData.contact?.phone || undefined,
        mobile: currentEmployeeData.contact?.mobile || undefined,
        emergencyContactName: currentEmployeeData.contact?.emergency_contact_name || undefined,
        emergencyContactPhone: currentEmployeeData.contact?.emergency_contact_phone || undefined,
        emergencyContactRelationship: currentEmployeeData.contact?.emergency_contact_relationship || undefined,
        
        // C. Family
        familyMembers: (currentEmployeeData.family_members || []).map(m => ({
          id: m.id,
          relationship: m.relationship,
          fullName: m.full_name,
          age: m.age ?? undefined,
          gender: (m.gender as any) || undefined,
          observations: m.observations || undefined,
        })),
        
        // D. Work Info
        operationCenterId: currentEmployeeData.work_info?.operation_center_id || undefined,
        costCenter: currentEmployeeData.work_info?.cost_center || undefined,
        areaId: currentEmployeeData.work_info?.area_id || undefined,
        positionId: currentEmployeeData.work_info?.position_id || undefined,
        positionName: currentEmployeeData.work_info?.position_name || '',
        workCity: currentEmployeeData.work_info?.work_city || undefined,
        hireDate: parseDateOnlyOr(currentEmployeeData.work_info?.hire_date, new Date()),
        linkType: currentEmployeeData.work_info?.link_type as any || 'indefinido',
        observations: currentEmployeeData.work_info?.observations || undefined,
        
        // E. Social Security
        riskLevel: currentEmployeeData.social_security?.risk_level as any,
        arl: currentEmployeeData.social_security?.arl || undefined,
        eps: currentEmployeeData.social_security?.eps || undefined,
        afp: currentEmployeeData.social_security?.afp || undefined,
        ccf: currentEmployeeData.social_security?.ccf || undefined,
        afc: currentEmployeeData.social_security?.afc || undefined,
        ips: currentEmployeeData.social_security?.ips || undefined,
        
        // F. Bank Info
        bankName: currentEmployeeData.bank_info?.bank_name || '',
        accountType: currentEmployeeData.bank_info?.account_type as any || undefined,
        accountNumber: currentEmployeeData.bank_info?.account_number || '',
        accountRegistered: currentEmployeeData.bank_info?.account_registered || false,
        
        // J. Schedule
        payrollType: currentEmployeeData.schedule?.payroll_type as any || 'quincenal',
        shiftTypeId: currentEmployeeData.schedule?.shift_type_id || undefined,
        isOfficeSchedule: currentEmployeeData.schedule?.is_office_schedule ?? true,
        restDay: currentEmployeeData.schedule?.rest_day || undefined,

        // K. Time Mode
        timeMode: currentEmployeeData.time_config?.mode || 'administrative',
        timeModeStartDate: parseDateOnlyOr(currentEmployeeData.time_config?.start_date, new Date()),
        workScheduleId: currentEmployeeData.time_config?.work_schedule_id || undefined,
        shiftCycleId: currentEmployeeData.time_config?.shift_cycle_id || undefined,
        cycleStartDate: parseDateOnly(currentEmployeeData.time_config?.cycle_start_date),
        timeModeNotes: currentEmployeeData.time_config?.notes || undefined,

        // L. Person Specifications
        isFirstJob: (currentEmployeeData as any).is_first_job || false,
        isHeadOfHousehold: (currentEmployeeData as any).is_head_of_household || false,
        disabilityType: (currentEmployeeData as any).disability_type || 'ninguna',
        ethnicGroup: (currentEmployeeData as any).ethnic_group || 'ninguno',
        isConflictVictim: (currentEmployeeData as any).is_conflict_victim || false,
        isDemobilized: (currentEmployeeData as any).is_demobilized || false,
      });
    } else if (!currentEmployeeData && open) {
      form.reset({
        birthCountry: 'Colombia',
        linkType: 'indefinido',
        payrollType: 'quincenal',
        isOfficeSchedule: true,
        familyMembers: [],
        bankName: '',
        accountType: undefined,
        accountNumber: '',
        accountRegistered: false,
        timeMode: 'administrative',
        timeModeStartDate: new Date(),
        isFirstJob: false,
        isHeadOfHousehold: false,
        disabilityType: 'ninguna',
        ethnicGroup: 'ninguno',
        isConflictVictim: false,
        isDemobilized: false,
      });
    }
  }, [currentEmployeeData, open, form]);

  const handleSubmit = async (data: EmployeeFullFormData) => {
    if (!currentCompanyId && !isEditMode) {
      toast.error('Error: No hay empresa seleccionada');
      return;
    }

    try {
      const selectedIdentificationType = identificationTypes.find((type) => type.id === data.identificationTypeId);
      const dataToSave: EmployeeFullFormData = {
        ...data,
        documentType: data.documentType || resolveDocumentType(selectedIdentificationType),
      };

      if (isEditMode && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, avatarUrl, ...dataToSave });
        toast.success('Empleado actualizado', {
          description: `${dataToSave.firstName} ${dataToSave.lastName} ha sido actualizado exitosamente.`,
        });
      } else {
        await createEmployee.mutateAsync({ ...dataToSave, avatarUrl });
        toast.success('Empleado creado', {
          description: `${dataToSave.firstName} ${dataToSave.lastName} ha sido registrado exitosamente.`,
        });
      }
      
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      toast.error(isEditMode ? 'Error al actualizar empleado' : 'Error al crear empleado', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const tabItems = [
    { value: 'identity', label: 'Identidad', icon: User },
    { value: 'contact', label: 'Contacto', icon: MapPin },
    { value: 'family', label: 'Familia', icon: Heart },
    { value: 'labor', label: 'Laboral', icon: Briefcase },
    { value: 'timemode', label: 'Modalidad', icon: RotateCcw },
    { value: 'security', label: 'Seguridad Social', icon: Shield },
    { value: 'bank', label: 'Banco', icon: CreditCard },
    { value: 'schedule', label: 'Nómina', icon: Clock },
  ];

  // Get errors per tab for visual indicators
  const formErrors = form.formState.errors;
  const tabsWithErrors = useMemo(() => {
    const errorTabs = new Set<string>();
    Object.keys(formErrors).forEach((fieldName) => {
      const tab = fieldToTabMap[fieldName];
      if (tab) {
        errorTabs.add(tab);
      }
    });
    return errorTabs;
  }, [formErrors]);

  // Get error count per tab
  const getTabErrorCount = (tabValue: string): number => {
    return Object.keys(formErrors).filter(
      (fieldName) => fieldToTabMap[fieldName] === tabValue
    ).length;
  };

  // Handle form validation and navigate to first tab with error
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Trigger validation
    const isValid = await form.trigger();
    
    if (!isValid) {
      // Find first tab with errors
      const errors = form.formState.errors;
      const errorFields = Object.keys(errors);
      
      if (errorFields.length > 0) {
        const firstErrorField = errorFields[0];
        const targetTab = fieldToTabMap[firstErrorField];
        
        if (targetTab && targetTab !== activeTab) {
          setActiveTab(targetTab);
          
          // Show toast with navigation info
          const tabLabel = tabItems.find(t => t.value === targetTab)?.label || targetTab;
          toast.error('Hay campos obligatorios sin completar', {
            description: `Se encontraron ${errorFields.length} error(es). Navegando a la pestaña "${tabLabel}".`,
          });
        } else {
          toast.error('Hay campos obligatorios sin completar', {
            description: `Por favor complete los ${errorFields.length} campo(s) marcados en rojo.`,
          });
        }
      }
      return;
    }
    
    // If valid, proceed with submit
    form.handleSubmit(handleSubmit)();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col overflow-hidden p-0">
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col flex-1 min-h-0">
              <div className="relative shrink-0 overflow-hidden bg-sidebar border-b">
                <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--primary))_1px,transparent_1px)] bg-[size:26px_26px] opacity-10" />
                <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full border border-primary/30 " />
                <div className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full border border-primary/20 " />
                <div className="absolute top-8 right-28 h-28 w-28 rounded-full border border-primary/25" />
                
                <DialogHeader className="relative z-10 px-4 pt-6 pb-2 text-foreground sm:px-6">
                  <DialogTitle className="flex items-center gap-2 pr-6 font-display text-lg text-foreground sm:text-xl">
                    <Building className="w-5 h-5 text-primary" />
                    {isEditMode ? 'Editar Empleado' : 'Nuevo Empleado'}
                    {isEditMode && isLoadingEmployee && (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground mt-1">
                    {isEditMode 
                      ? 'Modifique la información del empleado según sea necesario.'
                      : 'Complete la información del empleado en cada una de las secciones.'
                    }
                  </DialogDescription>
                </DialogHeader>

                <div className="relative z-10 px-4 pb-3 sm:px-6">
                  <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-themed">
                    <TabsList className="inline-flex h-auto min-w-max justify-start gap-1 rounded-xl border border-border/70 bg-background p-1 shadow-sm">
                  {tabItems.map((tab) => {
                    const errorCount = getTabErrorCount(tab.value);
                    const hasErrors = tabsWithErrors.has(tab.value);
                    
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                          "relative min-h-9 w-auto min-w-[7.5rem] shrink-0 justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:min-w-[8.75rem]",
                          hasErrors && "text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
                        )}
                      >
                        <tab.icon className={cn("w-3.5 h-3.5", hasErrors && "text-destructive")} />
                        <span className="truncate">{tab.label}</span>
                        {hasErrors && (
                          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                            {errorCount}
                          </span>
                        )}
                      </TabsTrigger>
                    );
                  })}
                    </TabsList>
                  </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 scrollbar-themed sm:px-6">
                {/* A. IDENTITY TAB */}
                <TabsContent value="identity" className="mt-0 space-y-6">
                  {/* Photo Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Foto del Empleado</h3>
                    <div className="flex justify-center">
                      <AvatarUpload
                        currentAvatarUrl={avatarUrl}
                        employeeId={employee?.id}
                        employeeName={`${form.watch('firstName') || ''} ${form.watch('lastName') || ''}`}
                        onAvatarChange={(url) => setAvatarUrl(url)}
                        size="lg"
                      />
                    </div>
                  </div>

                  {/* Document Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Documento de Identidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormField
                          control={form.control}
                          name="identificationTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo *</FormLabel>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  const selectedType = identificationTypes.find((type) => type.id === value);
                                  form.setValue('documentType', resolveDocumentType(selectedType), {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background">
                                  {identificationTypes?.filter(type => !!type.id).map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
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
                        name="documentNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número *</FormLabel>
                            <FormControl>
                              <Input placeholder="1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="documentIssueCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad Expedición</FormLabel>
                            <FormControl>
                              <CitySelect 
                                value={field.value || ''} 
                                onValueChange={field.onChange}
                                placeholder="Ciudad..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="documentIssueDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Expedición</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0 bg-background" align="start">
                                <DatePickerWithDropdowns
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date() || date < new Date('1940-01-01')}
                                  fromYear={1940}
                                  toYear={new Date().getFullYear()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Names Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Nombres y Apellidos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primer Nombre *</FormLabel>
                            <FormControl><Input placeholder="Juan" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segundo Nombre</FormLabel>
                            <FormControl><Input placeholder="Carlos" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primer Apellido *</FormLabel>
                            <FormControl><Input placeholder="García" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="secondLastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Segundo Apellido</FormLabel>
                            <FormControl><Input placeholder="López" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Birth & Personal Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Nacimiento y Datos Personales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Nacimiento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0 bg-background" align="start">
                                <DatePickerWithDropdowns
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date() || date < new Date('1940-01-01')}
                                  fromYear={1940}
                                  toYear={new Date().getFullYear() - 18}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="birthCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad de Nacimiento</FormLabel>
                            <FormControl>
                              <CitySelect 
                                value={field.value || ''} 
                                onValueChange={(city, dept) => {
                                  field.onChange(city);
                                  form.setValue('birthDepartment', dept || '');
                                }}
                                placeholder="Ciudad..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="birthCountry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>País de Nacimiento</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sexo biológico</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="M">Masculino</SelectItem>
                                <SelectItem value="F">Femenino</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="genderIdentity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sexo de identificación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="femenino">Femenino</SelectItem>
                                <SelectItem value="masculino">Masculino</SelectItem>
                                <SelectItem value="trans">Trans</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {form.watch('genderIdentity') === 'otro' && (
                        <FormField
                          control={form.control}
                          name="genderIdentityOther"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>¿Cuál?</FormLabel>
                              <FormControl><Input placeholder="Especifique" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                  </div>
                  </div>

                  {/* Especificaciones de la Persona */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Especificaciones de la Persona</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="isFirstJob"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm font-medium cursor-pointer">Primer Empleo</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isHeadOfHousehold"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm font-medium cursor-pointer">Madre Cabeza de Familia</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="disabilityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discapacidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'ninguna'}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="ninguna">Ninguna</SelectItem>
                                <SelectItem value="fisica">Discapacidad Física</SelectItem>
                                <SelectItem value="auditiva">Discapacidad Auditiva</SelectItem>
                                <SelectItem value="visual">Discapacidad Visual</SelectItem>
                                <SelectItem value="sordoceguera">Sordoceguera</SelectItem>
                                <SelectItem value="intelectual">Discapacidad Intelectual</SelectItem>
                                <SelectItem value="psicosocial">Discapacidad Psicosocial (mental)</SelectItem>
                                <SelectItem value="multiple">Discapacidad Múltiple</SelectItem>
                                <SelectItem value="otra">Otra Discapacidad</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ethnicGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grupo Étnico</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'ninguno'}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="ninguno">Ninguno</SelectItem>
                                <SelectItem value="afrodescendiente">Afrodescendiente</SelectItem>
                                <SelectItem value="indigena">Indígena</SelectItem>
                                <SelectItem value="otros">Otros grupos étnicos</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isConflictVictim"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm font-medium cursor-pointer">Víctima del Conflicto Armado</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="isDemobilized"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <FormLabel className="text-sm font-medium cursor-pointer">Desmovilizado / Reinsertado</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Blood Type & Marital Status */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Otros Datos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bloodType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Sangre</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(bloodTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maritalStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado Civil</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(maritalStatusLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="educationLevelIds"
                        render={({ field }) => (
                          <FormItem className="col-span-1 md:col-span-2">
                            <FormLabel className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-primary" />
                              Niveles Educativos
                            </FormLabel>
                            <FormControl>
                              <MultiSelect
                                options={activeEducationLevels.map(level => ({
                                  label: level.name,
                                  value: level.id
                                }))}
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder="Seleccionar niveles educativos..."
                                className="bg-background border-input hover:border-border 0 transition-colors"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="professionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-primary" />
                              Profesión
                            </FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(val === 'unspecified' ? '' : val)} 
                              value={field.value || 'unspecified'}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="unspecified">Sin especificar</SelectItem>
                                {activeProfessions?.filter(prof => !!prof.id).map((prof) => (
                                  <SelectItem key={prof.id} value={prof.id}>
                                    {prof.name}
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
                </TabsContent>

                {/* B. CONTACT TAB */}
                <TabsContent value="contact" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Dirección de Residencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CityDepartmentSelect
                        departmentValue={form.watch('residenceDepartment') || ''}
                        cityValue={form.watch('residenceCity') || ''}
                        onDepartmentChange={(dept) => {
                          form.setValue('residenceDepartment', dept);
                          form.setValue('residenceCity', '');
                        }}
                        onCityChange={(city) => form.setValue('residenceCity', city)}
                      />
                      <FormField
                        control={form.control}
                        name="residenceAddress"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Dirección</FormLabel>
                            <FormControl><Input placeholder="Calle 123 # 45-67" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="residenceNeighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barrio, Vereda u otro.</FormLabel>
                            <FormControl><Input placeholder="Nombre del barrio, vereda, otro..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Datos de Contacto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo Corporativo</FormLabel>
                            <FormControl><Input type="email" placeholder="empleado@empresa.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="personalEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Correo Personal</FormLabel>
                            <FormControl><Input type="email" placeholder="personal@email.com" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono Fijo</FormLabel>
                            <FormControl><Input placeholder="6011234567" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Celular</FormLabel>
                            <FormControl><Input placeholder="3001234567" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Contacto de Emergencia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Teléfono</FormLabel>
                            <FormControl><Input placeholder="3001234567" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="emergencyContactRelationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Parentesco</FormLabel>
                            <FormControl><Input placeholder="Esposo(a), Padre, Madre..." {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* C. FAMILY TAB */}
                <TabsContent value="family" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>
                        Núcleo Familiar (Personas a cargo)
                      </h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = form.getValues('familyMembers') || [];
                          form.setValue('familyMembers', [...current, { relationship: '', fullName: '', age: undefined, gender: undefined, observations: undefined }]);
                        }}
                      >
                        <UsersIcon className="w-4 h-4 mr-1" />
                        Agregar familiar
                      </Button>
                    </div>

                    {(form.watch('familyMembers') || []).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay familiares registrados</p>
                        <p className="text-xs mt-1">Haga clic en "Agregar familiar" para comenzar</p>
                      </div>
                    )}

                    {(form.watch('familyMembers') || []).map((_, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3 relative bg-background">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Familiar #{index + 1}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-7 w-7 p-0"
                            onClick={() => {
                              const current = form.getValues('familyMembers') || [];
                              form.setValue('familyMembers', current.filter((_, i) => i !== index));
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.relationship`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Parentesco</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-background">
                                    {familyRelationshipOptions.map(opt => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.fullName`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Nombre Completo</FormLabel>
                                <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.age`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Edad</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min={0} 
                                    max={120}
                                    placeholder="Edad"
                                    value={field.value ?? ''}
                                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.gender`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sexo biológico</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="bg-background">
                                    {Object.entries(genderLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`familyMembers.${index}.observations`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>Observaciones</FormLabel>
                                <FormControl><Input placeholder="Observaciones adicionales..." {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* D. LABOR TAB */}
                <TabsContent value="labor" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Ubicación Organizacional</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="operationCenterId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Operación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                  {operationCenters?.filter(c => !!c.id).map((center) => (
                                    <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="costCenter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Costos</FormLabel>
                            <FormControl><Input placeholder="Código del centro de costos" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="areaId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Área</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                  {areas?.filter((a: any) => !!a.id).map((area: any) => (
                                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="positionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Also update positionName with the selected position's name
                                const selectedPosition = positions.find((p: any) => p.id === value);
                                if (selectedPosition) {
                                  form.setValue('positionName', selectedPosition.name);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                  {positions?.filter((p: any) => !!p.id).map((position: any) => (
                                    <SelectItem key={position.id} value={position.id}>
                                      {position.name}
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
                            <FormLabel>Ciudad donde Labora</FormLabel>
                            <FormControl>
                              <CitySelect 
                                value={field.value || ''} 
                                onValueChange={field.onChange}
                                placeholder="Ciudad..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Vinculación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="hireDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Ingreso *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                  >
                                    {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Seleccionar</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0 bg-background" align="start">
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
                      <FormField
                        control={form.control}
                        name="linkType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Vinculación *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(linkTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                            <Textarea placeholder="Notas adicionales sobre el empleado..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* K. TIME MODE TAB - Modalidad de Tiempo */}
                <TabsContent value="timemode" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Modalidad de Tiempo *</h3>
                    <p className="text-sm text-muted-foreground">
                      Seleccione cómo se gestionará el horario de este empleado. Este campo es obligatorio.
                    </p>
                    
                    <FormField
                      control={form.control}
                      name="timeMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modalidad *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Clear dependent fields when mode changes
                                if (value === 'administrative') {
                                  form.setValue('shiftCycleId', undefined);
                                  form.setValue('cycleStartDate', undefined);
                                } else {
                                  form.setValue('workScheduleId', undefined);
                                }
                              }}
                              value={field.value}
                              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                            >
                              <label
                                className={cn(
                                  'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                  field.value === 'administrative'
                                    ? 'border-primary '
                                    : 'border-input hover:border-border 0'
                                )}
                              >
                                <RadioGroupItem value="administrative" className="sr-only" />
                                <Briefcase className={cn(
                                  'w-5 h-5',
                                  field.value === 'administrative' ? 'text-primary' : 'text-muted-foreground'
                                )} />
                                <div>
                                  <p className="font-medium">Administrativo</p>
                                  <p className="text-xs text-muted-foreground">Horario fijo de oficina</p>
                                </div>
                              </label>
                              <label
                                className={cn(
                                  'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                                  field.value === 'shift'
                                    ? 'border-primary '
                                    : 'border-input hover:border-border 0'
                                )}
                              >
                                <RadioGroupItem value="shift" className="sr-only" />
                                <RotateCcw className={cn(
                                  'w-5 h-5',
                                  field.value === 'shift' ? 'text-primary' : 'text-muted-foreground'
                                )} />
                                <div>
                                  <p className="font-medium">Turnos</p>
                                  <p className="text-xs text-muted-foreground">Ciclo rotativo operativo</p>
                                </div>
                              </label>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedTimeMode === 'administrative' && (
                      <FormField
                        control={form.control}
                        name="workScheduleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horario Administrativo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccione horario" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {activeSchedules.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    No hay horarios activos. Configure uno primero en Jornadas.
                                  </div>
                                ) : (
                                  activeSchedules?.filter(s => !!s.id).map((schedule) => (
                                    <SelectItem key={schedule.id} value={schedule.id}>
                                      <span>{schedule.name}</span>
                                      <span className="text-muted-foreground ml-2">
                                        ({schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)})
                                      </span>
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {selectedTimeMode === 'shift' && (
                      <>
                        <FormField
                          control={form.control}
                          name="shiftTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Turno de Trabajo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione turno (ej. Turno 10x5)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background">
                                  {activeShiftTypes.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                      No hay turnos activos. Cree uno primero en Jornadas.
                                    </div>
                                  ) : (
                                    activeShiftTypes
                                      .filter((shift: any) => !!shift.id)
                                      .map((shift: any) => (
                                        <SelectItem key={shift.id} value={shift.id}>
                                          <span>{shift.name}</span>
                                          {shift.code && (
                                            <span className="text-muted-foreground ml-2">({shift.code})</span>
                                          )}
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
                          name="shiftCycleId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciclo de Rotación *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione ciclo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background">
                                  {activeCycles.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                      No hay ciclos activos. Configure uno primero en Jornadas.
                                    </div>
                                  ) : (
                                    activeCycles?.filter(c => !!c.id).map((cycle) => (
                                      <SelectItem key={cycle.id} value={cycle.id}>
                                        <span>{cycle.name}</span>
                                        <span className="text-muted-foreground ml-2">
                                          ({cycle.total_days} días)
                                        </span>
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
                          name="cycleStartDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Inicio del Ciclo</FormLabel>
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
                                        format(field.value, 'dd MMM yyyy', { locale: es })
                                      ) : (
                                        <span>Fecha de referencia del ciclo</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="z-[70] w-auto max-w-[calc(100vw-2rem)] overflow-visible p-0 bg-background"
                                  align="start"
                                  collisionPadding={16}
                                >
                                  <DatePickerWithDropdowns
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    fromYear={1950}
                                    toYear={new Date().getFullYear() + 5}
                                  />
                                </PopoverContent>
                              </Popover>
                              <p className="text-xs text-muted-foreground">
                                Fecha desde la cual se calcula la posición en el ciclo
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                      <FormField
                        control={form.control}
                        name="timeModeStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Vigente Desde *</FormLabel>
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
                                      format(field.value, 'dd MMM yyyy', { locale: es })
                                    ) : (
                                      <span>Seleccione fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="z-[70] w-auto max-w-[calc(100vw-2rem)] overflow-visible p-0 bg-background"
                                align="start"
                                collisionPadding={16}
                              >
                                <DatePickerWithDropdowns
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  fromYear={1950}
                                  toYear={new Date().getFullYear() + 5}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="timeModeNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notas (opcional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Observaciones adicionales sobre la modalidad de tiempo..."
                              className="min-h-[60px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* E. SOCIAL SECURITY TAB */}
                <TabsContent value="security" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Seguridad Social y Riesgo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nivel de Riesgo ARL</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(riskLevelLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="arl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ARL</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar ARL" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {arlOptions?.filter(a => a.is_active && !!a.name).map((arl) => (
                                  <SelectItem key={arl.id} value={arl.name}>{arl.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="eps"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>EPS</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar EPS" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {epsOptions?.filter(e => e.is_active && !!e.name).map((eps) => (
                                  <SelectItem key={eps.id} value={eps.name}>{eps.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="afp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AFP (Pensión)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar AFP" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {afpOptions?.filter(a => a.is_active && !!a.name).map((afp) => (
                                  <SelectItem key={afp.id} value={afp.name}>{afp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ccf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Caja de Compensación</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar CCF" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {ccfOptions?.filter(c => c.is_active && !!c.name).map((ccf) => (
                                  <SelectItem key={ccf.id} value={ccf.name}>{ccf.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="afc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AFC (Ahorro)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar AFC" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {afcOptions?.filter(a => a.is_active && !!a.name).map((afc) => (
                                  <SelectItem key={afc.id} value={afc.name}>{afc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ips"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IPS Preferida</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar IPS" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {ipsOptions?.filter(i => i.is_active && !!i.name).map((ips) => (
                                  <SelectItem key={ips.id} value={ips.name}>{ips.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* F. BANK TAB */}
                <TabsContent value="bank" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Información Bancaria</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banco</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar banco" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {bankOptions?.filter(b => b.is_active && !!b.name).map((bank) => (
                                  <SelectItem key={bank.id} value={bank.name}>{bank.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Cuenta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(accountTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Cuenta</FormLabel>
                            <FormControl><Input placeholder="1234567890" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="accountRegistered"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">Cuenta inscrita y verificada</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* J. SCHEDULE TAB */}
                <TabsContent value="schedule" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-primary border-b-2 border-primary/20 pb-2 flex items-center gap-2"><span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>Jornada y Nómina</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="payrollType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Nómina</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(payrollTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="restDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Día de Descanso</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="lunes">Lunes</SelectItem>
                                <SelectItem value="martes">Martes</SelectItem>
                                <SelectItem value="miercoles">Miércoles</SelectItem>
                                <SelectItem value="jueves">Jueves</SelectItem>
                                <SelectItem value="viernes">Viernes</SelectItem>
                                <SelectItem value="sabado">Sábado</SelectItem>
                                <SelectItem value="domingo">Domingo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="isOfficeSchedule"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <FormLabel className="font-normal">Horario de oficina (no trabaja por turnos)</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </div>

              {/* Footer */}
              <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
                <Button type="button" variant="outline" className="h-10 w-full px-5 sm:w-auto" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEmployee.isPending || updateEmployee.isPending}
                  className="gradient-primary h-10 w-full px-5 text-primary-foreground shadow-sm sm:w-auto"
                >
                  {createEmployee.isPending || updateEmployee.isPending ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Empleado')}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
