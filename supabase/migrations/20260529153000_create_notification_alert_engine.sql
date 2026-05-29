-- Motor de Notificaciones y Alertas
-- Multi-company, configurable event catalog, rules, templates, channels, escalation,
-- audit trail and delivery history.

DO $$
BEGIN
  CREATE TYPE public.notification_engine_kind AS ENUM ('notification', 'alert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_engine_priority AS ENUM ('critical', 'high', 'medium', 'low', 'info');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_engine_channel AS ENUM ('in_app', 'push', 'email', 'whatsapp', 'sms', 'teams', 'telegram', 'webhook');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.notification_engine_delivery_status AS ENUM (
    'queued',
    'pending',
    'sent',
    'read',
    'attended',
    'failed',
    'cancelled',
    'suppressed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS is_attended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS attended_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attention_note TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_company_priority
  ON public.notifications(company_id, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_company_attended
  ON public.notifications(company_id, is_attended, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_engine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NULL,
  source_module TEXT NOT NULL DEFAULT 'general',
  kind public.notification_engine_kind NOT NULL DEFAULT 'notification',
  default_priority public.notification_engine_priority NOT NULL DEFAULT 'info',
  default_channels public.notification_engine_channel[] NOT NULL DEFAULT ARRAY['in_app']::public.notification_engine_channel[],
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.notification_engine_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.notification_engine_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.notification_engine_kind NOT NULL DEFAULT 'notification',
  priority public.notification_engine_priority NOT NULL DEFAULT 'info',
  channels public.notification_engine_channel[] NOT NULL DEFAULT ARRAY['in_app']::public.notification_engine_channel[],
  recipient_role_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  recipient_user_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_engine_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.notification_engine_events(id) ON DELETE CASCADE,
  channel public.notification_engine_channel NOT NULL DEFAULT 'in_app',
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, event_id, channel, name)
);

CREATE TABLE IF NOT EXISTS public.notification_engine_channel_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel public.notification_engine_channel NOT NULL,
  provider_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  throttle_per_minute INTEGER NULL CHECK (throttle_per_minute IS NULL OR throttle_per_minute > 0),
  retry_policy JSONB NOT NULL DEFAULT '{"max_attempts": 3, "backoff_minutes": 15}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, channel, provider_key)
);

CREATE TABLE IF NOT EXISTS public.notification_engine_escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.notification_engine_rules(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 1 CHECK (sequence > 0),
  wait_minutes INTEGER NOT NULL CHECK (wait_minutes > 0),
  priority_override public.notification_engine_priority NULL,
  recipient_role_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  recipient_user_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  channels public.notification_engine_channel[] NOT NULL DEFAULT ARRAY['in_app']::public.notification_engine_channel[],
  resend_enabled BOOLEAN NOT NULL DEFAULT false,
  resend_interval_minutes INTEGER NULL CHECK (resend_interval_minutes IS NULL OR resend_interval_minutes > 0),
  max_resends INTEGER NOT NULL DEFAULT 0 CHECK (max_resends >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rule_id, sequence)
);

