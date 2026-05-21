import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Mail, Monitor, RefreshCw, ShieldCheck, SlidersHorizontal, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles } from '@/hooks/useRolesPermissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type NotificationChannel = 'in_app_enabled' | 'email_enabled' | 'push_enabled';

interface NotificationEventDefinition {
  key: string;
  label: string;
  category: string;
  description: string;
}

interface NotificationRoleRule {
  id: string;
  company_id: string;
  role_id: string;
  event_key: string;
  event_label: string;
  category: string;
  description: string | null;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  is_active: boolean;
}

const asAnySupabase = supabase as any;

const NOTIFICATION_EVENTS: NotificationEventDefinition[] = [
  {
    key: 'requisition_approval',
    label: 'Aprobacion de requisiciones',
    category: 'Requisiciones',
    description: 'Solicitudes nuevas o pendientes que requieren aprobacion.',
  },
  {
    key: 'contract_expiry',
    label: 'Contratos por vencer',
    category: 'Contratos',
    description: 'Alertas de vencimiento, renovacion o preaviso de contratos.',
  },
  {
    key: 'contract_preaviso',
    label: 'Preavisos de contrato',
    category: 'Contratos',
    description: 'Contratos que entran en ventana critica de preaviso.',
  },
  {
    key: 'termination_pending',
    label: 'Procesos de retiro',
    category: 'Contratos',
    description: 'Retiros iniciados, documentos pendientes y cierre de desvinculacion.',
  },
  {
    key: 'hiring_candidate',
    label: 'Seleccion y vacantes',
    category: 'Seleccion',
    description: 'Candidatos contratados, cambios de etapa y novedades del proceso.',
  },
  {
    key: 'diversity_goal',
    label: 'Metas de diversidad',
    category: 'Seleccion',
    description: 'Alertas cuando la seleccion se aleja de los objetivos definidos.',
  },
  {
    key: 'dotation_expiry',
    label: 'Dotaciones',
    category: 'Dotaciones',
    description: 'Entregas pendientes, stock critico y vencimientos de dotacion.',
  },
  {
    key: 'disciplinary_update',
    label: 'Procesos disciplinarios',
    category: 'Disciplinarios',
    description: 'Descargos, decisiones, vencimientos y cambios de estado.',
  },
  {
    key: 'medical_exam_expiry',
    label: 'Examenes medicos',
    category: 'Salud ocupacional',
    description: 'Examenes proximos a vencer, no aptos o pendientes de programacion.',
  },
  {
    key: 'incapacity_alert',
    label: 'Incapacidades',
    category: 'Salud ocupacional',
    description: 'Incapacidades nuevas, largas, vencidas o con seguimiento requerido.',
  },
  {
    key: 'employee_document',
    label: 'Documentos de empleados',
    category: 'Empleados',
    description: 'Documentos vencidos, faltantes o cargados por auto-registro.',
  },
  {
    key: 'certificate_request',
    label: 'Certificaciones laborales',
    category: 'Empleados',
    description: 'Solicitudes y generacion de certificaciones laborales.',
  },
  {
    key: 'system_announcement',
    label: 'Comunicados del sistema',
    category: 'General',
    description: 'Mensajes administrativos, avisos internos y novedades generales.',
  },
];

const channelConfig: Array<{
  key: NotificationChannel;
  label: string;
  icon: typeof Monitor;
  description: string;
}> = [
  { key: 'in_app_enabled', label: 'App', icon: Monitor, description: 'Centro de notificaciones' },
  { key: 'email_enabled', label: 'Correo', icon: Mail, description: 'Envios por email' },
  { key: 'push_enabled', label: 'Push', icon: Smartphone, description: 'Canal futuro' },
];

