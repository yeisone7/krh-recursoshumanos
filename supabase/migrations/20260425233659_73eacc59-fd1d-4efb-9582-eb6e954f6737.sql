CREATE TABLE public.notification_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  recipient_user_id UUID NULL,
  recipient_email TEXT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NULL,
  template_name TEXT NULL,
  subject TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT NULL,
  triggered_by_user_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notification_delivery_logs_company_created
  ON public.notification_delivery_logs(company_id, created_at DESC);

CREATE INDEX idx_notification_delivery_logs_recipient_user_created
  ON public.notification_delivery_logs(recipient_user_id, created_at DESC);

CREATE INDEX idx_notification_delivery_logs_channel_status
  ON public.notification_delivery_logs(channel, status);

CREATE POLICY "Company members can view delivery logs"
ON public.notification_delivery_logs
FOR SELECT
TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR (company_id IS NOT NULL AND public.is_company_member(company_id))
  OR public.is_admin_or_rrhh()
);

CREATE POLICY "Admins and HR can create delivery logs"
ON public.notification_delivery_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
);

CREATE POLICY "Admins and HR can update delivery logs"
ON public.notification_delivery_logs
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
)
WITH CHECK (
  public.is_admin_or_rrhh()
  AND (company_id IS NULL OR public.is_company_member(company_id))
);

CREATE TRIGGER update_notification_delivery_logs_updated_at
BEFORE UPDATE ON public.notification_delivery_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();