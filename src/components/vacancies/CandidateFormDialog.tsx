import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, User, Briefcase, MapPin } from 'lucide-react';

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { candidateFormSchema, CandidateFormData } from '@/types/vacancy';
import { useOpenVacancies } from '@/hooks/useVacancies';
import { useCreateCandidate } from '@/hooks/useCandidates';
import { CityDepartmentSelect } from '@/components/ui/city-department-select';

interface CandidateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId?: string;
  onSuccess?: () => void;
}

export function CandidateFormDialog({ open, onOpenChange, vacancyId, onSuccess }: CandidateFormDialogProps) {
  const [activeTab, setActiveTab] = useState('personal');
  const { data: vacancies = [] } = useOpenVacancies();
  const createCandidate = useCreateCandidate();

  const form = useForm<CandidateFormData>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      vacancyId: vacancyId || '',
      documentType: 'CC',
      experienceYears: 0,
    },
  });

  const handleSubmit = async (data: CandidateFormData) => {
    try {
      await createCandidate.mutateAsync({
        vacancy_id: data.vacancyId,
        first_name: data.firstName,
        last_name: data.lastName,
        document_type: data.documentType as any,
        document_number: data.documentNumber,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        address: data.address || null,
        city: data.city || null,
        department: data.department || null,
        birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
        gender: data.gender || null,
        gender_identity: data.genderIdentity || null,
        gender_identity_other: data.genderIdentity === 'otro' ? (data.genderIdentityOther || null) : null,
        education_level: data.educationLevel || null,
        profession: data.profession || null,
        experience_years: data.experienceYears,
        current_company: data.currentCompany || null,
        current_position: data.currentPosition || null,
        salary_expectation: data.salaryExpectation ? parseFloat(data.salaryExpectation.replace(/[^0-9.-]+/g, '')) : null,
        source: data.source || null,
        general_notes: data.generalNotes || null,
      });

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
    { value: 'professional', label: 'Profesional', icon: Briefcase },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
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
                            <Input placeholder="1234567890" {...field} />
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
                </TabsContent>

                {/* Contact Tab */}
                <TabsContent value="contact" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="correo@ejemplo.com" {...field} />
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

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono Fijo</FormLabel>
                        <FormControl>
                          <Input placeholder="6012345678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <CityDepartmentSelect
                    departmentValue={form.watch('department') || ''}
                    cityValue={form.watch('city') || ''}
                    onDepartmentChange={(value) => form.setValue('department', value)}
                    onCityChange={(value) => form.setValue('city', value)}
                  />

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

                {/* Professional Tab */}
                <TabsContent value="professional" className="mt-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="educationLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nivel Educativo</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="bachiller">Bachiller</SelectItem>
                              <SelectItem value="tecnico">Técnico</SelectItem>
                              <SelectItem value="tecnologo">Tecnólogo</SelectItem>
                              <SelectItem value="profesional">Profesional</SelectItem>
                              <SelectItem value="especializacion">Especialización</SelectItem>
                              <SelectItem value="maestria">Maestría</SelectItem>
                              <SelectItem value="doctorado">Doctorado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profesión / Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Ingeniero de Sistemas" {...field} />
                          </FormControl>
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

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCandidate.isPending}>
                {createCandidate.isPending ? 'Registrando...' : 'Registrar Candidato'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
