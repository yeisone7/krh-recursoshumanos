-- Split the generic Capacitaciones permission into independent item permissions.
-- Existing roles that had Capacitaciones permissions receive matching child permissions.

WITH parent_module AS (
  SELECT id
  FROM public.modules
  WHERE code = 'capacitaciones'
),
training_modules (code, name, icon, sort_order) AS (
  VALUES
    ('capacitaciones_dashboard', 'Capacitaciones: Dashboard', 'LayoutDashboard', 1601),
    ('capacitaciones_ia', 'Capacitaciones: Nueva con IA', 'Sparkles', 1602),
    ('capacitaciones_manual', 'Capacitaciones: Nueva Manual', 'PenLine', 1603),
    ('capacitaciones_biblioteca', 'Capacitaciones: Biblioteca', 'Library', 1604),
    ('capacitaciones_enlaces', 'Capacitaciones: Enlaces', 'Link2', 1605),
    ('capacitaciones_cumplimiento', 'Capacitaciones: Cumplimiento', 'ClipboardCheck', 1606),
    ('capacitaciones_evidencias', 'Capacitaciones: Evidencias', 'FileSignature', 1607)
)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT
  training_modules.code,
  training_modules.name,
  parent_module.id,
  training_modules.icon,
  training_modules.sort_order,
  true
FROM training_modules
CROSS JOIN parent_module
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

UPDATE public.modules
SET
  parent_id = (SELECT id FROM public.modules WHERE code = 'capacitaciones'),
  sort_order = 1608,
  icon = 'BarChart3',
  is_active = true
WHERE code = 'analitica_capacitaciones';

WITH training_permissions (module_code, action) AS (
  VALUES
    ('capacitaciones_dashboard', 'view'::public.permission_action),
    ('capacitaciones_dashboard', 'create'::public.permission_action),
    ('capacitaciones_dashboard', 'update'::public.permission_action),
    ('capacitaciones_dashboard', 'delete'::public.permission_action),
    ('capacitaciones_dashboard', 'export'::public.permission_action),
    ('capacitaciones_ia', 'view'::public.permission_action),
    ('capacitaciones_ia', 'create'::public.permission_action),
    ('capacitaciones_ia', 'update'::public.permission_action),
    ('capacitaciones_ia', 'delete'::public.permission_action),
    ('capacitaciones_manual', 'view'::public.permission_action),
    ('capacitaciones_manual', 'create'::public.permission_action),
    ('capacitaciones_manual', 'update'::public.permission_action),
    ('capacitaciones_manual', 'delete'::public.permission_action),
    ('capacitaciones_biblioteca', 'view'::public.permission_action),
    ('capacitaciones_biblioteca', 'create'::public.permission_action),
    ('capacitaciones_biblioteca', 'update'::public.permission_action),
    ('capacitaciones_biblioteca', 'delete'::public.permission_action),
    ('capacitaciones_biblioteca', 'export'::public.permission_action),
    ('capacitaciones_enlaces', 'view'::public.permission_action),
    ('capacitaciones_enlaces', 'create'::public.permission_action),
    ('capacitaciones_enlaces', 'update'::public.permission_action),
    ('capacitaciones_enlaces', 'delete'::public.permission_action),
    ('capacitaciones_cumplimiento', 'view'::public.permission_action),
    ('capacitaciones_cumplimiento', 'export'::public.permission_action),
    ('capacitaciones_evidencias', 'view'::public.permission_action),
    ('capacitaciones_evidencias', 'delete'::public.permission_action),
    ('capacitaciones_evidencias', 'export'::public.permission_action),
    ('analitica_capacitaciones', 'view'::public.permission_action),
    ('analitica_capacitaciones', 'export'::public.permission_action)
)
INSERT INTO public.permissions (module_id, action, description)
SELECT
  modules.id,
  training_permissions.action,
  modules.name || ' - ' ||
    CASE training_permissions.action
      WHEN 'view' THEN 'Ver'
      WHEN 'create' THEN 'Crear'
      WHEN 'update' THEN 'Modificar'
      WHEN 'delete' THEN 'Eliminar'
      WHEN 'approve' THEN 'Aprobar'
      WHEN 'export' THEN 'Exportar'
    END
FROM training_permissions
JOIN public.modules ON modules.code = training_permissions.module_code
ON CONFLICT (module_id, action) DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT parent_role_permissions.role_id, child_permissions.id
FROM public.role_permissions AS parent_role_permissions
JOIN public.permissions AS parent_permissions
  ON parent_permissions.id = parent_role_permissions.permission_id
JOIN public.modules AS parent_modules
  ON parent_modules.id = parent_permissions.module_id
JOIN public.permissions AS child_permissions
  ON child_permissions.action = parent_permissions.action
JOIN public.modules AS child_modules
  ON child_modules.id = child_permissions.module_id
