import { useState, useEffect, type ReactNode } from 'react';
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
  Loader2,
  Accessibility,
  type LucideIcon
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
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
import type { Shift } from '@/types/schedule';

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
        proceso_exclusivo_pcd: requisition.proceso_exclusivo_pcd || false,
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
      proceso_exclusivo_pcd: data.proceso_exclusivo_pcd,
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

  const calendarClassNames = {
    months: "w-full",
    month: "w-full space-y-3",
    table: "w-full border-collapse",
    head_row: "grid grid-cols-7",
    head_cell: "text-muted-foreground text-center text-[0.75rem] font-medium",
    row: "grid grid-cols-7 mt-1",
    cell: "relative flex h-9 items-center justify-center p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
    day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100",
  };

  const FieldLabel = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => (
    <FormLabel className="block">
      <span className="inline-flex items-center gap-1.5 align-middle leading-none">
        <Icon className="h-4 w-4 shrink-0 translate-y-0 text-primary" />
        <span className="leading-none">{children}</span>
      </span>
    </FormLabel>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-xl sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[calc(100vw-2rem)] sm:max-w-5xl sm:rounded-lg sm:border">
        <DialogTitle className="sr-only">
          {requisition ? 'Editar Requisición' : 'Nueva Requisición de Personal'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para la solicitud de nuevo personal en la organización.
        </DialogDescription>

        <div className="shrink-0 border-b border-border bg-background px-4 pb-3 pt-4 sm:px-6 sm:py-4">
          {/* Decorative patterns */}
          
          
          
          {/* Pattern overlay (dots) removed */}

          <div className="relative flex items-start gap-3 pr-8 sm:gap-4 sm:pr-0">
            {/* Avatar/Initial */}
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-base font-semibold text-primary sm:flex">
              {form.watch('cargo_solicitado') ? form.watch('cargo_solicitado').substring(0, 2).toUpperCase() : 'RP'}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md border-success/20 bg-success/10 text-success">
                  <span className="mr-1.5 h-2 w-2 rounded-full bg-success" />
                  {requisition ? 'En Proceso' : 'Nueva'}
                </Badge>
                <Badge variant="secondary" className="rounded-md border-primary/20 bg-primary/10 font-medium text-primary">
                  {requisitionReasonLabels[form.watch('motivo_solicitud') as RequisitionReason] || 'Solicitud'}
                </Badge>
              </div>
              
              <h2 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground sm:truncate sm:text-2xl">
                {form.watch('cargo_solicitado') || (requisition ? 'Editar Requisición' : 'Nueva Requisición')}
              </h2>
              
              <div className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5 sm:text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-primary/60" />
                  <span className="truncate">{operationCenters.find(c => c.id === form.watch('operation_center_id'))?.name || 'Centro no seleccionado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 shrink-0 text-primary/60" />
                  {format(form.watch('fecha_requisicion') || new Date(), "MMMM yyyy", { locale: es })}
                </div>
                {form.watch('area_id') && (
                  <div className="flex min-w-0 items-center gap-2">
                    <Target className="h-4 w-4 shrink-0 text-primary/60" />
                    <span className="truncate">{areas.find(a => a.id === form.watch('area_id'))?.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit, (errors) => {
            const missingFields = Object.keys(errors).length;
            if (missingFields > 0) {
              toast.error('Campos incompletos', {
                description: 'Por favor diligencie todos los campos obligatorios antes de guardar la requisición.'
              });
            }
          })}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
              <div className="shrink-0 border-b border-border/70 bg-muted/30 px-3 py-2 sm:px-6 sm:py-3">
                <div className="-mx-1 overflow-x-auto px-1 pb-1 scrollbar-themed">
                  <TabsList className="inline-flex h-auto min-w-full justify-start gap-1 rounded-xl border border-border/60 bg-background p-1 shadow-sm sm:grid sm:grid-cols-6">
                    {tabItems.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="h-10 min-w-[4.75rem] flex-1 gap-1.5 rounded-lg px-2 text-[9px] font-bold uppercase tracking-[0.08em] text-muted-foreground shadow-none transition-colors data-[state=active]:bg-[#19a9e5] data-[state=active]:text-white data-[state=active]:shadow-none sm:min-w-0 sm:gap-2 sm:text-[10px] sm:tracking-[0.16em]"
                      >
                        <tab.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-medium">{tab.label}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                {/* Requisition Tab */}
                <TabsContent value="requisition" className="mt-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="fecha_requisicion"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FieldLabel icon={CalendarIcon}>
                            Fecha de Requisición <span className="text-orange-500">*</span>
                          </FieldLabel>
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
                            <PopoverContent className="w-[min(92vw,21rem)] p-2 bg-popover" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="w-full p-0 pointer-events-auto"
                                classNames={calendarClassNames}
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
                          <FieldLabel icon={CalendarIcon}>
                            Fecha Ingreso Estimada
                          </FieldLabel>
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
                            <PopoverContent className="w-[min(92vw,21rem)] p-2 bg-popover" align="start">
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
                                className="w-full p-0 pointer-events-auto"
                                classNames={calendarClassNames}
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
                          <FieldLabel icon={ClipboardList}>
                            Motivo de la Solicitud <span className="text-orange-500">*</span>
                          </FieldLabel>
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

                    <FormField
                      control={form.control}
                      name="proceso_exclusivo_pcd"
                      render={({ field }) => (
                        <FormItem className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
                          <div className="flex flex-col-reverse gap-3">
                            <FormControl>
                              <RadioGroup
                                value={field.value === true ? 'si' : field.value === false ? 'no' : ''}
                                onValueChange={(value) => field.onChange(value === 'si')}
                                className="flex flex-wrap gap-2"
                              >
                                <label className="flex h-9 w-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-amber-200 bg-background/70 px-3 text-sm font-semibold text-amber-950 transition-colors hover:border-amber-400">
                                  <RadioGroupItem value="si" />
                                  Sí
                                </label>
                                <label className="flex h-9 w-24 cursor-pointer items-center justify-center gap-2 rounded-md border border-amber-200 bg-background/70 px-3 text-sm font-semibold text-amber-950 transition-colors hover:border-amber-400">
                                  <RadioGroupItem value="no" />
                                  No
                                </label>
                              </RadioGroup>
                            </FormControl>
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <Accessibility className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                              <FormLabel className="cursor-pointer text-sm font-bold leading-5 text-amber-950">
                                Proceso de selección exclusivo para personas en situación de discapacidad (PcD)
                              </FormLabel>
                            </div>
                          </div>
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
                          <FieldLabel icon={Briefcase}>
                            Cargo Solicitado <span className="text-orange-500">*</span>
                          </FieldLabel>
                          <FormControl>
                            <SearchableSelect
                              options={positions
                                .filter((p) => p.is_active !== false)
                                .map((position) => ({
                                  value: position.name,
                                  label: position.name,
                                }))}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Seleccionar cargo..."
                              searchPlaceholder="Buscar cargo..."
                              triggerClassName="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cantidad_vacantes_requeridas"
                      render={({ field }) => (
                        <FormItem>
                          <FieldLabel icon={Users}>
                            Cantidad de Vacantes <span className="text-orange-500">*</span>
                          </FieldLabel>
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
                          <FieldLabel icon={Target}>
                            Área <span className="text-orange-500">*</span>
                          </FieldLabel>
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
                          <FieldLabel icon={Building2}>
                            Centro de Operación <span className="text-orange-500">*</span>
                          </FieldLabel>
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
                  <div className="rounded-xl border border-border p-4 sm:rounded-2xl sm:p-6">
                    <div className="mb-5 flex items-start gap-3 sm:mb-6 sm:items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
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
                            <FormControl>
                              <SearchableSelect
                                options={positions
                                  .filter((p) => p.is_active !== false)
                                  .map((position) => ({
                                    value: position.name,
                                    label: position.name,
                                  }))}
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                placeholder="Si aplica..."
                                searchPlaceholder="Buscar cargo..."
                                triggerClassName="h-11 bg-background"
                              />
                            </FormControl>
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
                          <FieldLabel icon={Clock}>
                            Horario de Trabajo
                          </FieldLabel>
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
                          <FieldLabel icon={CalendarIcon}>
                            Día de Descanso <span className="text-orange-500">*</span>
                          </FieldLabel>
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
                          <FieldLabel icon={ClipboardList}>
                            Turno de Trabajo
                          </FieldLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl>
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Seleccionar turno específico" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background">
                              {(shifts as Shift[])
                                .filter((shift) => shift.is_active !== false)
                                .map((shift) => (
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
                      <FormItem className="flex flex-row items-center justify-between gap-3 rounded-xl border bg-background p-4 transition-colors hover:bg-background sm:gap-4 sm:rounded-2xl sm:p-5">
                        <div className="flex min-w-0 gap-3 sm:gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <FormLabel className="text-sm font-semibold sm:text-base">Requiere Herramienta</FormLabel>
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
                        <FormItem className="flex flex-row items-center justify-between gap-3 rounded-xl border bg-background p-4 sm:gap-4 sm:rounded-2xl sm:p-5">
                          <div className="flex min-w-0 gap-3 sm:gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
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
                        <FormItem className="flex flex-row items-center justify-between gap-3 rounded-xl border bg-background p-4 sm:gap-4 sm:rounded-2xl sm:p-5">
                          <div className="flex min-w-0 gap-3 sm:gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
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
                        <FieldLabel icon={FileEdit}>
                          Tipo de Contrato Sugerido
                        </FieldLabel>
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
                  <div className="bg-background rounded-xl p-4 border border-dashed border-muted-foreground/30 flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <div className="max-w-xs space-y-0.5">
                      <h4 className="text-sm font-bold text-foreground">Validación del Solicitante</h4>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
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
                </div>
              </ScrollArea>

              <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="order-2 h-11 w-full rounded-md px-5 font-medium sm:order-1 sm:h-10 sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="order-1 h-11 w-full rounded-md px-6 font-semibold sm:order-2 sm:h-10 sm:w-auto"
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
