-- Split the generic Catalogos permission into independent catalog permissions.
-- Existing roles that had Catalogos CRUD permissions receive the matching child permissions.

WITH parent_module AS (
  SELECT id
  FROM public.modules
  WHERE code = 'catalogos'
),
catalog_modules (code, name, icon, sort_order) AS (
  VALUES
    ('catalogos_areas', 'Catalogos: Areas', 'Users', 2701),
    ('catalogos_cargos', 'Catalogos: Cargos', 'Briefcase', 2702),
    ('catalogos_tipos_contrato', 'Catalogos: Tipos de Contrato', 'FileText', 2703),
    ('catalogos_tipos_dotacion', 'Catalogos: Tipos de Dotacion', 'Shirt', 2704),
    ('catalogos_festivos', 'Catalogos: Dias Festivos', 'Calendar', 2705),
    ('catalogos_arl', 'Catalogos: ARL', 'ShieldCheck', 2706),
    ('catalogos_eps', 'Catalogos: EPS', 'HeartPulse', 2707),
    ('catalogos_afp', 'Catalogos: AFP', 'Landmark', 2708),
    ('catalogos_ccf', 'Catalogos: Caja Compensacion', 'Users', 2709),
    ('catalogos_afc', 'Catalogos: AFC', 'Landmark', 2710),
    ('catalogos_ips', 'Catalogos: IPS', 'Stethoscope', 2711),
    ('catalogos_bancos', 'Catalogos: Bancos', 'BanknoteIcon', 2712),
    ('catalogos_motivos_novedad', 'Catalogos: Motivos Novedad', 'ClipboardList', 2713),
    ('catalogos_plataformas_publicacion', 'Catalogos: Plataformas Publicacion', 'Globe', 2714),
    ('catalogos_tipos_identificacion', 'Catalogos: Tipos Identificacion', 'FileText', 2715),
    ('catalogos_niveles_educativos', 'Catalogos: Niveles Educativos', 'GraduationCap', 2716),
    ('catalogos_profesiones', 'Catalogos: Profesiones', 'Briefcase', 2717)
)
INSERT INTO public.modules (code, name, parent_id, icon, sort_order, is_active)
SELECT
  catalog_modules.code,
  catalog_modules.name,
  parent_module.id,
  catalog_modules.icon,
  catalog_modules.sort_order,
  true
FROM catalog_modules
CROSS JOIN parent_module
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  parent_id = EXCLUDED.parent_id,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT
  modules.id,
  actions.action,
  modules.name || ' - ' ||
    CASE actions.action
      WHEN 'view' THEN 'Ver'
      WHEN 'create' THEN 'Crear'
      WHEN 'update' THEN 'Modificar'
      WHEN 'delete' THEN 'Eliminar'
    END
FROM public.modules
CROSS JOIN (
  VALUES
    ('view'::public.permission_action),
    ('create'::public.permission_action),
    ('update'::public.permission_action),
    ('delete'::public.permission_action)
) AS actions(action)
WHERE modules.code LIKE 'catalogos_%'
ON CONFLICT (module_id, action) DO UPDATE
SET description = EXCLUDED.description;

-- Preserve current behavior: roles with generic Catalogos permissions inherit
-- the same action on each independent catalog.
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
WHERE parent_modules.code = 'catalogos'
  AND child_modules.code LIKE 'catalogos_%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT custom_roles.id, permissions.id
FROM public.custom_roles
CROSS JOIN public.permissions
JOIN public.modules ON modules.id = permissions.module_id
WHERE custom_roles.is_system = true
  AND modules.code LIKE 'catalogos_%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

DO $$
DECLARE
  catalog_record record;
BEGIN
  FOR catalog_record IN
    SELECT *
    FROM (
      VALUES
        ('areas', 'catalogos_areas'),
        ('positions', 'catalogos_cargos'),
        ('contract_type_config', 'catalogos_tipos_contrato'),
        ('dotation_item_types', 'catalogos_tipos_dotacion'),
        ('company_holidays', 'catalogos_festivos'),
        ('catalog_arl', 'catalogos_arl'),
        ('catalog_eps', 'catalogos_eps'),
        ('catalog_afp', 'catalogos_afp'),
        ('catalog_ccf', 'catalogos_ccf'),
        ('catalog_afc', 'catalogos_afc'),
        ('catalog_ips', 'catalogos_ips'),
        ('catalog_banks', 'catalogos_bancos'),
        ('novelty_reasons', 'catalogos_motivos_novedad'),
        ('vacancy_publication_platforms', 'catalogos_plataformas_publicacion'),
        ('identification_types', 'catalogos_tipos_identificacion'),
        ('education_levels', 'catalogos_niveles_educativos'),
        ('professions', 'catalogos_profesiones')
    ) AS catalogs(table_name, module_code)
  LOOP
    IF to_regclass(format('public.%I', catalog_record.table_name)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can insert" ON public.%I', catalog_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can update" ON public.%I', catalog_record.table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can delete" ON public.%I', catalog_record.table_name);

    EXECUTE format($policy$
      CREATE POLICY "Catalog permissions can insert"
      ON public.%I
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), %L, 'create')
          )
        )
      )
    $policy$, catalog_record.table_name, catalog_record.module_code);

    EXECUTE format($policy$
      CREATE POLICY "Catalog permissions can update"
      ON public.%I
      FOR UPDATE
      TO authenticated
      USING (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), %L, 'update')
          )
        )
      )
      WITH CHECK (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), %L, 'update')
          )
        )
      )
    $policy$, catalog_record.table_name, catalog_record.module_code, catalog_record.module_code);

    EXECUTE format($policy$
      CREATE POLICY "Catalog permissions can delete"
      ON public.%I
      FOR DELETE
      TO authenticated
      USING (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), %L, 'delete')
          )
        )
      )
    $policy$, catalog_record.table_name, catalog_record.module_code);
  END LOOP;
END $$;
