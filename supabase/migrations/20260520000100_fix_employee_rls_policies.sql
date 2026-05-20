-- 1. DROP OLD POLICIES FOR CORE TABLE
DROP POLICY IF EXISTS "Admin and RRHH can create employees v2" ON public.employees_v2;
DROP POLICY IF EXISTS "Admin and RRHH can update employees v2" ON public.employees_v2;
DROP POLICY IF EXISTS "Admin can delete employees v2" ON public.employees_v2;

-- 2. DROP OLD POLICIES FOR DETAIL TABLES
DROP POLICY IF EXISTS "Admin and RRHH can manage employee contact" ON public.employee_contact;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee family" ON public.employee_family;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee family members" ON public.employee_family_members;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee work info" ON public.employee_work_info;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee social security" ON public.employee_social_security;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee bank info" ON public.employee_bank_info;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee documents" ON public.employee_documents;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee certifications" ON public.employee_certifications;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee vaccinations" ON public.employee_vaccinations;
DROP POLICY IF EXISTS "Admin and RRHH can manage employee schedule" ON public.employee_schedule;

-- 3. DROP OLD POLICIES FOR ADDITIONAL TABLES (TIME CONFIG AND ONBOARDING)
DROP POLICY IF EXISTS "Company members can view time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can insert time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can update time config" ON public.employee_time_config;
DROP POLICY IF EXISTS "Company members can delete time config" ON public.employee_time_config;

DROP POLICY IF EXISTS "Users can view onboarding tasks for their company" ON public.employee_onboarding_tasks;
DROP POLICY IF EXISTS "Users can insert onboarding tasks for their company" ON public.employee_onboarding_tasks;
DROP POLICY IF EXISTS "Users can update onboarding tasks for their company" ON public.employee_onboarding_tasks;


-- 4. CREATE UPDATED POLICIES FOR CORE TABLE
CREATE POLICY "Admin and RRHH can create employees v2" ON public.employees_v2
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
      )
    )
  );

CREATE POLICY "Admin and RRHH can update employees v2" ON public.employees_v2
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin can delete employees v2" ON public.employees_v2
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'empleados', 'delete')
      )
    )
  );


-- 5. CREATE UPDATED POLICIES FOR ACCESS-BASED DETAIL TABLES
-- contact, family, family_members, social_security, bank_info, certifications, vaccinations, schedule
CREATE POLICY "Admin and RRHH can manage employee contact" ON public.employee_contact
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee family" ON public.employee_family
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee family members" ON public.employee_family_members
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee social security" ON public.employee_social_security
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee bank info" ON public.employee_bank_info
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee certifications" ON public.employee_certifications
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee vaccinations" ON public.employee_vaccinations
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee schedule" ON public.employee_schedule
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.has_employee_v2_access(employee_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );


-- 6. CREATE UPDATED POLICIES FOR COMPANY-BASED DETAIL TABLES
-- work_info, documents
CREATE POLICY "Admin and RRHH can manage employee work info" ON public.employee_work_info
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Admin and RRHH can manage employee documents" ON public.employee_documents
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
        OR public.check_user_permission(auth.uid(), 'empleados', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
        OR public.check_user_permission(auth.uid(), 'empleados', 'delete')
      )
    )
  );


-- 7. CREATE UPDATED POLICIES FOR SPECIAL TABLES
-- time config
CREATE POLICY "Company members can view time config" ON public.employee_time_config
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_company_member(company_id)
  );

CREATE POLICY "Company members can insert time config" ON public.employee_time_config
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Company members can update time config" ON public.employee_time_config
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );

CREATE POLICY "Company members can delete time config" ON public.employee_time_config
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'empleados', 'delete')
      )
    )
  );

-- onboarding tasks
CREATE POLICY "Users can view onboarding tasks for their company" ON public.employee_onboarding_tasks
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.is_company_member(company_id)
  );

CREATE POLICY "Users can insert onboarding tasks for their company" ON public.employee_onboarding_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'create')
      )
    )
  );

CREATE POLICY "Users can update onboarding tasks for their company" ON public.employee_onboarding_tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'empleados', 'update')
      )
    )
  );
