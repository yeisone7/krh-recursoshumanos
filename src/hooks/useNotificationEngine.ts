import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationEngineKind = 'notification' | 'alert';
export type NotificationEnginePriority = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type NotificationEngineChannel = 'in_app' | 'push' | 'email' | 'whatsapp' | 'sms' | 'teams' | 'telegram' | 'webhook';
export type NotificationEngineStatus = 'queued' | 'pending' | 'sent' | 'read' | 'attended' | 'failed' | 'cancelled' | 'suppressed';

export const ENGINE_CHANNELS: NotificationEngineChannel[] = ['in_app', 'push', 'email', 'whatsapp', 'sms', 'teams', 'telegram', 'webhook'];
export const ENGINE_PRIORITIES: NotificationEnginePriority[] = ['critical', 'high', 'medium', 'low', 'info'];
export const ENGINE_KINDS: NotificationEngineKind[] = ['notification', 'alert'];

export const ENGINE_CHANNEL_LABELS: Record<NotificationEngineChannel, string> = {
  in_app: 'App',
  push: 'Push',
  email: 'Correo',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  teams: 'Teams',
  telegram: 'Telegram',
  webhook: 'Webhook',
};

export const ENGINE_PRIORITY_LABELS: Record<NotificationEnginePriority, string> = {
  critical: 'Critica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  info: 'Informativa',
};

export const ENGINE_KIND_LABELS: Record<NotificationEngineKind, string> = {
  notification: 'Notificacion',
  alert: 'Alerta',
};

