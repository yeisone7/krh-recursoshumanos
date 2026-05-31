ALTER TABLE public.notification_role_rules
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false;

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
      OR (_channel = 'whatsapp' AND nrr.whatsapp_enabled = true)
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_company_assignments uca
      WHERE uca.user_id = ucr.user_id
        AND uca.company_id = _company_id
    );
$$;

REVOKE ALL ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_recipient_user_ids(uuid, text, text) TO service_role;
