-- Correct payment ownership for work-related incapacities and paternity leave.
-- Extend incapacity document permissions for rehabilitation and PCL documents.

BEGIN;

WITH payment_base AS (
  SELECT
    ei.id,
    ei.origin,
    ei.total_days,
    ei.parent_incapacity_id,
    GREATEST(
      COALESCE(ei.daily_base_salary, 0),
      CASE
        WHEN EXTRACT(YEAR FROM ei.start_date) <= 2024 THEN 1300000::numeric / 30
        WHEN EXTRACT(YEAR FROM ei.start_date) = 2025 THEN 1423500::numeric / 30
        ELSE 1750905::numeric / 30
      END
    ) AS payable_daily_salary
  FROM public.employee_incapacities ei
  WHERE ei.origin IN ('laboral', 'licencia_paternidad')
), recalculated AS (
  SELECT
    payment_base.*,
    CASE
      WHEN origin = 'laboral' AND parent_incapacity_id IS NULL THEN 1
      ELSE 0
    END AS new_employer_days,
    CASE
      WHEN origin = 'licencia_paternidad' THEN total_days
      ELSE 0
    END AS new_eps_days,
    CASE
      WHEN origin = 'laboral' THEN
        total_days - CASE WHEN parent_incapacity_id IS NULL THEN 1 ELSE 0 END
      ELSE 0
    END AS new_arl_days
  FROM payment_base
)
UPDATE public.employee_incapacities ei
SET
  employer_days = recalculated.new_employer_days,
  eps_days = recalculated.new_eps_days,
  arl_days = recalculated.new_arl_days,
  afp_days = 0,
  employer_amount = ROUND(recalculated.new_employer_days * recalculated.payable_daily_salary, 2),
  eps_amount = ROUND(recalculated.new_eps_days * recalculated.payable_daily_salary, 2),
  arl_amount = ROUND(recalculated.new_arl_days * recalculated.payable_daily_salary, 2),
  afp_amount = 0,
  total_amount =
    ROUND(recalculated.new_employer_days * recalculated.payable_daily_salary, 2)
    + ROUND(recalculated.new_eps_days * recalculated.payable_daily_salary, 2)
    + ROUND(recalculated.new_arl_days * recalculated.payable_daily_salary, 2)
FROM recalculated
WHERE ei.id = recalculated.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.origin IN ('laboral', 'licencia_paternidad')
      AND ei.employer_days + ei.eps_days + ei.arl_days + ei.afp_days <> ei.total_days
  ) THEN
    RAISE EXCEPTION 'Incapacity payment backfill produced an invalid day distribution';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.origin = 'laboral'
      AND (
        (ei.parent_incapacity_id IS NULL AND ei.employer_days <> 1)
        OR (ei.parent_incapacity_id IS NOT NULL AND ei.employer_days <> 0)
        OR ei.arl_days <> ei.total_days - ei.employer_days
      )
  ) THEN
    RAISE EXCEPTION 'Work-related incapacity backfill produced an invalid owner distribution';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.origin = 'licencia_paternidad'
      AND (ei.eps_days <> ei.total_days OR ei.employer_days <> 0 OR ei.arl_days <> 0 OR ei.afp_days <> 0)
  ) THEN
    RAISE EXCEPTION 'Paternity leave backfill produced an invalid owner distribution';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.origin IN ('laboral', 'licencia_paternidad')
      AND ABS(
        COALESCE(ei.total_amount, 0)
        - (
          COALESCE(ei.employer_amount, 0)
          + COALESCE(ei.eps_amount, 0)
          + COALESCE(ei.arl_amount, 0)
          + COALESCE(ei.afp_amount, 0)
        )
      ) > 0.01
  ) THEN
    RAISE EXCEPTION 'Incapacity payment backfill produced an invalid amount total';
  END IF;
END
$$;

DROP POLICY IF EXISTS "Incapacity permissions can upload documents" ON storage.objects;
CREATE POLICY "Incapacity permissions can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(name))[3]
      AND ei.company_id::text = (storage.foldername(name))[1]
  )
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'create')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

DROP POLICY IF EXISTS "Incapacity permissions can update documents" ON storage.objects;
CREATE POLICY "Incapacity permissions can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(name))[3]
      AND ei.company_id::text = (storage.foldername(name))[1]
  )
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(name))[3]
      AND ei.company_id::text = (storage.foldername(name))[1]
  )
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

DROP POLICY IF EXISTS "Incapacity permissions can delete documents" ON storage.objects;
CREATE POLICY "Incapacity permissions can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(name))[3]
      AND ei.company_id::text = (storage.foldername(name))[1]
  )
  AND public.is_company_member(((storage.foldername(name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

-- Table privileges are required before PostgreSQL evaluates the RLS policies.
-- RLS remains the authorization boundary for company and module permissions.
GRANT SELECT
ON TABLE public.employee_incapacities
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.document_versions
TO authenticated;

DROP POLICY IF EXISTS "Incapacity permissions can insert document versions" ON public.document_versions;
CREATE POLICY "Incapacity permissions can insert document versions"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (
  entity_type IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND uploaded_by = auth.uid()
  AND public.is_company_member(company_id)
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id = document_versions.entity_id
      AND ei.company_id = document_versions.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'create')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

DROP POLICY IF EXISTS "Incapacity permissions can update document versions" ON public.document_versions;
CREATE POLICY "Incapacity permissions can update document versions"
ON public.document_versions
FOR UPDATE
TO authenticated
USING (
  entity_type IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND public.is_company_member(company_id)
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id = document_versions.entity_id
      AND ei.company_id = document_versions.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
)
WITH CHECK (
  entity_type IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND public.is_company_member(company_id)
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id = document_versions.entity_id
      AND ei.company_id = document_versions.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

DROP POLICY IF EXISTS "Incapacity permissions can delete document versions" ON public.document_versions;
CREATE POLICY "Incapacity permissions can delete document versions"
ON public.document_versions
FOR DELETE
TO authenticated
USING (
  entity_type IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_capacity_loss_rating'
  )
  AND public.is_company_member(company_id)
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id = document_versions.entity_id
      AND ei.company_id = document_versions.company_id
  )
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

COMMIT;
