-- Fix storage RLS for generated/uploaded training media.
-- Inside the training_courses subquery, an unqualified "name" resolves to
-- training_courses.name instead of storage.objects.name, making the course-id
-- path check fail for browser uploads.

DROP POLICY IF EXISTS "Training permissions can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Training permissions can update media" ON storage.objects;
DROP POLICY IF EXISTS "Training permissions can delete media" ON storage.objects;

CREATE POLICY "Training permissions can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-media'
  AND EXISTS (
    SELECT 1
    FROM public.training_courses tc
    WHERE tc.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'create')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'create')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'create')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
          )
        )
      )
  )
);

CREATE POLICY "Training permissions can update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-media'
  AND EXISTS (
    SELECT 1
    FROM public.training_courses tc
    WHERE tc.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
          )
        )
      )
  )
)
WITH CHECK (
  bucket_id = 'training-media'
  AND EXISTS (
    SELECT 1
    FROM public.training_courses tc
    WHERE tc.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'update')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
          )
        )
      )
  )
);

CREATE POLICY "Training permissions can delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-media'
  AND EXISTS (
    SELECT 1
    FROM public.training_courses tc
    WHERE tc.id::text = (storage.foldername(storage.objects.name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_ia', 'delete')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_manual', 'delete')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'delete')
            OR public.check_user_permission(auth.uid(), 'capacitaciones_biblioteca', 'update')
          )
        )
      )
  )
);
