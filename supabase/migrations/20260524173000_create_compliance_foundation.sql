-- Compliance foundation for Colombian HR and payroll operations.
-- Phase 1: obligations, templates, evidence, permissions and secure access.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_domain') THEN
    CREATE TYPE public.compliance_domain AS ENUM (
      'pila_ugpp',
      'nomina_electronica',
      'sg_sst',
      'documental_laboral',
      'juridico_laboral',
      'contratos',
      'seguridad_social'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_status') THEN
    CREATE TYPE public.compliance_status AS ENUM (
      'pendiente',
      'en_proceso',
      'cumplido',
      'vencido',
      'no_aplica'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'compliance_priority') THEN
    CREATE TYPE public.compliance_priority AS ENUM (
      'baja',
      'media',
      'alta',
      'critica'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.compliance_obligation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain public.compliance_domain NOT NULL,
  title text NOT NULL,
  description text,
  legal_reference text,
  default_priority public.compliance_priority NOT NULL DEFAULT 'media',
  suggested_frequency text,
  recommended_evidence text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain, title)
);

CREATE TABLE IF NOT EXISTS public.compliance_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.compliance_obligation_templates(id) ON DELETE SET NULL,
  domain public.compliance_domain NOT NULL,
  title text NOT NULL,
  description text,
  legal_reference text,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  responsible_role_id uuid REFERENCES public.custom_roles(id) ON DELETE SET NULL,
  due_date date,
  period_label text,
  recurrence text,
  status public.compliance_status NOT NULL DEFAULT 'pendiente',
  priority public.compliance_priority NOT NULL DEFAULT 'media',
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  source_module text,
  source_record_id uuid,
  requires_evidence boolean NOT NULL DEFAULT true,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.compliance_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES public.compliance_obligations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  evidence_date date NOT NULL DEFAULT CURRENT_DATE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_company_status
  ON public.compliance_obligations(company_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_company_domain
  ON public.compliance_obligations(company_id, domain, priority);

CREATE INDEX IF NOT EXISTS idx_compliance_obligations_due_date
  ON public.compliance_obligations(due_date);

CREATE INDEX IF NOT EXISTS idx_compliance_evidences_obligation
  ON public.compliance_evidences(obligation_id, created_at DESC);

ALTER TABLE public.compliance_obligation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_evidences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view compliance templates" ON public.compliance_obligation_templates;
CREATE POLICY "Authenticated users can view compliance templates"
ON public.compliance_obligation_templates
FOR SELECT
TO authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Compliance permissions can view obligations" ON public.compliance_obligations;
CREATE POLICY "Compliance permissions can view obligations"
ON public.compliance_obligations
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'view')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can insert obligations" ON public.compliance_obligations;
CREATE POLICY "Compliance permissions can insert obligations"
ON public.compliance_obligations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'create')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can update obligations" ON public.compliance_obligations;
CREATE POLICY "Compliance permissions can update obligations"
ON public.compliance_obligations
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'update')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'update')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can delete obligations" ON public.compliance_obligations;
CREATE POLICY "Compliance permissions can delete obligations"
ON public.compliance_obligations
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'delete')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can view evidences" ON public.compliance_evidences;
CREATE POLICY "Compliance permissions can view evidences"
ON public.compliance_evidences
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'view')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can insert evidences" ON public.compliance_evidences;
CREATE POLICY "Compliance permissions can insert evidences"
ON public.compliance_evidences
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'create')
  )
);

DROP POLICY IF EXISTS "Compliance permissions can delete evidences" ON public.compliance_evidences;
CREATE POLICY "Compliance permissions can delete evidences"
ON public.compliance_evidences
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND public.check_user_permission(auth.uid(), 'cumplimiento_laboral', 'delete')
  )
);

DROP TRIGGER IF EXISTS update_compliance_obligations_updated_at ON public.compliance_obligations;
CREATE TRIGGER update_compliance_obligations_updated_at
BEFORE UPDATE ON public.compliance_obligations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.compliance_obligation_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_obligations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.compliance_evidences TO authenticated;

