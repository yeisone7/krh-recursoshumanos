CREATE TYPE public.document_expiry_alert_status AS ENUM ('pendiente', 'notificada', 'cerrada');

CREATE TABLE public.document_expiry_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.employee_documents(id) ON DELETE CASCADE,
  expires_at DATE NOT NULL,
  status public.document_expiry_alert_status NOT NULL DEFAULT 'pendiente',
  notification_id UUID NULL REFERENCES public.notifications(id) ON DELETE SET NULL,
  notified_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  closed_by UUID NULL,
  close_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id)
);

ALTER TABLE public.document_expiry_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_document_expiry_alerts_company_status
  ON public.document_expiry_alerts(company_id, status, expires_at);

CREATE INDEX idx_document_expiry_alerts_employee
  ON public.document_expiry_alerts(employee_id, expires_at);

CREATE POLICY "Company members can view document expiry alerts"
ON public.document_expiry_alerts
FOR SELECT
USING (public.is_super_admin() OR public.is_company_member(company_id));

CREATE POLICY "Admin and HR can manage document expiry alerts"
ON public.document_expiry_alerts
FOR ALL
USING (public.is_super_admin() OR (public.is_admin_or_rrhh() AND public.is_company_member(company_id)))
WITH CHECK (public.is_super_admin() OR (public.is_admin_or_rrhh() AND public.is_company_member(company_id)));

CREATE OR REPLACE FUNCTION public.sync_document_expiry_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_valid = true AND NEW.expiry_date IS NOT NULL THEN
    INSERT INTO public.document_expiry_alerts (
      company_id,
      employee_id,
      document_id,
      expires_at,
      status,
      closed_at,
      closed_by,
      close_reason
    ) VALUES (
      NEW.company_id,
      NEW.employee_id,
      NEW.id,
      NEW.expiry_date,
      'pendiente',
      NULL,
      NULL,
      NULL
    )
    ON CONFLICT (document_id)
    DO UPDATE SET
      company_id = EXCLUDED.company_id,
      employee_id = EXCLUDED.employee_id,
      expires_at = EXCLUDED.expires_at,
      status = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN 'pendiente'::public.document_expiry_alert_status
        ELSE public.document_expiry_alerts.status
      END,
      closed_at = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.closed_at
      END,
      closed_by = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.closed_by
      END,
      close_reason = CASE
        WHEN public.document_expiry_alerts.status = 'cerrada' THEN NULL
        ELSE public.document_expiry_alerts.close_reason
      END,
      updated_at = now();
  ELSE
    UPDATE public.document_expiry_alerts
    SET
      status = 'cerrada',
      closed_at = COALESCE(closed_at, now()),
      close_reason = COALESCE(close_reason, 'Documento sin vencimiento o invalidado'),
      updated_at = now()
    WHERE document_id = NEW.id
      AND status <> 'cerrada';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_employee_document_expiry_alert
AFTER INSERT OR UPDATE OF expiry_date, is_valid, company_id, employee_id ON public.employee_documents
FOR EACH ROW
EXECUTE FUNCTION public.sync_document_expiry_alert();

CREATE TRIGGER update_document_expiry_alerts_updated_at
BEFORE UPDATE ON public.document_expiry_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();