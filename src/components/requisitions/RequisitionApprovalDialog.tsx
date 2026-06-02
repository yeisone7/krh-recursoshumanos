import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useApproveRequisitionStep, PersonnelRequisition } from '@/hooks/useRequisitions';
import { useContractTypes } from '@/hooks/useContractTypes';
import { useVacancyPlatforms } from '@/hooks/useVacancyPlatforms';
import { recruitmentTypeLabels, RecruitmentType } from '@/types/requisition';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ApprovalStep = 'coordinadores' | 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia';

interface VacancyCodeEntry {
  platformId: string;
  code: string;
  fechaCreacion: string;
  fechaCierre: string;
}

interface RequisitionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: PersonnelRequisition | null;
  step: ApprovalStep;
}

const stepTitles: Record<ApprovalStep, string> = {
  coordinadores: 'Aprobacion Coordinadores',
  operaciones: 'Aprobación de Operaciones',
  rrhh: 'Aprobación de RRHH',
  juridico: 'Aprobación de Jurídico',
  seleccion: 'Aprobación de Selección',
  gerencia: 'Aprobación de Gerencia',
};

export function RequisitionApprovalDialog({
  open,
  onOpenChange,
  requisition,
  step,
}: RequisitionApprovalDialogProps) {
  const { user } = useAuth();
  const approveStep = useApproveRequisitionStep();
  const { data: contractTypes = [] } = useContractTypes();
  const { data: platforms = [] } = useVacancyPlatforms();
  
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-name', user?.id],
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
  
  const defaultApproverName = userProfile?.full_name || user?.email?.split('@')[0] || '';
  
  // All state declarations
  const [approverName, setApproverName] = useState(defaultApproverName);
  const [approved, setApproved] = useState(true);
  const [observations, setObservations] = useState('');
  const [salarioAprobado, setSalarioAprobado] = useState(true);
  const [asignacionSalarial, setAsignacionSalarial] = useState<number | undefined>();
  const [incluyeAuxilioTransporte, setIncluyeAuxilioTransporte] = useState(false);
  const [tipoConvocatoria, setTipoConvocatoria] = useState<string>('');
  const [condicionesAdicionales, setCondicionesAdicionales] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [duracion, setDuracion] = useState('');
  const [fechaInicioProceso, setFechaInicioProceso] = useState<Date | undefined>();
  // New seleccion fields
  const [perfilCargoCreado, setPerfilCargoCreado] = useState(false);
  const [tipoManoObra, setTipoManoObra] = useState('');
  const [vacancyCodes, setVacancyCodes] = useState<VacancyCodeEntry[]>([]);
  
  useEffect(() => {
    if (defaultApproverName && !approverName) {
      setApproverName(defaultApproverName);
    }
  }, [defaultApproverName]);

  useEffect(() => {
    if (open) {
      setApproverName(defaultApproverName);
      setApproved(true);
      setObservations('');
      setSalarioAprobado(true);
      setAsignacionSalarial(undefined);
      setIncluyeAuxilioTransporte(false);
      setTipoConvocatoria('');
      setCondicionesAdicionales('');
      setTipoContrato('');
      setDuracion('');
      setFechaInicioProceso(undefined);
      setPerfilCargoCreado(false);
      setTipoManoObra('');
      setVacancyCodes([]);
    }
  }, [open, defaultApproverName]);

  const isStepValid = (): boolean => {
    if (!defaultApproverName.trim()) return false;
    if (!approved) return true;

    switch (step) {
      case 'coordinadores':
        return true;
      case 'operaciones':
        return true;
      case 'rrhh':
        return !!(asignacionSalarial && asignacionSalarial > 0 && tipoConvocatoria);
      case 'juridico':
        return !!(tipoContrato && duracion.trim());
      case 'seleccion':
        return !!(fechaInicioProceso && tipoManoObra);
      case 'gerencia':
        return true;
      default:
        return true;
    }
  };

  const canSubmit = isStepValid();

  const addVacancyCode = () => {
    setVacancyCodes(prev => [...prev, { platformId: '', code: '', fechaCreacion: '', fechaCierre: '' }]);
  };

  const removeVacancyCode = (index: number) => {
    setVacancyCodes(prev => prev.filter((_, i) => i !== index));
  };

  const updateVacancyCode = (index: number, field: keyof VacancyCodeEntry, value: string) => {
    setVacancyCodes(prev => prev.map((entry, i) => i === index ? { ...entry, [field]: value } : entry));
  };

  const { hasPermission } = useAuth();
  
  const stepPermissionMap: Record<ApprovalStep, string> = {
    coordinadores: 'req_approve_coordinadores',
    rrhh: 'req_approve_rh',
    juridico: 'req_approve_juridica',
    operaciones: 'req_approve_ger_op',
    gerencia: 'req_approve_ger_adm',
    seleccion: 'req_approve_seleccion',
  };

  const canApproveStep = hasPermission(stepPermissionMap[step], 'approve');
  const canManageSalaries = hasPermission('salarios', 'update');

  const onSubmit = async () => {
    if (!requisition) return;
    
    if (!canApproveStep) {
      toast.error('No tienes permisos para aprobar este paso');
      return;
    }

    if (step === 'rrhh' && approved && !canManageSalaries) {
      toast.error('No tienes permisos para asignar salarios');
      return;
    }

    const data: Record<string, any> = {
      [`${step}_quien_aprobo`]: defaultApproverName,
      [`${step}_observaciones`]: observations,
    };

    if (step === 'operaciones') {
      data.operaciones_aprobado_salario = salarioAprobado;
    } else if (step === 'coordinadores') {
      data.coordinadores_observaciones = observations || null;
    } else if (step === 'rrhh') {
      data.rrhh_asignacion_salarial = asignacionSalarial;
      data.rrhh_incluye_auxilio_transporte = incluyeAuxilioTransporte;
      data.rrhh_tipo_convocatoria = tipoConvocatoria || null;
      data.rrhh_condiciones_adicionales = condicionesAdicionales || null;
    } else if (step === 'juridico') {
      data.juridico_tipo_contrato = tipoContrato || null;
      data.juridico_duracion = duracion || null;
    } else if (step === 'seleccion') {
      data.seleccion_fecha_inicio_proceso = fechaInicioProceso ? format(fechaInicioProceso, 'yyyy-MM-dd') : null;
      data.seleccion_perfil_cargo_creado = perfilCargoCreado;
      data.seleccion_tipo_mano_obra = tipoManoObra || null;
    } else if (step === 'gerencia') {
      data.gerencia_aprobado_salario = salarioAprobado;
    }

    await approveStep.mutateAsync({
      id: requisition.id,
      step,
      approved,
      data,
    });

    // Save vacancy codes if any
    if (step === 'seleccion' && approved && vacancyCodes.length > 0) {
      const validCodes = vacancyCodes.filter(vc => vc.platformId && vc.code.trim());
      if (validCodes.length > 0) {
        await (supabase as any)
          .from('requisition_vacancy_codes')
          .insert(
            validCodes.map(vc => ({
              requisition_id: requisition.id,
              company_id: requisition.company_id,
              platform_id: vc.platformId,
              codigo_vacante_externa: vc.code.trim(),
              entidad_origen: platforms.find(p => p.id === vc.platformId)?.name || '',
              fecha_creacion: vc.fechaCreacion || null,
              fecha_cierre: vc.fechaCierre || null,
            }))
          );
      }
    }

    onOpenChange(false);
  };

  if (!requisition) return null;

  const activePlatforms = platforms.filter(p => p.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] max-h-[92dvh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 [&_button]:min-h-11 sm:[&_button]:min-h-10 [&_input]:min-h-11 sm:[&_input]:min-h-10 [&_textarea]:min-h-24 [&_[role=combobox]]:min-h-11 sm:[&_[role=combobox]]:min-h-10">
        <DialogHeader className="shrink-0 border-b px-4 pt-4 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle className="pr-8 text-lg leading-tight sm:pr-0">{stepTitles[step]}</DialogTitle>
          <DialogDescription className="break-words pr-8 sm:pr-0">
            Requisición: {requisition.requisition_code || 'RQ-PEND'} - {requisition.cargo_solicitado} ({requisition.cantidad_vacantes_requeridas} vacantes)
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-4">

          {step === 'coordinadores' && (
            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-semibold">Preview de la requisicion</p>
                <p className="text-sm text-muted-foreground">
                  Revisa la solicitud completa antes de registrar la decision.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Codigo</p>
                  <p className="font-semibold">{requisition.requisition_code || 'RQ-PEND'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Cargo solicitado</p>
                  <p className="font-semibold">{requisition.cargo_solicitado}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Vacantes</p>
                  <p className="font-semibold">{requisition.cantidad_vacantes_requeridas}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Solicitante</p>
                  <p className="font-semibold">{requisition.solicitante_nombre}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Cargo solicitante</p>
                  <p className="font-semibold">{requisition.cargo_solicitante || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Area</p>
                  <p className="font-semibold">{requisition.areas?.name || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Centro de operacion</p>
                  <p className="font-semibold">{requisition.operation_centers?.name || 'No especificado'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Fecha estimada de ingreso</p>
                  <p className="font-semibold">{requisition.fecha_ingreso_estimada || 'No especificada'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Horario</p>
                  <p className="font-semibold">{requisition.horario_trabajo || 'No especificado'}</p>
                </div>
              </div>
              {(requisition.cargo_a_reemplazar || requisition.persona_a_reemplazar || requisition.observaciones_motivo_solicitud) && (
                <div className="space-y-2 border-t pt-3 text-sm">
                  {requisition.cargo_a_reemplazar && (
                    <p><span className="font-semibold">Cargo a reemplazar:</span> {requisition.cargo_a_reemplazar}</p>
                  )}
                  {requisition.persona_a_reemplazar && (
                    <p><span className="font-semibold">Persona a reemplazar:</span> {requisition.persona_a_reemplazar}</p>
                  )}
                  {requisition.observaciones_motivo_solicitud && (
                    <p><span className="font-semibold">Observaciones:</span> {requisition.observaciones_motivo_solicitud}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step-specific fields */}
          {step === 'operaciones' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Salario Aprobado</Label>
                <p className="text-sm text-muted-foreground">
                  ¿Se aprueba el salario asignado por RRHH?
                </p>
                {requisition.rrhh_asignacion_salarial && (
                  <p className="text-sm font-semibold text-primary mt-1">
                    ${requisition.rrhh_asignacion_salarial.toLocaleString('es-CO')}
                  </p>
                )}
              </div>
              <Switch checked={salarioAprobado} onCheckedChange={setSalarioAprobado} />
            </div>
          )}

          {step === 'rrhh' && approved && (
            <>
              <div className="space-y-2">
                <Label>
                  Asignación Salarial <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={asignacionSalarial || ''}
                  onChange={(e) => setAsignacionSalarial(parseFloat(e.target.value) || undefined)}
                  className={!asignacionSalarial ? 'border-destructive/50' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Tipo de Convocatoria <span className="text-destructive">*</span>
                </Label>
                <Select value={tipoConvocatoria} onValueChange={setTipoConvocatoria}>
                  <SelectTrigger className={!tipoConvocatoria ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {(Object.keys(recruitmentTypeLabels) as RecruitmentType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {recruitmentTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Incluye Auxilio de Transporte</Label>
                  <p className="text-sm text-muted-foreground">
                    Aplica para salarios hasta 2 SMMLV
                  </p>
                </div>
                <Switch checked={incluyeAuxilioTransporte} onCheckedChange={setIncluyeAuxilioTransporte} />
              </div>

              <div className="space-y-2">
                <Label>Condiciones Adicionales</Label>
                <Textarea
                  value={condicionesAdicionales}
                  onChange={(e) => setCondicionesAdicionales(e.target.value)}
                  placeholder="Condiciones especiales..."
                />
              </div>
            </>
          )}

          {step === 'juridico' && approved && (
            <>
              <div className="space-y-2">
                <Label>
                  Tipo de Contrato <span className="text-destructive">*</span>
                </Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger className={!tipoContrato ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {contractTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.contract_type}>
                        {ct.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Duración del Contrato <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Ej: 6 meses, Indefinido..."
                  className={!duracion.trim() ? 'border-destructive/50' : ''}
                />
              </div>
            </>
          )}

          {step === 'seleccion' && approved && (
            <>
              <div className="space-y-2">
                <Label>
                  Fecha Inicio del Proceso <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !fechaInicioProceso && 'text-muted-foreground border-destructive/50'
                      )}
                    >
                      {fechaInicioProceso ? format(fechaInicioProceso, 'dd/MM/yyyy') : 'Seleccionar fecha'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={8}
                    collisionPadding={16}
                    className="z-[80] w-auto overflow-visible rounded-lg border-border bg-background p-0 shadow-xl"
                  >
                    <DatePickerWithDropdowns
                      selected={fechaInicioProceso}
                      onSelect={setFechaInicioProceso}
                      fromYear={1990}
                      toYear={new Date().getFullYear() + 10}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Creación del Perfil de Cargo */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Creación del Perfil de Cargo</Label>
                  <p className="text-sm text-muted-foreground">
                    ¿Se creó el perfil de cargo?
                  </p>
                </div>
                <Switch checked={perfilCargoCreado} onCheckedChange={setPerfilCargoCreado} />
              </div>

              {/* Tipo Mano de Obra */}
              <div className="space-y-2">
                <Label>
                  Tipo Mano de Obra <span className="text-destructive">*</span>
                </Label>
                <Select value={tipoManoObra} onValueChange={setTipoManoObra}>
                  <SelectTrigger className={!tipoManoObra ? 'border-destructive/50' : ''}>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="calificada">Calificada</SelectItem>
                    <SelectItem value="no_calificada">No Calificada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Códigos de la Vacante */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-base">Códigos de la Vacante</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVacancyCode}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </div>
                {vacancyCodes.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Sin códigos de vacante agregados.
                  </p>
                )}
                {vacancyCodes.map((entry, index) => (
                  <div key={index} className="space-y-2 p-3 border border-border rounded-lg relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeVacancyCode(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="grid grid-cols-1 gap-2 pr-8 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Plataforma</Label>
                        <Select
                          value={entry.platformId}
                          onValueChange={(val) => updateVacancyCode(index, 'platformId', val)}
                        >
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Plataforma" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {activePlatforms.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Código</Label>
                        <Input
                          className="h-9 text-sm"
                          placeholder="Código"
                          value={entry.code}
                          onChange={(e) => updateVacancyCode(index, 'code', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">F. Creación</Label>
                        <Input
                          type="date"
                          className="h-9 text-sm"
                          value={entry.fechaCreacion}
                          onChange={(e) => updateVacancyCode(index, 'fechaCreacion', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">F. Cierre</Label>
                        <Input
                          type="date"
                          className={cn("h-9 text-sm", entry.fechaCreacion && entry.fechaCierre && entry.fechaCierre < entry.fechaCreacion && "border-destructive")}
                          value={entry.fechaCierre}
                          min={entry.fechaCreacion || undefined}
                          onChange={(e) => updateVacancyCode(index, 'fechaCierre', e.target.value)}
                        />
                        {entry.fechaCreacion && entry.fechaCierre && entry.fechaCierre < entry.fechaCreacion && (
                          <p className="text-[11px] text-destructive">No puede ser anterior a la fecha de creación</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {activePlatforms.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay plataformas configuradas. Agrégalas desde el catálogo de Plataformas de Publicación.
                  </p>
                )}
              </div>
            </>
          )}

          {step === 'gerencia' && (
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Salario Aprobado por Gerencia</Label>
                <p className="text-sm text-muted-foreground">
                  ¿Gerencia aprueba el salario asignado?
                </p>
                {requisition.rrhh_asignacion_salarial && (
                  <p className="text-sm font-semibold text-primary mt-1">
                    ${requisition.rrhh_asignacion_salarial.toLocaleString('es-CO')}
                  </p>
                )}
              </div>
              <Switch checked={salarioAprobado} onCheckedChange={setSalarioAprobado} />
            </div>
          )}

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Approval toggle */}
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-background">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">
                {approved ? '✓ Aprobar' : '✗ Rechazar'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {approved
                  ? 'La requisición continuará al siguiente paso.'
                  : 'La requisición será rechazada.'}
              </p>
            </div>
            <Switch checked={approved} onCheckedChange={setApproved} />
          </div>

          </div>
        </div>
        <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={approveStep.isPending || !canSubmit}>
              {approveStep.isPending ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
