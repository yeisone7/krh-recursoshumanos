-- Make Capacitaciones CRUD follow the role permission matrix instead of broad
-- company membership. Public token-based training access remains available.

DO $$
DECLARE
  training_table text;
  training_tables text[] := ARRAY[
    'training_courses',
    'training_sessions',
    'training_attendance',
    'training_plans',
    'training_plan_items',
    'training_access_tokens',
    'training_completions',
    'training_media'
  ];
BEGIN
  FOREACH training_table IN ARRAY training_tables LOOP
    IF to_regclass(format('public.%I', training_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can view" ON public.%I', training_table);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can insert" ON public.%I', training_table);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can update" ON public.%I', training_table);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can delete" ON public.%I', training_table);

    EXECUTE format($policy$
      CREATE POLICY "Training permissions can view"
      ON public.%I
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
      )
    $policy$, training_table);

    EXECUTE format($policy$
      CREATE POLICY "Training permissions can insert"
      ON public.%I
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
          )
        )
      )
    $policy$, training_table);

    EXECUTE format($policy$
      CREATE POLICY "Training permissions can update"
      ON public.%I
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
      )
    $policy$, training_table);

    EXECUTE format($policy$
      CREATE POLICY "Training permissions can delete"
      ON public.%I
      FOR DELETE
      TO authenticated
      USING (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
          )
        )
      )
    $policy$, training_table);
  END LOOP;
END $$;

-- Remove broad write policies that allowed every company member to manage training.
DROP POLICY IF EXISTS "training_courses_company_isolation" ON public.training_courses;
DROP POLICY IF EXISTS "training_sessions_company_isolation" ON public.training_sessions;
DROP POLICY IF EXISTS "training_attendance_company_isolation" ON public.training_attendance;
DROP POLICY IF EXISTS "training_plans_company_isolation" ON public.training_plans;
DROP POLICY IF EXISTS "training_plan_items_company_isolation" ON public.training_plan_items;

DROP POLICY IF EXISTS "Users can manage access tokens for their company" ON public.training_access_tokens;
DROP POLICY IF EXISTS "Users can manage media for their company courses" ON public.training_media;
DROP POLICY IF EXISTS "Users can delete completions for their company" ON public.training_completions;
DROP POLICY IF EXISTS "Users can read completions for their company" ON public.training_completions;

DROP POLICY IF EXISTS "Company members can view training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can insert training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can update training attendance" ON public.training_attendance;
DROP POLICY IF EXISTS "Company members can delete training attendance" ON public.training_attendance;

DROP POLICY IF EXISTS "Company members can view training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can insert training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can update training media" ON public.training_media;
DROP POLICY IF EXISTS "Company members can delete training media" ON public.training_media;

DROP POLICY IF EXISTS "Company members can view plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can insert plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can update plan items" ON public.training_plan_items;
DROP POLICY IF EXISTS "Company members can delete plan items" ON public.training_plan_items;

-- Storage: keep media public for viewing, but uploads/updates/deletes require
-- a role with Capacitaciones permissions over the course company.
DROP POLICY IF EXISTS "Authenticated users can upload training media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete training media" ON storage.objects;
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
    WHERE tc.id::text = (storage.foldername(name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'create')
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
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
    WHERE tc.id::text = (storage.foldername(name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
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
    WHERE tc.id::text = (storage.foldername(name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
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
    WHERE tc.id::text = (storage.foldername(name))[1]
      AND (
        public.is_super_admin()
        OR (
          public.is_company_member(tc.company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'delete')
            OR public.check_user_permission(auth.uid(), 'capacitaciones', 'update')
          )
        )
      )
  )
);