INSERT INTO public.compliance_obligation_templates (
  domain,
  title,
  description,
  legal_reference,
  default_priority,
  suggested_frequency,
  recommended_evidence
)
VALUES
  (
    'pila_ugpp',
    'Validacion mensual de aportes PILA y consistencia UGPP',
    'Verificar IBC, aportes a salud, pension, ARL, caja de compensacion y novedades reportadas frente a contratos, salarios e incapacidades.',
    'Sistema de Seguridad Social Integral y fiscalizacion UGPP',
    'critica',
    'Mensual',
    'Planilla PILA, soporte de pago, matriz de novedades e informe de diferencias'
  ),
  (
    'nomina_electronica',
    'Generacion y validacion de nomina electronica',
    'Consolidar devengados, deducciones, incapacidades, vacaciones y notas de ajuste antes de transmision o archivo de soporte.',
    'Documento soporte de pago de nomina electronica DIAN',
    'alta',
    'Mensual',
    'Resumen por periodo, XML/soporte, acuse o registro de validacion'
  ),
  (
    'sg_sst',
    'Seguimiento de plan anual SG-SST',
    'Controlar actividades del plan anual, responsables, evidencias, vencimientos y estado de ejecucion.',
    'Sistema de Gestion de Seguridad y Salud en el Trabajo',
    'alta',
    'Mensual',
    'Plan anual firmado, actas, informes, registros fotograficos o certificados'
  ),
  (
    'sg_sst',
    'Gestion de reintegros y restricciones medicas',
    'Verificar examenes de reintegro, recomendaciones ocupacionales, restricciones y seguimiento del trabajador.',
    'SG-SST, medicina laboral y reincorporacion laboral',
    'critica',
    'Por evento',
    'Concepto medico ocupacional, plan de seguimiento y comunicacion al area responsable'
  ),
  (
    'documental_laboral',
    'Completitud del expediente laboral',
    'Validar documentos obligatorios por empleado, cargo, tipo de contrato y centro de operacion.',
    'Gestion documental laboral',
    'alta',
    'Mensual',
    'Checklist documental, documentos firmados y soportes vigentes'
  ),
  (
    'juridico_laboral',
    'Control de terminos de casos laborales',
    'Monitorear derechos de peticion, tutelas, reclamaciones, conciliaciones, descargos o procesos judiciales.',
    'Gestion juridica laboral',
    'critica',
    'Por caso',
    'Radicado, respuesta, actas, anexos y seguimiento de terminos'
  ),
  (
    'contratos',
    'Revision de vencimientos contractuales y prorrogas',
    'Verificar contratos proximos a vencer, prorrogas, renovaciones, terminaciones y documentos generados.',
    'Codigo Sustantivo del Trabajo',
    'alta',
    'Semanal',
    'Listado de vencimientos, documentos de prorroga o terminacion'
  ),
  (
    'seguridad_social',
    'Validacion de afiliaciones y novedades de seguridad social',
    'Controlar EPS, AFP, ARL, caja de compensacion, afiliaciones nuevas y cambios reportados.',
    'Sistema de Seguridad Social Integral',
    'alta',
    'Mensual',
    'Certificados de afiliacion, novedades y matriz de validacion'
  )
ON CONFLICT (domain, title) DO UPDATE SET
  description = EXCLUDED.description,
  legal_reference = EXCLUDED.legal_reference,
  default_priority = EXCLUDED.default_priority,
  suggested_frequency = EXCLUDED.suggested_frequency,
  recommended_evidence = EXCLUDED.recommended_evidence,
  is_active = true;

INSERT INTO public.modules (code, name, icon, sort_order)
VALUES ('cumplimiento_laboral', 'Cumplimiento Laboral', 'ShieldCheck', 29)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, action_value::public.permission_action, description_value
FROM public.modules m
CROSS JOIN (
  VALUES
    ('view', 'Cumplimiento Laboral - Ver'),
    ('create', 'Cumplimiento Laboral - Crear'),
    ('update', 'Cumplimiento Laboral - Modificar'),
    ('delete', 'Cumplimiento Laboral - Eliminar')
) AS permission_seed(action_value, description_value)
WHERE m.code = 'cumplimiento_laboral'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT cr.id, p.id
FROM public.custom_roles cr
CROSS JOIN public.permissions p
JOIN public.modules m ON m.id = p.module_id
WHERE cr.is_system = true
  AND m.code = 'cumplimiento_laboral'
ON CONFLICT (role_id, permission_id) DO NOTHING;
