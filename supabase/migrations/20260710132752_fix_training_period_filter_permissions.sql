DROP POLICY IF EXISTS "Training permissions can view" ON public.training_course_periods;
DROP POLICY IF EXISTS "Training permissions can insert" ON public.training_course_periods;
DROP POLICY IF EXISTS "Training permissions can update" ON public.training_course_periods;
DROP POLICY IF EXISTS "Training permissions can delete" ON public.training_course_periods;

CREATE POLICY "Training permissions can view"
ON public.training_course_periods
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_dashboard', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_cumplimiento', 'view')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_evidencias', 'view')
      OR public.check_user_permission(auth.uid(), 'analitica_capacitaciones', 'view')
    )
  )
);

CREATE POLICY "Training permissions can insert"
ON public.training_course_periods
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'create')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'create')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'create')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
    )
  )
);

CREATE POLICY "Training permissions can update"
ON public.training_course_periods
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
    )
  )
);

CREATE POLICY "Training permissions can delete"
ON public.training_course_periods
FOR DELETE
TO authenticated
USING (
  public.is_super_admin()
  OR (
    public.is_company_member(company_id)
    AND (
      public.is_admin_or_rrhh()
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
      OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'delete')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'delete')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'delete')
      OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
    )
  )
);

WITH petro_periods(course_name, year, month) AS (
  VALUES
    ('Fase 1 Control del fuego', 2026, 6),
    ('Manejo de Sustancias Químicas', 2026, 6),
    ('Procedimientos de trabajo seguro en mantenimiento', 2026, 6),
    ('SAGRILAFT', 2026, 7),
    ('Control de Plagas', 2026, 7)
)
INSERT INTO public.training_course_periods (company_id, course_id, year, month, created_by)
SELECT tc.company_id, tc.id, pp.year, pp.month, tc.created_by
FROM public.training_courses tc
JOIN public.companies c ON c.id = tc.company_id
JOIN petro_periods pp ON lower(trim(tc.name)) = lower(trim(pp.course_name))
WHERE lower(c.name) LIKE 'petrocasinos%'
  AND tc.is_active = true
ON CONFLICT (company_id, course_id, year, month) DO NOTHING;

INSERT INTO public.training_course_periods (company_id, course_id, year, month, created_by)
SELECT tc.company_id, tc.id, 2026, 7, tc.created_by
FROM public.training_courses tc
JOIN public.companies c ON c.id = tc.company_id
WHERE lower(c.name) LIKE 'cosecharte%'
  AND tc.is_active = true
ON CONFLICT (company_id, course_id, year, month) DO NOTHING;

DELETE FROM public.training_course_periods tcp
USING public.training_courses tc, public.companies c
WHERE tcp.course_id = tc.id
  AND tcp.company_id = c.id
  AND lower(c.name) LIKE 'petrocasinos%'
  AND tcp.year = 2026
  AND tcp.month = 7
  AND lower(trim(tc.name)) = lower(trim('Lavado de manos ejemplo'));