export function NotificationRulesManager() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');

  const { data: roles = [], isLoading: rolesLoading } = useCustomRoles();
  const activeRoles = useMemo(() => roles.filter((role) => role.is_active), [roles]);
  const effectiveRoleId = selectedRoleId || activeRoles[0]?.id || '';
  const selectedRole = activeRoles.find((role) => role.id === effectiveRoleId);

  const rulesQuery = useQuery({
    queryKey: ['notification-role-rules', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_role_rules')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('category')
        .order('event_label');

      if (error) throw error;
      return (data || []) as NotificationRoleRule[];
    },
  });

  const ruleMap = useMemo(() => {
    const map = new Map<string, NotificationRoleRule>();
    rulesQuery.data?.forEach((rule) => map.set(`${rule.role_id}:${rule.event_key}`, rule));
    return map;
  }, [rulesQuery.data]);

  const totals = useMemo(() => {
    const roleRules = (rulesQuery.data || []).filter((rule) => rule.role_id === effectiveRoleId);
    return {
      active: roleRules.filter((rule) => rule.is_active).length,
      email: roleRules.filter((rule) => rule.is_active && rule.email_enabled).length,
      app: roleRules.filter((rule) => rule.is_active && rule.in_app_enabled).length,
    };
  }, [rulesQuery.data, effectiveRoleId]);

  const upsertRule = useMutation({
    mutationFn: async ({
      event,
      patch,
    }: {
      event: NotificationEventDefinition;
      patch: Partial<Pick<NotificationRoleRule, 'is_active' | 'in_app_enabled' | 'email_enabled' | 'push_enabled'>>;
    }) => {
      if (!currentCompanyId || !effectiveRoleId) throw new Error('Selecciona una empresa y un rol valido.');

      const existing = ruleMap.get(`${effectiveRoleId}:${event.key}`);
      const nextIsActive = patch.is_active ?? existing?.is_active ?? true;
      const payload = {
        id: existing?.id,
        company_id: currentCompanyId,
        role_id: effectiveRoleId,
        event_key: event.key,
        event_label: event.label,
        category: event.category,
        description: event.description,
        in_app_enabled: patch.in_app_enabled ?? existing?.in_app_enabled ?? nextIsActive,
        email_enabled: patch.email_enabled ?? existing?.email_enabled ?? false,
        push_enabled: patch.push_enabled ?? existing?.push_enabled ?? false,
        is_active: nextIsActive,
      };

      const { error } = await asAnySupabase
        .from('notification_role_rules')
        .upsert(payload, { onConflict: 'company_id,role_id,event_key' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-role-rules'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'No se pudo guardar la regla de notificacion.');
    },
  });

  const handleToggleRule = (event: NotificationEventDefinition, checked: boolean) => {
    upsertRule.mutate({
      event,
      patch: checked
        ? { is_active: true, in_app_enabled: true }
        : { is_active: false, in_app_enabled: false, email_enabled: false, push_enabled: false },
    });
  };

  const handleToggleChannel = (event: NotificationEventDefinition, channel: NotificationChannel, checked: boolean) => {
    upsertRule.mutate({
      event,
      patch: { is_active: true, [channel]: checked },
    });
  };

  if (rolesLoading || rulesQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (activeRoles.length === 0) {
    return (
      <Card className="rounded-2xl border-border/70">
        <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
          <ShieldCheck className="h-10 w-10 text-primary" />
          <div>
            <h3 className="text-lg font-black text-foreground">No hay roles activos</h3>
            <p className="text-sm text-muted-foreground">Crea o activa roles para poder configurar reglas inteligentes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-border/70 bg-background shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black tracking-tight">Reglas inteligentes</CardTitle>
                <CardDescription className="mt-1 max-w-2xl">
                  Define que eventos recibe cada rol y por que canales se entrega la alerta.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={effectiveRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border/70 bg-background font-semibold sm:w-[260px]">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {activeRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => rulesQuery.refetch()}
                disabled={rulesQuery.isFetching}
              >
                <RefreshCw className={cn('mr-2 h-4 w-4', rulesQuery.isFetching && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          {[
            { label: 'Rol seleccionado', value: selectedRole?.name || 'Sin rol', icon: ShieldCheck },
            { label: 'Reglas activas', value: `${totals.active}/${NOTIFICATION_EVENTS.length}`, icon: BellRing },
            { label: 'Con correo', value: totals.email, icon: Mail },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="truncate text-lg font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[minmax(260px,1fr)_120px_360px] items-center gap-4 border-b bg-muted/30 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground lg:grid">
            <span>Evento</span>
            <span>Estado</span>
            <span>Canales</span>
          </div>
          <div className="divide-y divide-border/70">
            {NOTIFICATION_EVENTS.map((event) => {
              const rule = ruleMap.get(`${effectiveRoleId}:${event.key}`);
              const isActive = rule?.is_active ?? false;

              return (
                <div key={event.key} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(260px,1fr)_120px_360px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-foreground">{event.label}</h3>
                      <Badge variant="outline" className="rounded-full bg-primary/5 text-[10px] font-black uppercase tracking-widest text-primary">
                        {event.category}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 lg:border-0 lg:bg-transparent lg:p-0">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground lg:hidden">Estado</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isActive}
                        disabled={upsertRule.isPending || !effectiveRoleId}
                        onCheckedChange={(checked) => handleToggleRule(event, checked)}
                      />
                      <span className={cn('text-xs font-black uppercase tracking-widest', isActive ? 'text-success' : 'text-muted-foreground')}>
                        {isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {channelConfig.map((channel) => {
                      const Icon = channel.icon;
                      const checked = rule?.[channel.key] ?? false;
                      return (
                        <label
                          key={channel.key}
                          className={cn(
                            'flex min-h-[74px] cursor-pointer items-center gap-3 rounded-2xl border p-3 transition-colors',
                            isActive
                              ? 'border-border/70 bg-background hover:border-primary/40'
                              : 'border-border/50 bg-muted/20 text-muted-foreground'
                          )}
                        >
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', checked && isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black">{channel.label}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{channel.description}</p>
                          </div>
                          <Switch
                            checked={checked && isActive}
                            disabled={!isActive || upsertRule.isPending || !effectiveRoleId}
                            onCheckedChange={(value) => handleToggleChannel(event, channel.key, value)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
