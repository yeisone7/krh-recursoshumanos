BEGIN;

-- Some legacy storage policies read membership rows directly. PostgreSQL must
-- grant table access before RLS can filter those rows for the current user.
GRANT SELECT
ON TABLE public.user_company_assignments
TO authenticated;

-- These tables already have company-aware policies. Enabling RLS makes those
-- policies effective and closes the exposure reported by Supabase advisors.
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Keep training_courses private while allowing its storage policy to validate
-- the course/company relationship under the caller's existing permissions.
CREATE OR REPLACE FUNCTION public.can_access_training_media(
  p_course_id text,
  p_action text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.training_courses tc
    WHERE tc.id::text = p_course_id
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR CASE p_action
              WHEN 'create' THEN
                public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'create')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'create')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'create')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
              WHEN 'update' THEN
                public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
              WHEN 'delete' THEN
                public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'delete')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'delete')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'delete')
                OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
              ELSE false
            END
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_training_media(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_training_media(text, text) TO authenticated;

DROP POLICY IF EXISTS "Training permissions can upload media" ON storage.objects;
CREATE POLICY "Training permissions can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-media'
  AND public.can_access_training_media(
    (storage.foldername(storage.objects.name))[1],
    'create'
  )
);

DROP POLICY IF EXISTS "Training permissions can update media" ON storage.objects;
CREATE POLICY "Training permissions can update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-media'
  AND public.can_access_training_media(
    (storage.foldername(storage.objects.name))[1],
    'update'
  )
)
WITH CHECK (
  bucket_id = 'training-media'
  AND public.can_access_training_media(
    (storage.foldername(storage.objects.name))[1],
    'update'
  )
);

DROP POLICY IF EXISTS "Training permissions can delete media" ON storage.objects;
CREATE POLICY "Training permissions can delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-media'
  AND public.can_access_training_media(
    (storage.foldername(storage.objects.name))[1],
    'delete'
  )
);

-- SELECT policies also participate in UPDATE/DELETE checks. Move the hired
-- candidate lookup behind a protected helper so unrelated document types do
-- not require direct access to candidate and employee document tables.
CREATE OR REPLACE FUNCTION public.can_view_hired_candidate_storage_document(
  p_company_id text,
  p_candidate_id text,
  p_object_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.candidate_documents cd
    JOIN public.candidates c ON c.id = cd.candidate_id
    JOIN public.employee_documents ed ON ed.employee_id = c.employee_id
    WHERE cd.company_id::text = p_company_id
      AND cd.candidate_id::text = p_candidate_id
      AND c.employee_id IS NOT NULL
      AND ed.file_url = cd.file_url
      AND (cd.file_url = p_object_name OR cd.file_url LIKE '%' || p_object_name)
      AND public.is_company_member(ed.company_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_hired_candidate_storage_document(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_hired_candidate_storage_document(text, text, text) TO authenticated;

DROP POLICY IF EXISTS "Employee module can view hired candidate storage documents" ON storage.objects;
CREATE POLICY "Employee module can view hired candidate storage documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(storage.objects.name))[2] = 'candidates'
  AND public.can_view_hired_candidate_storage_document(
    (storage.foldername(storage.objects.name))[1],
    (storage.foldername(storage.objects.name))[3],
    storage.objects.name
  )
);

COMMIT;
