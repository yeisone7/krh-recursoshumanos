import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, User, Briefcase, MapPin, Shield, Users, X, GraduationCap, BookOpen } from 'lucide-react';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { candidateFormSchema, CandidateFormData } from '@/types/vacancy';
import { useOpenVacancies } from '@/hooks/useVacancies';
import { useCreateCandidate } from '@/hooks/useCandidates';
import { CityDepartmentSelect, CitySelect } from '@/components/ui/city-department-select';
import { supabase } from '@/integrations/supabase/client';
import { familyRelationshipOptions } from '@/types/employee';
import { useAuth } from '@/contexts/AuthContext';
import { useCandidateBackground } from '@/hooks/useCandidateBackground';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import { useProfessions } from '@/hooks/useProfessions';
import { CandidateBackgroundAlerts } from '@/components/selection/CandidateBackgroundAlerts';

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId?: string;
  onSuccess?: () => void;
}

export function CandidateFormDialog({ open, onOpenChange, vacancyId, onSuccess }: CandidateFormDialogProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const { currentCompanyId } = useAuth();
  const { data: vacancies = [] } = useOpenVacancies();
  const { data: educationLevels = [] } = useEducationLevels();
  const { data: professions = [] } = useProfessions();
  const createCandidate = useCreateCandidate();
  const { background, loading: bgLoading, checkBackground } = useCandidateBackground();
  const [prefilled, setPrefilled] = useState(false);

  const form = useForm<CandidateFormData>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      vacancyId: vacancyId || '',
      documentType: 'CC',
      experienceYears: 0,
      isFirstJob: false,
      isHeadOfHousehold: false,
      isConflictVictim: false,
      isDemobilized: false,
      familyMembers: [],
    },
  });

  const { fields: familyFields, append: appendFamily, remove: removeFamily } = useFieldArray({
    control: form.control,
    name: 'familyMembers',
  });

  const handleSubmit = async (data: CandidateFormData) => {
    try {
      const candidate = await createCandidate.mutateAsync({
        vacancy_id: data.vacancyId,
        first_name: data.firstName,
        last_name: data.lastName,
        document_type: data.documentType as any,
        document_number: data.documentNumber,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        address: data.address || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        department: data.department || null,
        birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
        document_issue_date: data.documentIssueDate ? format(data.documentIssueDate, 'yyyy-MM-dd') : null,
        document_issue_city: data.documentIssueCity || null,
        gender: data.gender || null,
        gender_identity: data.genderIdentity || null,
        gender_identity_other: data.genderIdentity === 'otro' ? (data.genderIdentityOther || null) : null,
        education_level_id: (data.educationLevelId && data.educationLevelId !== 'none') ? data.educationLevelId : null,
        profession_id: (data.professionId && data.professionId !== 'none') ? data.professionId : null,
        experience_years: data.experienceYears,
        current_company: data.currentCompany || null,
        current_position: data.currentPosition || null,
        salary_expectation: data.salaryExpectation ? parseFloat(data.salaryExpectation.replace(/[^0-9.-]+/g, '')) : null,
        source: data.source || null,
        general_notes: data.generalNotes || null,
        is_first_job: data.isFirstJob || false,
        is_head_of_household: data.isHeadOfHousehold || false,
        disability_type: data.disabilityType || null,
        ethnic_group: data.ethnicGroup || null,
        is_conflict_victim: data.isConflictVictim || false,
        is_demobilized: data.isDemobilized || false,
        blood_type: data.bloodType || null,
        marital_status: data.maritalStatus || null,
        emergency_contact_name: data.emergencyContactName || null,
        emergency_contact_phone: data.emergencyContactPhone || null,
        emergency_contact_relationship: data.emergencyContactRelationship || null,
      });

      // Save family members if any
      if (data.familyMembers && data.familyMembers.length > 0) {
        const familyInserts = data.familyMembers.map((m) => ({
          candidate_id: candidate.id,
          relationship: m.relationship,
          full_name: m.fullName,
          age: m.age ?? null,
          gender: m.gender ?? null,
          observations: m.observations || null,
        }));
        await supabase.from('candidate_family_members' as any).insert(familyInserts);
      }

      toast.success('Candidato registrado', {
        description: `${data.firstName} ${data.lastName} ha sido agregado al proceso.`,
      });

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating candidate:', error);
      toast.error('Error al registrar candidato', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const tabItems = [
    { value: 'personal', label: 'Personal', icon: User },
    { value: 'contact', label: 'Contacto', icon: MapPin },
    { value: 'family', label: 'Familia', icon: Users },
    { value: 'professional', label: 'Profesional', icon: Briefcase },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl p-0 overflow-hidden sm:w-full">
        <DialogHeader className="px-4 pt-5 pb-4 border-b border-border sm:px-6 sm:pt-6">
          <DialogTitle className="font-display text-lg leading-tight flex items-center gap-2 sm:text-xl">
            <User className="w-5 h-5 text-primary" />
            Nuevo Candidato
          </DialogTitle>
          <DialogDescription>
            Registre un candidato para el proceso de selección.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-2 sm:px-6">
                <TabsList className="w-full h-auto flex-wrap gap-1 bg-background p-1">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-9 flex-1 min-w-[64px] gap-2 px-2 data-[state=active]:bg-background sm:min-w-[100px]"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(92dvh-250px)] px-4 py-4 sm:h-[calc(90vh-260px)] sm:px-6">
                <CandidateBackgroundAlerts background={background} loading={bgLoading} compact />

                {/* Personal Tab */}
                <TabsContent value="personal" className="mt-0 space-y-4">
                  <FormField
                    control={form.control}
                    name="vacancyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vacante *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar vacante" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            {vacancies.map((vacancy) => (
                              <SelectItem key={vacancy.id} value={vacancy.id}>
                                {vacancy.position_title} - {(vacancy.operation_centers as any)?.name || 'General'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del candidato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido *</FormLabel>
                          <FormControl>
                            <Input placeholder="Apellido del candidato" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="documentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Documento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                              <SelectItem value="PA">Pasaporte</SelectItem>
                              <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                              <SelectItem value="PEP">PEP</SelectItem>
                              <SelectItem value="PPT">PPT</SelectItem>
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
                          <FormLabel>Número de Documento *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="1234567890"
                              {...field}
                              onBlur={async (e) => {
                                field.onBlur();
                                const docNum = e.target.value.trim();
                                if (docNum.length >= 4) {
                                  const result = await checkBackground(docNum, currentCompanyId);
                                  if (result?.previous_candidacies?.length > 0 && !prefilled) {
                                    const latest = result.previous_candidacies[0];
                                    const current = form.getValues();
                                    if (!current.firstName && latest.first_name) form.setValue('firstName', latest.first_name);
                                    if (!current.lastName && latest.last_name) form.setValue('lastName', latest.last_name);
                                    if (!current.email && latest.email) form.setValue('email', latest.email);
                                    if (!current.mobile && latest.mobile) form.setValue('mobile', latest.mobile);
                                    if (!current.phone && latest.phone) form.setValue('phone', latest.phone || '');
                                    if (!current.address && latest.address) form.setValue('address', latest.address);
                                    if (!current.city && latest.city) form.setValue('city', latest.city);
                                    if (!current.department && latest.department) form.setValue('department', latest.department);
                                    if (!current.neighborhood && latest.neighborhood) form.setValue('neighborhood', latest.neighborhood);
                                    if (!current.gender && latest.gender) form.setValue('gender', latest.gender);
                                    if (!current.educationLevelId && latest.education_level_id) form.setValue('educationLevelId', latest.education_level_id);
                                    if (!current.professionId && latest.profession_id) form.setValue('professionId', latest.profession_id);
                                    if (!current.educationLevel && latest.education_level) form.setValue('educationLevel', latest.education_level);
                                    if (!current.profession && latest.profession) form.setValue('profession', latest.profession);
                                    setPrefilled(true);
                                  }
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
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
                                captionLayout="dropdown-buttons"
                                fromYear={1950}
                                toYear={new Date().getFullYear()}
                                locale={es}
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
                      name="documentIssueCity"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Lugar de Expedición</FormLabel>
                          <FormControl>
                            <CitySelect
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              placeholder="Buscar ciudad..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                  className={cn(
                                    'w-full pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
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
                                captionLayout="dropdown-buttons"
                                fromYear={1950}
                                toYear={new Date().getFullYear() - 16}
                                locale={es}
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
                      name="gender"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Sexo biológico</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="femenino">Femenino</SelectItem>
                              <SelectItem value="masculino">Masculino</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="genderIdentity"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Sexo de identificación</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            if (value !== 'otro') {
                              form.setValue('genderIdentityOther', '');
                            }
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
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
                          <FormItem className="flex flex-col">
                            <FormLabel>¿Cuál?</FormLabel>
                            <FormControl>
                              <Input placeholder="Especifique" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                   </div>

                  {/* Especificaciones de la Persona */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-accent rounded-full" />
                      <h3 className="font-semibold text-foreground">Especificaciones de la Persona</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="isFirstJob"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                            <FormLabel className="text-sm font-normal cursor-pointer">Primer Empleo</FormLabel>
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
                          <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                            <FormLabel className="text-sm font-normal cursor-pointer">Madre Cabeza de Familia</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="disabilityType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discapacidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ninguna" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="ninguna">Ninguna</SelectItem>
                                <SelectItem value="fisica">Física</SelectItem>
                                <SelectItem value="visual">Visual</SelectItem>
                                <SelectItem value="auditiva">Auditiva</SelectItem>
                                <SelectItem value="cognitiva">Cognitiva</SelectItem>
                                <SelectItem value="mental">Mental</SelectItem>
                                <SelectItem value="multiple">Múltiple</SelectItem>
                                <SelectItem value="otra">Otra</SelectItem>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Ninguno" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="ninguno">Ninguno</SelectItem>
                                <SelectItem value="indigena">Indígena</SelectItem>
                                <SelectItem value="afrocolombiano">Afrocolombiano</SelectItem>
                                <SelectItem value="raizal">Raizal</SelectItem>
                                <SelectItem value="palenquero">Palenquero</SelectItem>
                                <SelectItem value="rom">Rom (Gitano)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="isConflictVictim"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                            <FormLabel className="text-sm font-normal cursor-pointer">Víctima del Conflicto Armado</FormLabel>
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
                          <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                            <FormLabel className="text-sm font-normal cursor-pointer">Desmovilizado / Reinsertado</FormLabel>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Otros Datos */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-accent rounded-full" />
                      <h3 className="font-semibold text-foreground">Otros Datos</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="bloodType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Sangre</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
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
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="soltero">Soltero(a)</SelectItem>
                                <SelectItem value="casado">Casado(a)</SelectItem>
                                <SelectItem value="union_libre">Unión Libre</SelectItem>
                                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                                <SelectItem value="viudo">Viudo(a)</SelectItem>
                                <SelectItem value="separado">Separado(a)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="mt-0 space-y-4">
                  {/* Datos de Contacto */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-5 bg-accent rounded-full" />
                    <h3 className="font-semibold text-foreground">Datos de Contacto</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo Personal</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="personal@email.com" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder="3001234567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <CityDepartmentSelect
                    departmentValue={form.watch('department') || ''}
                    cityValue={form.watch('city') || ''}
                    onDepartmentChange={(value) => form.setValue('department', value)}
                    onCityChange={(value) => form.setValue('city', value)}
                  />

                  {/* Contacto de Emergencia */}
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-accent rounded-full" />
                      <h3 className="font-semibold text-foreground">Contacto de Emergencia</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre completo" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input placeholder="3001234567" {...field} />
                            </FormControl>
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
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Esposo(a), Padre, Madre..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="esposo">Esposo(a)</SelectItem>
                                <SelectItem value="padre">Padre</SelectItem>
                                <SelectItem value="madre">Madre</SelectItem>
                                <SelectItem value="hijo">Hijo(a)</SelectItem>
                                <SelectItem value="hermano">Hermano(a)</SelectItem>
                                <SelectItem value="abuelo">Abuelo(a)</SelectItem>
                                <SelectItem value="tio">Tío(a)</SelectItem>
                                <SelectItem value="primo">Primo(a)</SelectItem>
                                <SelectItem value="amigo">Amigo(a)</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Calle 123 # 45-67" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barrio, Vereda u Otro.</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del barrio, vereda, otro..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuente de Candidato</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="¿Cómo nos encontró?" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="computrabajo">Computrabajo</SelectItem>
                            <SelectItem value="elempleo">elempleo.com</SelectItem>
                            <SelectItem value="indeed">Indeed</SelectItem>
                            <SelectItem value="referido">Referido</SelectItem>
                            <SelectItem value="portal_interno">Portal interno</SelectItem>
                            <SelectItem value="universidad">Universidad</SelectItem>
                            <SelectItem value="redes_sociales">Redes sociales</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Family Tab */}
                <TabsContent value="family" className="mt-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-primary flex items-center gap-2">
                      <span className="w-1 h-4 bg-secondary rounded-full inline-block"></span>
                      Núcleo Familiar (Personas a cargo)
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendFamily({ relationship: '', fullName: '', age: undefined, gender: null, observations: '' })}
                      className="gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Agregar familiar
                    </Button>
                  </div>

                  {familyFields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay familiares registrados</p>
                      <p className="text-xs mt-1">Haz clic en "Agregar familiar" para añadir personas a cargo</p>
                    </div>
                  )}

                  {familyFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-background relative">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground bg-background border rounded-full px-3 py-0.5">
                          Familiar #{index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => removeFamily(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3">
                        <FormField
                          control={form.control}
                          name={`familyMembers.${index}.relationship`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Parentesco</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-background">
                                  {familyRelationshipOptions.map((opt) => (
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
                            <FormItem>
                              <FormLabel className="text-xs">Nombre Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Nombre completo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`familyMembers.${index}.age`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Edad</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="Edad"
                                  className="w-20"
                                  min={0}
                                  max={120}
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
                        <FormField
                          control={form.control}
                          name={`familyMembers.${index}.gender`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Sexo biológico</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ''}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                  </SelectTrigger>
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
                          name={`familyMembers.${index}.observations`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Observaciones</FormLabel>
                              <FormControl>
                                <Input placeholder="Observaciones adicionales..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Professional Tab */}
                <TabsContent value="professional" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="educationLevelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            Nivel Educativo
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                             <SelectContent className="bg-background">
                              <SelectItem value="none">Sin especificar</SelectItem>
                              {educationLevels.filter(e => e.is_active).map((level) => (
                                <SelectItem key={level.id} value={level.id}>
                                  {level.name}
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
                      name="professionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Profesión / Título
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                             <SelectContent className="bg-background">
                              <SelectItem value="none">Sin especificar</SelectItem>
                              {professions.filter(p => p.is_active).map((prof) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="experienceYears"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Años de Experiencia</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
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
                      name="currentCompany"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa Actual</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa donde trabaja" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="currentPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo Actual</FormLabel>
                          <FormControl>
                            <Input placeholder="Cargo que desempeña" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="salaryExpectation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expectativa Salarial</FormLabel>
                        <FormControl>
                          <Input placeholder="$3.000.000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="generalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas iniciales sobre el candidato..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="px-4 py-4 border-t border-border flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={createCandidate.isPending}>
                {createCandidate.isPending ? 'Registrando...' : 'Registrar Candidato'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
