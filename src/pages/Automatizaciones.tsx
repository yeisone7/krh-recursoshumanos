import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Bot,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  GitBranch,
  ListChecks,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  Workflow,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  HRAutomation,
  HRAutomationAction,
  HRAutomationEntity,
  HRAutomationInput,
  HRAutomationTrigger,
  useCreateHRAutomation,
  useDeleteHRAutomation,
  useHRAutomationRuns,
  useHRAutomations,
  useUpdateHRAutomation,
} from '@/hooks/useHRAutomations';
import { cn } from '@/lib/utils';

const entityOptions: Array<{ value: HRAutomationEntity | 'all'; label: string; icon: typeof Workflow }> = [
  { value: 'all', label: 'Todas', icon: Workflow },
  { value: 'employee', label: 'Empleados', icon: UserCheck },
  { value: 'candidate', label: 'Candidatos', icon: CircleDot },
  { value: 'leave_request', label: 'Permisos', icon: CalendarClock },
  { value: 'vacation_request', label: 'Vacaciones', icon: Briefcase },
  { value: 'performance_review', label: 'Evaluaciones', icon: ListChecks },
  { value: 'onboarding', label: 'Onboarding', icon: Bot },
];

const triggerOptions: Record<HRAutomationEntity, Array<{ value: HRAutomationTrigger; label: string }>> = {
  employee: [
    { value: 'employee_hired', label: 'Empleado creado / contratado' },
    { value: 'status_changed', label: 'Cambio de estado activo/inactivo' },
    { value: 'department_changed', label: 'Cambio de area, cargo o centro' },
  ],
  candidate: [
    { value: 'candidate_status_changed', label: 'Cambio de estado del candidato' },
    { value: 'status_changed', label: 'Cambio de estado general' },
  ],
  leave_request: [
    { value: 'leave_requested', label: 'Nueva solicitud de permiso' },
    { value: 'status_changed', label: 'Cambio de estado del permiso' },
  ],
  vacation_request: [
    { value: 'vacation_requested', label: 'Nueva solicitud de vacaciones' },
    { value: 'status_changed', label: 'Cambio de estado de vacaciones' },
  ],
  performance_review: [
    { value: 'review_completed', label: 'Evaluacion completada' },
    { value: 'status_changed', label: 'Cambio de estado de evaluacion' },
  ],
  onboarding: [
    { value: 'onboarding_task_completed', label: 'Tarea de onboarding completada' },
    { value: 'status_changed', label: 'Cambio de estado de onboarding' },
  ],
};

const actionOptions: Array<{ value: HRAutomationAction; label: string; description: string; icon: typeof Bell }> = [
  { value: 'notify', label: 'Notificar', description: 'Crea una alerta para roles o responsables definidos.', icon: Bell },
  { value: 'set_status', label: 'Cambiar estado', description: 'Prepara la actualizacion automatica del estado del registro.', icon: RefreshCw },
  { value: 'assign_to', label: 'Asignar responsable', description: 'Asigna el caso a un usuario o rol de RRHH.', icon: UserCheck },
  { value: 'schedule_meeting', label: 'Agendar reunion', description: 'Programa un seguimiento u onboarding.', icon: CalendarClock },
  { value: 'create_task', label: 'Crear tarea', description: 'Deja una actividad operativa para seguimiento.', icon: ListChecks },
];

const initialForm: HRAutomationInput = {
  entity_type: 'employee',
  name: '',
  enabled: true,
  trigger_type: 'employee_hired',
  trigger_config: {},
  action_type: 'notify',
  action_config: {},
};

function triggerLabel(trigger: string) {
  for (const options of Object.values(triggerOptions)) {
    const match = options.find((option) => option.value === trigger);
    if (match) return match.label;
  }
  return trigger;
}

function actionLabel(action: string) {
  return actionOptions.find((option) => option.value === action)?.label || action;
}

function entityLabel(entity: string) {
  return entityOptions.find((option) => option.value === entity)?.label || entity;
}

