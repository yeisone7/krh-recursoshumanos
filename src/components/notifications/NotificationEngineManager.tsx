import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock,
  Edit3,
  Layers,
  Loader2,
  Mail,
  MessageSquareText,
  Plus,
  RadioTower,
  RefreshCw,
  Route,
  Send,
  Settings2,
  Smartphone,
  Trash2,
  Users,
  Webhook,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useRolesPermissions';
import {
  ENGINE_CHANNEL_LABELS,
  ENGINE_CHANNELS,
  ENGINE_KIND_LABELS,
  ENGINE_KINDS,
  ENGINE_PRIORITIES,
  ENGINE_PRIORITY_LABELS,
  NotificationEngineChannel,
  NotificationEngineChannelProvider,
  NotificationEngineEscalationRule,
  NotificationEngineEvent,
  NotificationEngineKind,
  NotificationEnginePriority,
  NotificationEngineRule,
  NotificationEngineTemplate,
  useNotificationEngine,
} from '@/hooks/useNotificationEngine';
import { cn } from '@/lib/utils';

type Option = { id: string; label: string; caption?: string };

const priorityStyles: Record<NotificationEnginePriority, string> = {
  critical: 'border-red-200 bg-red-50 text-red-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  low: 'border-blue-200 bg-blue-50 text-blue-700',
  info: 'border-slate-200 bg-slate-50 text-slate-600',
};

const kindStyles: Record<NotificationEngineKind, string> = {
  notification: 'border-sky-200 bg-sky-50 text-sky-700',
  alert: 'border-rose-200 bg-rose-50 text-rose-700',
};

const channelIcons: Record<NotificationEngineChannel, typeof BellRing> = {
  in_app: BellRing,
  push: Smartphone,
  email: Mail,
  whatsapp: MessageSquareText,
  sms: MessageSquareText,
  teams: Users,
  telegram: Send,
  webhook: Webhook,
};

function toVariableText(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).join(', ');
  return '';
}