WHERE parent_modules.code = 'capacitaciones'
  AND child_modules.code IN (
    'capacitaciones_dashboard',
    'capacitaciones_ia',
    'capacitaciones_manual',
    'capacitaciones_biblioteca',
    'capacitaciones_enlaces',
    'capacitaciones_cumplimiento',
    'capacitaciones_evidencias',
    'analitica_capacitaciones'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT custom_roles.id, permissions.id
FROM public.custom_roles
CROSS JOIN public.permissions
JOIN public.modules ON modules.id = permissions.module_id
WHERE custom_roles.is_system = true
  AND modules.code IN (
    'capacitaciones_dashboard',
    'capacitaciones_ia',
    'capacitaciones_manual',
    'capacitaciones_biblioteca',
    'capacitaciones_enlaces',
    'capacitaciones_cumplimiento',
    'capacitaciones_evidencias',
    'analitica_capacitaciones'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

DO $$
DECLARE
  training_record record;
  view_check text;
  create_check text;
  update_check text;
  delete_check text;
BEGIN
  FOR training_record IN
    SELECT *
    FROM (
      VALUES
        ('training_courses', ARRAY['capacitaciones_dashboard','capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca','capacitaciones_cumplimiento','capacitaciones_evidencias','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca']::text[]),
        ('training_sessions', ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento','capacitaciones_evidencias','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca']::text[]),
        ('training_attendance', ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento','capacitaciones_evidencias','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca']::text[]),
        ('training_plans', ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca']::text[]),
        ('training_plan_items', ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_biblioteca']::text[]),
        ('training_access_tokens', ARRAY['capacitaciones_enlaces']::text[], ARRAY['capacitaciones_enlaces']::text[], ARRAY['capacitaciones_enlaces']::text[], ARRAY['capacitaciones_enlaces']::text[]),
        ('training_completions', ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento','capacitaciones_evidencias','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento','capacitaciones_evidencias']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento','capacitaciones_evidencias']::text[], ARRAY['capacitaciones_evidencias']::text[]),
        ('training_media', ARRAY['capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[], ARRAY['capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[], ARRAY['capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[], ARRAY['capacitaciones_ia','capacitaciones_manual','capacitaciones_biblioteca']::text[]),
        ('training_certificates', ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento','capacitaciones_evidencias','analitica_capacitaciones']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_dashboard','capacitaciones_cumplimiento']::text[], ARRAY['capacitaciones_evidencias']::text[])
    ) AS training(table_name, view_modules, create_modules, update_modules, delete_modules)
  LOOP
    IF to_regclass(format('public.%I', training_record.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    view_check := format(
      'public.check_user_permission(auth.uid(), %L, %L) OR EXISTS (SELECT 1 FROM unnest(%L::text[]) AS allowed(module_code) WHERE public.check_user_permission(auth.uid(), allowed.module_code, %L))',
      'capacitaciones',
      'view',
      training_record.view_modules,
      'view'
    );
    create_check := format(
      'public.check_user_permission(auth.uid(), %L, %L) OR EXISTS (SELECT 1 FROM unnest(%L::text[]) AS allowed(module_code) WHERE public.check_user_permission(auth.uid(), allowed.module_code, %L))',
      'capacitaciones',
      'create',
      training_record.create_modules,
      'create'
    );
    update_check := format(
      'public.check_user_permission(auth.uid(), %L, %L) OR EXISTS (SELECT 1 FROM unnest(%L::text[]) AS allowed(module_code) WHERE public.check_user_permission(auth.uid(), allowed.module_code, %L))',
      'capacitaciones',
      'update',
      training_record.update_modules,
      'update'
    );
    delete_check := format(
      'public.check_user_permission(auth.uid(), %L, %L) OR EXISTS (SELECT 1 FROM unnest(%L::text[]) AS allowed(module_code) WHERE public.check_user_permission(auth.uid(), allowed.module_code, %L))',
      'capacitaciones',
      'delete',
      training_record.delete_modules,
      'delete'
    );

    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can view" ON public.%I', training_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can insert" ON public.%I', training_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can update" ON public.%I', training_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Training permissions can delete" ON public.%I', training_record.table_name);

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
            OR %s
          )
        )
      )
    $policy$, training_record.table_name, view_check);

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
            OR %s
          )
        )
      )
    $policy$, training_record.table_name, create_check);

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
            OR %s
          )
        )
      )
      WITH CHECK (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR %s
          )
        )
      )
    $policy$, training_record.table_name, update_check, update_check);

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
            OR %s
          )
        )
      )
    $policy$, training_record.table_name, delete_check);
  END LOOP;
END $$;

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
    WHERE tc.id::text = (storage.foldername(name))[1]
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
    WHERE tc.id::text = (storage.foldername(name))[1]
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
    WHERE tc.id::text = (storage.foldername(name))[1]
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