export interface NotificationEngineEvent {
  id: string;
  company_id: string;
  event_key: string;
  name: string;
  description: string | null;
  source_module: string;
  kind: NotificationEngineKind;
  default_priority: NotificationEnginePriority;
  default_channels: NotificationEngineChannel[];
  variables: string[] | Record<string, unknown>;
  sample_payload: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineRule {
  id: string;
  company_id: string;
  event_id: string;
  name: string;
  kind: NotificationEngineKind;
  priority: NotificationEnginePriority;
  channels: NotificationEngineChannel[];
  recipient_role_ids: string[];
  recipient_user_ids: string[];
  conditions: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineTemplate {
  id: string;
  company_id: string;
  event_id: string;
  channel: NotificationEngineChannel;
  name: string;
  subject_template: string;
  body_template: string;
  variables: string[] | Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineChannelProvider {
  id: string;
  company_id: string;
  channel: NotificationEngineChannel;
  provider_key: string;
  display_name: string;
  is_enabled: boolean;
  config: Record<string, unknown>;
  throttle_per_minute: number | null;
  retry_policy: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineEscalationRule {
  id: string;
  company_id: string;
  rule_id: string;
  sequence: number;
  wait_minutes: number;
  priority_override: NotificationEnginePriority | null;
  recipient_role_ids: string[];
  recipient_user_ids: string[];
  channels: NotificationEngineChannel[];
  resend_enabled: boolean;
  resend_interval_minutes: number | null;
  max_resends: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineEventLog {
  id: string;
  company_id: string;
  event_id: string | null;
  event_key: string;
  kind: NotificationEngineKind;
  priority: NotificationEnginePriority;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  status: NotificationEngineStatus;
  generated_at: string;
  processed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface NotificationEngineDelivery {
  id: string;
  company_id: string;
  event_log_id: string | null;
  rule_id: string | null;
  escalation_rule_id: string | null;
  notification_id: string | null;
  recipient_user_id: string | null;
  recipient_role_id: string | null;
  channel: NotificationEngineChannel;
  provider_key: string | null;
  priority: NotificationEnginePriority;
  status: NotificationEngineStatus;
  subject: string | null;
  body: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  generated_at: string;
  sent_at: string | null;
  read_at: string | null;
  action_at: string | null;
  action_by: string | null;
  action_label: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationEngineUser {
  id: string;
  label: string;
}

export interface NotificationEngineMetrics {
  total: number;
  sent: number;
  read: number;
  pending: number;
  failed: number;
  attended: number;
  avgResponseMinutes: number | null;
  effectivenessByChannel: Array<{
    channel: NotificationEngineChannel;
    total: number;
    successRate: number;
  }>;
}

export type EventUpsert = Partial<NotificationEngineEvent> & Pick<NotificationEngineEvent, 'event_key' | 'name' | 'source_module'>;
export type RuleUpsert = Partial<NotificationEngineRule> & Pick<NotificationEngineRule, 'event_id' | 'name'>;
export type TemplateUpsert = Partial<NotificationEngineTemplate> & Pick<NotificationEngineTemplate, 'event_id' | 'channel' | 'name' | 'subject_template' | 'body_template'>;
export type ChannelProviderUpsert = Partial<NotificationEngineChannelProvider> & Pick<NotificationEngineChannelProvider, 'channel' | 'provider_key' | 'display_name'>;
export type EscalationUpsert = Partial<NotificationEngineEscalationRule> & Pick<NotificationEngineEscalationRule, 'rule_id' | 'sequence' | 'wait_minutes'>;

const asAnySupabase = supabase as any;

function isFailure(status: NotificationEngineStatus) {
  return ['failed', 'cancelled', 'suppressed'].includes(status);
}

function parseResponseMinutes(delivery: NotificationEngineDelivery) {
  if (!delivery.action_at && !delivery.read_at) return null;
  const end = new Date(delivery.action_at || delivery.read_at || delivery.generated_at).getTime();
  const start = new Date(delivery.generated_at).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(start) || end < start) return null;
  return Math.round((end - start) / 60000);
}

export function useNotificationEngine() {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notification-engine'] });

  const eventsQuery = useQuery({
    queryKey: ['notification-engine', 'events', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_events')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('source_module')
        .order('name');
      if (error) throw error;
      return (data || []) as NotificationEngineEvent[];
    },
  });

  const rulesQuery = useQuery({
    queryKey: ['notification-engine', 'rules', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_rules')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as NotificationEngineRule[];
    },
  });

  const templatesQuery = useQuery({
    queryKey: ['notification-engine', 'templates', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_templates')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('channel')
        .order('name');
      if (error) throw error;
      return (data || []) as NotificationEngineTemplate[];
    },
  });

  const channelProvidersQuery = useQuery({
    queryKey: ['notification-engine', 'channel-providers', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_channel_providers')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('channel');
      if (error) throw error;
      return (data || []) as NotificationEngineChannelProvider[];
    },
  });

  const escalationsQuery = useQuery({
    queryKey: ['notification-engine', 'escalations', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_escalation_rules')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('sequence');
      if (error) throw error;
      return (data || []) as NotificationEngineEscalationRule[];
    },
  });

  const eventLogsQuery = useQuery({
    queryKey: ['notification-engine', 'event-logs', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_event_logs')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('generated_at', { ascending: false })
        .limit(150);
      if (error) throw error;
      return (data || []) as NotificationEngineEventLog[];
    },
  });

  const deliveriesQuery = useQuery({
    queryKey: ['notification-engine', 'deliveries', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await asAnySupabase
        .from('notification_engine_deliveries')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('generated_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data || []) as NotificationEngineDelivery[];
    },
  });

  const companyUsersQuery = useQuery({
    queryKey: ['notification-engine', 'company-users', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data: assignments, error: assignmentsError } = await asAnySupabase
        .from('user_company_assignments')
        .select('user_id')
        .eq('company_id', currentCompanyId);
      if (assignmentsError) throw assignmentsError;

      const ids = Array.from(new Set((assignments || []).map((row: { user_id: string }) => row.user_id))).filter(Boolean);
      if (ids.length === 0) return [] as NotificationEngineUser[];

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, display_name')
        .in('id', ids);
      if (profilesError) throw profilesError;

      const labelMap = new Map((profiles || []).map((profile) => [
        profile.id,
        profile.full_name || profile.display_name || profile.id,
      ]));

      return ids
        .map((id) => ({ id, label: labelMap.get(id) || id }))
        .sort((a, b) => a.label.localeCompare(b.label));
    },
  });

  const metrics = useMemo<NotificationEngineMetrics>(() => {
    const deliveries = deliveriesQuery.data || [];
    const responseTimes = deliveries
      .map(parseResponseMinutes)
      .filter((value): value is number => value !== null);

    const effectivenessByChannel = ENGINE_CHANNELS
      .map((channel) => {
        const channelDeliveries = deliveries.filter((delivery) => delivery.channel === channel);
        const total = channelDeliveries.length;
        const successful = channelDeliveries.filter((delivery) => ['sent', 'read', 'attended'].includes(delivery.status)).length;
        return {
          channel,
          total,
          successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        };
      })
      .filter((item) => item.total > 0);

    return {
      total: deliveries.length,
      sent: deliveries.filter((delivery) => delivery.status === 'sent').length,
      read: deliveries.filter((delivery) => delivery.status === 'read').length,
      pending: deliveries.filter((delivery) => ['queued', 'pending'].includes(delivery.status)).length,
      failed: deliveries.filter((delivery) => isFailure(delivery.status)).length,
      attended: deliveries.filter((delivery) => delivery.status === 'attended').length,
      avgResponseMinutes: responseTimes.length > 0
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
      effectivenessByChannel,
    };
  }, [deliveriesQuery.data]);

  const upsertEvent = useMutation({
    mutationFn: async (payload: EventUpsert) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const record = {
        ...payload,
        company_id: currentCompanyId,
        created_by: payload.created_by ?? user?.id ?? null,
      };
      const { data, error } = await asAnySupabase
        .from('notification_engine_events')
        .upsert(record, { onConflict: 'company_id,event_key' })
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineEvent;
    },
    onSuccess: invalidate,
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await asAnySupabase.from('notification_engine_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const upsertRule = useMutation({
    mutationFn: async (payload: RuleUpsert) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const record = {
        ...payload,
        company_id: currentCompanyId,
        created_by: payload.created_by ?? user?.id ?? null,
      };
      const { data, error } = await asAnySupabase
        .from('notification_engine_rules')
        .upsert(record)
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineRule;
    },
    onSuccess: invalidate,
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await asAnySupabase.from('notification_engine_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const upsertTemplate = useMutation({
    mutationFn: async (payload: TemplateUpsert) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const record = {
        ...payload,
        company_id: currentCompanyId,
        created_by: payload.created_by ?? user?.id ?? null,
      };
      const { data, error } = await asAnySupabase
        .from('notification_engine_templates')
        .upsert(record, { onConflict: 'company_id,event_id,channel,name' })
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineTemplate;
    },
    onSuccess: invalidate,
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await asAnySupabase.from('notification_engine_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const upsertChannelProvider = useMutation({
    mutationFn: async (payload: ChannelProviderUpsert) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const record = {
        ...payload,
        company_id: currentCompanyId,
      };
      const { data, error } = await asAnySupabase
        .from('notification_engine_channel_providers')
        .upsert(record, { onConflict: 'company_id,channel,provider_key' })
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineChannelProvider;
    },
    onSuccess: invalidate,
  });

  const upsertEscalation = useMutation({
    mutationFn: async (payload: EscalationUpsert) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const record = {
        ...payload,
        company_id: currentCompanyId,
      };
      const { data, error } = await asAnySupabase
        .from('notification_engine_escalation_rules')
        .upsert(record, { onConflict: 'rule_id,sequence' })
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineEscalationRule;
    },
    onSuccess: invalidate,
  });

  const deleteEscalation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await asAnySupabase.from('notification_engine_escalation_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const registerEvent = useMutation({
    mutationFn: async ({
      event,
      payload,
      entityType,
      entityId,
    }: {
      event: NotificationEngineEvent;
      payload?: Record<string, unknown>;
      entityType?: string;
      entityId?: string;
    }) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa.');
      const { data, error } = await asAnySupabase
        .from('notification_engine_event_logs')
        .insert({
          company_id: currentCompanyId,
          event_id: event.id,
          event_key: event.event_key,
          kind: event.kind,
          priority: event.default_priority,
          entity_type: entityType || null,
          entity_id: entityId || null,
          payload: payload || event.sample_payload || {},
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as NotificationEngineEventLog;
    },
    onSuccess: invalidate,
  });

  return {
    companyId: currentCompanyId,
    events: eventsQuery.data || [],
    rules: rulesQuery.data || [],
    templates: templatesQuery.data || [],
    channelProviders: channelProvidersQuery.data || [],
    escalations: escalationsQuery.data || [],
    eventLogs: eventLogsQuery.data || [],
    deliveries: deliveriesQuery.data || [],
    users: companyUsersQuery.data || [],
    metrics,
    isLoading:
      eventsQuery.isLoading ||
      rulesQuery.isLoading ||
      templatesQuery.isLoading ||
      channelProvidersQuery.isLoading ||
      escalationsQuery.isLoading ||
      deliveriesQuery.isLoading ||
      companyUsersQuery.isLoading,
    error:
      eventsQuery.error ||
      rulesQuery.error ||
      templatesQuery.error ||
      channelProvidersQuery.error ||
      escalationsQuery.error ||
      eventLogsQuery.error ||
      deliveriesQuery.error ||
      companyUsersQuery.error,
    refetch: () => {
      eventsQuery.refetch();
      rulesQuery.refetch();
      templatesQuery.refetch();
      channelProvidersQuery.refetch();
      escalationsQuery.refetch();
      eventLogsQuery.refetch();
      deliveriesQuery.refetch();
      companyUsersQuery.refetch();
    },
    upsertEvent: upsertEvent.mutateAsync,
    deleteEvent: deleteEvent.mutateAsync,
    upsertRule: upsertRule.mutateAsync,
    deleteRule: deleteRule.mutateAsync,
    upsertTemplate: upsertTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    upsertChannelProvider: upsertChannelProvider.mutateAsync,
    upsertEscalation: upsertEscalation.mutateAsync,
    deleteEscalation: deleteEscalation.mutateAsync,
    registerEvent: registerEvent.mutateAsync,
    isSaving:
      upsertEvent.isPending ||
      deleteEvent.isPending ||
      upsertRule.isPending ||
      deleteRule.isPending ||
      upsertTemplate.isPending ||
      deleteTemplate.isPending ||
      upsertChannelProvider.isPending ||
      upsertEscalation.isPending ||
      deleteEscalation.isPending ||
      registerEvent.isPending,
  };
}