function toPrettyJson(value: unknown) {
  try {
    return JSON.stringify(value || {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJsonObject(value: string, fallback: Record<string, unknown> = {}) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('El JSON debe ser un objeto.');
  }
  return parsed as Record<string, unknown>;
}

function parseVariables(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function PriorityBadge({ priority }: { priority: NotificationEnginePriority }) {
  return (
    <Badge variant="outline" className={cn('rounded-md text-[10px] font-black uppercase tracking-wider', priorityStyles[priority])}>
      {ENGINE_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

function KindBadge({ kind }: { kind: NotificationEngineKind }) {
  return (
    <Badge variant="outline" className={cn('rounded-md text-[10px] font-black uppercase tracking-wider', kindStyles[kind])}>
      {ENGINE_KIND_LABELS[kind]}
    </Badge>
  );
}

function ChannelPills({ channels }: { channels: NotificationEngineChannel[] }) {
  if (!channels.length) return <span className="text-xs text-muted-foreground">Sin canales</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {channels.map((channel) => {
        const Icon = channelIcons[channel];
        return (
          <Badge key={channel} variant="outline" className="gap-1 rounded-md bg-background text-[10px] font-bold uppercase tracking-wider">
            <Icon className="h-3 w-3" />
            {ENGINE_CHANNEL_LABELS[channel]}
          </Badge>
        );
      })}
    </div>
  );
}

function CheckboxList({
  options,
  selected,
  onChange,
  emptyLabel,
}: {
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
}) {
  const toggle = (id: string, checked: boolean) => {
    const next = checked ? Array.from(new Set([...selected, id])) : selected.filter((item) => item !== id);
    onChange(next);
  };

  if (!options.length) {
    return <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/70 p-2">
      {options.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-muted/40">
          <Checkbox checked={selected.includes(option.id)} onCheckedChange={(checked) => toggle(option.id, checked === true)} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">{option.label}</span>
            {option.caption && <span className="block truncate text-xs text-muted-foreground">{option.caption}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function ChannelPicker({
  selected,
  onChange,
}: {
  selected: NotificationEngineChannel[];
  onChange: (next: NotificationEngineChannel[]) => void;
}) {
  const toggle = (channel: NotificationEngineChannel, checked: boolean) => {
    const next = checked ? Array.from(new Set([...selected, channel])) : selected.filter((item) => item !== channel);
    onChange(next.length ? next : ['in_app']);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ENGINE_CHANNELS.map((channel) => {
        const Icon = channelIcons[channel];
        return (
          <label key={channel} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 p-3 hover:border-primary/40">
            <Checkbox checked={selected.includes(channel)} onCheckedChange={(checked) => toggle(channel, checked === true)} />
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{ENGINE_CHANNEL_LABELS[channel]}</span>
          </label>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone = 'primary' }: { label: string; value: string | number; icon: typeof BellRing; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-red-50 text-red-600' : tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-primary/10 text-primary')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

interface EventDialogState {
  id?: string;
  event_key: string;
  name: string;
  description: string;
  source_module: string;
  kind: NotificationEngineKind;
  default_priority: NotificationEnginePriority;
  default_channels: NotificationEngineChannel[];
  variables: string;
  sample_payload: string;
  is_active: boolean;
}

function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: NotificationEngineEvent | null;
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState<EventDialogState>({
    event_key: '',
    name: '',
    description: '',
    source_module: 'general',
    kind: 'notification',
    default_priority: 'info',
    default_channels: ['in_app'],
    variables: '',
    sample_payload: '{}',
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      id: event?.id,
      event_key: event?.event_key || '',
      name: event?.name || '',
      description: event?.description || '',
      source_module: event?.source_module || 'general',
      kind: event?.kind || 'notification',
      default_priority: event?.default_priority || 'info',
      default_channels: event?.default_channels?.length ? event.default_channels : ['in_app'],
      variables: toVariableText(event?.variables),
      sample_payload: toPrettyJson(event?.sample_payload),
      is_active: event?.is_active ?? true,
    });
  }, [event, open]);

  const handleSubmit = async () => {
    try {
      await onSave({
        id: draft.id,
        event_key: draft.event_key.trim(),
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        source_module: draft.source_module.trim() || 'general',
        kind: draft.kind,
        default_priority: draft.default_priority,
        default_channels: draft.default_channels,
        variables: parseVariables(draft.variables),
        sample_payload: parseJsonObject(draft.sample_payload),
        is_active: draft.is_active,
      });
      toast.success('Evento guardado');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el evento.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{event ? 'Editar evento' : 'Nuevo evento'}</DialogTitle>
          <DialogDescription>Catalogo central por empresa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Clave tecnica</Label>
            <Input value={draft.event_key} onChange={(e) => setDraft((prev) => ({ ...prev, event_key: e.target.value }))} placeholder="ContratoPorVencer" />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Modulo origen</Label>
            <Input value={draft.source_module} onChange={(e) => setDraft((prev) => ({ ...prev, source_module: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={draft.kind} onValueChange={(value) => setDraft((prev) => ({ ...prev, kind: value as NotificationEngineKind }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENGINE_KINDS.map((kind) => <SelectItem key={kind} value={kind}>{ENGINE_KIND_LABELS[kind]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={draft.default_priority} onValueChange={(value) => setDraft((prev) => ({ ...prev, default_priority: value as NotificationEnginePriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENGINE_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{ENGINE_PRIORITY_LABELS[priority]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Descripcion</Label>
            <Textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Canales por defecto</Label>
            <ChannelPicker selected={draft.default_channels} onChange={(default_channels) => setDraft((prev) => ({ ...prev, default_channels }))} />
          </div>
          <div className="space-y-2">
            <Label>Variables</Label>
            <Input value={draft.variables} onChange={(e) => setDraft((prev) => ({ ...prev, variables: e.target.value }))} placeholder="Empleado, Empresa, Fecha" />
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
            <Switch checked={draft.is_active} onCheckedChange={(is_active) => setDraft((prev) => ({ ...prev, is_active }))} />
            <span className="text-sm font-semibold">Activo</span>
          </label>
          <div className="space-y-2 sm:col-span-2">
            <Label>Payload de ejemplo</Label>
            <Textarea className="min-h-36 font-mono text-xs" value={draft.sample_payload} onChange={(e) => setDraft((prev) => ({ ...prev, sample_payload: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !draft.event_key.trim() || !draft.name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RuleDialogState {
  id?: string;
  event_id: string;
  name: string;
  kind: NotificationEngineKind;
  priority: NotificationEnginePriority;
  channels: NotificationEngineChannel[];
  recipient_role_ids: string[];
  recipient_user_ids: string[];
  conditions: string;
  is_active: boolean;
}

function RuleDialog({
  open,
  onOpenChange,
  rule,
  events,
  roleOptions,
  userOptions,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: NotificationEngineRule | null;
  events: NotificationEngineEvent[];
  roleOptions: Option[];
  userOptions: Option[];
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}) {
  const firstEvent = events[0];
  const [draft, setDraft] = useState<RuleDialogState>({
    event_id: '',
    name: '',
    kind: 'notification',
    priority: 'info',
    channels: ['in_app'],
    recipient_role_ids: [],
    recipient_user_ids: [],
    conditions: '{}',
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    const event = events.find((item) => item.id === rule?.event_id) || firstEvent;
    setDraft({
      id: rule?.id,
      event_id: rule?.event_id || event?.id || '',
      name: rule?.name || (event ? `${event.name} - Regla principal` : ''),
      kind: rule?.kind || event?.kind || 'notification',
      priority: rule?.priority || event?.default_priority || 'info',
      channels: rule?.channels?.length ? rule.channels : event?.default_channels || ['in_app'],
      recipient_role_ids: rule?.recipient_role_ids || [],
      recipient_user_ids: rule?.recipient_user_ids || [],
      conditions: toPrettyJson(rule?.conditions),
      is_active: rule?.is_active ?? true,
    });
  }, [events, firstEvent, open, rule]);

  const handleEventChange = (eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    setDraft((prev) => ({
      ...prev,
      event_id: eventId,
      kind: event?.kind || prev.kind,
      priority: event?.default_priority || prev.priority,
      channels: event?.default_channels?.length ? event.default_channels : prev.channels,
      name: prev.name || (event ? `${event.name} - Regla principal` : ''),
    }));
  };

  const handleSubmit = async () => {
    try {
      await onSave({
        id: draft.id,
        event_id: draft.event_id,
        name: draft.name.trim(),
        kind: draft.kind,
        priority: draft.priority,
        channels: draft.channels,
        recipient_role_ids: draft.recipient_role_ids,
        recipient_user_ids: draft.recipient_user_ids,
        conditions: parseJsonObject(draft.conditions),
        is_active: draft.is_active,
      });
      toast.success('Regla guardada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar la regla.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{rule ? 'Editar regla' : 'Nueva regla'}</DialogTitle>
          <DialogDescription>Destinatarios, prioridad y canales.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>Evento</Label>
            <Select value={draft.event_id} onValueChange={handleEventChange}>
              <SelectTrigger><SelectValue placeholder="Selecciona un evento" /></SelectTrigger>
              <SelectContent>
                {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nombre de regla</Label>
            <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={draft.kind} onValueChange={(value) => setDraft((prev) => ({ ...prev, kind: value as NotificationEngineKind }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENGINE_KINDS.map((kind) => <SelectItem key={kind} value={kind}>{ENGINE_KIND_LABELS[kind]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={draft.priority} onValueChange={(value) => setDraft((prev) => ({ ...prev, priority: value as NotificationEnginePriority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENGINE_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{ENGINE_PRIORITY_LABELS[priority]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
            <Switch checked={draft.is_active} onCheckedChange={(is_active) => setDraft((prev) => ({ ...prev, is_active }))} />
            <span className="text-sm font-semibold">Activa</span>
          </label>
          <div className="space-y-2 lg:col-span-2">
            <Label>Canales</Label>
            <ChannelPicker selected={draft.channels} onChange={(channels) => setDraft((prev) => ({ ...prev, channels }))} />
          </div>
          <div className="space-y-2">
            <Label>Roles destinatarios</Label>
            <CheckboxList options={roleOptions} selected={draft.recipient_role_ids} onChange={(recipient_role_ids) => setDraft((prev) => ({ ...prev, recipient_role_ids }))} emptyLabel="Sin roles activos" />
          </div>
          <div className="space-y-2">
            <Label>Usuarios destinatarios</Label>
            <CheckboxList options={userOptions} selected={draft.recipient_user_ids} onChange={(recipient_user_ids) => setDraft((prev) => ({ ...prev, recipient_user_ids }))} emptyLabel="Sin usuarios vinculados" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Label>Condiciones JSON</Label>
            <Textarea className="min-h-28 font-mono text-xs" value={draft.conditions} onChange={(e) => setDraft((prev) => ({ ...prev, conditions: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !draft.event_id || !draft.name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  template,
  events,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: NotificationEngineTemplate | null;
  events: NotificationEngineEvent[];
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}) {
  const firstEvent = events[0];
  const [draft, setDraft] = useState({
    id: undefined as string | undefined,
    event_id: '',
    channel: 'in_app' as NotificationEngineChannel,
    name: '',
    subject_template: '',
    body_template: '',
    variables: '',
    is_default: false,
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    const event = events.find((item) => item.id === template?.event_id) || firstEvent;
    setDraft({
      id: template?.id,
      event_id: template?.event_id || event?.id || '',
      channel: template?.channel || 'in_app',
      name: template?.name || (event ? `${event.event_key} - App` : ''),
      subject_template: template?.subject_template || '{Empresa}: {Evento}',
      body_template: template?.body_template || 'Hola {Usuario}, tienes una novedad de {Empresa}.',
      variables: toVariableText(template?.variables || event?.variables),
      is_default: template?.is_default ?? false,
      is_active: template?.is_active ?? true,
    });
  }, [events, firstEvent, open, template]);

  const handleSubmit = async () => {
    try {
      await onSave({
        id: draft.id,
        event_id: draft.event_id,
        channel: draft.channel,
        name: draft.name.trim(),
        subject_template: draft.subject_template.trim(),
        body_template: draft.body_template.trim(),
        variables: parseVariables(draft.variables),
        is_default: draft.is_default,
        is_active: draft.is_active,
      });
      toast.success('Plantilla guardada');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar la plantilla.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          <DialogDescription>Asunto, cuerpo y variables dinamicas.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Evento</Label>
            <Select value={draft.event_id} onValueChange={(event_id) => setDraft((prev) => ({ ...prev, event_id }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {events.map((event) => <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={draft.channel} onValueChange={(channel) => setDraft((prev) => ({ ...prev, channel: channel as NotificationEngineChannel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENGINE_CHANNELS.map((channel) => <SelectItem key={channel} value={channel}>{ENGINE_CHANNEL_LABELS[channel]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Nombre</Label>
            <Input value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Asunto</Label>
            <Input value={draft.subject_template} onChange={(e) => setDraft((prev) => ({ ...prev, subject_template: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Cuerpo</Label>
            <Textarea className="min-h-36" value={draft.body_template} onChange={(e) => setDraft((prev) => ({ ...prev, body_template: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Variables</Label>
            <Input value={draft.variables} onChange={(e) => setDraft((prev) => ({ ...prev, variables: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Switch checked={draft.is_default} onCheckedChange={(is_default) => setDraft((prev) => ({ ...prev, is_default }))} />
              <span className="text-sm font-semibold">Defecto</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Switch checked={draft.is_active} onCheckedChange={(is_active) => setDraft((prev) => ({ ...prev, is_active }))} />
              <span className="text-sm font-semibold">Activa</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !draft.event_id || !draft.name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EscalationDialog({
  open,
  onOpenChange,
  escalation,
  rules,
  eventsById,
  roleOptions,
  userOptions,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escalation: NotificationEngineEscalationRule | null;
  rules: NotificationEngineRule[];
  eventsById: Map<string, NotificationEngineEvent>;
  roleOptions: Option[];
  userOptions: Option[];
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}) {
  const firstRule = rules[0];
  const [draft, setDraft] = useState({
    id: undefined as string | undefined,
    rule_id: '',
    sequence: 1,
    wait_hours: 24,
    priority_override: 'none' as NotificationEnginePriority | 'none',
    recipient_role_ids: [] as string[],
    recipient_user_ids: [] as string[],
    channels: ['in_app'] as NotificationEngineChannel[],
    resend_enabled: false,
    resend_interval_hours: 24,
    max_resends: 0,
    is_active: true,
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      id: escalation?.id,
      rule_id: escalation?.rule_id || firstRule?.id || '',
      sequence: escalation?.sequence || 1,
      wait_hours: escalation ? Math.max(1, Math.round(escalation.wait_minutes / 60)) : 24,
      priority_override: escalation?.priority_override || 'none',
      recipient_role_ids: escalation?.recipient_role_ids || [],
      recipient_user_ids: escalation?.recipient_user_ids || [],
      channels: escalation?.channels?.length ? escalation.channels : ['in_app'],
      resend_enabled: escalation?.resend_enabled ?? false,
      resend_interval_hours: escalation?.resend_interval_minutes ? Math.max(1, Math.round(escalation.resend_interval_minutes / 60)) : 24,
      max_resends: escalation?.max_resends || 0,
      is_active: escalation?.is_active ?? true,
    });
  }, [escalation, firstRule, open]);

  const handleSubmit = async () => {
    try {
      await onSave({
        id: draft.id,
        rule_id: draft.rule_id,
        sequence: Number(draft.sequence) || 1,
        wait_minutes: (Number(draft.wait_hours) || 1) * 60,
        priority_override: draft.priority_override === 'none' ? null : draft.priority_override,
        recipient_role_ids: draft.recipient_role_ids,
        recipient_user_ids: draft.recipient_user_ids,
        channels: draft.channels,
        resend_enabled: draft.resend_enabled,
        resend_interval_minutes: draft.resend_enabled ? (Number(draft.resend_interval_hours) || 1) * 60 : null,
        max_resends: Number(draft.max_resends) || 0,
        is_active: draft.is_active,
      });
      toast.success('Escalamiento guardado');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el escalamiento.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{escalation ? 'Editar escalamiento' : 'Nuevo escalamiento'}</DialogTitle>
          <DialogDescription>Tiempo de espera, prioridad y destinatarios adicionales.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 lg:col-span-2">
            <Label>Regla base</Label>
            <Select value={draft.rule_id} onValueChange={(rule_id) => setDraft((prev) => ({ ...prev, rule_id }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {rules.map((rule) => {
                  const event = eventsById.get(rule.event_id);
                  return <SelectItem key={rule.id} value={rule.id}>{rule.name} / {event?.name || 'Evento'}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Secuencia</Label>
              <Input type="number" min={1} value={draft.sequence} onChange={(e) => setDraft((prev) => ({ ...prev, sequence: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Espera horas</Label>
              <Input type="number" min={1} value={draft.wait_hours} onChange={(e) => setDraft((prev) => ({ ...prev, wait_hours: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={draft.priority_override} onValueChange={(priority_override) => setDraft((prev) => ({ ...prev, priority_override: priority_override as NotificationEnginePriority | 'none' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cambio</SelectItem>
                  {ENGINE_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{ENGINE_PRIORITY_LABELS[priority]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
            <Switch checked={draft.is_active} onCheckedChange={(is_active) => setDraft((prev) => ({ ...prev, is_active }))} />
            <span className="text-sm font-semibold">Activo</span>
          </label>
          <div className="space-y-2 lg:col-span-2">
            <Label>Canales</Label>
            <ChannelPicker selected={draft.channels} onChange={(channels) => setDraft((prev) => ({ ...prev, channels }))} />
          </div>
          <div className="space-y-2">
            <Label>Roles adicionales</Label>
            <CheckboxList options={roleOptions} selected={draft.recipient_role_ids} onChange={(recipient_role_ids) => setDraft((prev) => ({ ...prev, recipient_role_ids }))} emptyLabel="Sin roles activos" />
          </div>
          <div className="space-y-2">
            <Label>Usuarios adicionales</Label>
            <CheckboxList options={userOptions} selected={draft.recipient_user_ids} onChange={(recipient_user_ids) => setDraft((prev) => ({ ...prev, recipient_user_ids }))} emptyLabel="Sin usuarios vinculados" />
          </div>
          <div className="grid gap-3 rounded-xl border border-border/70 p-3 sm:grid-cols-3 lg:col-span-2">
            <label className="flex items-center gap-3">
              <Switch checked={draft.resend_enabled} onCheckedChange={(resend_enabled) => setDraft((prev) => ({ ...prev, resend_enabled }))} />
              <span className="text-sm font-semibold">Reenvios</span>
            </label>
            <div className="space-y-2">
              <Label>Cada horas</Label>
              <Input type="number" min={1} disabled={!draft.resend_enabled} value={draft.resend_interval_hours} onChange={(e) => setDraft((prev) => ({ ...prev, resend_interval_hours: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Maximo</Label>
              <Input type="number" min={0} disabled={!draft.resend_enabled} value={draft.max_resends} onChange={(e) => setDraft((prev) => ({ ...prev, max_resends: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !draft.rule_id}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelProviderDialog({
  open,
  onOpenChange,
  provider,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: NotificationEngineChannelProvider | null;
  onSave: (payload: any) => Promise<void>;
  isSaving: boolean;
}) {
  const [draft, setDraft] = useState({
    id: undefined as string | undefined,
    channel: 'in_app' as NotificationEngineChannel,
    provider_key: '',
    display_name: '',
    is_enabled: false,
    config: '{}',
    throttle_per_minute: '',
    retry_policy: '{}',
  });

  useEffect(() => {
    if (!open) return;
    setDraft({
      id: provider?.id,
      channel: provider?.channel || 'in_app',
      provider_key: provider?.provider_key || '',
      display_name: provider?.display_name || '',
      is_enabled: provider?.is_enabled ?? false,
      config: toPrettyJson(provider?.config),
      throttle_per_minute: provider?.throttle_per_minute ? String(provider.throttle_per_minute) : '',
      retry_policy: toPrettyJson(provider?.retry_policy || { max_attempts: 3, backoff_minutes: 15 }),
    });
  }, [open, provider]);

  const handleSubmit = async () => {
    try {
      await onSave({
        id: draft.id,
        channel: draft.channel,
        provider_key: draft.provider_key.trim(),
        display_name: draft.display_name.trim(),
        is_enabled: draft.is_enabled,
        config: parseJsonObject(draft.config),
        throttle_per_minute: draft.throttle_per_minute ? Number(draft.throttle_per_minute) : null,
        retry_policy: parseJsonObject(draft.retry_policy),
      });
      toast.success('Canal guardado');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el canal.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{provider ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          <DialogDescription>Proveedor extensible por canal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={draft.channel} onValueChange={(channel) => setDraft((prev) => ({ ...prev, channel: channel as NotificationEngineChannel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENGINE_CHANNELS.map((channel) => <SelectItem key={channel} value={channel}>{ENGINE_CHANNEL_LABELS[channel]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Clave proveedor</Label>
            <Input value={draft.provider_key} onChange={(e) => setDraft((prev) => ({ ...prev, provider_key: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={draft.display_name} onChange={(e) => setDraft((prev) => ({ ...prev, display_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-border/70 p-3">
              <Switch checked={draft.is_enabled} onCheckedChange={(is_enabled) => setDraft((prev) => ({ ...prev, is_enabled }))} />
              <span className="text-sm font-semibold">Habilitado</span>
            </label>
            <div className="space-y-2">
              <Label>Limite/min</Label>
              <Input type="number" min={1} value={draft.throttle_per_minute} onChange={(e) => setDraft((prev) => ({ ...prev, throttle_per_minute: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Configuracion JSON</Label>
            <Textarea className="min-h-32 font-mono text-xs" value={draft.config} onChange={(e) => setDraft((prev) => ({ ...prev, config: e.target.value }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Reintentos JSON</Label>
            <Textarea className="min-h-24 font-mono text-xs" value={draft.retry_policy} onChange={(e) => setDraft((prev) => ({ ...prev, retry_policy: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !draft.provider_key.trim() || !draft.display_name.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NotificationEngineManager() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('motor_notificaciones', 'view') || hasPermission('alertas', 'view');
  const canCreate = hasPermission('motor_notificaciones', 'create');
  const canUpdate = hasPermission('motor_notificaciones', 'update');
  const canDelete = hasPermission('motor_notificaciones', 'delete');
  const engine = useNotificationEngine();
  const { data: roles = [] } = useCustomRoles();

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [escalationDialogOpen, setEscalationDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NotificationEngineEvent | null>(null);
  const [editingRule, setEditingRule] = useState<NotificationEngineRule | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationEngineTemplate | null>(null);
  const [editingEscalation, setEditingEscalation] = useState<NotificationEngineEscalationRule | null>(null);
  const [editingProvider, setEditingProvider] = useState<NotificationEngineChannelProvider | null>(null);

  const eventsById = useMemo(() => new Map(engine.events.map((event) => [event.id, event])), [engine.events]);
  const rulesById = useMemo(() => new Map(engine.rules.map((rule) => [rule.id, rule])), [engine.rules]);
  const roleOptions = useMemo<Option[]>(
    () => roles.filter((role) => role.is_active).map((role) => ({ id: role.id, label: role.name, caption: role.description || undefined })),
    [roles]
  );
  const userOptions = useMemo<Option[]>(
    () => engine.users.map((user) => ({ id: user.id, label: user.label })),
    [engine.users]
  );

  const openEventDialog = (event: NotificationEngineEvent | null = null) => {
    setEditingEvent(event);
    setEventDialogOpen(true);
  };

  const openRuleDialog = (rule: NotificationEngineRule | null = null) => {
    setEditingRule(rule);
    setRuleDialogOpen(true);
  };

  const openTemplateDialog = (template: NotificationEngineTemplate | null = null) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const openEscalationDialog = (escalation: NotificationEngineEscalationRule | null = null) => {
    setEditingEscalation(escalation);
    setEscalationDialogOpen(true);
  };

  const openProviderDialog = (provider: NotificationEngineChannelProvider | null = null) => {
    setEditingProvider(provider);
    setChannelDialogOpen(true);
  };

  const handleDeleteEvent = async (event: NotificationEngineEvent) => {
    if (!window.confirm(`Eliminar el evento "${event.name}" tambien elimina sus reglas y plantillas.`)) return;
    try {
      await engine.deleteEvent(event.id);
      toast.success('Evento eliminado');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el evento.');
    }
  };

  const handleDeleteRule = async (rule: NotificationEngineRule) => {
    if (!window.confirm(`Eliminar la regla "${rule.name}"?`)) return;
    try {
      await engine.deleteRule(rule.id);
      toast.success('Regla eliminada');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar la regla.');
    }
  };

  const handleDeleteTemplate = async (template: NotificationEngineTemplate) => {
    if (!window.confirm(`Eliminar la plantilla "${template.name}"?`)) return;
    try {
      await engine.deleteTemplate(template.id);
      toast.success('Plantilla eliminada');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar la plantilla.');
    }
  };

  const handleDeleteEscalation = async (escalation: NotificationEngineEscalationRule) => {
    if (!window.confirm(`Eliminar el escalamiento de ${Math.round(escalation.wait_minutes / 60)} horas?`)) return;
    try {
      await engine.deleteEscalation(escalation.id);
      toast.success('Escalamiento eliminado');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo eliminar el escalamiento.');
    }
  };

  const simulateEvent = async (event: NotificationEngineEvent) => {
    try {
      await engine.registerEvent({ event });
      toast.success('Evento registrado en la bitacora');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo registrar el evento.');
    }
  };

  if (!canView) {
    return (
      <Card className="rounded-2xl border-border/70">
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
          <BellRing className="h-10 w-10 text-primary" />
          <div>
            <h3 className="text-lg font-black text-foreground">Motor no habilitado para tu rol</h3>
            <p className="text-sm text-muted-foreground">Solicita el permiso Motor de Notificaciones y Alertas.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (engine.error) {
    return (
      <Card className="rounded-2xl border-destructive/30">
        <CardContent className="flex min-h-40 items-center justify-center text-center text-destructive">
          No se pudo cargar el motor de notificaciones.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-background shadow-sm">
        <CardHeader className="border-b bg-muted/25">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Workflow className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Motor de Notificaciones y Alertas</CardTitle>
                <CardDescription className="mt-1">Eventos, reglas, canales, plantillas, escalamiento y metricas por empresa.</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={engine.refetch} disabled={engine.isLoading} className="h-11 rounded-xl">
              <RefreshCw className={cn('mr-2 h-4 w-4', engine.isLoading && 'animate-spin')} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <MetricCard label="Eventos" value={engine.events.length} icon={Layers} />
          <MetricCard label="Reglas activas" value={engine.rules.filter((rule) => rule.is_active).length} icon={BellRing} />
          <MetricCard label="Escalamientos" value={engine.escalations.filter((item) => item.is_active).length} icon={Route} />
          <MetricCard label="Canales activos" value={engine.channelProviders.filter((provider) => provider.is_enabled).length} icon={RadioTower} />
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="flex h-auto max-w-full justify-start gap-2 overflow-x-auto rounded-2xl border border-border/70 bg-background p-1.5">
          {[
            { value: 'events', label: 'Eventos', icon: Layers },
            { value: 'rules', label: 'Reglas', icon: BellRing },
            { value: 'templates', label: 'Plantillas', icon: MessageSquareText },
            { value: 'escalations', label: 'Escalamiento', icon: Route },
            { value: 'channels', label: 'Canales', icon: RadioTower },
            { value: 'metrics', label: 'Metricas', icon: BarChart3 },
          ].map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openEventDialog()} disabled={!canCreate} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nuevo evento
            </Button>
          </div>
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Modulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Canales</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engine.events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <p className="font-black">{event.name}</p>
                        <p className="text-xs text-muted-foreground">{event.event_key}</p>
                      </TableCell>
                      <TableCell>{event.source_module}</TableCell>
                      <TableCell><KindBadge kind={event.kind} /></TableCell>
                      <TableCell><PriorityBadge priority={event.default_priority} /></TableCell>
                      <TableCell><ChannelPills channels={event.default_channels} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => simulateEvent(event)} title="Registrar evento de prueba">
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEventDialog(event)} disabled={!canUpdate}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEvent(event)} disabled={!canDelete}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {engine.events.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay eventos configurados.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openRuleDialog()} disabled={!canCreate || engine.events.length === 0} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nueva regla
            </Button>
          </div>
          <div className="grid gap-3">
            {engine.rules.map((rule) => {
              const event = eventsById.get(rule.event_id);
              const recipientsCount = rule.recipient_role_ids.length + rule.recipient_user_ids.length;
              return (
                <Card key={rule.id} className="rounded-2xl border-border/70">
                  <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-foreground">{rule.name}</h3>
                        <KindBadge kind={rule.kind} />
                        <PriorityBadge priority={rule.priority} />
                        <Badge variant={rule.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px] font-black uppercase tracking-wider">
                          {rule.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{event?.name || 'Evento no disponible'} / {recipientsCount} destinatario(s)</p>
                      <ChannelPills channels={rule.channels} />
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openRuleDialog(rule)} disabled={!canUpdate}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRule(rule)} disabled={!canDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {engine.rules.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No hay reglas configuradas.</div>}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openTemplateDialog()} disabled={!canCreate || engine.events.length === 0} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nueva plantilla
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {engine.templates.map((template) => {
              const event = eventsById.get(template.event_id);
              return (
                <Card key={template.id} className="rounded-2xl border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-black">{template.name}</h3>
                        <p className="text-xs text-muted-foreground">{event?.name || 'Evento'} / {ENGINE_CHANNEL_LABELS[template.channel]}</p>
                      </div>
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px] font-black uppercase tracking-wider">
                        {template.is_default ? 'Defecto' : template.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <p className="line-clamp-1 text-sm font-semibold text-foreground">{template.subject_template}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{template.body_template}</p>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openTemplateDialog(template)} disabled={!canUpdate}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTemplate(template)} disabled={!canDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {engine.templates.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground md:col-span-2">No hay plantillas configuradas.</div>}
          </div>
        </TabsContent>

        <TabsContent value="escalations" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openEscalationDialog()} disabled={!canCreate || engine.rules.length === 0} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nuevo escalamiento
            </Button>
          </div>
          <div className="grid gap-3">
            {engine.escalations.map((escalation) => {
              const rule = rulesById.get(escalation.rule_id);
              const event = rule ? eventsById.get(rule.event_id) : null;
              return (
                <Card key={escalation.id} className="rounded-2xl border-border/70">
                  <CardContent className="grid gap-4 p-4 lg:grid-cols-[150px_1fr_auto] lg:items-center">
                    <div className="rounded-xl bg-primary/10 p-3 text-center text-primary">
                      <Clock className="mx-auto h-5 w-5" />
                      <p className="mt-1 text-lg font-black">{Math.round(escalation.wait_minutes / 60)}h</p>
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{rule?.name || 'Regla no disponible'}</h3>
                        {escalation.priority_override && <PriorityBadge priority={escalation.priority_override} />}
                        <Badge variant={escalation.is_active ? 'default' : 'secondary'} className="rounded-md text-[10px] font-black uppercase tracking-wider">
                          Paso {escalation.sequence}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{event?.name || 'Evento'} / {escalation.recipient_role_ids.length + escalation.recipient_user_ids.length} destinatario(s) adicionales</p>
                      <ChannelPills channels={escalation.channels} />
                    </div>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEscalationDialog(escalation)} disabled={!canUpdate}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEscalation(escalation)} disabled={!canDelete}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {engine.escalations.length === 0 && <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">No hay escalamiento configurado.</div>}
          </div>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openProviderDialog()} disabled={!canCreate} className="rounded-xl">
              <Plus className="h-4 w-4" />
              Nuevo proveedor
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {engine.channelProviders.map((provider) => {
              const Icon = channelIcons[provider.channel];
              return (
                <Card key={provider.id} className="rounded-2xl border-border/70">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', provider.is_enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-black">{provider.display_name}</h3>
                          <p className="text-xs text-muted-foreground">{ENGINE_CHANNEL_LABELS[provider.channel]} / {provider.provider_key}</p>
                        </div>
                      </div>
                      <Switch
                        checked={provider.is_enabled}
                        disabled={!canUpdate || engine.isSaving}
                        onCheckedChange={(is_enabled) => engine.upsertChannelProvider({ ...provider, is_enabled }).then(() => toast.success('Canal actualizado')).catch((error) => toast.error(error?.message || 'No se pudo actualizar el canal.'))}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openProviderDialog(provider)} disabled={!canUpdate}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Configurar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MetricCard label="Enviadas" value={engine.metrics.sent} icon={Send} />
            <MetricCard label="Leidas" value={engine.metrics.read} icon={CheckCircle2} />
            <MetricCard label="Pendientes" value={engine.metrics.pending} icon={Clock} tone="warning" />
            <MetricCard label="Fallidas" value={engine.metrics.failed} icon={AlertTriangle} tone="danger" />
            <MetricCard label="Atendidas" value={engine.metrics.attended} icon={Activity} />
            <MetricCard label="Resp. prom." value={engine.metrics.avgResponseMinutes === null ? '-' : `${engine.metrics.avgResponseMinutes}m`} icon={BarChart3} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <Card className="rounded-2xl border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-black">Efectividad por canal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {engine.metrics.effectivenessByChannel.map((item) => (
                  <div key={item.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{ENGINE_CHANNEL_LABELS[item.channel]}</span>
                      <span className="font-black">{item.successRate}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${item.successRate}%` }} />
                    </div>
                  </div>
                ))}
                {engine.metrics.effectivenessByChannel.length === 0 && <p className="text-sm text-muted-foreground">Sin entregas registradas.</p>}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-black">Ultimas entregas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asunto</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Prioridad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {engine.deliveries.slice(0, 8).map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <p className="line-clamp-1 font-medium">{delivery.subject || delivery.body || 'Entrega sin asunto'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(delivery.generated_at).toLocaleString('es-CO')}</p>
                        </TableCell>
                        <TableCell>{ENGINE_CHANNEL_LABELS[delivery.channel]}</TableCell>
                        <TableCell><Badge variant="outline" className="rounded-md text-[10px] font-black uppercase tracking-wider">{delivery.status}</Badge></TableCell>
                        <TableCell><PriorityBadge priority={delivery.priority} /></TableCell>
                      </TableRow>
                    ))}
                    {engine.deliveries.length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Sin historial de entregas.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <EventDialog open={eventDialogOpen} onOpenChange={setEventDialogOpen} event={editingEvent} onSave={engine.upsertEvent} isSaving={engine.isSaving} />
      <RuleDialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen} rule={editingRule} events={engine.events} roleOptions={roleOptions} userOptions={userOptions} onSave={engine.upsertRule} isSaving={engine.isSaving} />
      <TemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} template={editingTemplate} events={engine.events} onSave={engine.upsertTemplate} isSaving={engine.isSaving} />
      <EscalationDialog open={escalationDialogOpen} onOpenChange={setEscalationDialogOpen} escalation={editingEscalation} rules={engine.rules} eventsById={eventsById} roleOptions={roleOptions} userOptions={userOptions} onSave={engine.upsertEscalation} isSaving={engine.isSaving} />
      <ChannelProviderDialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen} provider={editingProvider} onSave={engine.upsertChannelProvider} isSaving={engine.isSaving} />
    </div>
  );
}
