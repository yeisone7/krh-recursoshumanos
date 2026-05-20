import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Briefcase, DollarSign, FileText, Settings, AlertCircle, FileCheck, Upload, X, Loader2, GraduationCap, BookOpen, Building2, Target, Zap } from 'lucide-react';

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
import { MultiSelect } from '@/components/ui/multi-select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import {
  vacancyFormSchema,
  VacancyFormData,
  vacancyTypeLabels,
  vacancyReasonLabels,
} from '@/types/vacancy';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useCreateVacancy } from '@/hooks/useVacancies';
import { useApprovedRequisitions } from '@/hooks/useRequisitions';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import { useProfessions } from '@/hooks/useProfessions';

interface VacancyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedRequisitionId?: string;
}

const COLOCADO_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const COLOCADO_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function VacancyFormDialog({ open, onOpenChange, onSuccess, preselectedRequisitionId }: VacancyFormDialogProps) {
  const [activeTab, setActiveTab] = useState('requisition');
  const [colocadoFile, setColocadoFile] = useState<File | null>(null);
  const [uploadingColocado, setUploadingColocado] = useState(false);
  const { currentCompanyId } = useAuth();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: approvedRequisitions = [], isLoading: loadingRequisitions } = useApprovedRequisitions();
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const { data: educationLevels = [] } = useEducationLevels();
  const { data: professions = [] } = useProfessions();
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
      educationLevelIds: [],
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
          const center = operationCenters.find(c => c.name === selectedReq.operation_centers?.name);
          if (center) {
            form.setValue('operationCenterId', center.id);
          }
        }
        // Auto-link position from catalog by matching cargo name
        const matchedPosition = positions.find(
          p => p.is_active && p.name.toLowerCase() === selectedReq.cargo_solicitado.toLowerCase()
        );
        form.setValue('positionId', matchedPosition?.id || undefined);

        // Auto-fill salary assignment from RRHH approval step
        if (selectedReq.rrhh_asignacion_salarial) {
          const formattedSalary = `$${selectedReq.rrhh_asignacion_salarial.toLocaleString('es-CO')}`;
          form.setValue('salaryRangeMin', formattedSalary);
          form.setValue('salaryRangeMax', formattedSalary);
        }
        if (selectedReq.rrhh_incluye_auxilio_transporte !== undefined) {
          form.setValue('includesTransport', !!selectedReq.rrhh_incluye_auxilio_transporte);
        }
      }
    }
  }, [selectedRequisitionId, approvedRequisitions, operationCenters, positions, form]);

  const handleColocadoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!COLOCADO_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Tipo de archivo no permitido', { description: 'Solo PDF, JPG, PNG o WebP' });
      return;
    }
    if (file.size > COLOCADO_MAX_SIZE) {
      toast.error('Archivo muy grande', { description: 'Máximo 10MB' });
      return;
    }
    setColocadoFile(file);
  };

  const clearColocadoFile = () => {
    setColocadoFile(null);
    const input = document.getElementById('colocado-file-input') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleSubmit = async (data: VacancyFormData) => {
    try {
      let colocadoUrl: string | null = null;

      // Upload colocado file if selected
      if (colocadoFile && currentCompanyId) {
        setUploadingColocado(true);
        const fileExt = colocadoFile.name.split('.').pop();
        const filePath = `${currentCompanyId}/vacancies/colocado_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, colocadoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        colocadoUrl = urlData.publicUrl;
        setUploadingColocado(false);
      }

      await createVacancy.mutateAsync({
        requisition_id: data.requisitionId,
        operation_center_id: data.operationCenterId || null,
        position_id: data.positionId || null,
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
        educationLevelIds: data.educationLevelIds,
        education_level: data.educationLevelIds.length > 0 
          ? data.educationLevelIds.map(id => educationLevels.find(e => e.id === id)?.name).filter(Boolean).join(', ') 
          : (data.educationLevel || null),
        education_level_id: data.educationLevelIds.length > 0 ? data.educationLevelIds[0] : null,
        profession_id: (data.professionId && data.professionId !== 'none') ? data.professionId : null,
        open_date: format(data.openDate, 'yyyy-MM-dd'),
        target_close_date: data.targetCloseDate ? format(data.targetCloseDate, 'yyyy-MM-dd') : null,
        publication_platforms: data.publicationPlatforms,
        priority: data.priority,
        observations: data.observations || null,
        colocado_url: colocadoUrl,
      });

      toast.success('Vacante creada', {
        description: `La vacante "${data.positionTitle}" ha sido publicada.`,
      });

      onOpenChange(false);
      form.reset();
      setColocadoFile(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating vacancy:', error);
      setUploadingColocado(false);
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
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden sm:w-full border-none shadow-2xl">
        <DialogTitle className="sr-only">Nueva Vacante</DialogTitle>
        <DialogDescription className="sr-only">Formulario para la creación de una nueva vacante de empleo.</DialogDescription>
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 pt-8 pb-6 sm:px-8 sm:pt-10">
          {/* Decorative patterns */}
          
          
          
          {/* Pattern overlay (dots) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col md:flex-row items-start gap-6">
            {/* Avatar/Initial */}
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner border border-border transition-transform hover:scale-105 duration-300">
              {form.watch('positionTitle') ? form.watch('positionTitle').substring(0, 2).toUpperCase() : 'NV'}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 animate-in fade-in slide-in-from-left-2 duration-500">
                  <span className="w-2 h-2 rounded-full bg-success mr-1.5 animate-pulse" />
                  Nueva
                </Badge>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                  {vacancyTypeLabels[form.watch('vacancyType') as keyof typeof vacancyTypeLabels] || 'Externa'}
                </Badge>
              </div>
              
              <h2 className="text-3xl font-display font-bold text-foreground tracking-tight sm:text-4xl">
                {form.watch('positionTitle') || 'Nueva Vacante'}
              </h2>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <Building2 className="w-4 h-4 text-primary/60" />
                  {operationCenters.find(c => c.id === form.watch('operationCenterId'))?.name || 'Centro no seleccionado'}
                </div>
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <CalendarIcon className="w-4 h-4 text-primary/60" />
                  {format(new Date(), "MMMM yyyy", { locale: es })}
                </div>
                {form.watch('departmentArea') && (
                  <div className="flex items-center gap-2 transition-colors hover:text-primary">
                    <Target className="w-4 h-4 text-primary/60" />
                    {form.watch('departmentArea')}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-2 sm:px-6">
                <TabsList className="w-full h-auto flex-wrap gap-2 bg-transparent p-0 justify-start">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-10 flex-1 min-w-[100px] gap-2 px-4 rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:shadow-none transition-all"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline font-medium">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(95dvh-320px)] px-4 py-4 sm:px-8 sm:py-6">
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
                              {approvedRequisitions.filter(req => !!req.id).map((req) => (
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
                          <FormLabel>Cargo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Analista de Recursos Humanos" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              {operationCenters.filter(c => !!c.id).map((center) => (
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
                              {areas.filter(a => a.is_active && !!a.name).map((area) => (
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
                      name="educationLevelIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-primary" />
                            Niveles Educativos
                          </FormLabel>
                          <FormControl>
                            <MultiSelect
                              options={educationLevels
                                .filter(e => e.is_active)
                                .map(e => ({ label: e.name, value: e.id }))}
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Seleccionar niveles"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="professionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Profesión / Disciplina
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar profesión" />
                              </SelectTrigger>
                            </FormControl>
                             <SelectContent className="bg-background">
                              <SelectItem value="none">Sin especificar / Cualquiera</SelectItem>
                              {professions.filter(p => p.is_active && !!p.id).map((prof) => (
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

                  {/* Colocado - File Upload */}
                  <div className="space-y-2">
                    <FormLabel>Colocado</FormLabel>
                    {colocadoFile ? (
                      <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{colocadoFile.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            ({(colocadoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={clearColocadoFile}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-background transition-colors">
                        <input
                          id="colocado-file-input"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={handleColocadoFileSelect}
                          className="hidden"
                        />
                        <label htmlFor="colocado-file-input" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Clic para adjuntar documento de colocado
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, JPG, PNG o WebP (máx. 10MB)
                          </p>
                        </label>
                      </div>
                    )}
                  </div>

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

            <div className="px-6 py-4 bg-background border-t border-border flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:px-8">
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full sm:w-auto hover:bg-background transition-colors" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full sm:w-auto shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]" 
                disabled={createVacancy.isPending}
              >
                {createVacancy.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</>
                ) : (
                  'Crear Vacante'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
