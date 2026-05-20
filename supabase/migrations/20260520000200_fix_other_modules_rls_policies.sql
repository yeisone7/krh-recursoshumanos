-- Migration: Fix RLS Policies for remaining modules (Contratos, Vacaciones, Permisos, Incapacidades, Dotación, Disciplinarios, Evaluaciones, Cesantías, Exámenes Médicos)
-- This migration updates all legacy policies checking only static roles to include check_user_permission() for custom dynamic roles.

BEGIN;

-- =========================================================================
-- 1. CONTRATOS (Module: 'contratos')
-- =========================================================================

-- contracts
DROP POLICY IF EXISTS "Admin and RRHH can manage contracts" ON public.contracts;
CREATE POLICY "Admin and RRHH can manage contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  );

-- contract_extensions
DROP POLICY IF EXISTS "Admin and RRHH can manage extensions" ON public.contract_extensions;
CREATE POLICY "Admin and RRHH can manage extensions" ON public.contract_extensions
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  );

-- contract_type_config
DROP POLICY IF EXISTS "Admin can manage contract type config" ON public.contract_type_config;
CREATE POLICY "Admin can manage contract type config" ON public.contract_type_config
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'contratos', 'create')
        OR public.check_user_permission(auth.uid(), 'contratos', 'update')
        OR public.check_user_permission(auth.uid(), 'contratos', 'delete')
      )
    )
  );


-- =========================================================================
-- 2. VACACIONES (Module: 'vacaciones')
-- =========================================================================

-- vacation_balances
DROP POLICY IF EXISTS "Admin and RRHH can manage vacation balances" ON public.vacation_balances;
CREATE POLICY "Admin and RRHH can manage vacation balances" ON public.vacation_balances
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  );

-- vacation_requests
DROP POLICY IF EXISTS "Admin and RRHH can manage vacation requests" ON public.vacation_requests;
CREATE POLICY "Admin and RRHH can manage vacation requests" ON public.vacation_requests
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  );

-- vacation_config
DROP POLICY IF EXISTS "Admin can manage vacation config" ON public.vacation_config;
CREATE POLICY "Admin can manage vacation config" ON public.vacation_config
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'vacaciones', 'delete')
      )
    )
  );


-- =========================================================================
-- 3. PERMISOS DE AUSENCIA (Module: 'permisos')
-- =========================================================================

-- leave_balances
DROP POLICY IF EXISTS "Admin and RRHH can manage leave balances" ON public.leave_balances;
CREATE POLICY "Admin and RRHH can manage leave balances" ON public.leave_balances
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  );

-- leave_requests
DROP POLICY IF EXISTS "Admin and RRHH can manage leave requests" ON public.leave_requests;
CREATE POLICY "Admin and RRHH can manage leave requests" ON public.leave_requests
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  );

-- leave_type_config
DROP POLICY IF EXISTS "Admin can manage leave type config" ON public.leave_type_config;
CREATE POLICY "Admin can manage leave type config" ON public.leave_type_config
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin()
        OR public.check_user_permission(auth.uid(), 'permisos', 'create')
        OR public.check_user_permission(auth.uid(), 'permisos', 'update')
        OR public.check_user_permission(auth.uid(), 'permisos', 'delete')
      )
    )
  );


-- =========================================================================
-- 4. INCAPACIDADES (Module: 'incapacidades')
-- =========================================================================

-- employee_incapacities
DROP POLICY IF EXISTS "Admin and RRHH can manage incapacities" ON public.employee_incapacities;
CREATE POLICY "Admin and RRHH can manage incapacities" ON public.employee_incapacities
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'create')
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'create')
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'update')
        OR public.check_user_permission(auth.uid(), 'incapacidades', 'delete')
      )
    )
  );


-- =========================================================================
-- 5. DOTACIÓN (Module: 'dotacion')
-- =========================================================================

-- dotation_deliveries
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation" ON public.dotation_deliveries;
CREATE POLICY "Admin and RRHH can manage dotation" ON public.dotation_deliveries
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

-- dotation_delivery_transactions
DROP POLICY IF EXISTS "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions;
CREATE POLICY "Admin and RRHH can manage delivery transactions" ON public.dotation_delivery_transactions
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

-- dotation_item_types
DROP POLICY IF EXISTS "Admin and RRHH can manage dotation item types" ON public.dotation_item_types;
CREATE POLICY "Admin and RRHH can manage dotation item types" ON public.dotation_item_types
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

