CREATE TABLE IF NOT EXISTS public.notification_role_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  event_label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text NULL,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, role_id, event_key)
);

COMMENT ON TABLE public.notification_role_rules
IS 'Reglas inteligentes de notificación por empresa, rol, evento y canal.';

CREATE INDEX IF NOT EXISTS idx_notification_role_rules_company_event
  ON public.notification_role_rules(company_id, event_key, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_role_rules_role
  ON public.notification_role_rules(role_id);

ALTER TABLE public.notification_role_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and HR can view notification role rules" ON public.notification_role_rules;
CREATE POLICY "Admins and HR can view notification role rules"
ON public.notification_role_rules
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'alertas', 'view')
  )
);

DROP POLICY IF EXISTS "Admins can manage notification role rules" ON public.notification_role_rules;
CREATE POLICY "Admins can manage notification role rules"
ON public.notification_role_rules
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'alertas', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'alertas', 'update')
  )
);

DROP TRIGGER IF EXISTS update_notification_role_rules_updated_at ON public.notification_role_rules;
CREATE TRIGGER update_notification_role_rules_updated_at
BEFORE UPDATE ON public.notification_role_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_notification_recipient_user_ids(
  _company_id uuid,
  _event_key text,
  _channel text DEFAULT 'in_app'
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ucr.user_id
  FROM public.notification_role_rules nrr
  JOIN public.custom_roles cr ON cr.id = nrr.role_id
  JOIN public.user_custom_roles ucr ON ucr.role_id = cr.id
  LEFT JOIN public.user_preferences up ON up.user_id = ucr.user_id
  WHERE (
      auth.role() = 'service_role'
      OR public.is_super_admin()
      OR (
        public.is_company_member(_company_id)
        AND public.check_user_permission(auth.uid(), 'alertas', 'view')
      )
    )
    AND nrr.company_id = _company_id
    AND nrr.event_key = _event_key
    AND nrr.is_active = true
    AND cr.is_active = true
    AND cr.company_id = _company_id
    AND (
      (_channel = 'in_app' AND nrr.in_app_enabled = true)
      OR (_channel = 'push' AND nrr.push_enabled = true)
      OR (_channel = 'email' AND nrr.email_enabled = true AND coalesce(up.email_notifications, true) = true)
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_company_assignments uca
      WHERE uca.user_id = ucr.user_id
        AND uca.company_id = _company_id
    );
$$;

CREATE OR REPLACE FUNCTION public.create_role_based_notifications(
  _company_id uuid,
  _event_key text,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _category text DEFAULT 'general',
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _action_url text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer := 0;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    company_id,
    title,
    message,
    type,
    category,
    entity_type,
    entity_id,
    action_url
  )
  SELECT
    recipients.user_id,
    _company_id,
    _title,
    _message,
    _type,
    _category,
    _entity_type,
    _entity_id,
    _action_url
  FROM public.get_notification_recipient_user_ids(_company_id, _event_key, 'in_app') recipients;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.create_role_based_notifications(uuid, text, text, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_role_based_notifications(uuid, text, text, text, text, text, text, uuid, text) TO service_role;
