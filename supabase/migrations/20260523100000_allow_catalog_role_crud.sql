-- Allow users with Catalogos module permissions to manage catalog tables.
-- This keeps company scoping through company_id and maps each CRUD action
-- to the matching permission from the access matrix.

DO $$
DECLARE
  catalog_table text;
  catalog_tables text[] := ARRAY[
    'areas',
    'positions',
    'contract_type_config',
    'dotation_item_types',
    'company_holidays',
    'catalog_arl',
    'catalog_eps',
    'catalog_afp',
    'catalog_ccf',
    'catalog_afc',
    'catalog_ips',
    'catalog_banks',
    'novelty_reasons',
    'vacancy_publication_platforms',
    'identification_types',
    'education_levels',
    'professions'
  ];
BEGIN
  FOREACH catalog_table IN ARRAY catalog_tables LOOP
    IF to_regclass(format('public.%I', catalog_table)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can insert" ON public.%I', catalog_table);
    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can update" ON public.%I', catalog_table);
    EXECUTE format('DROP POLICY IF EXISTS "Catalog permissions can delete" ON public.%I', catalog_table);

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
            OR public.check_user_permission(auth.uid(), 'catalogos', 'create')
          )
        )
      )
    $policy$, catalog_table);

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
            OR public.check_user_permission(auth.uid(), 'catalogos', 'update')
          )
        )
      )
      WITH CHECK (
        public.is_super_admin()
        OR (
          public.is_company_member(company_id)
          AND (
            public.is_admin_or_rrhh()
            OR public.check_user_permission(auth.uid(), 'catalogos', 'update')
          )
        )
      )
    $policy$, catalog_table);

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
            OR public.check_user_permission(auth.uid(), 'catalogos', 'delete')
          )
        )
      )
    $policy$, catalog_table);
  END LOOP;
END $$;

-- These catalogs previously allowed any company member to mutate records.
-- Replace those broad mutations with the role-aware policies above.
DROP POLICY IF EXISTS "Company members can insert education levels" ON public.education_levels;
DROP POLICY IF EXISTS "Company members can update education levels" ON public.education_levels;
DROP POLICY IF EXISTS "Company members can delete education levels" ON public.education_levels;

DROP POLICY IF EXISTS "Company members can insert professions" ON public.professions;
DROP POLICY IF EXISTS "Company members can update professions" ON public.professions;
DROP POLICY IF EXISTS "Company members can delete professions" ON public.professions;

DROP POLICY IF EXISTS "Company members can insert platforms" ON public.vacancy_publication_platforms;
DROP POLICY IF EXISTS "Company members can update platforms" ON public.vacancy_publication_platforms;
DROP POLICY IF EXISTS "Company members can delete platforms" ON public.vacancy_publication_platforms;
