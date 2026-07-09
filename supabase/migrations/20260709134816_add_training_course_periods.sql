CREATE TABLE IF NOT EXISTS public.training_course_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_course_periods_month_check CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT training_course_periods_unique UNIQUE (company_id, course_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_training_course_periods_company_period
ON public.training_course_periods(company_id, year, month);

CREATE INDEX IF NOT EXISTS idx_training_course_periods_course
ON public.training_course_periods(course_id);

ALTER TABLE public.training_course_periods ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_course_periods TO authenticated;

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
JOIN petro_periods pp ON lower(btrim(pp.course_name)) = lower(btrim(tc.name))
WHERE c.name ILIKE 'PETROCASINOS%'
  AND tc.is_active = true
ON CONFLICT (company_id, course_id, year, month) DO NOTHING;

INSERT INTO public.training_course_periods (company_id, course_id, year, month, created_by)
SELECT tc.company_id, tc.id, 2026, 7, tc.created_by
FROM public.training_courses tc
JOIN public.companies c ON c.id = tc.company_id
WHERE c.name ILIKE 'COSECHARTE%'
  AND tc.is_active = true
ON CONFLICT (company_id, course_id, year, month) DO NOTHING;
