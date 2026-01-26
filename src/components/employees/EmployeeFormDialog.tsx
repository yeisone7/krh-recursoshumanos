import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarIcon, User, Briefcase, MapPin, Heart, Building, 
  CreditCard, Shield, Clock, Users as UsersIcon, Camera 
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
  employeeFullFormSchema,
  type EmployeeFullFormData,
  type EmployeeV2WithRelations,
  documentTypeLabels,
  genderLabels,
  bloodTypeLabels,
  maritalStatusLabels,
  linkTypeLabels,
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels,
} from '@/types/employee';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
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
import { AvatarUpload } from './AvatarUpload';

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
  const { data: arlOptions = [] } = useARLCatalog();
  const { data: epsOptions = [] } = useEPSCatalog();
  const { data: afpOptions = [] } = useAFPCatalog();
  const { data: ccfOptions = [] } = useCCFCatalog();
  const { data: afcOptions = [] } = useAFCCatalog();
  const { data: ipsOptions = [] } = useIPSCatalog();
  const { data: bankOptions = [] } = useBanksCatalog();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  
  const isEditMode = !!employee;

  // Sync avatar URL when employee changes
  useEffect(() => {
    setAvatarUrl(employee?.avatar_url || null);
  }, [employee]);

  const form = useForm<EmployeeFullFormData>({
    resolver: zodResolver(employeeFullFormSchema),
    defaultValues: {
      birthCountry: 'Colombia',
      linkType: 'indefinido',
      payrollType: 'quincenal',
      isOfficeSchedule: true,
      spouseWorks: false,
      childrenCount: 0,
      accountRegistered: false,
    },
  });

  // Reset form with employee data when editing
  useEffect(() => {
    if (employee && open) {
      form.reset({
        // A. Core Identity
        documentType: employee.document_type as any,
        documentNumber: employee.document_number,
        documentIssueCity: employee.document_issue_city || undefined,
        documentIssueDate: employee.document_issue_date ? new Date(employee.document_issue_date) : undefined,
        firstName: employee.first_name,
        middleName: employee.middle_name || undefined,
        lastName: employee.last_name,
        secondLastName: employee.second_last_name || undefined,
        birthCountry: employee.birth_country || 'Colombia',
        birthDepartment: employee.birth_department || undefined,
        birthCity: employee.birth_city || undefined,
        birthDate: employee.birth_date ? new Date(employee.birth_date) : undefined,
        gender: employee.gender as any,
        bloodType: employee.blood_type as any,
        maritalStatus: employee.marital_status as any,
        
        // B. Contact
        residenceDepartment: employee.contact?.residence_department || undefined,
        residenceCity: employee.contact?.residence_city || undefined,
        residenceAddress: employee.contact?.residence_address || undefined,
        residenceNeighborhood: employee.contact?.residence_neighborhood || undefined,
        email: employee.contact?.email || undefined,
        personalEmail: employee.contact?.personal_email || undefined,
        phone: employee.contact?.phone || undefined,
        mobile: employee.contact?.mobile || undefined,
        emergencyContactName: employee.contact?.emergency_contact_name || undefined,
        emergencyContactPhone: employee.contact?.emergency_contact_phone || undefined,
        emergencyContactRelationship: employee.contact?.emergency_contact_relationship || undefined,
        
        // C. Family
        spouseName: employee.family?.spouse_name || undefined,
        spouseGender: employee.family?.spouse_gender as any,
        spouseBirthDate: employee.family?.spouse_birth_date ? new Date(employee.family.spouse_birth_date) : undefined,
        spouseWorks: employee.family?.spouse_works || false,
        childrenCount: employee.family?.children_count || 0,
        
        // D. Work Info
        operationCenterId: employee.work_info?.operation_center_id || undefined,
        costCenter: employee.work_info?.cost_center || undefined,
        areaId: employee.work_info?.area_id || undefined,
        positionId: employee.work_info?.position_id || undefined,
        positionName: employee.work_info?.position_name || '',
        workCity: employee.work_info?.work_city || undefined,
        hireDate: employee.work_info?.hire_date ? new Date(employee.work_info.hire_date) : new Date(),
        linkType: employee.work_info?.link_type as any || 'indefinido',
        observations: employee.work_info?.observations || undefined,
        
        // E. Social Security
        riskLevel: employee.social_security?.risk_level as any,
        arl: employee.social_security?.arl || undefined,
        eps: employee.social_security?.eps || undefined,
        afp: employee.social_security?.afp || undefined,
        ccf: employee.social_security?.ccf || undefined,
        afc: employee.social_security?.afc || undefined,
        ips: employee.social_security?.ips || undefined,
        
        // F. Bank Info
        bankName: employee.bank_info?.bank_name || undefined,
        accountType: employee.bank_info?.account_type as any,
        accountNumber: employee.bank_info?.account_number || undefined,
        accountRegistered: employee.bank_info?.account_registered || false,
        
        // J. Schedule
        payrollType: employee.schedule?.payroll_type as any || 'quincenal',
        shiftTypeId: employee.schedule?.shift_type_id || undefined,
        isOfficeSchedule: employee.schedule?.is_office_schedule ?? true,
        restDay: employee.schedule?.rest_day || undefined,
      });
    } else if (!employee && open) {
      form.reset({
        birthCountry: 'Colombia',
        linkType: 'indefinido',
        payrollType: 'quincenal',
        isOfficeSchedule: true,
        spouseWorks: false,
        childrenCount: 0,
        accountRegistered: false,
      });
    }
  }, [employee, open, form]);

  const handleSubmit = async (data: EmployeeFullFormData) => {
    if (!currentCompanyId && !isEditMode) {
      toast.error('Error: No hay empresa seleccionada');
      return;
    }

    try {
      if (isEditMode && employee) {
        await updateEmployee.mutateAsync({ id: employee.id, avatarUrl, ...data });
        toast.success('Empleado actualizado', {
          description: `${data.firstName} ${data.lastName} ha sido actualizado exitosamente.`,
        });
      } else {
        await createEmployee.mutateAsync({ ...data, avatarUrl });
        toast.success('Empleado creado', {
          description: `${data.firstName} ${data.lastName} ha sido registrado exitosamente.`,
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
    { value: 'security', label: 'Seguridad Social', icon: Shield },
    { value: 'bank', label: 'Banco', icon: CreditCard },
    { value: 'schedule', label: 'Jornada', icon: Clock },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            {isEditMode ? 'Editar Empleado' : 'Nuevo Empleado'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Modifique la información del empleado según sea necesario.'
              : 'Complete la información del empleado en cada una de las secciones.'
            }
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
                      className="flex-1 min-w-[90px] gap-1.5 text-xs data-[state=active]:bg-background"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(90vh-220px)] px-6 py-4">
                {/* A. IDENTITY TAB */}
                <TabsContent value="identity" className="mt-0 space-y-6">
                  {/* Photo Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Foto del Empleado</h3>
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Documento de Identidad</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(documentTypeLabels).map(([value, label]) => (
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
                        name="documentNumber"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
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
                    </div>
                  </div>

                  {/* Names Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Nombres y Apellidos</h3>
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Nacimiento y Datos Personales</h3>
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
                              <PopoverContent className="w-auto p-0 bg-background" align="start">
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
                            <FormLabel>Género</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                    </div>
                  </div>
                </TabsContent>

                {/* B. CONTACT TAB */}
                <TabsContent value="contact" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Dirección de Residencia</h3>
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
                            <FormLabel>Barrio</FormLabel>
                            <FormControl><Input placeholder="Nombre del barrio" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Datos de Contacto</h3>
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Contacto de Emergencia</h3>
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Cónyuge / Pareja</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="spouseName"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nombre del Cónyuge</FormLabel>
                            <FormControl><Input placeholder="Nombre completo" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="spouseGender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Género</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                        name="spouseBirthDate"
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
                              <PopoverContent className="w-auto p-0 bg-background" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date()}
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
                        name="spouseWorks"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <FormLabel className="font-normal">¿El cónyuge trabaja?</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Hijos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="childrenCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Hijos</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={0} 
                                max={20}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* D. LABOR TAB */}
                <TabsContent value="labor" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Ubicación Organizacional</h3>
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
                                {operationCenters.map((center) => (
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
                                {areas.map((area: any) => (
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
                                {positions.map((position: any) => (
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Vinculación</h3>
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
                              <PopoverContent className="w-auto p-0 bg-background" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
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

                {/* E. SOCIAL SECURITY TAB */}
                <TabsContent value="security" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Seguridad Social y Riesgo</h3>
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
                                {arlOptions.filter(a => a.is_active).map((arl) => (
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
                                {epsOptions.filter(e => e.is_active).map((eps) => (
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
                                {afpOptions.filter(a => a.is_active).map((afp) => (
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
                                {ccfOptions.filter(c => c.is_active).map((ccf) => (
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
                                {afcOptions.filter(a => a.is_active).map((afc) => (
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
                                {ipsOptions.filter(i => i.is_active).map((ips) => (
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Información Bancaria</h3>
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
                                {bankOptions.filter(b => b.is_active).map((bank) => (
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
                    <h3 className="font-semibold text-foreground border-b pb-2">Jornada y Nómina</h3>
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
                                <SelectItem value="domingo">Domingo</SelectItem>
                                <SelectItem value="sabado">Sábado</SelectItem>
                                <SelectItem value="lunes">Lunes</SelectItem>
                                <SelectItem value="rotativo">Rotativo</SelectItem>
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
              </ScrollArea>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createEmployee.isPending || updateEmployee.isPending}
                  className="gradient-primary text-primary-foreground"
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
