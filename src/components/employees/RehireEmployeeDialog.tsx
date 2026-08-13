import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BriefcaseBusiness, Check, Info, Loader2, RotateCcw, UserSearch } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOpenVacancies } from '@/hooks/useVacancies';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAreas, usePositions } from '@/hooks/useSystemConfig';
import { useContractTypes } from '@/hooks/useContractTypes';
import { fetchPositionTemplates } from '@/hooks/useOnboardingTemplates';
import { PREDEFINED_TASKS } from '@/hooks/useOnboardingTasks';
import { selectOnboardingTasks } from '@/lib/onboardingTaskSelection';
import { todayDateOnlyString } from '@/lib/dateOnly';
import { getEmployeeFullName } from '@/types/employee';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface RehireEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    second_last_name: string | null;
  } | null;
}

interface StartRehireResult {
  candidate_id: string;
  vacancy_id: string;
  existing: boolean;
}

interface DirectRehireResult {
  employee_id: string;
  employment_cycle_id: string;
  contract_id: string;
  entry_exam_id: string;
  existing: boolean;
}

interface DirectRehirePrefill {
  work: { operation_center_id: string | null; area_id: string | null; position_id: string | null };
  contract: {
    contract_type: string | null;
    salary: number | null;
    salary_type: string | null;
    transport_allowance: number | null;
    trial_period_days: number | null;
    special_clauses: string | null;
  };
  schedule: { rest_day: string | null };
}

type RehireRoute = 'selection' | 'direct';

interface DirectFormState {
  requestId: string;
  operationCenterId: string;
  areaId: string;
  positionId: string;
  hireDate: string;
  contractType: string;
  endDate: string;
  salary: string;
  salaryType: 'mensual' | 'integral';
  transportAllowance: string;
  trialPeriodDays: string;
  restDay: string;
  specialClauses: string;
  reason: string;
}

const emptyDirectForm = (): DirectFormState => ({
  requestId: crypto.randomUUID(),
  operationCenterId: '',
  areaId: '',
  positionId: '',
  hireDate: todayDateOnlyString(),
  contractType: '',
  endDate: '',
  salary: '',
  salaryType: 'mensual',
  transportAllowance: '0',
  trialPeriodDays: '0',
  restDay: '',
  specialClauses: '',
  reason: '',
});

const fallbackContractTypes = [
  { contract_type: 'indefinido', display_name: 'Indefinido', requires_end_date: false, default_trial_days: 0 },
  { contract_type: 'fijo', display_name: 'Término fijo', requires_end_date: true, default_trial_days: 0 },
  { contract_type: 'obra_labor', display_name: 'Obra o labor', requires_end_date: true, default_trial_days: 0 },
  { contract_type: 'aprendizaje', display_name: 'Aprendizaje', requires_end_date: true, default_trial_days: 0 },
  { contract_type: 'servicios', display_name: 'Prestación de servicios', requires_end_date: true, default_trial_days: 0 },
];