function getActionIcon(action: HRAutomationAction) {
  return actionOptions.find((option) => option.value === action)?.icon || Zap;
}

function buildTriggerConfig(statusFrom: string, statusTo: string, conditionField: string, conditionValue: string) {
  const config: Record<string, unknown> = {};
  if (statusFrom.trim()) config.status_from = statusFrom.trim();
  if (statusTo.trim()) config.status_to = statusTo.trim();
  if (conditionField.trim() && conditionValue.trim()) {
    config.conditions = { [conditionField.trim()]: conditionValue.trim() };
  }
  return config;
}

function buildActionConfig(action: HRAutomationAction, title: string, message: string, value: string, offsetDays: string) {
  if (action === 'notify') {
    return {
      title: title.trim() || 'Automatizacion de RRHH',
      message: message.trim() || 'Se activo una automatizacion configurada.',
      event_key: value.trim() || 'hr_automation',
    };
  }

  if (action === 'schedule_meeting') {
    return {
      title: title.trim() || 'Seguimiento de RRHH',
      offset_days: Number(offsetDays || 0),
      notes: message.trim(),
    };
  }

  if (action === 'assign_to') {
    return {
      assignee_user_id: value.trim(),
      note: message.trim(),
    };
  }

  if (action === 'set_status') {
    return {
      status: value.trim(),
      reason: message.trim(),
    };
  }

  return {
    title: title.trim() || 'Tarea automatica',
    description: message.trim(),
    offset_days: Number(offsetDays || 0),
  };
}

function AutomationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<HRAutomationInput>(initialForm);
  const [statusFrom, setStatusFrom] = useState('');
  const [statusTo, setStatusTo] = useState('');
  const [conditionField, setConditionField] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const [actionTitle, setActionTitle] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionValue, setActionValue] = useState('');
  const [offsetDays, setOffsetDays] = useState('1');
  const createAutomation = useCreateHRAutomation();

  const selectedAction = actionOptions.find((option) => option.value === form.action_type);

  const reset = () => {
    setStep(1);
    setForm(initialForm);
    setStatusFrom('');
    setStatusTo('');
    setConditionField('');
    setConditionValue('');
    setActionTitle('');
    setActionMessage('');
    setActionValue('');
    setOffsetDays('1');
  };

  const handleEntityChange = (entity: HRAutomationEntity) => {
    setForm((current) => ({
      ...current,
      entity_type: entity,
      trigger_type: triggerOptions[entity][0].value,
    }));
  };

  const handleSubmit = async () => {
    await createAutomation.mutateAsync({
      ...form,
      trigger_config: buildTriggerConfig(statusFrom, statusTo, conditionField, conditionValue),
      action_config: buildActionConfig(form.action_type, actionTitle, actionMessage, actionValue, offsetDays),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden rounded-[28px] border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 bg-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <Workflow className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-950">Nueva automatizacion</DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Configura el flujo bajo el patron Cuando X, entonces Y.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(92vh-184px)] overflow-y-auto px-6 py-5">
          <div className="mb-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-100 p-1">
            {[
              { value: 1, label: '1. Disparador' },
              { value: 2, label: '2. Accion' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStep(item.value)}
                className={cn(
                  'h-11 rounded-xl text-xs font-black uppercase tracking-[0.12em] transition',
                  step === item.value ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Nombre de la automatizacion</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ej. Notificar ingresos nuevos a Talento Humano"
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Entidad</Label>
                  <Select value={form.entity_type} onValueChange={(value) => handleEntityChange(value as HRAutomationEntity)}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entityOptions.filter((entity) => entity.value !== 'all').map((entity) => (
                        <SelectItem key={entity.value} value={entity.value}>
                          {entity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cuando ocurra</Label>
                  <Select
                    value={form.trigger_type}
                    onValueChange={(value) => setForm((current) => ({ ...current, trigger_type: value as HRAutomationTrigger }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions[form.entity_type].map((trigger) => (
                        <SelectItem key={trigger.value} value={trigger.value}>
                          {trigger.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <GitBranch className="size-4 text-sky-500" />
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-700">Condiciones opcionales</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input value={statusFrom} onChange={(event) => setStatusFrom(event.target.value)} placeholder="Estado origen" className="h-11 rounded-xl" />
                  <Input value={statusTo} onChange={(event) => setStatusTo(event.target.value)} placeholder="Estado destino" className="h-11 rounded-xl" />
                  <Input value={conditionField} onChange={(event) => setConditionField(event.target.value)} placeholder="Campo especifico, ej. priority" className="h-11 rounded-xl" />
                  <Input value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} placeholder="Valor esperado" className="h-11 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {actionOptions.map((action) => {
                  const Icon = action.icon;
                  const active = form.action_type === action.value;
                  return (
                    <button
                      key={action.value}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, action_type: action.value }))}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition',
                        active ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-sky-200'
                      )}
                    >
                      <Icon className={cn('mb-3 size-5', active ? 'text-sky-600' : 'text-slate-400')} />
                      <div className="font-black text-slate-900">{action.label}</div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{action.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  {selectedAction ? <selectedAction.icon className="size-4 text-sky-500" /> : <Zap className="size-4 text-sky-500" />}
                  <h3 className="text-sm font-black uppercase tracking-[0.1em] text-slate-700">Parametros de accion</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} placeholder="Titulo o asunto" className="h-11 rounded-xl" />
                  <Input
                    value={actionValue}
                    onChange={(event) => setActionValue(event.target.value)}
                    placeholder={form.action_type === 'notify' ? 'event_key o regla de notificacion' : 'Estado, usuario o valor destino'}
                    className="h-11 rounded-xl"
                  />
                  <Input value={offsetDays} onChange={(event) => setOffsetDays(event.target.value)} placeholder="Dias de desfase" type="number" className="h-11 rounded-xl" />
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Activa al guardar</p>
                      <p className="text-xs text-slate-500">Puedes pausarla desde la tarjeta.</p>
                    </div>
                    <Switch checked={!!form.enabled} onCheckedChange={(enabled) => setForm((current) => ({ ...current, enabled }))} />
                  </div>
                  <Textarea
                    value={actionMessage}
                    onChange={(event) => setActionMessage(event.target.value)}
                    placeholder="Mensaje, descripcion o nota operacional"
                    className="min-h-28 rounded-xl md:col-span-2"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancelar
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!form.name.trim()} className="rounded-xl bg-sky-500 hover:bg-sky-600">
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createAutomation.isPending || !form.name.trim()} className="rounded-xl bg-sky-500 hover:bg-sky-600">
              Crear automatizacion
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AutomationCard({
  automation,
  runs,
  canUpdate,
  canDelete,
}: {
  automation: HRAutomation;
  runs: ReturnType<typeof useHRAutomationRuns>['data'];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const updateAutomation = useUpdateHRAutomation();
  const deleteAutomation = useDeleteHRAutomation();
  const ActionIcon = getActionIcon(automation.action_type);
  const recentRuns = (runs || []).filter((run) => run.automation_id === automation.id).slice(0, 3);

  return (
    <Card className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600">
              <Workflow className="size-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-black text-slate-950">{automation.name}</h3>
                <Badge className={cn('rounded-full', automation.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')}>
                  {automation.enabled ? 'Activa' : 'Pausada'}
                </Badge>
                <Badge variant="outline" className="rounded-full border-sky-200 text-sky-600">
                  {entityLabel(automation.entity_type)}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                Cuando <span className="font-bold text-slate-700">{triggerLabel(automation.trigger_type)}</span>, entonces{' '}
                <span className="font-bold text-slate-700">{actionLabel(automation.action_type)}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={automation.enabled}
              disabled={!canUpdate || updateAutomation.isPending}
              onCheckedChange={(enabled) => updateAutomation.mutate({ id: automation.id, enabled })}
            />
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl text-red-500 hover:text-red-600"
              disabled={!canDelete || deleteAutomation.isPending}
              onClick={() => deleteAutomation.mutate(automation.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_1fr_1.15fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              <Activity className="size-4 text-sky-500" />
              Disparador
            </div>
            <p className="text-sm font-bold text-slate-800">{triggerLabel(automation.trigger_type)}</p>
            <pre className="mt-3 max-h-24 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              {JSON.stringify(automation.trigger_config || {}, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
              <ActionIcon className="size-4 text-sky-500" />
              Accion
            </div>
            <p className="text-sm font-bold text-slate-800">{actionLabel(automation.action_type)}</p>
            <pre className="mt-3 max-h-24 overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              {JSON.stringify(automation.action_config || {}, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <Clock3 className="size-4 text-sky-500" />
                Ultimas ejecuciones
              </div>
              <span className="text-xs font-bold text-slate-500">{automation.run_count} total</span>
            </div>
            {recentRuns.length > 0 ? (
              <div className="space-y-2">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <CheckCircle2 className={cn('mt-0.5 size-4', run.success ? 'text-emerald-500' : 'text-amber-500')} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-700">{run.message || run.status}</p>
                      <p className="text-[11px] text-slate-400">{new Date(run.created_at).toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-24 place-items-center rounded-xl bg-slate-50 text-center text-sm text-slate-400">
                Sin ejecuciones todavia
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Automatizaciones() {
  const [entity, setEntity] = useState<HRAutomationEntity | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { canCreate, canUpdate, canDelete } = useAuth();
  const automationsQuery = useHRAutomations(entity);
  const automationIds = useMemo(() => (automationsQuery.data || []).map((automation) => automation.id), [automationsQuery.data]);
  const runsQuery = useHRAutomationRuns(automationIds);
  const automations = automationsQuery.data || [];

  const activeCount = automations.filter((automation) => automation.enabled).length;
  const queuedCount = (runsQuery.data || []).filter((run) => run.status === 'queued').length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-sky-50" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-3xl bg-sky-100 text-sky-600">
                <Workflow className="size-8" />
              </div>
              <div>
                <Badge className="mb-2 rounded-full bg-sky-100 text-sky-700">Cuando X, entonces Y</Badge>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Automatizaciones RRHH</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Configura reglas operativas para responder a cambios de empleados, candidatos, permisos, vacaciones y evaluaciones.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={!canCreate('automatizaciones')}
              className="h-12 rounded-2xl bg-sky-500 px-5 font-black hover:bg-sky-600"
            >
              <Plus className="mr-2 size-4" />
              Nueva automatizacion
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Automatizaciones', value: automations.length, helper: 'Reglas filtradas', icon: Workflow },
          { label: 'Activas', value: activeCount, helper: 'Listas para dispararse', icon: Zap },
          { label: 'En cola', value: queuedCount, helper: 'Eventos registrados', icon: Clock3 },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{metric.helper}</p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-500">
                <metric.icon className="size-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-100 p-1">
        <div className="grid gap-1 md:grid-cols-4 xl:grid-cols-7">
          {entityOptions.map((option) => {
            const Icon = option.icon;
            const active = entity === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setEntity(option.value)}
                className={cn(
                  'flex h-12 items-center justify-center gap-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.12em] transition',
                  active ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:bg-white/60'
                )}
              >
                <Icon className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {automationsQuery.isLoading ? (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-slate-500">
          Cargando automatizaciones...
        </div>
      ) : automations.length > 0 ? (
        <div className="space-y-4">
          {automations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              runs={runsQuery.data}
              canUpdate={canUpdate('automatizaciones')}
              canDelete={canDelete('automatizaciones')}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-sky-50 text-sky-500">
              <Workflow className="size-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Aun no hay automatizaciones</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Crea la primera regla para registrar eventos y preparar acciones automaticas por modulo.
            </p>
          </div>
        </div>
      )}

      <AutomationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
