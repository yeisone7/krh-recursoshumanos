import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Building2, 
  Target, 
  ClipboardList, 
  Users, 
  Clock, 
  CreditCard, 
  UserCheck, 
  FileEdit, 
  Briefcase,
  AlertCircle,
  Truck,
  Coffee,
  Tool,
  Wrench,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useShifts } from '@/hooks/useSchedules';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useCreateRequisition, useUpdateRequisition, PersonnelRequisition } from '@/hooks/useRequisitions';
import {
  requisitionFormSchema,
  RequisitionFormData,
  requisitionReasonLabels,
  dayOfWeekLabels,
  RequisitionReason,
  DayOfWeek,
} from '@/types/requisition';

interface RequisitionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition?: PersonnelRequisition | null;
}

export function RequisitionFormDialog({
  open,
  onOpenChange,
  requisition,
}: RequisitionFormDialogProps) {
  const [activeTab, setActiveTab] = useState('requisition');
  const { user } = useAuth();
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: employees = [] } = useEmployees();
  const { data: contractTypes = [] } = useContractTypes();
  const { data: shifts = [] } = useShifts();
  
  // Fetch user profile to get full name
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // Get default requester name: profile full_name > email prefix
  const defaultRequesterName = userProfile?.full_name || user?.email?.split('@')[0] || '';
  
  const activeEmployees = employees.filter((e) => e.is_active);
  const createRequisition = useCreateRequisition();
  const updateRequisition = useUpdateRequisition();

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionFormSchema),
    defaultValues: {
      fecha_requisicion: new Date(),
      cantidad_vacantes_requeridas: 1,
      cargo_solicitado: '',
      requiere_herramienta_trabajo: false,
      incluye_alimentacion: false,
      incluye_desplazamiento: false,
      motivo_solicitud: 'nuevo_cargo',
      solicitante_nombre: '',
      persona_a_reemplazar: [],
    },
  });

  const selectedOperationCenterId = form.watch('operation_center_id');
  const filteredActiveEmployees = activeEmployees.filter((e) => {
    if (!selectedOperationCenterId) return true;
    return e.work_info?.operation_center_id === selectedOperationCenterId;
  });

  useEffect(() => {
    if (requisition) {
      form.reset({
        fecha_requisicion: requisition.fecha_requisicion ? new Date(requisition.fecha_requisicion) : new Date(),
        fecha_ingreso_estimada: requisition.fecha_ingreso_estimada ? new Date(requisition.fecha_ingreso_estimada) : undefined,
        cantidad_vacantes_requeridas: requisition.cantidad_vacantes_requeridas,
        cargo_solicitado: requisition.cargo_solicitado,
        area_id: requisition.area_id || undefined,
        operation_center_id: requisition.operation_center_id || undefined,
        cargo_a_reemplazar: requisition.cargo_a_reemplazar || undefined,
        persona_a_reemplazar: requisition.persona_a_reemplazar ? requisition.persona_a_reemplazar.split(', ') : [],
        requiere_herramienta_trabajo: requisition.requiere_herramienta_trabajo || false,
        horario_trabajo: requisition.horario_trabajo || undefined,
        dia_descanso_obligatorio: requisition.dia_descanso_obligatorio as DayOfWeek | undefined,
        
        tipo_contrato_solicitado: requisition.tipo_contrato_solicitado || undefined,
        turno_trabajo_id: requisition.turno_trabajo_id || undefined,
        incluye_alimentacion: requisition.incluye_alimentacion || false,
        incluye_desplazamiento: requisition.incluye_desplazamiento || false,
        trayecto_desplazamiento: requisition.trayecto_desplazamiento || undefined,
        motivo_solicitud: requisition.motivo_solicitud as RequisitionReason,
        observaciones_motivo_solicitud: requisition.observaciones_motivo_solicitud || undefined,
        solicitante_nombre: requisition.solicitante_nombre,
        cargo_solicitante: requisition.cargo_solicitante || undefined,
      });
    } else {
      form.reset({
        fecha_requisicion: new Date(),
        cantidad_vacantes_requeridas: 1,
        cargo_solicitado: '',
        requiere_herramienta_trabajo: false,
        incluye_alimentacion: false,
        incluye_desplazamiento: false,
        motivo_solicitud: 'nuevo_cargo',
        solicitante_nombre: defaultRequesterName,
        persona_a_reemplazar: [],
      });
    }
  }, [requisition, form, defaultRequesterName]);

  const onSubmit = async (data: RequisitionFormData) => {
    const payload = {
      fecha_requisicion: format(data.fecha_requisicion, 'yyyy-MM-dd'),
      fecha_ingreso_estimada: data.fecha_ingreso_estimada ? format(data.fecha_ingreso_estimada, 'yyyy-MM-dd') : null,
      cantidad_vacantes_requeridas: data.cantidad_vacantes_requeridas,
      cargo_solicitado: data.cargo_solicitado,
      area_id: data.area_id || null,
      operation_center_id: data.operation_center_id || null,
      cargo_a_reemplazar: data.cargo_a_reemplazar || null,
      persona_a_reemplazar: data.persona_a_reemplazar && data.persona_a_reemplazar.length > 0 ? data.persona_a_reemplazar.join(', ') : null,
      requiere_herramienta_trabajo: data.requiere_herramienta_trabajo,
      horario_trabajo: data.horario_trabajo || null,
      dia_descanso_obligatorio: data.dia_descanso_obligatorio || null,
      
      tipo_contrato_solicitado: data.tipo_contrato_solicitado || null,
      turno_trabajo_id: data.turno_trabajo_id || null,
      incluye_alimentacion: data.incluye_alimentacion,
      incluye_desplazamiento: data.incluye_desplazamiento,
      trayecto_desplazamiento: data.trayecto_desplazamiento || null,
      motivo_solicitud: data.motivo_solicitud,
      observaciones_motivo_solicitud: data.observaciones_motivo_solicitud || null,
      solicitante_nombre: data.solicitante_nombre,
      cargo_solicitante: data.cargo_solicitante || null,
    };

    if (requisition) {
      await updateRequisition.mutateAsync({ id: requisition.id, ...payload });
    } else {
      await createRequisition.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isLoading = createRequisition.isPending || updateRequisition.isPending;

  const tabItems = [
    { value: 'requisition', label: 'Solicitud', icon: FileEdit },
    { value: 'position', label: 'Posición', icon: Briefcase },
    { value: 'replacement', label: 'Reemplazo', icon: Users },
    { value: 'conditions', label: 'Condiciones', icon: Clock },
    { value: 'benefits', label: 'Beneficios', icon: CreditCard },
    { value: 'requester', label: 'Solicitante', icon: UserCheck },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-4xl p-0 overflow-hidden sm:w-full border-none shadow-2xl">
        <DialogTitle className="sr-only">
          {requisition ? 'Editar Requisición' : 'Nueva Requisición de Personal'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para la solicitud de nuevo personal en la organización.
        </DialogDescription>

        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 pt-8 pb-6 sm:px-8 sm:pt-10">
          {/* Decorative patterns */}
          
          
          
          {/* Pattern overlay (dots) */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="relative flex flex-col md:flex-row items-start gap-6">
            {/* Avatar/Initial */}
            <div className="w-16 h-16 shrink-0 rounded-2xl bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shadow-inner border border-border transition-transform hover:scale-105 duration-300">
              {form.watch('cargo_solicitado') ? form.watch('cargo_solicitado').substring(0, 2).toUpperCase() : 'RP'}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-success/10 text-success border-success/20 animate-in fade-in slide-in-from-left-2 duration-500">
                  <span className="w-2 h-2 rounded-full bg-success mr-1.5 animate-pulse" />
                  {requisition ? 'En Proceso' : 'Nueva'}
                </Badge>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                  {requisitionReasonLabels[form.watch('motivo_solicitud') as RequisitionReason] || 'Solicitud'}
                </Badge>
              </div>
              
              <h2 className="text-3xl font-display font-bold text-foreground tracking-tight sm:text-4xl">
                {form.watch('cargo_solicitado') || (requisition ? 'Editar Requisición' : 'Nueva Requisición')}
              </h2>
              
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <Building2 className="w-4 h-4 text-primary/60" />
                  {operationCenters.find(c => c.id === form.watch('operation_center_id'))?.name || 'Centro no seleccionado'}
                </div>
                <div className="flex items-center gap-2 transition-colors hover:text-primary">
                  <CalendarIcon className="w-4 h-4 text-primary/60" />
                  {format(form.watch('fecha_requisicion') || new Date(), "MMMM yyyy", { locale: es })}
                </div>
                {form.watch('area_id') && (
                  <div className="flex items-center gap-2 transition-colors hover:text-primary">
                    <Target className="w-4 h-4 text-primary/60" />
                    {areas.find(a => a.id === form.watch('area_id'))?.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const missingFields = Object.keys(errors).length;
            if (missingFields > 0) {
              toast.error('Campos incompletos', {
                description: 'Por favor diligencie todos los campos obligatorios antes de guardar la requisición.'
              });
            }
          })}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-2 sm:px-6">
                <TabsList className="w-full h-auto flex-wrap gap-2 bg-transparent p-0 justify-start">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="h-10 flex-1 min-w-[120px] gap-2 px-4 rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline font-medium">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(95dvh-320px)] px-4 py-4 sm:px-8 sm:py-6">
                {/* Requisition Tab */}
                <TabsContent value="requisition" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fecha_requisicion"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            Fecha de Requisición <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal h-11',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar fecha'}
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
                      name="fecha_ingreso_estimada"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            Fecha Ingreso Estimada
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'pl-3 text-left font-normal h-11',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar fecha'}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-background" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                  const fechaReq = form.getValues('fecha_requisicion');
                                  if (!fechaReq) return false;
                                  const minDate = new Date(fechaReq);
                                  minDate.setDate(minDate.getDate() + 8);
                                  minDate.setHours(0, 0, 0, 0);
                                  return date < minDate;
                                }}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1">
                            Mínimo 8 días después de la fecha de requisición
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="motivo_solicitud"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            Motivo de la Solicitud <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar motivo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {(Object.keys(requisitionReasonLabels) as RequisitionReason[]).map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {requisitionReasonLabels[reason]}
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
                      name="observaciones_motivo_solicitud"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observaciones adicionales</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detalle adicional sobre el motivo de la solicitud..."
                              className="min-h-[120px] resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Position Tab */}
                <TabsContent value="position" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cargo_solicitado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            Cargo Solicitado <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar cargo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {positions
                                .filter((p) => p.is_active !== false)
                                .map((position) => (
                                  <SelectItem key={position.id} value={position.name}>
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
                      name="cantidad_vacantes_requeridas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Cantidad de Vacantes <span className="text-orange-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="h-11"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="area_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-primary" />
                            Área <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar área" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {areas.map((area) => (
                                <SelectItem key={area.id} value={area.id}>
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
                      name="operation_center_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" />
                            Centro de Operación <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
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
                </TabsContent>

                {/* Replacement Tab */}
                <TabsContent value="replacement" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="rounded-2xl p-6 border border-border ">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Información de Reemplazo</h4>
                        <p className="text-xs text-muted-foreground">Complete solo si la vacante es para reemplazar a alguien.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="cargo_a_reemplazar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo a Reemplazar</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger className="h-11 bg-background">
                                  <SelectValue placeholder="Si aplica..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {positions
                                  .filter((p) => p.is_active !== false)
                                  .map((position) => (
                                    <SelectItem key={position.id} value={position.name}>
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
                        name="persona_a_reemplazar"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Persona a Reemplazar</FormLabel>
                            <FormControl>
                              <MultiSelect
                                options={filteredActiveEmployees.map(employee => ({
                                  label: `${employee.first_name} ${employee.last_name}`,
                                  value: `${employee.first_name} ${employee.last_name}`
                                }))}
                                value={field.value || []}
                                onChange={field.onChange}
                                placeholder="Seleccionar personas..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Conditions Tab */}
                <TabsContent value="conditions" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="horario_trabajo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            Horario de Trabajo
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: 6:00 AM - 2:00 PM" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dia_descanso_obligatorio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            Día de Descanso <span className="text-orange-500">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar día" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              <SelectGroup>
                                <SelectLabel className="text-primary/70 text-[10px] font-bold uppercase tracking-widest bg-background py-2 mb-1">Horario de Oficina</SelectLabel>
                                {(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as DayOfWeek[]).map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {dayOfWeekLabels[day]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              <SelectSeparator className="my-1" />
                              <SelectGroup>
                                <SelectLabel className="text-primary/70 text-[10px] font-bold uppercase tracking-widest bg-background py-2 mb-1">Turnos</SelectLabel>
                                {(['2_dias', '4_dias', '7_dias'] as DayOfWeek[]).map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {dayOfWeekLabels[day]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="turno_trabajo_id"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel className="flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary" />
                            Turno de Trabajo
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar turno específico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {shifts
                                .filter((s: any) => s.is_active !== false)
                                .map((shift: any) => (
                                  <SelectItem key={shift.id} value={shift.id}>
                                    {shift.name}
                                  </SelectItem>
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
                    name="requiere_herramienta_trabajo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4 rounded-2xl border p-5 bg-background transition-colors hover:bg-background">
                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <FormLabel className="text-base font-semibold">Requiere Herramienta</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              ¿Se requieren equipos o herramientas especiales?
                            </p>
                          </div>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} className="shrink-0" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Benefits Tab */}
                <TabsContent value="benefits" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="incluye_alimentacion"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4 rounded-2xl border p-5 bg-background">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success shrink-0">
                              <Coffee className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-semibold">Alimentación</FormLabel>
                              <p className="text-xs text-muted-foreground">¿Incluye servicio de comedor?</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="shrink-0" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="incluye_desplazamiento"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between gap-4 rounded-2xl border p-5 bg-background">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info shrink-0">
                              <Truck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <FormLabel className="text-base font-semibold">Transporte</FormLabel>
                              <p className="text-xs text-muted-foreground">¿Se incluye desplazamiento?</p>
                            </div>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} className="shrink-0" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch('incluye_desplazamiento') && (
                    <FormField
                      control={form.control}
                      name="trayecto_desplazamiento"
                      render={({ field }) => (
                        <FormItem className="animate-in fade-in zoom-in-95 duration-200">
                          <FormLabel>Trayecto de Desplazamiento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Bogotá - Yopal" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="tipo_contrato_solicitado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileEdit className="w-4 h-4 text-primary" />
                          Tipo de Contrato Sugerido
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Seleccionar tipo de contrato" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-background">
                            {contractTypes
                              .filter((ct) => ct.is_active)
                              .map((ct) => (
                                <SelectItem key={ct.id} value={ct.display_name}>
                                  {ct.display_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Requester Tab */}
                <TabsContent value="requester" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-background rounded-3xl p-8 border border-dashed border-muted-foreground/30 flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                      <UserCheck className="w-10 h-10" />
                    </div>
                    <div className="max-w-md space-y-2">
                      <h4 className="text-xl font-bold text-foreground">Validación del Solicitante</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Esta información identifica quién está realizando el requerimiento de personal ante el área de recursos humanos.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="solicitante_nombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Solicitante</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly className="h-11 bg-background cursor-not-allowed font-medium" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cargo_solicitante"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cargo del Solicitante</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingrese su cargo actual" className="h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </ScrollArea>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-4 py-4 sm:px-8 sm:py-6 bg-background /5 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-11 px-6 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors font-medium order-2 sm:order-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-11 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all font-semibold order-1 sm:order-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    requisition ? 'Actualizar Requisición' : 'Crear Requisición'
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
