BEGIN;

-- A required document is a follow-up requirement, not a blocker for filing the
-- request. Keep the rule in leave_type_config so the application can surface
-- every open request that still needs evidence.
DO $$
DECLARE
  v_definition text;
  v_relaxed_definition text;
  v_guard constant text := E'  IF v_config.requires_document AND nullif(btrim(p_document_url), \'\') IS NULL THEN\n    RAISE EXCEPTION \'Este tipo de permiso requiere un soporte.\' USING ERRCODE = \'22023\';\n  END IF;\n';
BEGIN
  SELECT pg_get_functiondef(
    'private.create_leave_request_core(uuid,uuid,jsonb,uuid,text,uuid,text,text)'::regprocedure
  ) INTO v_definition;

  v_relaxed_definition := replace(v_definition, v_guard, '');
  IF v_relaxed_definition = v_definition THEN
    RAISE EXCEPTION 'No se encontró la validación de soporte obligatorio en create_leave_request_core.';
  END IF;

  EXECUTE v_relaxed_definition;
END;
$$;

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS annulled_as_unused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unused_reason text;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_unused_annulment_reason_check,
  ADD CONSTRAINT leave_requests_unused_annulment_reason_check CHECK (
    NOT annulled_as_unused
    OR (
      status = 'cancelado'::public.leave_request_status
      AND NULLIF(BTRIM(unused_reason), '') IS NOT NULL
    )
  );

CREATE OR REPLACE FUNCTION public.annul_unused_leave_request(
  p_request_id uuid,
  p_reason text
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_request public.leave_requests%ROWTYPE;
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_balance_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = '42501';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Es obligatorio especificar por qué no se utilizó el permiso.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.leave_requests request
  WHERE request.id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Permiso no encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_request.status <> 'aprobado'::public.leave_request_status THEN
    RAISE EXCEPTION 'Solo se puede anular por no uso un permiso aprobado.' USING ERRCODE = '22023';
  END IF;
  IF NOT (
    public.is_super_admin()
    OR public.is_admin_or_rrhh()
    OR (
      public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'permisos', 'update')
    )
    OR v_request.created_by = v_user_id
    OR v_request.employee_id = public.get_my_employee_id()
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para anular este permiso.' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.leave_workflow_rpc', 'on', true);

  SELECT balance.id INTO v_balance_id
  FROM public.leave_balances balance
  LEFT JOIN public.employee_employment_cycles cycle
    ON cycle.id = balance.employment_cycle_id
  WHERE balance.company_id = v_request.company_id
    AND balance.employee_id = v_request.employee_id
    AND balance.leave_type::text = v_request.leave_type::text
    AND balance.year = EXTRACT(YEAR FROM v_request.start_date)::integer
    AND (
      balance.employment_cycle_id IS NULL
      OR (
        cycle.start_date <= v_request.start_date
        AND (cycle.end_date IS NULL OR cycle.end_date >= v_request.start_date)
      )
    )
  ORDER BY
    (balance.employment_cycle_id IS NOT NULL) DESC,
    cycle.start_date DESC NULLS LAST,
    balance.created_at DESC
  LIMIT 1
  FOR UPDATE OF balance;

  UPDATE public.leave_balances AS balance
  SET used_days = GREATEST(0, used_days - v_request.total_days)
  WHERE balance.id = v_balance_id;

  UPDATE public.leave_requests
  SET status = 'cancelado'::public.leave_request_status,
      annulled_as_unused = true,
      unused_reason = v_reason,
      cancellation_reason = v_reason,
      cancelled_at = now(),
      cancelled_by = v_user_id
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    v_request.company_id,
    'annul_unused',
    'leave_request',
    v_request.id,
    'Permiso no utilizado',
    jsonb_build_object('unused_reason', v_reason)
  );

  PERFORM set_config('app.leave_workflow_rpc', 'off', true);
  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.annul_unused_leave_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.annul_unused_leave_request(uuid, text) TO authenticated, service_role;

COMMENT ON COLUMN public.leave_requests.annulled_as_unused IS
  'True when an approved permission was annulled because the employee did not use it.';
COMMENT ON COLUMN public.leave_requests.unused_reason IS
  'Mandatory explanation supplied when an approved permission is annulled as unused.';

COMMIT;
