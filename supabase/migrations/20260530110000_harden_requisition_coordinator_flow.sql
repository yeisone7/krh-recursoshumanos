-- Harden the coordinator approval step for requisitions.
-- This migration is intentionally idempotent because some production
-- databases may already have part of the coordinator flow applied.

ALTER TYPE public.requisition_status ADD VALUE IF NOT EXISTS 'en_coordinadores';

ALTER TABLE public.personnel_requisitions
  ADD COLUMN IF NOT EXISTS coordinadores_aprobado BOOLEAN,
  ADD COLUMN IF NOT EXISTS coordinadores_quien_aprobo TEXT,
  ADD COLUMN IF NOT EXISTS coordinadores_aprobador_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS coordinadores_fecha_aprobacion TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS coordinadores_observaciones TEXT;

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'requisiciones'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'req_approve_coordinadores', 'Requisicion: Aprobacion Coordinadores', 'UserCheck', 190, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT m.id, 'approve'::public.permission_action, 'Requisicion: Aprobacion Coordinadores - Aprobar'
FROM public.modules m
WHERE m.code = 'req_approve_coordinadores'
ON CONFLICT (module_id, action) DO UPDATE SET
  description = EXCLUDED.description;

DROP POLICY IF EXISTS "Admin RRHH and requesters can update requisitions" ON public.personnel_requisitions;
DROP POLICY IF EXISTS "Admin and RRHH can update requisitions" ON public.personnel_requisitions;

CREATE POLICY "Admin RRHH and requesters can update requisitions"
  ON public.personnel_requisitions
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
        OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
        OR created_by = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      public.is_company_member(company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'create')
        OR public.check_user_permission(auth.uid(), 'requisiciones', 'update')
        OR public.check_user_permission(auth.uid(), 'req_approve_coordinadores', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_rh', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_juridica', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_ger_op', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_ger_adm', 'approve')
        OR public.check_user_permission(auth.uid(), 'req_approve_seleccion', 'approve')
        OR (
          created_by = auth.uid()
          AND estado_requisicion::text IN ('borrador', 'en_coordinadores', 'en_rrhh')
        )
      )
    )
  );