-- dotation_inventory (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admin/RRHH can insert inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can insert inventory" ON public.dotation_inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can update inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can update inventory" ON public.dotation_inventory
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can delete inventory" ON public.dotation_inventory;
CREATE POLICY "Admin/RRHH can delete inventory" ON public.dotation_inventory
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );

-- dotation_profesiograma (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admin/RRHH can insert profesiogramas" ON public.dotation_profesiograma;
CREATE POLICY "Admin/RRHH can insert profesiogramas" ON public.dotation_profesiograma
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'create')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can update profesiogramas" ON public.dotation_profesiograma;
CREATE POLICY "Admin/RRHH can update profesiogramas" ON public.dotation_profesiograma
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'update')
      )
    )
  );

DROP POLICY IF EXISTS "Admin/RRHH can delete profesiogramas" ON public.dotation_profesiograma;
CREATE POLICY "Admin/RRHH can delete profesiogramas" ON public.dotation_profesiograma
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'dotacion', 'delete')
      )
    )
  );


-- =========================================================================
-- 6. PROCESOS DISCIPLINARIOS (Module: 'disciplinarios')
-- =========================================================================

-- disciplinary_processes
DROP POLICY IF EXISTS "Admin and RRHH can manage disciplinary processes" ON public.disciplinary_processes;
CREATE POLICY "Admin and RRHH can manage disciplinary processes" ON public.disciplinary_processes
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'create')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'update')
        OR public.check_user_permission(auth.uid(), 'disciplinarios', 'delete')
      )
    )
  );


-- =========================================================================
-- 7. EVALUACIONES (Module: 'evaluaciones')
-- =========================================================================

-- evaluation_cycles
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation cycles" ON public.evaluation_cycles;
CREATE POLICY "Admin and RRHH can manage evaluation cycles" ON public.evaluation_cycles
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  );

-- evaluation_templates
DROP POLICY IF EXISTS "Admin and RRHH can manage evaluation templates" ON public.evaluation_templates;
CREATE POLICY "Admin and RRHH can manage evaluation templates" ON public.evaluation_templates
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  );

-- performance_evaluations
DROP POLICY IF EXISTS "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations;
CREATE POLICY "Admin and RRHH can manage performance evaluations" ON public.performance_evaluations
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  );

-- performance_goals
DROP POLICY IF EXISTS "Admin and RRHH can manage performance goals" ON public.performance_goals;
CREATE POLICY "Admin and RRHH can manage performance goals" ON public.performance_goals
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'create')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'update')
        OR public.check_user_permission(auth.uid(), 'evaluaciones', 'delete')
      )
    )
  );


-- =========================================================================
-- 8. CESANTÍAS (Module: 'cesantias')
-- =========================================================================

-- cesantias_deposits
DROP POLICY IF EXISTS "Admin and RRHH can manage cesantias deposits" ON public.cesantias_deposits;
CREATE POLICY "Admin and RRHH can manage cesantias deposits" ON public.cesantias_deposits
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  );

-- cesantias_interest_payments
DROP POLICY IF EXISTS "Admin and RRHH can manage cesantias interest" ON public.cesantias_interest_payments;
CREATE POLICY "Admin and RRHH can manage cesantias interest" ON public.cesantias_interest_payments
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  );

-- cesantias_withdrawals
DROP POLICY IF EXISTS "Admin and RRHH can manage cesantias withdrawals" ON public.cesantias_withdrawals;
CREATE POLICY "Admin and RRHH can manage cesantias withdrawals" ON public.cesantias_withdrawals
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'cesantias', 'create')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'update')
        OR public.check_user_permission(auth.uid(), 'cesantias', 'delete')
      )
    )
  );


-- =========================================================================
-- 9. EXÁMENES MÉDICOS (Module: 'examenes')
-- =========================================================================

-- medical_exams
DROP POLICY IF EXISTS "Admin RRHH and Psicologo can manage exams" ON public.medical_exams;
CREATE POLICY "Admin RRHH and Psicologo can manage exams" ON public.medical_exams
  FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo() -- <- Preserves legacy check for psychologist
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.is_psicologo() -- <- Preserves legacy check for psychologist
        OR public.check_user_permission(auth.uid(), 'examenes', 'create')
        OR public.check_user_permission(auth.uid(), 'examenes', 'update')
        OR public.check_user_permission(auth.uid(), 'examenes', 'delete')
      )
    )
  );

COMMIT;
