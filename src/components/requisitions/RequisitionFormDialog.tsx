import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useEmployees } from '@/hooks/useEmployees';
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
  const { user } = useAuth();
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: employees = [] } = useEmployees();
  
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
      motivo_solicitud: 'nuevo_cargo',
      solicitante_nombre: '',
    },
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
        persona_a_reemplazar: requisition.persona_a_reemplazar || undefined,
        requiere_herramienta_trabajo: requisition.requiere_herramienta_trabajo || false,
        horario_trabajo: requisition.horario_trabajo || undefined,
        dia_descanso_obligatorio: requisition.dia_descanso_obligatorio as DayOfWeek | undefined,
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
        motivo_solicitud: 'nuevo_cargo',
        solicitante_nombre: defaultRequesterName,
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
      persona_a_reemplazar: data.persona_a_reemplazar || null,
      requiere_herramienta_trabajo: data.requiere_herramienta_trabajo,
      horario_trabajo: data.horario_trabajo || null,
      dia_descanso_obligatorio: data.dia_descanso_obligatorio || null,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {requisition ? 'Editar Requisición' : 'Nueva Requisición de Personal'}
          </DialogTitle>
          <DialogDescription>
            {requisition
              ? 'Modifica los datos de la requisición.'
              : 'Ingresa los datos para solicitar nuevo personal.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Datos generales */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Datos Generales</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_requisicion"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Requisición *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
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
                      <FormLabel>Fecha Ingreso Estimada</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cargo_solicitado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo Solicitado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                      <FormLabel>Cantidad de Vacantes *</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cargo_a_reemplazar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo a Reemplazar</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
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
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Si aplica..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {activeEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={`${employee.first_name} ${employee.last_name}`}>
                              {employee.first_name} {employee.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horario_trabajo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horario de Trabajo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 6:00 AM - 2:00 PM" {...field} />
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
                      <FormLabel>Día de Descanso</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar día" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {(Object.keys(dayOfWeekLabels) as DayOfWeek[]).map((day) => (
                            <SelectItem key={day} value={day}>
                              {dayOfWeekLabels[day]}
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Requiere Herramienta de Trabajo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        ¿El cargo requiere herramientas o equipos especiales?
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Motivo de la solicitud */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Motivo de la Solicitud</h3>

              <FormField
                control={form.control}
                name="motivo_solicitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
                    <FormLabel>Observaciones del Motivo</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalle adicional sobre el motivo de la solicitud..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información del solicitante */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Información del Solicitante</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="solicitante_nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Solicitante *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre completo" {...field} />
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
                        <Input placeholder="Cargo que ocupa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : requisition ? 'Guardar Cambios' : 'Crear Requisición'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