CREATE TABLE IF NOT EXISTS public.notification_engine_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID NULL REFERENCES public.notification_engine_events(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL,
  kind public.notification_engine_kind NOT NULL DEFAULT 'notification',
  priority public.notification_engine_priority NOT NULL DEFAULT 'info',
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.notification_engine_delivery_status NOT NULL DEFAULT 'queued',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_engine_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_log_id UUID NULL REFERENCES public.notification_engine_event_logs(id) ON DELETE SET NULL,
  rule_id UUID NULL REFERENCES public.notification_engine_rules(id) ON DELETE SET NULL,
  escalation_rule_id UUID NULL REFERENCES public.notification_engine_escalation_rules(id) ON DELETE SET NULL,
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  recipient_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_role_id UUID NULL REFERENCES public.custom_roles(id) ON DELETE SET NULL,
  channel public.notification_engine_channel NOT NULL DEFAULT 'in_app',
  provider_key TEXT NULL,
  priority public.notification_engine_priority NOT NULL DEFAULT 'info',
  status public.notification_engine_delivery_status NOT NULL DEFAULT 'queued',
  subject TEXT NULL,
  body TEXT NULL,
  error_message TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NULL,
  read_at TIMESTAMPTZ NULL,
  action_at TIMESTAMPTZ NULL,
  action_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action_label TEXT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_engine_events_company_key
  ON public.notification_engine_events(company_id, event_key);

CREATE INDEX IF NOT EXISTS idx_notification_engine_rules_company_event
  ON public.notification_engine_rules(company_id, event_id, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_engine_rules_channels
  ON public.notification_engine_rules USING gin(channels);

CREATE INDEX IF NOT EXISTS idx_notification_engine_templates_company_event
  ON public.notification_engine_templates(company_id, event_id, channel, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_engine_channels_company
  ON public.notification_engine_channel_providers(company_id, channel, is_enabled);

CREATE INDEX IF NOT EXISTS idx_notification_engine_escalations_rule
  ON public.notification_engine_escalation_rules(rule_id, sequence, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_engine_event_logs_company_status
  ON public.notification_engine_event_logs(company_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_engine_deliveries_company_status
  ON public.notification_engine_deliveries(company_id, status, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_engine_deliveries_recipient
  ON public.notification_engine_deliveries(recipient_user_id, status, generated_at DESC);

ALTER TABLE public.notification_engine_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_channel_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_engine_deliveries ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.notification_engine_events,
  public.notification_engine_rules,
  public.notification_engine_templates,
  public.notification_engine_channel_providers,
  public.notification_engine_escalation_rules,
  public.notification_engine_event_logs,
  public.notification_engine_deliveries
TO authenticated;

-- Permission catalog entry for role administration.
WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'alertas'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'motor_notificaciones', 'Motor de Notificaciones y Alertas', 'BellRing', 275, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    icon = EXCLUDED.icon,
    parent_id = EXCLUDED.parent_id,
    is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, permission_seed.action_value::public.permission_action, permission_seed.description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Motor de Notificaciones - Ver'),
    ('create', 'Motor de Notificaciones - Crear'),
    ('update', 'Motor de Notificaciones - Modificar'),
    ('delete', 'Motor de Notificaciones - Eliminar'),
    ('export', 'Motor de Notificaciones - Exportar metricas')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'motor_notificaciones'
ON CONFLICT (module_id, action) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'motor_notificaciones'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- RLS policies for configuration tables.
DROP POLICY IF EXISTS "Notification engine events are viewable by permitted company users" ON public.notification_engine_events;
CREATE POLICY "Notification engine events are viewable by permitted company users"
ON public.notification_engine_events
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine events are insertable by managers" ON public.notification_engine_events;
CREATE POLICY "Notification engine events are insertable by managers"
ON public.notification_engine_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine events are updatable by managers" ON public.notification_engine_events;
CREATE POLICY "Notification engine events are updatable by managers"
ON public.notification_engine_events
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine events are deletable by managers" ON public.notification_engine_events;
CREATE POLICY "Notification engine events are deletable by managers"
ON public.notification_engine_events
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Notification engine rules are viewable by permitted company users" ON public.notification_engine_rules;
CREATE POLICY "Notification engine rules are viewable by permitted company users"
ON public.notification_engine_rules
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine rules are manageable by managers" ON public.notification_engine_rules;
DROP POLICY IF EXISTS "Notification engine rules are insertable by managers" ON public.notification_engine_rules;
CREATE POLICY "Notification engine rules are insertable by managers"
ON public.notification_engine_rules
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine rules are updatable by managers" ON public.notification_engine_rules;
CREATE POLICY "Notification engine rules are updatable by managers"
ON public.notification_engine_rules
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine rules are deletable by managers" ON public.notification_engine_rules;
CREATE POLICY "Notification engine rules are deletable by managers"
ON public.notification_engine_rules
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Notification engine templates are viewable by permitted company users" ON public.notification_engine_templates;
CREATE POLICY "Notification engine templates are viewable by permitted company users"
ON public.notification_engine_templates
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine templates are manageable by managers" ON public.notification_engine_templates;
DROP POLICY IF EXISTS "Notification engine templates are insertable by managers" ON public.notification_engine_templates;
CREATE POLICY "Notification engine templates are insertable by managers"
ON public.notification_engine_templates
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine templates are updatable by managers" ON public.notification_engine_templates;
CREATE POLICY "Notification engine templates are updatable by managers"
ON public.notification_engine_templates
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine templates are deletable by managers" ON public.notification_engine_templates;
CREATE POLICY "Notification engine templates are deletable by managers"
ON public.notification_engine_templates
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Notification engine channel providers are viewable by permitted company users" ON public.notification_engine_channel_providers;
CREATE POLICY "Notification engine channel providers are viewable by permitted company users"
ON public.notification_engine_channel_providers
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine channel providers are manageable by managers" ON public.notification_engine_channel_providers;
DROP POLICY IF EXISTS "Notification engine channel providers are insertable by managers" ON public.notification_engine_channel_providers;
CREATE POLICY "Notification engine channel providers are insertable by managers"
ON public.notification_engine_channel_providers
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine channel providers are updatable by managers" ON public.notification_engine_channel_providers;
CREATE POLICY "Notification engine channel providers are updatable by managers"
ON public.notification_engine_channel_providers
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine channel providers are deletable by managers" ON public.notification_engine_channel_providers;
CREATE POLICY "Notification engine channel providers are deletable by managers"
ON public.notification_engine_channel_providers
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Notification engine escalations are viewable by permitted company users" ON public.notification_engine_escalation_rules;
CREATE POLICY "Notification engine escalations are viewable by permitted company users"
ON public.notification_engine_escalation_rules
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine escalations are manageable by managers" ON public.notification_engine_escalation_rules;
DROP POLICY IF EXISTS "Notification engine escalations are insertable by managers" ON public.notification_engine_escalation_rules;
CREATE POLICY "Notification engine escalations are insertable by managers"
ON public.notification_engine_escalation_rules
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine escalations are updatable by managers" ON public.notification_engine_escalation_rules;
CREATE POLICY "Notification engine escalations are updatable by managers"
ON public.notification_engine_escalation_rules
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine escalations are deletable by managers" ON public.notification_engine_escalation_rules;
CREATE POLICY "Notification engine escalations are deletable by managers"
ON public.notification_engine_escalation_rules
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'delete')
  )
);

DROP POLICY IF EXISTS "Notification engine event logs are viewable by permitted company users" ON public.notification_engine_event_logs;
CREATE POLICY "Notification engine event logs are viewable by permitted company users"
ON public.notification_engine_event_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine event logs can be registered by managers" ON public.notification_engine_event_logs;
CREATE POLICY "Notification engine event logs can be registered by managers"
ON public.notification_engine_event_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
      OR public.check_user_permission(auth.uid(), 'alertas', 'create')
      OR public.check_user_permission(auth.uid(), 'alertas', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine event logs are updatable by managers" ON public.notification_engine_event_logs;
CREATE POLICY "Notification engine event logs are updatable by managers"
ON public.notification_engine_event_logs
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Notification engine deliveries are viewable by recipients or managers" ON public.notification_engine_deliveries;
CREATE POLICY "Notification engine deliveries are viewable by recipients or managers"
ON public.notification_engine_deliveries
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'motor_notificaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Notification engine deliveries are insertable by managers" ON public.notification_engine_deliveries;
CREATE POLICY "Notification engine deliveries are insertable by managers"
ON public.notification_engine_deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'create')
  )
);

DROP POLICY IF EXISTS "Notification engine deliveries are updatable by recipients or managers" ON public.notification_engine_deliveries;
CREATE POLICY "Notification engine deliveries are updatable by recipients or managers"
ON public.notification_engine_deliveries
FOR UPDATE
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
)
WITH CHECK (
  recipient_user_id = auth.uid()
  OR public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
  )
);