export function RehireEmployeeDialog({ open, onOpenChange, employee }: RehireEmployeeDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentCompanyId, permissions, isSuperAdmin } = useAuth();
  const canDirectRehire = isSuperAdmin || permissions.some(
    (permission) => permission.module_code === 'recontratacion_directa' && permission.action === 'create'
  );
  const { data: vacancies = [], isLoading: vacanciesLoading } = useOpenVacancies();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: areas = [] } = useAreas();
  const { data: positions = [] } = usePositions();
  const { data: configuredContractTypes = [] } = useContractTypes();
  const contractTypes = configuredContractTypes.filter((type) => type.is_active);
  const availableContractTypes = contractTypes.length > 0 ? contractTypes : fallbackContractTypes;

  const [route, setRoute] = useState<RehireRoute>('selection');
  const [vacancyId, setVacancyId] = useState('');
  const [directForm, setDirectForm] = useState<DirectFormState>(emptyDirectForm);
  const [prefilledRequestId, setPrefilledRequestId] = useState('');

  const { data: previousEmployment, isLoading: previousEmploymentLoading } = useQuery({
    queryKey: ['direct-rehire-prefill', employee?.id],
    enabled: open && !!employee?.id && canDirectRehire,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_direct_employee_rehire_prefill', {
        p_employee_id: employee.id,
      });
      if (error) throw error;
      return data as unknown as DirectRehirePrefill;
    },
  });

  useEffect(() => {
    if (!open) {
      setRoute('selection');
      setVacancyId('');
      setDirectForm(emptyDirectForm());
      setPrefilledRequestId('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !previousEmployment || prefilledRequestId === directForm.requestId) return;
    const work = previousEmployment.work;
    const contract = previousEmployment.contract;
    const selectedType = availableContractTypes.find((type) => type.contract_type === contract?.contract_type);
    setDirectForm((current) => ({
      ...current,
      operationCenterId: work?.operation_center_id || '',
      areaId: work?.area_id || '',
      positionId: work?.position_id || '',
      contractType: contract?.contract_type || availableContractTypes[0]?.contract_type || '',
      endDate: '',
      salary: contract?.salary != null ? String(contract.salary) : '',
      salaryType: contract?.salary_type === 'integral' ? 'integral' : 'mensual',
      transportAllowance: String(contract?.transport_allowance || 0),
      trialPeriodDays: String(contract?.trial_period_days ?? selectedType?.default_trial_days ?? 0),
      restDay: previousEmployment.schedule?.rest_day || '',
      specialClauses: contract?.special_clauses || '',
    }));
    setPrefilledRequestId(directForm.requestId);
  }, [availableContractTypes, directForm.requestId, open, prefilledRequestId, previousEmployment]);

  const selectedContractType = availableContractTypes.find(
    (type) => type.contract_type === directForm.contractType
  );
  const filteredPositions = useMemo(
    () => positions.filter((position) =>
      (position.is_active ?? true) && (!directForm.areaId || position.area_id === directForm.areaId)
    ),
    [directForm.areaId, positions]
  );

  const updateDirectField = <K extends keyof DirectFormState>(field: K, value: DirectFormState[K]) => {
    setDirectForm((current) => ({ ...current, [field]: value }));
  };

  const invalidateRehireQueries = () => {
    const keys = [
      'employees', 'employees_v2', 'contracts', 'medical_exams', 'employee-onboarding-tasks',
      'employee-employment-cycles', 'employee-candidate-history', 'dashboard-alerts', 'candidates', 'vacancies',
    ];
    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }));
  };

  const startRehire = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !vacancyId) throw new Error('Seleccione la vacante para iniciar el reingreso.');
      const { data, error } = await supabase.rpc('start_employee_rehire', {
        p_employee_id: employee.id,
        p_vacancy_id: vacancyId,
      } as never);
      if (error) throw error;
      return data as unknown as StartRehireResult;
    },
    onSuccess: (result) => {
      invalidateRehireQueries();
      toast.success(result.existing ? 'Postulación de reingreso retomada' : 'Reingreso iniciado', {
        description: result.existing
          ? 'Ya existía una postulación activa para esta vacante.'
          : 'Se creó una postulación limpia. El empleado permanecerá retirado hasta completar Selección.',
      });
      onOpenChange(false);
      navigate(`/seleccion?candidate=${result.candidate_id}`);
    },
    onError: (error: Error) => toast.error('No se pudo iniciar el reingreso', { description: error.message }),
  });

  const completeDirectRehire = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !currentCompanyId) throw new Error('No hay una empresa o empleado válido.');
      if (!canDirectRehire) throw new Error('No tiene permiso para ejecutar una recontratación directa.');
      if (!directForm.operationCenterId || !directForm.areaId || !directForm.positionId) {
        throw new Error('Seleccione centro de operación, área y cargo.');
      }
      if (!directForm.hireDate || !directForm.contractType || !directForm.salary) {
        throw new Error('Complete fecha de ingreso, tipo de contrato y salario.');
      }
      if (Number(directForm.salary) <= 0) throw new Error('El salario debe ser mayor que cero.');
      if (selectedContractType?.requires_end_date && !directForm.endDate) {
        throw new Error('El tipo de contrato seleccionado requiere fecha de finalización.');
      }
      if (directForm.endDate && directForm.endDate <= directForm.hireDate) {
        throw new Error('La fecha de finalización debe ser posterior a la fecha de ingreso.');
      }
      if (directForm.reason.trim().length < 10) {
        throw new Error('Registre un motivo de al menos 10 caracteres.');
      }

      const positionTasks = await fetchPositionTemplates(currentCompanyId, directForm.positionId);
      const onboardingTasks = selectOnboardingTasks(positionTasks, PREDEFINED_TASKS).map((task) => ({
        task_key: task.task_key,
        task_label: task.task_label,
        task_description: task.task_description || null,
        sort_order: task.sort_order,
      }));

      const { data, error } = await supabase.rpc('complete_direct_employee_rehire', {
        p_employee_id: employee.id,
        p_hiring: {
          request_id: directForm.requestId,
          hire_date: directForm.hireDate,
          end_date: directForm.endDate || null,
          operation_center_id: directForm.operationCenterId,
          area_id: directForm.areaId,
          position_id: directForm.positionId,
          contract_type: directForm.contractType,
          salary: Number(directForm.salary),
          salary_type: directForm.salaryType,
          transport_allowance: Number(directForm.transportAllowance || 0),
          trial_period_days: Number(directForm.trialPeriodDays || 0),
          rest_day: directForm.restDay || null,
          special_clauses: directForm.specialClauses || null,
          reason: directForm.reason.trim(),
          onboarding_tasks: onboardingTasks,
        },
      } as never);
      if (error) throw error;
      return data as unknown as DirectRehireResult;
    },
    onSuccess: (result) => {
      invalidateRehireQueries();
      toast.success(result.existing ? 'Recontratación directa ya registrada' : 'Recontratación directa completada', {
        description: 'El empleado está activo y su examen médico de ingreso quedó pendiente.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error('No se pudo completar la recontratación', { description: error.message }),
  });

  if (!employee) return null;
  const directPending = completeDirectRehire.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1.5rem)] gap-0 overflow-hidden border-border/70 p-0 shadow-2xl sm:max-w-[820px] sm:rounded-2xl">
        <DialogHeader className="border-b bg-background px-5 pb-5 pt-5 pr-12 sm:px-7 sm:pb-6 sm:pt-6 sm:pr-14">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                Recontratar empleado
              </DialogTitle>
              <DialogDescription className="max-w-[58ch] text-sm leading-relaxed">
                Inicia un nuevo ciclo laboral para <strong className="font-semibold text-foreground">{getEmployeeFullName(employee)}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 px-4 py-5 sm:px-7 sm:py-6">
          <section aria-labelledby="rehire-route-label" className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p id="rehire-route-label" className="text-sm font-semibold text-foreground">Tipo de recontratación</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Elige la ruta que corresponde a este caso.</p>
              </div>
              <span className="hidden text-[11px] font-medium text-muted-foreground sm:block">Paso 1 de 2</span>
            </div>

            <div className={cn('grid gap-2 rounded-xl bg-muted/70 p-1.5', canDirectRehire && 'sm:grid-cols-2')}>
              <button
                type="button"
                aria-pressed={route === 'selection'}
                onClick={() => setRoute('selection')}
                className={cn(
                  'group flex min-h-[72px] items-center gap-3 rounded-lg px-3.5 py-3 text-left outline-none transition-all duration-200 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  route === 'selection'
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                    : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                )}
              >
                <span className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  route === 'selection' ? 'bg-primary text-primary-foreground' : 'bg-background text-primary ring-1 ring-border'
                )}>
                  <UserSearch className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Con proceso de selección</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">Nueva postulación y todas las etapas.</span>
                </span>
                {route === 'selection' && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>

              {canDirectRehire && (
                <button
                  type="button"
                  aria-pressed={route === 'direct'}
                  onClick={() => setRoute('direct')}
                  className={cn(
                    'group flex min-h-[72px] items-center gap-3 rounded-lg px-3.5 py-3 text-left outline-none transition-all duration-200 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                    route === 'direct'
                      ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                      : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                  )}
                >
                  <span className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                    route === 'direct' ? 'bg-primary text-primary-foreground' : 'bg-background text-primary ring-1 ring-border'
                  )}>
                    <BriefcaseBusiness className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Recontratación directa</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">Activa el ciclo sin pasar por Selección.</span>
                  </span>
                  {route === 'direct' && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )}
            </div>
          </section>

          {route === 'selection' ? (
            <section aria-labelledby="selection-route-title" className="mt-6 rounded-2xl border bg-background p-4 shadow-sm sm:p-5">
              <div className="mb-5 flex gap-3 border-b pb-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="selection-route-title" className="text-sm font-semibold">Configura la nueva postulación</h3>
                  <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-muted-foreground">
                    Conservaremos la identidad y el contacto. Las etapas, documentos, familia y evaluaciones comenzarán desde cero.
                  </p>
                </div>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">Vacante vigente <span className="text-destructive">*</span></Label>
                <Select value={vacancyId} onValueChange={setVacancyId} disabled={vacanciesLoading}>
                  <SelectTrigger className="h-11 bg-background"><SelectValue placeholder={vacanciesLoading ? 'Cargando vacantes…' : 'Seleccionar vacante'} /></SelectTrigger>
                  <SelectContent>
                    {vacancies.map((vacancy) => (
                      <SelectItem key={vacancy.id} value={vacancy.id}>
                        {vacancy.position_title}{vacancy.operation_centers?.name ? ` · ${vacancy.operation_centers.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!vacanciesLoading && vacancies.length === 0 && (
                  <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">No hay vacantes vigentes disponibles.</p>
                )}
              </div>
            </section>
          ) : (
            <section aria-labelledby="direct-route-title" className="mt-6 space-y-5 rounded-2xl border bg-background p-4 shadow-sm sm:p-5">
              <div className="flex gap-3 border-b border-amber-500/20 pb-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="direct-route-title" className="text-sm font-semibold">Datos del nuevo ciclo laboral</h3>
                  <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-muted-foreground">
                    La activación será inmediata. El examen médico de ingreso quedará creado como pendiente.
                  </p>
                </div>
              </div>
            {previousEmploymentLoading ? (
              <div className="flex items-center justify-center rounded-xl bg-muted/50 py-12 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Cargando último ciclo…</div>
            ) : (
              <>
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Centro de operación *</Label>
                    <Select value={directForm.operationCenterId} onValueChange={(value) => updateDirectField('operationCenterId', value)}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                      <SelectContent>{operationCenters.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Área *</Label>
                    <Select value={directForm.areaId} onValueChange={(value) => {
                      updateDirectField('areaId', value);
                      if (directForm.positionId && positions.find((position) => position.id === directForm.positionId)?.area_id !== value) updateDirectField('positionId', '');
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar área" /></SelectTrigger>
                      <SelectContent>{areas.filter((area) => area.is_active ?? true).map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Cargo *</Label>
                    <Select value={directForm.positionId} onValueChange={(value) => {
                      const position = positions.find((item) => item.id === value);
                      setDirectForm((current) => ({ ...current, positionId: value, areaId: position?.area_id || current.areaId }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                      <SelectContent>{filteredPositions.map((position) => <SelectItem key={position.id} value={position.id}>{position.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de ingreso *</Label>
                    <Input type="date" value={directForm.hireDate} onChange={(event) => updateDirectField('hireDate', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de contrato *</Label>
                    <Select value={directForm.contractType} onValueChange={(value) => {
                      const type = availableContractTypes.find((item) => item.contract_type === value);
                      setDirectForm((current) => ({ ...current, contractType: value, endDate: type?.requires_end_date ? current.endDate : '', trialPeriodDays: String(type?.default_trial_days ?? current.trialPeriodDays) }));
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                      <SelectContent>{availableContractTypes.map((type) => <SelectItem key={type.contract_type} value={type.contract_type}>{type.display_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {selectedContractType?.requires_end_date && (
                    <div className="space-y-2">
                      <Label>Fecha de finalización *</Label>
                      <Input type="date" min={directForm.hireDate} value={directForm.endDate} onChange={(event) => updateDirectField('endDate', event.target.value)} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Salario *</Label>
                    <Input type="number" min="1" step="1" value={directForm.salary} onChange={(event) => updateDirectField('salary', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo salarial *</Label>
                    <Select value={directForm.salaryType} onValueChange={(value: 'mensual' | 'integral') => updateDirectField('salaryType', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="mensual">Mensual</SelectItem><SelectItem value="integral">Integral</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Auxilio de transporte</Label>
                    <Input type="number" min="0" step="1" value={directForm.transportAllowance} onChange={(event) => updateDirectField('transportAllowance', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Periodo de prueba (días)</Label>
                    <Input type="number" min="0" max="60" value={directForm.trialPeriodDays} onChange={(event) => updateDirectField('trialPeriodDays', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Día de descanso</Label>
                    <Input value={directForm.restDay} onChange={(event) => updateDirectField('restDay', event.target.value)} placeholder="Ej. domingo" />
                  </div>
                </div>
                <div className="space-y-2 border-t pt-5">
                  <Label>Cláusulas adicionales</Label>
                  <Textarea className="min-h-[88px]" value={directForm.specialClauses} onChange={(event) => updateDirectField('specialClauses', event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Motivo de la recontratación directa *</Label>
                  <Textarea className="min-h-[96px]" value={directForm.reason} onChange={(event) => updateDirectField('reason', event.target.value)} placeholder="Explique por qué este caso no requiere un nuevo proceso de selección" />
                  <p className="text-xs text-muted-foreground">Mínimo 10 caracteres. Este motivo quedará en la auditoría del ciclo.</p>
                </div>
              </>
            )}
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-4 py-4 sm:px-7 sm:py-5">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {route === 'selection' ? (
            <Button className="min-w-[148px]" onClick={() => startRehire.mutate()} disabled={!vacancyId || startRehire.isPending}>
              {startRehire.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ir a Selección
            </Button>
          ) : (
            <Button className="min-w-[220px]" onClick={() => completeDirectRehire.mutate()} disabled={directPending || previousEmploymentLoading}>
              {directPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar recontratación directa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
