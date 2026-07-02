-- MVP operativo de desconexion laboral para Colombia.
-- Configuracion por empresa, RLS, grants explicitos y seeds de cumplimiento/notificaciones.

CREATE TABLE IF NOT EXISTS public.labor_disconnection_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  policy_name text NOT NULL DEFAULT 'Politica de desconexion laboral',
  legal_reference text NOT NULL DEFAULT 'Ley 2191 de 2022',
  protected_start_time time NOT NULL DEFAULT '18:00',
  protected_end_time time NOT NULL DEFAULT '07:00',
  applies_weekends boolean NOT NULL DEFAULT true,
  applies_holidays boolean NOT NULL DEFAULT true,
  exception_notes text,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_review_date date,
  next_review_date date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_labor_disconnection_policies_company
  ON public.labor_disconnection_policies(company_id);

CREATE INDEX IF NOT EXISTS idx_labor_disconnection_policies_next_review
  ON public.labor_disconnection_policies(company_id, enabled, next_review_date);

ALTER TABLE public.labor_disconnection_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Labor disconnection policies are viewable by permitted company users" ON public.labor_disconnection_policies;
CREATE POLICY "Labor disconnection policies are viewable by permitted company users"
ON public.labor_disconnection_policies
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((select auth.uid()), 'config_laboral', 'view')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'view')
      OR public.check_user_permission((select auth.uid()), 'alertas', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Labor disconnection policies are insertable by labor managers" ON public.labor_disconnection_policies;
CREATE POLICY "Labor disconnection policies are insertable by labor managers"
ON public.labor_disconnection_policies
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((select auth.uid()), 'config_laboral', 'create')
      OR public.check_user_permission((select auth.uid()), 'config_laboral', 'update')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'create')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Labor disconnection policies are updatable by labor managers" ON public.labor_disconnection_policies;
CREATE POLICY "Labor disconnection policies are updatable by labor managers"
ON public.labor_disconnection_policies
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((select auth.uid()), 'config_laboral', 'update')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((select auth.uid()), 'config_laboral', 'update')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'update')
    )
  )
);

DROP POLICY IF EXISTS "Labor disconnection policies are deletable by labor managers" ON public.labor_disconnection_policies;
CREATE POLICY "Labor disconnection policies are deletable by labor managers"
ON public.labor_disconnection_policies
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((select auth.uid()), 'config_laboral', 'delete')
      OR public.check_user_permission((select auth.uid()), 'cumplimiento_laboral', 'delete')
    )
  )
);

DROP TRIGGER IF EXISTS update_labor_disconnection_policies_updated_at ON public.labor_disconnection_policies;
CREATE TRIGGER update_labor_disconnection_policies_updated_at
BEFORE UPDATE ON public.labor_disconnection_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labor_disconnection_policies TO authenticated;

INSERT INTO public.compliance_obligation_templates (
  domain,
  title,
  description,
  legal_reference,
  default_priority,
  suggested_frequency,
  recommended_evidence
)
VALUES (
  'juridico_laboral',
  'Politica de desconexion laboral',
  'Mantener aprobada, vigente, socializada y evidenciada la politica interna de desconexion laboral de la empresa.',
  'Ley 2191 de 2022',
  'alta',
  'Anual',
  'Politica interna aprobada y socializada'
)
ON CONFLICT (domain, title) DO UPDATE SET
  description = EXCLUDED.description,
  legal_reference = EXCLUDED.legal_reference,
  default_priority = EXCLUDED.default_priority,
  suggested_frequency = EXCLUDED.suggested_frequency,
  recommended_evidence = EXCLUDED.recommended_evidence,
  is_active = true;

DO $$
BEGIN
  IF to_regclass('public.notification_engine_events') IS NOT NULL
    AND to_regclass('public.notification_engine_templates') IS NOT NULL
    AND to_regtype('public.notification_engine_kind') IS NOT NULL
    AND to_regtype('public.notification_engine_priority') IS NOT NULL
    AND to_regtype('public.notification_engine_channel') IS NOT NULL
  THEN
    EXECUTE $seed_events$
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
        'DesconexionLaboralRevisionPendiente',
        'Revision pendiente de desconexion laboral',
        'Alerta cuando la politica de desconexion laboral requiere revision o evidencia.',
        'cumplimiento_laboral',
        'alert'::public.notification_engine_kind,
        'high'::public.notification_engine_priority,
        ARRAY['in_app']::public.notification_engine_channel[],
        '["Empresa","FechaRevision","DiasRestantes","EstadoPolitica"]'::jsonb,
        '{"Empresa":"Empresa Demo","FechaRevision":"2026-12-31","DiasRestantes":15,"EstadoPolitica":"Activa"}'::jsonb
      FROM public.companies c
      ON CONFLICT (company_id, event_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        source_module = EXCLUDED.source_module,
        kind = EXCLUDED.kind,
        default_priority = EXCLUDED.default_priority,
        default_channels = EXCLUDED.default_channels,
        variables = EXCLUDED.variables,
        sample_payload = EXCLUDED.sample_payload,
        is_active = true
    $seed_events$;

    EXECUTE $seed_templates$
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
        'Desconexion laboral - App',
        'Revision de desconexion laboral pendiente',
        'La politica de desconexion laboral requiere seguimiento. Fecha de revision: {FechaRevision}. Dias restantes: {DiasRestantes}.',
        e.variables,
        true,
        true
      FROM public.notification_engine_events e
      WHERE e.event_key = 'DesconexionLaboralRevisionPendiente'
      ON CONFLICT (company_id, event_id, channel, name) DO UPDATE SET
        subject_template = EXCLUDED.subject_template,
        body_template = EXCLUDED.body_template,
        variables = EXCLUDED.variables,
        is_default = true,
        is_active = true
    $seed_templates$;
  END IF;
END $$;