DROP POLICY IF EXISTS "Admins can update company notifications attention state" ON public.notifications;
CREATE POLICY "Admins can update company notifications attention state"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    company_id IS NOT NULL
    AND public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'alertas', 'update')
      OR public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    company_id IS NOT NULL
    AND public.is_company_member(company_id)
    AND (
      public.check_user_permission(auth.uid(), 'alertas', 'update')
      OR public.check_user_permission(auth.uid(), 'motor_notificaciones', 'update')
    )
  )
);

DROP TRIGGER IF EXISTS update_notification_engine_events_updated_at ON public.notification_engine_events;
CREATE TRIGGER update_notification_engine_events_updated_at
BEFORE UPDATE ON public.notification_engine_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_engine_rules_updated_at ON public.notification_engine_rules;
CREATE TRIGGER update_notification_engine_rules_updated_at
BEFORE UPDATE ON public.notification_engine_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_engine_templates_updated_at ON public.notification_engine_templates;
CREATE TRIGGER update_notification_engine_templates_updated_at
BEFORE UPDATE ON public.notification_engine_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_engine_channel_providers_updated_at ON public.notification_engine_channel_providers;
CREATE TRIGGER update_notification_engine_channel_providers_updated_at
BEFORE UPDATE ON public.notification_engine_channel_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_engine_escalation_rules_updated_at ON public.notification_engine_escalation_rules;
CREATE TRIGGER update_notification_engine_escalation_rules_updated_at
BEFORE UPDATE ON public.notification_engine_escalation_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_engine_deliveries_updated_at ON public.notification_engine_deliveries;
CREATE TRIGGER update_notification_engine_deliveries_updated_at
BEFORE UPDATE ON public.notification_engine_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Default extensible providers per company.
INSERT INTO public.notification_engine_channel_providers (
  company_id,
  channel,
  provider_key,
  display_name,
  is_enabled,
  config
)
SELECT
  c.id,
  provider_seed.channel_value::public.notification_engine_channel,
  provider_seed.provider_key,
  provider_seed.display_name,
  provider_seed.is_enabled,
  provider_seed.config_value::jsonb
