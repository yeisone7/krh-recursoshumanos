-- Read-path optimization only: no training records, signatures or permissions
-- are removed. The company and module access rules are unchanged.
-- User-only checks run once per statement (InitPlans), not once per evidence.
SET LOCAL lock_timeout = '3s';

CREATE INDEX IF NOT EXISTS training_completions_company_completed_id_idx
  ON public.training_completions (company_id, completed_at DESC, id DESC);

ALTER POLICY "Training permissions can view" ON public.training_completions
USING (
  (SELECT public.is_super_admin())
  OR (
    company_id IN (SELECT public.get_user_company_ids())
    AND (
      (SELECT public.is_admin_or_rrhh())
      OR (SELECT public.check_user_permission(auth.uid(), 'capacitaciones', 'view'))
      OR (SELECT EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          'capacitaciones_dashboard', 'capacitaciones_cumplimiento',
          'capacitaciones_evidencias', 'analitica_capacitaciones'
        ]::text[]) AS allowed(module_code)
        WHERE public.check_user_permission(auth.uid(), allowed.module_code, 'view')
      ))
    )
  )
);

ALTER POLICY "Training permissions can view" ON public.training_courses
USING (
  (SELECT public.is_super_admin())
  OR (
    company_id IN (SELECT public.get_user_company_ids())
    AND (
      (SELECT public.is_admin_or_rrhh())
      OR (SELECT public.check_user_permission(auth.uid(), 'capacitaciones', 'view'))
      OR (SELECT EXISTS (
        SELECT 1 FROM unnest(ARRAY[
          'capacitaciones_dashboard', 'capacitaciones_ia', 'capacitaciones_manual',
          'capacitaciones_biblioteca', 'capacitaciones_cumplimiento',
          'capacitaciones_evidencias', 'analitica_capacitaciones'
        ]::text[]) AS allowed(module_code)
        WHERE public.check_user_permission(auth.uid(), allowed.module_code, 'view')
      ))
    )
  )
);

ALTER POLICY "Training permissions can view" ON public.training_access_tokens
USING (
  (SELECT public.is_super_admin())
  OR (
    company_id IN (SELECT public.get_user_company_ids())
    AND (
      (SELECT public.is_admin_or_rrhh())
      OR (SELECT public.check_user_permission(auth.uid(), 'capacitaciones', 'view'))
      OR (SELECT public.check_user_permission(auth.uid(), 'capacitaciones_enlaces', 'view'))
    )
  )
);
