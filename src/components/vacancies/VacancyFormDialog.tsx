import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Briefcase, DollarSign, FileText, Settings, AlertCircle, FileCheck } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  vacancyFormSchema,
  VacancyFormData,
  vacancyTypeLabels,
  vacancyReasonLabels,
} from '@/types/vacancy';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useCreateVacancy } from '@/hooks/useVacancies';
import { useApprovedRequisitions } from '@/hooks/useRequisitions';
import { useAreas } from '@/hooks/useSystemConfig';

interface VacancyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedRequisitionId?: string;
}

const publicationPlatformOptions = [
  'LinkedIn',
  'Computrabajo',
  'elempleo.com',
  'Indeed',
  'Glassdoor',
  'Portal interno',
  'Referidos',
  'Universidades',
  'Redes sociales',
];

export function VacancyFormDialog({ open, onOpenChange, onSuccess, preselectedRequisitionId }: VacancyFormDialogProps) {
  const [activeTab, setActiveTab] = useState('requisition');
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: approvedRequisitions = [], isLoading: loadingRequisitions } = useApprovedRequisitions();
  const { data: areas = [] } = useAreas();
  const createVacancy = useCreateVacancy();

  const form = useForm<VacancyFormData>({
    resolver: zodResolver(vacancyFormSchema),
    defaultValues: {
      requisitionId: preselectedRequisitionId || '',
      shiftType: 'oficina',
      positionsCount: 1,
      vacancyType: 'external',
      vacancyReason: 'new_position',
      includesTransport: true,
      experienceYears: 0,
      openDate: new Date(),
      publicationPlatforms: [],
      priority: 'normal',
    },
  });

  // When selecting a requisition, auto-fill related fields
  const selectedRequisitionId = form.watch('requisitionId');
  
  useEffect(() => {
    if (selectedRequisitionId) {
      const selectedReq = approvedRequisitions.find(r => r.id === selectedRequisitionId);
      if (selectedReq) {
        form.setValue('positionTitle', selectedReq.cargo_solicitado);
        form.setValue('positionsCount', selectedReq.cantidad_vacantes_requeridas);
        if (selectedReq.operation_centers?.name) {
          // Find matching operation center
          const center = operationCenters.find(c => c.name === selectedReq.operation_centers?.name);
          if (center) {
            form.setValue('operationCenterId', center.id);
          }
        }
      }
    }
  }, [selectedRequisitionId, approvedRequisitions, operationCenters, form]);

  const handleSubmit = async (data: VacancyFormData) => {
    try {
      await createVacancy.mutateAsync({
        requisition_id: data.requisitionId,
        operation_center_id: data.operationCenterId || null,
        position_title: data.positionTitle,
        department_area: data.departmentArea || null,
        shift_type: data.shiftType,
        positions_count: data.positionsCount,
        vacancy_type: data.vacancyType,
        vacancy_reason: data.vacancyReason,
        reason_details: data.reasonDetails || null,
        salary_range_min: data.salaryRangeMin ? parseFloat(data.salaryRangeMin.replace(/[^0-9.-]+/g, '')) : null,
        salary_range_max: data.salaryRangeMax ? parseFloat(data.salaryRangeMax.replace(/[^0-9.-]+/g, '')) : null,
        includes_transport: data.includesTransport,
        other_benefits: data.otherBenefits || null,
        job_description: data.jobDescription || null,
        requirements: data.requirements || null,
        experience_years: data.experienceYears,
        education_level: data.educationLevel || null,
        open_date: format(data.openDate, 'yyyy-MM-dd'),
        target_close_date: data.targetCloseDate ? format(data.targetCloseDate, 'yyyy-MM-dd') : null,
        publication_platforms: data.publicationPlatforms,
        priority: data.priority,
        observations: data.observations || null,
      });

      toast.success('Vacante creada', {
        description: `La vacante "${data.positionTitle}" ha sido publicada.`,
      });

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating vacancy:', error);
      toast.error('Error al crear vacante', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const tabItems = [
    { value: 'requisition', label: 'Requisición', icon: FileCheck },
    { value: 'general', label: 'General', icon: Briefcase },
    { value: 'compensation', label: 'Compensación', icon: DollarSign },
    { value: 'description', label: 'Descripción', icon: FileText },
    { value: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            Nueva Vacante
          </DialogTitle>
          <DialogDescription>
            Complete la información de la posición a cubrir.
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
                {/* Requisition Tab */}
                <TabsContent value="requisition" className="mt-0 space-y-6">
                  {approvedRequisitions.length === 0 && !loadingRequisitions ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No hay requisiciones aprobadas disponibles. Debe crear y aprobar una requisición de personal antes de crear una vacante.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <FormField
                      control={form.control}
                      name="requisitionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requisición de Personal *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={loadingRequisitions ? "Cargando..." : "Seleccionar requisición aprobada"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {approvedRequisitions.map((req) => (
                                <SelectItem key={req.id} value={req.id}>
                                  {req.cargo_solicitado} - {req.cantidad_vacantes_requeridas} vacante(s)
                                  {req.operation_centers?.name && ` (${req.operation_centers.name})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            La vacante debe estar vinculada a una requisición de personal aprobada.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedRequisitionId && (
                    <Alert>
                      <FileCheck className="h-4 w-4" />
                      <AlertDescription>
                        Los datos del cargo se han prellenado desde la requisición seleccionada. Puede modificarlos si es necesario.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="positionTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título del Cargo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Analista de Recursos Humanos" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="operationCenterId"
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="departmentArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Área/Departamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar área" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {areas.filter(a => a.is_active).map((area) => (
                                <SelectItem key={area.id} value={area.name}>
                                  {area.name}
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
                      name="shiftType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Jornada</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectItem value="oficina">Oficina</SelectItem>
                              <SelectItem value="turnos">Turnos</SelectItem>
                              <SelectItem value="mixto">Mixto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="positionsCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Posiciones</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                      name="vacancyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Convocatoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {Object.entries(vacancyTypeLabels).map(([value, label]) => (
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
                      name="vacancyReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motivo de la Vacante</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {Object.entries(vacancyReasonLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
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
                      name="openDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Apertura</FormLabel>
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
                      name="targetCloseDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Objetivo de Cierre</FormLabel>
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
                  </div>
                </TabsContent>

                {/* Compensation Tab */}
                <TabsContent value="compensation" className="mt-0 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="salaryRangeMin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salario Mínimo</FormLabel>
                          <FormControl>
                            <Input placeholder="$2.000.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="salaryRangeMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salario Máximo</FormLabel>
                          <FormControl>
                            <Input placeholder="$3.500.000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="includesTransport"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Incluye Auxilio de Transporte</FormLabel>
                          <FormDescription className="text-xs">
                            Aplica para salarios hasta 2 SMMLV
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otherBenefits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Otros Beneficios</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ej: Seguro médico, bonos, trabajo remoto..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Description Tab */}
                <TabsContent value="description" className="mt-0 space-y-6">
                  <FormField
                    control={form.control}
                    name="jobDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción del Cargo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describa las responsabilidades y funciones del cargo..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requisitos</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Liste los requisitos para el cargo..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0 space-y-6">
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="publicationPlatforms"
                    render={() => (
                      <FormItem>
                        <FormLabel>Plataformas de Publicación</FormLabel>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {publicationPlatformOptions.map((platform) => (
                            <FormField
                              key={platform}
                              control={form.control}
                              name="publicationPlatforms"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(platform)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(
                                          checked
                                            ? [...current, platform]
                                            : current.filter((v) => v !== platform)
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">{platform}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="observations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas adicionales sobre la vacante..."
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
              <Button type="submit" disabled={createVacancy.isPending}>
                {createVacancy.isPending ? 'Creando...' : 'Crear Vacante'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