FROM public.companies c
CROSS JOIN (
  VALUES
    ('in_app', 'empatiq', 'Centro de notificaciones Empatiq', true, '{"internal": true}'),
    ('email', 'smtp', 'Correo electronico', false, '{"from_name": "Empatiq"}'),
    ('push', 'browser', 'Push web', false, '{"provider": "browser"}'),
    ('whatsapp', 'future_whatsapp', 'WhatsApp', false, '{"provider": null}'),
    ('sms', 'future_sms', 'SMS', false, '{"provider": null}'),
    ('teams', 'future_teams', 'Microsoft Teams', false, '{"provider": null}'),
    ('telegram', 'future_telegram', 'Telegram', false, '{"provider": null}'),
    ('webhook', 'generic_webhook', 'Webhook generico', false, '{"url": null}')
) AS provider_seed(channel_value, provider_key, display_name, is_enabled, config_value)
ON CONFLICT (company_id, channel, provider_key) DO NOTHING;

-- Seed company-local catalog with the events currently represented by the app.
INSERT INTO public.notification_engine_events (
  company_id,
  event_key,
  name,
  description,
  source_module,
  kind,
  default_priority,
  default_channels,
  variables,
  sample_payload
)
SELECT
  c.id,
  event_seed.event_key,
  event_seed.name,
  event_seed.description,
  event_seed.source_module,
  event_seed.kind_value::public.notification_engine_kind,
  event_seed.priority_value::public.notification_engine_priority,
  event_seed.channels_value::public.notification_engine_channel[],
  event_seed.variables_value::jsonb,
  event_seed.sample_payload_value::jsonb
