-- Reuse evaluaciones/create and expose review/approval as independent role permissions.
INSERT INTO public.modules (code, name, parent_id, sort_order, is_active)
SELECT entry.code, entry.name, parent.id, entry.sort_order, true
FROM public.modules parent
CROSS JOIN (VALUES
  ('evaluaciones_review', 'Marcar como Revisada', 2),
  ('evaluaciones_approve', 'Marcar como Aprobada', 3)
) AS entry(code, name, sort_order)
WHERE parent.code = 'evaluaciones'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id,
  sort_order = EXCLUDED.sort_order, is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT id, 'approve'::public.permission_action, name
FROM public.modules WHERE code IN ('evaluaciones_review', 'evaluaciones_approve')
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

UPDATE public.permissions p SET description = 'Crear evaluaciones, ciclos y plantillas'
FROM public.modules m WHERE p.module_id = m.id AND m.code = 'evaluaciones' AND p.action = 'create';

-- Only system administrator roles receive the new permissions automatically.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.custom_roles r
CROSS JOIN public.permissions p JOIN public.modules m ON m.id = p.module_id
WHERE r.is_system AND m.code IN ('evaluaciones_review', 'evaluaciones_approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.authorize_evaluation_workflow()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE required_module text; required_action text;
BEGIN
  -- Maintenance/service connections keep their existing privileges; API callers use auth.uid().
  IF auth.uid() IS NULL AND current_user IN ('postgres', 'service_role') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    required_module := 'evaluaciones';
    required_action := 'create';
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('reviewed', 'approved') THEN
    required_module := CASE NEW.status WHEN 'reviewed' THEN 'evaluaciones_review' ELSE 'evaluaciones_approve' END;
    required_action := 'approve';
  ELSE
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NOT (
    public.is_super_admin() OR (public.is_company_member(NEW.company_id) AND (
      public.is_admin() OR public.check_user_permission(auth.uid(), required_module, required_action)
    ))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para esta acción de evaluación (%)', required_module USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'reviewed' THEN
      NEW.reviewed_at := now();
      NEW.reviewed_by := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_evaluation_workflow() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_evaluation_workflow() TO authenticated, service_role;

CREATE TRIGGER authorize_evaluation_workflow BEFORE INSERT OR UPDATE ON public.performance_evaluations
FOR EACH ROW EXECUTE FUNCTION public.authorize_evaluation_workflow();
CREATE TRIGGER authorize_evaluation_workflow BEFORE INSERT ON public.evaluation_cycles
FOR EACH ROW EXECUTE FUNCTION public.authorize_evaluation_workflow();
CREATE TRIGGER authorize_evaluation_workflow BEFORE INSERT ON public.evaluation_templates
FOR EACH ROW EXECUTE FUNCTION public.authorize_evaluation_workflow();

-- Review-only roles can read and update finalized evaluations without the general update permission.
-- Existing completion guards still enforce exact transitions and immutable answers.
CREATE POLICY evaluation_workflow_read ON public.performance_evaluations FOR SELECT TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (
  public.check_user_permission(auth.uid(), 'evaluaciones_review', 'approve') OR
  public.check_user_permission(auth.uid(), 'evaluaciones_approve', 'approve')
)));
CREATE POLICY evaluation_workflow_update ON public.performance_evaluations FOR UPDATE TO authenticated
USING (public.is_super_admin() OR (public.is_company_member(company_id) AND (
  (status = 'submitted' AND public.check_user_permission(auth.uid(), 'evaluaciones_review', 'approve')) OR
  (status = 'reviewed' AND public.check_user_permission(auth.uid(), 'evaluaciones_approve', 'approve'))
)))
WITH CHECK (public.is_super_admin() OR (public.is_company_member(company_id) AND (
  (status = 'reviewed' AND public.check_user_permission(auth.uid(), 'evaluaciones_review', 'approve')) OR
  (status = 'approved' AND public.check_user_permission(auth.uid(), 'evaluaciones_approve', 'approve'))
)));
