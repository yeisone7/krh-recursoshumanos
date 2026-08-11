-- Allow each legal follow-up milestone to keep an independent document trail.

BEGIN;

DROP POLICY IF EXISTS "Incapacity permissions can upload documents" ON storage.objects;
CREATE POLICY "Incapacity permissions can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(storage.objects.name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(storage.objects.name))[3]
      AND ei.company_id::text = (storage.foldername(storage.objects.name))[1]
  )
  AND public.is_company_member(((storage.foldername(storage.objects.name))[1])::uuid)
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
  AND (storage.foldername(storage.objects.name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(storage.objects.name))[3]
      AND ei.company_id::text = (storage.foldername(storage.objects.name))[1]
  )
  AND public.is_company_member(((storage.foldername(storage.objects.name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(storage.objects.name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(storage.objects.name))[3]
      AND ei.company_id::text = (storage.foldername(storage.objects.name))[1]
  )
  AND public.is_company_member(((storage.foldername(storage.objects.name))[1])::uuid)
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
  AND (storage.foldername(storage.objects.name))[2] IN (
    'incapacity',
    'incapacity_clinical_history',
    'incapacity_rehabilitation_concept',
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
    'incapacity_capacity_loss_rating'
  )
  AND EXISTS (
    SELECT 1
    FROM public.employee_incapacities ei
    WHERE ei.id::text = (storage.foldername(storage.objects.name))[3]
      AND ei.company_id::text = (storage.foldername(storage.objects.name))[1]
  )
  AND public.is_company_member(((storage.foldername(storage.objects.name))[1])::uuid)
  AND (
    public.is_admin_or_rrhh()
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
    OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
  )
);

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
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
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
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
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
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
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
    'incapacity_afp_follow_up',
    'incapacity_economic_responsibility',
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