FROM public.companies c
CROSS JOIN (
  VALUES
    ('ContratoCreado', 'Contrato creado', 'Informa cuando se registra un nuevo contrato.', 'contratos', 'notification', 'info', ARRAY['in_app']::public.notification_engine_channel[], '["Empleado","Empresa","Usuario","Fecha","Cargo"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-05-29","Cargo":"Analista"}'),
    ('ContratoPorVencer', 'Contrato por vencer', 'Alerta de contratos dentro de la ventana de vencimiento.', 'contratos', 'alert', 'high', ARRAY['in_app','email']::public.notification_engine_channel[], '["Empleado","Empresa","Fecha","Cargo","DiasRestantes"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-06-15","Cargo":"Analista","DiasRestantes":15}'),
    ('RequisicionCreada', 'Requisicion creada', 'Informa la creacion de una requisicion.', 'requisiciones', 'notification', 'info', ARRAY['in_app']::public.notification_engine_channel[], '["Empresa","Usuario","Fecha","Cargo"]', '{"Empresa":"Empresa Demo","Usuario":"Yeison","Fecha":"2026-05-29","Cargo":"Coordinador"}'),
    ('RequisicionPendienteAprobacion', 'Requisicion pendiente de aprobacion', 'Alerta para aprobadores de requisiciones.', 'requisiciones', 'alert', 'high', ARRAY['in_app','email']::public.notification_engine_channel[], '["Empresa","Usuario","Fecha","Cargo","PasoAprobacion"]', '{"Empresa":"Empresa Demo","Usuario":"Yeison","Fecha":"2026-05-29","Cargo":"Coordinador","PasoAprobacion":"Aprobacion Coordinadores"}'),
    ('VacacionesAprobadas', 'Vacaciones aprobadas', 'Notifica la aprobacion de vacaciones.', 'vacaciones', 'notification', 'medium', ARRAY['in_app','email']::public.notification_engine_channel[], '["Empleado","Empresa","Usuario","Fecha"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Usuario":"RRHH","Fecha":"2026-05-29"}'),
    ('IncapacidadRegistrada', 'Incapacidad registrada', 'Informa una nueva incapacidad o seguimiento requerido.', 'incapacidades', 'alert', 'medium', ARRAY['in_app']::public.notification_engine_channel[], '["Empleado","Empresa","Usuario","Fecha","Dias"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-05-29","Dias":3}'),
    ('CesantiasLiquidadas', 'Cesantias liquidadas', 'Informa la liquidacion o pago de cesantias.', 'cesantias', 'notification', 'info', ARRAY['in_app','email']::public.notification_engine_channel[], '["Empleado","Empresa","Usuario","Fecha"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-05-29"}'),
    ('ExamenMedicoPorVencer', 'Examen medico por vencer', 'Alerta de examenes medicos proximos a vencer.', 'examenes', 'alert', 'medium', ARRAY['in_app']::public.notification_engine_channel[], '["Empleado","Empresa","Fecha","DiasRestantes"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-06-20","DiasRestantes":22}'),
    ('DocumentoEmpleadoPorVencer', 'Documento de empleado por vencer', 'Alerta por documentos con fecha de expiracion proxima.', 'empleados', 'alert', 'medium', ARRAY['in_app']::public.notification_engine_channel[], '["Empleado","Empresa","Fecha","DiasRestantes"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-06-20","DiasRestantes":22}'),
    ('DotacionPorVencer', 'Dotacion por vencer', 'Alerta de renovacion o vencimiento de dotacion.', 'dotacion', 'alert', 'medium', ARRAY['in_app']::public.notification_engine_channel[], '["Empleado","Empresa","Fecha","DiasRestantes"]', '{"Empleado":"Ana Perez","Empresa":"Empresa Demo","Fecha":"2026-06-20","DiasRestantes":22}')
) AS event_seed(event_key, name, description, source_module, kind_value, priority_value, channels_value, variables_value, sample_payload_value)
ON CONFLICT (company_id, event_key) DO NOTHING;

INSERT INTO public.notification_engine_templates (
  company_id,
  event_id,
  channel,
  name,
  subject_template,
  body_template,
  variables,
  is_default,
  is_active
)
SELECT
  e.company_id,
  e.id,
  'in_app'::public.notification_engine_channel,
  e.event_key || ' - App',
  '{Empresa}: ' || e.name,
  COALESCE(e.description, e.name) || ' Referencia: {Empleado}{Cargo}{Fecha}{DiasRestantes}.',
  e.variables,
  true,
  true
FROM public.notification_engine_events e
WHERE e.event_key IN (
  'ContratoCreado',
  'ContratoPorVencer',
  'RequisicionCreada',
  'RequisicionPendienteAprobacion',
  'VacacionesAprobadas',
  'IncapacidadRegistrada',
  'CesantiasLiquidadas',
  'ExamenMedicoPorVencer',
  'DocumentoEmpleadoPorVencer',
  'DotacionPorVencer'
)
ON CONFLICT (company_id, event_id, channel, name) DO NOTHING;

COMMENT ON TABLE public.notification_engine_events IS 'Catalogo central parametrizable de eventos por empresa.';
COMMENT ON TABLE public.notification_engine_rules IS 'Reglas por evento con destinatarios por rol, usuario, canal y prioridad.';
COMMENT ON TABLE public.notification_engine_templates IS 'Plantillas dinamicas con asunto, cuerpo y variables.';
COMMENT ON TABLE public.notification_engine_channel_providers IS 'Proveedores configurables por canal y empresa.';
COMMENT ON TABLE public.notification_engine_escalation_rules IS 'Reglas de escalamiento automatico por espera, prioridad y destinatarios adicionales.';
COMMENT ON TABLE public.notification_engine_event_logs IS 'Bitacora de eventos generados por los modulos del sistema.';
COMMENT ON TABLE public.notification_engine_deliveries IS 'Historial auditable de entregas, lecturas y acciones por destinatario y canal.';
