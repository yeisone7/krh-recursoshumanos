BEGIN;

-- Automatic, auditable vacation balances. Existing request/approval fields remain unchanged.

ALTER TABLE public.vacation_config
  ADD COLUMN IF NOT EXISTS accrual_basis_days integer NOT NULL DEFAULT 360,
  ADD COLUMN IF NOT EXISTS allow_advance_vacation boolean NOT NULL DEFAULT false;

ALTER TABLE public.vacation_config
  DROP CONSTRAINT IF EXISTS vacation_config_accrual_basis_days_check,
  ADD CONSTRAINT vacation_config_accrual_basis_days_check
    CHECK (accrual_basis_days BETWEEN 1 AND 366);

ALTER TABLE public.vacation_balances
  ADD COLUMN IF NOT EXISTS days_adjusted numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_reserved numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS days_available numeric(10,2)
    GENERATED ALWAYS AS (
      GREATEST(days_accrued + days_adjusted - days_taken - days_compensated - days_reserved, 0)
    ) STORED,
  ADD COLUMN IF NOT EXISTS accrual_source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS last_accrual_date date,
  ADD COLUMN IF NOT EXISTS period_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS automatic_period_key text;

ALTER TABLE public.vacation_balances
  DROP CONSTRAINT IF EXISTS vacation_balances_nonnegative_check,
  ADD CONSTRAINT vacation_balances_nonnegative_check CHECK (
    days_accrued >= 0 AND days_taken >= 0 AND days_compensated >= 0 AND days_reserved >= 0
  ),
  DROP CONSTRAINT IF EXISTS vacation_balances_accrual_source_check,
  ADD CONSTRAINT vacation_balances_accrual_source_check
    CHECK (accrual_source IN ('legacy', 'automatic', 'adjusted')),
  DROP CONSTRAINT IF EXISTS vacation_balances_period_status_check,
  ADD CONSTRAINT vacation_balances_period_status_check
    CHECK (period_status IN ('open', 'closed', 'reconciled'));

CREATE UNIQUE INDEX IF NOT EXISTS vacation_balances_automatic_period_key_idx
  ON public.vacation_balances (automatic_period_key)
  WHERE automatic_period_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS vacation_balances_cycle_period_idx
  ON public.vacation_balances (employment_cycle_id, period_start);
CREATE INDEX IF NOT EXISTS vacation_balances_company_available_idx
  ON public.vacation_balances (company_id, employee_id)
  WHERE days_accrued > 0;

CREATE TABLE IF NOT EXISTS public.vacation_balance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL,
  balance_id uuid NOT NULL REFERENCES public.vacation_balances(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.vacation_requests(id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  days_delta numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vacation_balance_movements_type_check CHECK (movement_type IN (
    'legacy_accrual', 'legacy_enjoyment', 'legacy_compensation', 'automatic_accrual',
    'reservation', 'reservation_release', 'enjoyment', 'compensation',
    'adjustment', 'liquidation', 'reversal'
  )),
  CONSTRAINT vacation_balance_movements_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS vacation_balance_movements_employee_date_idx
  ON public.vacation_balance_movements (employee_id, effective_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS vacation_balance_movements_company_date_idx
  ON public.vacation_balance_movements (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vacation_balance_movements_balance_idx
  ON public.vacation_balance_movements (balance_id);
CREATE INDEX IF NOT EXISTS vacation_balance_movements_request_idx
  ON public.vacation_balance_movements (request_id)
  WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vacation_request_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE SET NULL,
  request_id uuid NOT NULL REFERENCES public.vacation_requests(id) ON DELETE CASCADE,
  balance_id uuid NOT NULL REFERENCES public.vacation_balances(id) ON DELETE RESTRICT,
  enjoyment_days numeric(10,2) NOT NULL DEFAULT 0,
  compensated_days numeric(10,2) NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'reserved',
  reserved_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vacation_request_allocations_days_check
    CHECK (enjoyment_days >= 0 AND compensated_days >= 0 AND enjoyment_days + compensated_days > 0),
  CONSTRAINT vacation_request_allocations_state_check
    CHECK (state IN ('reserved', 'consumed', 'released')),
  CONSTRAINT vacation_request_allocations_request_balance_key UNIQUE (request_id, balance_id)
);

CREATE INDEX IF NOT EXISTS vacation_request_allocations_request_idx
  ON public.vacation_request_allocations (request_id, state);
CREATE INDEX IF NOT EXISTS vacation_request_allocations_balance_idx
  ON public.vacation_request_allocations (balance_id, state);
CREATE INDEX IF NOT EXISTS vacation_request_allocations_employee_idx
  ON public.vacation_request_allocations (employee_id, state);

ALTER TABLE public.vacation_balance_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_request_allocations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.vacation_balance_movements FROM anon, authenticated;
REVOKE ALL ON public.vacation_request_allocations FROM anon, authenticated;
GRANT SELECT ON public.vacation_balance_movements, public.vacation_request_allocations TO authenticated;
GRANT ALL ON public.vacation_balance_movements, public.vacation_request_allocations TO service_role;

DROP POLICY IF EXISTS "Members can view vacation balance movements" ON public.vacation_balance_movements;
CREATE POLICY "Members can view vacation balance movements"
ON public.vacation_balance_movements FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_or_rrhh()
  OR employee_id = public.get_my_employee_id()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((SELECT auth.uid()), 'vacation_balances', 'view')
      OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'view')
    )
  )
);

DROP POLICY IF EXISTS "Members can view vacation allocations" ON public.vacation_request_allocations;
CREATE POLICY "Members can view vacation allocations"
ON public.vacation_request_allocations FOR SELECT TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_or_rrhh()
  OR employee_id = public.get_my_employee_id()
  OR (
    public.is_company_member(company_id)
    AND (
      public.check_user_permission((SELECT auth.uid()), 'vacation_balances', 'view')
      OR public.check_user_permission((SELECT auth.uid()), 'vacaciones', 'view')
    )
  )
);

WITH parent_module AS (
  SELECT id FROM public.modules WHERE code = 'vacaciones'
)
INSERT INTO public.modules (code, name, icon, sort_order, parent_id, is_active)
SELECT 'vacation_balances', 'Vacaciones: Saldos', 'WalletCards', 703, parent_module.id, true
FROM parent_module
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  parent_id = EXCLUDED.parent_id,
  is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.value::public.permission_action,
  CASE action.value
    WHEN 'view' THEN 'Consultar saldos y movimientos de vacaciones'
    WHEN 'update' THEN 'Recalcular y registrar ajustes de saldos'
    ELSE 'Exportar el libro de saldos de vacaciones'
  END
FROM public.modules module
CROSS JOIN (VALUES ('view'), ('update'), ('export')) action(value)
WHERE module.code = 'vacation_balances'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.custom_roles role
CROSS JOIN public.permissions permission
JOIN public.modules module ON module.id = permission.module_id
WHERE role.is_system = true AND module.code = 'vacation_balances'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Preserve the opening position in the immutable ledger.
INSERT INTO public.vacation_balance_movements (
  company_id, employee_id, employment_cycle_id, balance_id, movement_type,
  days_delta, balance_after, effective_date, reason, idempotency_key
)
SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
  'legacy_accrual', balance.days_accrued, balance.days_pending, balance.period_start,
  'Saldo causado existente antes de la automatización', 'legacy:accrual:' || balance.id
FROM public.vacation_balances balance
WHERE balance.days_accrued <> 0
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.vacation_balance_movements (
  company_id, employee_id, employment_cycle_id, balance_id, movement_type,
  days_delta, balance_after, effective_date, reason, idempotency_key
)
SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
  'legacy_enjoyment', -balance.days_taken, balance.days_pending, balance.period_start,
  'Días disfrutados existentes antes de la automatización', 'legacy:enjoyment:' || balance.id
FROM public.vacation_balances balance
WHERE balance.days_taken <> 0
ON CONFLICT (idempotency_key) DO NOTHING;

INSERT INTO public.vacation_balance_movements (
  company_id, employee_id, employment_cycle_id, balance_id, movement_type,
  days_delta, balance_after, effective_date, reason, idempotency_key
)
SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
  'legacy_compensation', -balance.days_compensated, balance.days_pending, balance.period_start,
  'Días compensados existentes antes de la automatización', 'legacy:compensation:' || balance.id
FROM public.vacation_balances balance
WHERE balance.days_compensated <> 0
ON CONFLICT (idempotency_key) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.sync_employee_vacation_balances(
  p_employee_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_cycle public.employee_employment_cycles%ROWTYPE;
  v_days_per_year numeric(10,2) := 15;
  v_basis integer := 360;
  v_cutoff date;
  v_period_start date;
  v_period_end date;
  v_effective_end date;
  v_target numeric(10,2);
  v_worked integer;
  v_balance public.vacation_balances%ROWTYPE;
  v_delta numeric(10,2);
  v_previous_accrued numeric(10,2);
  v_key text;
BEGIN
  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'El empleado es obligatorio.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('vacation:' || p_employee_id::text, 0));

  SELECT cycle.* INTO v_cycle
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = p_employee_id
    AND cycle.start_date <= p_as_of_date
  ORDER BY (cycle.status = 'active') DESC, cycle.cycle_number DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('employee_id', p_employee_id, 'cycle_id', NULL, 'synced', false);
  END IF;

  SELECT config.days_per_year, config.accrual_basis_days
  INTO v_days_per_year, v_basis
  FROM public.vacation_config config
  WHERE config.company_id = v_cycle.company_id;

  v_days_per_year := COALESCE(v_days_per_year, 15);
  v_basis := COALESCE(v_basis, 360);
  v_cutoff := LEAST(p_as_of_date, COALESCE(v_cycle.end_date, p_as_of_date));
  v_period_start := v_cycle.start_date;

  WHILE v_period_start <= v_cutoff LOOP
    v_period_end := (v_period_start + INTERVAL '1 year' - INTERVAL '1 day')::date;
    v_effective_end := LEAST(v_period_end, v_cutoff);
    v_worked := LEAST(v_basis, GREATEST(0, (v_effective_end - v_period_start) + 1));
    v_target := ROUND(LEAST(v_days_per_year, (v_days_per_year * v_worked) / v_basis), 2);
    v_key := v_cycle.id::text || ':' || v_period_start::text;

    SELECT balance.* INTO v_balance
    FROM public.vacation_balances balance
    WHERE balance.employment_cycle_id = v_cycle.id
      AND balance.period_start = v_period_start
    ORDER BY balance.created_at
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO public.vacation_balances (
        employee_id, company_id, employment_cycle_id, period_start, period_end,
        days_accrued, accrual_source, last_accrual_date, period_status, automatic_period_key,
        notes
      ) VALUES (
        v_cycle.employee_id, v_cycle.company_id, v_cycle.id, v_period_start, v_period_end,
        v_target, 'automatic', v_effective_end,
        CASE WHEN v_effective_end >= v_period_end THEN 'closed' ELSE 'open' END,
        v_key, 'Generado automáticamente por causación corporativa'
      ) RETURNING * INTO v_balance;

      v_delta := v_target;
    ELSE
      v_previous_accrued := v_balance.days_accrued;
      UPDATE public.vacation_balances SET
        automatic_period_key = COALESCE(automatic_period_key, v_key),
        days_accrued = GREATEST(days_accrued, v_target),
        accrual_source = CASE WHEN accrual_source = 'legacy' AND days_accrued > v_target
          THEN 'legacy' ELSE 'automatic' END,
        last_accrual_date = GREATEST(COALESCE(last_accrual_date, v_period_start), v_effective_end),
        period_status = CASE WHEN v_effective_end >= v_period_end THEN 'closed' ELSE period_status END
      WHERE id = v_balance.id
      RETURNING * INTO v_balance;

      v_delta := GREATEST(v_target - v_previous_accrued, 0);
    END IF;

    -- The target itself is part of the key so retries never duplicate a movement.
    INSERT INTO public.vacation_balance_movements (
      company_id, employee_id, employment_cycle_id, balance_id, movement_type,
      days_delta, balance_after, effective_date, reason, metadata, idempotency_key
    )
    SELECT v_cycle.company_id, v_cycle.employee_id, v_cycle.id, v_balance.id,
      'automatic_accrual', v_delta, v_balance.days_available, v_effective_end,
      'Causación automática proporcional',
      jsonb_build_object('target_days', v_target, 'worked_days', v_worked, 'basis_days', v_basis),
      'automatic:' || v_key || ':' || v_target::text
    WHERE v_delta > 0
    ON CONFLICT (idempotency_key) DO NOTHING;

    v_period_start := (v_period_start + INTERVAL '1 year')::date;
  END LOOP;

  RETURN jsonb_build_object(
    'employee_id', v_cycle.employee_id,
    'company_id', v_cycle.company_id,
    'cycle_id', v_cycle.id,
    'as_of_date', v_cutoff,
    'synced', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_employee_vacation_balances(
  p_employee_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_employee public.employees_v2%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  SELECT * INTO v_employee FROM public.employees_v2 WHERE id = p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empleado no encontrado.' USING ERRCODE = 'P0002'; END IF;

  IF NOT (
    public.is_super_admin() OR public.is_admin_or_rrhh()
    OR p_employee_id = public.get_my_employee_id()
    OR (public.is_company_member(v_employee.company_id)
      AND (public.check_user_permission(v_user_id, 'vacation_balances', 'view')
        OR public.check_user_permission(v_user_id, 'vacaciones', 'view')))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para consultar este saldo.' USING ERRCODE = '42501';
  END IF;

  RETURN private.sync_employee_vacation_balances(p_employee_id, p_as_of_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_company_vacation_balances(
  p_company_id uuid,
  p_as_of_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employee record;
  v_count integer := 0;
BEGIN
  IF NOT (
    public.is_super_admin() OR public.is_admin_or_rrhh()
    OR (public.is_company_member(p_company_id)
      AND (public.check_user_permission(v_user_id, 'vacation_balances', 'view')
        OR public.check_user_permission(v_user_id, 'vacaciones', 'view')))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para recalcular saldos.' USING ERRCODE = '42501';
  END IF;

  FOR v_employee IN
    SELECT employee.id
    FROM public.employees_v2 employee
    WHERE employee.company_id = p_company_id
      AND employee.is_active = true
      AND employee.status = 'active'
    ORDER BY employee.id
  LOOP
    PERFORM private.sync_employee_vacation_balances(v_employee.id, p_as_of_date);
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('company_id', p_company_id, 'employees_synced', v_count, 'as_of_date', p_as_of_date);
END;
$$;

CREATE OR REPLACE FUNCTION private.reserve_vacation_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_request public.vacation_requests%ROWTYPE;
  v_balance record;
  v_enjoyment numeric(10,2);
  v_compensated numeric(10,2);
  v_take_enjoyment numeric(10,2);
  v_take_compensated numeric(10,2);
  v_total numeric(10,2);
BEGIN
  SELECT * INTO v_request FROM public.vacation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002'; END IF;

  IF EXISTS (SELECT 1 FROM public.vacation_request_allocations WHERE request_id = p_request_id) THEN
    RETURN;
  END IF;

  v_enjoyment := v_request.enjoyment_days;
  v_compensated := v_request.compensated_days;

  FOR v_balance IN
    SELECT balance.id, balance.days_available
    FROM public.vacation_balances balance
    WHERE balance.employee_id = v_request.employee_id
      AND balance.company_id = v_request.company_id
      AND (v_request.balance_id IS NULL OR balance.employment_cycle_id = (
        SELECT employment_cycle_id FROM public.vacation_balances WHERE id = v_request.balance_id
      ))
      AND balance.days_available > 0
    ORDER BY balance.period_start, balance.id
    FOR UPDATE
  LOOP
    EXIT WHEN v_enjoyment + v_compensated <= 0;
    v_take_enjoyment := LEAST(v_enjoyment, v_balance.days_available);
    v_take_compensated := LEAST(v_compensated, v_balance.days_available - v_take_enjoyment);
    v_total := v_take_enjoyment + v_take_compensated;

    IF v_total > 0 THEN
      UPDATE public.vacation_balances SET days_reserved = days_reserved + v_total
      WHERE id = v_balance.id;

      INSERT INTO public.vacation_request_allocations (
        company_id, employee_id, employment_cycle_id, request_id, balance_id,
        enjoyment_days, compensated_days
      ) SELECT v_request.company_id, v_request.employee_id, balance.employment_cycle_id,
        p_request_id, balance.id, v_take_enjoyment, v_take_compensated
      FROM public.vacation_balances balance WHERE balance.id = v_balance.id;

      INSERT INTO public.vacation_balance_movements (
        company_id, employee_id, employment_cycle_id, balance_id, request_id,
        movement_type, days_delta, balance_after, reason, idempotency_key, created_by
      ) SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
        p_request_id, 'reservation', -v_total, balance.days_available,
        'Reserva por solicitud de vacaciones', 'request:reserve:' || p_request_id || ':' || balance.id,
        v_request.created_by
      FROM public.vacation_balances balance WHERE balance.id = v_balance.id
      ON CONFLICT (idempotency_key) DO NOTHING;

      v_enjoyment := v_enjoyment - v_take_enjoyment;
      v_compensated := v_compensated - v_take_compensated;
    END IF;
  END LOOP;

  IF v_enjoyment + v_compensated > 0 THEN
    RAISE EXCEPTION 'El saldo disponible cambió y ya no cubre la solicitud.' USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.release_vacation_reservation(p_request_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_allocation record;
  v_total numeric(10,2);
BEGIN
  FOR v_allocation IN
    SELECT allocation.*
    FROM public.vacation_request_allocations allocation
    WHERE allocation.request_id = p_request_id AND allocation.state = 'reserved'
    ORDER BY allocation.balance_id
    FOR UPDATE
  LOOP
    v_total := v_allocation.enjoyment_days + v_allocation.compensated_days;
    UPDATE public.vacation_balances
    SET days_reserved = GREATEST(days_reserved - v_total, 0)
    WHERE id = v_allocation.balance_id;

    UPDATE public.vacation_request_allocations
    SET state = 'released', released_at = now(), updated_at = now()
    WHERE id = v_allocation.id;

    INSERT INTO public.vacation_balance_movements (
      company_id, employee_id, employment_cycle_id, balance_id, request_id,
      movement_type, days_delta, balance_after, reason, idempotency_key, created_by
    ) SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
      p_request_id, 'reservation_release', v_total, balance.days_available,
      COALESCE(NULLIF(BTRIM(p_reason), ''), 'Liberación de reserva'),
      'request:release:' || p_request_id || ':' || balance.id, auth.uid()
    FROM public.vacation_balances balance WHERE balance.id = v_allocation.balance_id
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.consume_vacation_reservation(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_allocation record;
  v_total numeric(10,2);
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.vacation_request_allocations
    WHERE request_id = p_request_id AND state = 'consumed'
  ) THEN RETURN; END IF;

  FOR v_allocation IN
    SELECT allocation.*
    FROM public.vacation_request_allocations allocation
    WHERE allocation.request_id = p_request_id AND allocation.state = 'reserved'
    ORDER BY allocation.balance_id
    FOR UPDATE
  LOOP
    v_total := v_allocation.enjoyment_days + v_allocation.compensated_days;
    UPDATE public.vacation_balances SET
      days_reserved = GREATEST(days_reserved - v_total, 0),
      days_taken = days_taken + v_allocation.enjoyment_days,
      days_compensated = days_compensated + v_allocation.compensated_days
    WHERE id = v_allocation.balance_id;

    UPDATE public.vacation_request_allocations
    SET state = 'consumed', consumed_at = now(), updated_at = now()
    WHERE id = v_allocation.id;

    INSERT INTO public.vacation_balance_movements (
      company_id, employee_id, employment_cycle_id, balance_id, request_id,
      movement_type, days_delta, balance_after, effective_date, reason, idempotency_key, created_by
    ) SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
      p_request_id, 'enjoyment', -v_allocation.enjoyment_days, balance.days_available,
      request.start_date, 'Vacaciones aprobadas y consumidas',
      'request:enjoyment:' || p_request_id || ':' || balance.id, auth.uid()
    FROM public.vacation_balances balance
    JOIN public.vacation_requests request ON request.id = p_request_id
    WHERE balance.id = v_allocation.balance_id AND v_allocation.enjoyment_days > 0
    ON CONFLICT (idempotency_key) DO NOTHING;

    INSERT INTO public.vacation_balance_movements (
      company_id, employee_id, employment_cycle_id, balance_id, request_id,
      movement_type, days_delta, balance_after, effective_date, reason, idempotency_key, created_by
    ) SELECT balance.company_id, balance.employee_id, balance.employment_cycle_id, balance.id,
      p_request_id, 'compensation', -v_allocation.compensated_days, balance.days_available,
      request.request_date, 'Compensación en dinero aprobada',
      'request:compensation:' || p_request_id || ':' || balance.id, auth.uid()
    FROM public.vacation_balances balance
    JOIN public.vacation_requests request ON request.id = p_request_id
    WHERE balance.id = v_allocation.balance_id AND v_allocation.compensated_days > 0
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_vacation_balance(
  p_employee_id uuid,
  p_days numeric,
  p_reason text,
  p_effective_date date DEFAULT CURRENT_DATE,
  p_idempotency_key uuid DEFAULT gen_random_uuid()
)
RETURNS public.vacation_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employee public.employees_v2%ROWTYPE;
  v_sync jsonb;
  v_balance public.vacation_balances%ROWTYPE;
  v_existing uuid;
  v_period record;
  v_remaining numeric(10,2);
  v_delta numeric(10,2);
  v_available numeric(10,2);
BEGIN
  IF p_days = 0 OR NULLIF(BTRIM(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Indica una cantidad diferente de cero y una justificación.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_employee FROM public.employees_v2 WHERE id = p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empleado no encontrado.' USING ERRCODE = 'P0002'; END IF;
  IF NOT (
    public.is_super_admin() OR public.is_admin_or_rrhh()
    OR (public.is_company_member(v_employee.company_id)
      AND public.check_user_permission(v_user_id, 'vacation_balances', 'update'))
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para ajustar saldos.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_existing FROM public.vacation_balance_movements
  WHERE idempotency_key LIKE 'adjustment:' || p_idempotency_key::text || ':%'
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    SELECT balance.* INTO v_balance
    FROM public.vacation_balances balance
    JOIN public.vacation_balance_movements movement ON movement.balance_id = balance.id
    WHERE movement.id = v_existing;
    RETURN v_balance;
  END IF;

  v_sync := private.sync_employee_vacation_balances(p_employee_id, p_effective_date);
  IF (v_sync->>'cycle_id') IS NULL THEN
    RAISE EXCEPTION 'No existe un ciclo laboral para ajustar.' USING ERRCODE = '22023';
  END IF;

  IF p_days > 0 THEN
    SELECT balance.* INTO v_balance
    FROM public.vacation_balances balance
    WHERE balance.employee_id = p_employee_id
      AND balance.employment_cycle_id = (v_sync->>'cycle_id')::uuid
    ORDER BY balance.period_start DESC
    LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No existe un período para ajustar.' USING ERRCODE = '22023'; END IF;

    UPDATE public.vacation_balances SET
      days_adjusted = days_adjusted + p_days,
      accrual_source = 'adjusted',
      notes = CONCAT_WS(E'\n', NULLIF(notes, ''), 'Ajuste: ' || BTRIM(p_reason))
    WHERE id = v_balance.id RETURNING * INTO v_balance;

    INSERT INTO public.vacation_balance_movements (
      company_id, employee_id, employment_cycle_id, balance_id, movement_type,
      days_delta, balance_after, effective_date, reason, idempotency_key, created_by
    ) VALUES (
      v_balance.company_id, v_balance.employee_id, v_balance.employment_cycle_id, v_balance.id,
      'adjustment', p_days, v_balance.days_available, p_effective_date, BTRIM(p_reason),
      'adjustment:' || p_idempotency_key::text || ':' || v_balance.id::text, v_user_id
    );
  ELSE
    SELECT COALESCE(SUM(balance.days_available), 0) INTO v_available
    FROM public.vacation_balances balance
    WHERE balance.employee_id = p_employee_id
      AND balance.employment_cycle_id = (v_sync->>'cycle_id')::uuid;
    IF ABS(p_days) > v_available THEN
      RAISE EXCEPTION 'El ajuste negativo excede el saldo disponible total.' USING ERRCODE = '22023';
    END IF;

    v_remaining := ABS(p_days);
    FOR v_period IN
      SELECT balance.id, balance.days_available
      FROM public.vacation_balances balance
      WHERE balance.employee_id = p_employee_id
        AND balance.employment_cycle_id = (v_sync->>'cycle_id')::uuid
        AND balance.days_available > 0
      ORDER BY balance.period_start, balance.id
      FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      v_delta := LEAST(v_remaining, v_period.days_available);
      UPDATE public.vacation_balances SET
        days_adjusted = days_adjusted - v_delta,
        accrual_source = 'adjusted',
        notes = CONCAT_WS(E'\n', NULLIF(notes, ''), 'Ajuste: ' || BTRIM(p_reason))
      WHERE id = v_period.id RETURNING * INTO v_balance;

      INSERT INTO public.vacation_balance_movements (
        company_id, employee_id, employment_cycle_id, balance_id, movement_type,
        days_delta, balance_after, effective_date, reason, idempotency_key, created_by
      ) VALUES (
        v_balance.company_id, v_balance.employee_id, v_balance.employment_cycle_id, v_balance.id,
        'adjustment', -v_delta, v_balance.days_available, p_effective_date, BTRIM(p_reason),
        'adjustment:' || p_idempotency_key::text || ':' || v_balance.id::text, v_user_id
      );
      v_remaining := v_remaining - v_delta;
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values
  ) VALUES (
    v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id), v_balance.company_id,
    'update', 'vacation_balance', v_balance.id,
    CONCAT(v_employee.first_name, ' ', v_employee.last_name),
    jsonb_build_object('days', p_days, 'reason', BTRIM(p_reason), 'effective_date', p_effective_date)
  );

  RETURN v_balance;
END;
$$;

-- Replace creation so it synchronizes and reserves the current-cycle balance atomically.
CREATE OR REPLACE FUNCTION public.create_vacation_request_workflow(p_request jsonb)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employee public.employees_v2%ROWTYPE;
  v_request public.vacation_requests%ROWTYPE;
  v_start_date date := (p_request->>'start_date')::date;
  v_end_date date := (p_request->>'end_date')::date;
  v_enjoyment numeric(8,2) := COALESCE((p_request->>'enjoyment_days')::numeric, 0);
  v_compensated numeric(8,2) := COALESCE((p_request->>'compensated_days')::numeric, 0);
  v_available numeric(10,2);
  v_accrued numeric(10,2);
  v_already_compensated numeric(10,2);
  v_contract_start date;
  v_balance_id uuid;
  v_cycle_id uuid;
  v_request_type public.vacation_request_type;
  v_max_compensation numeric := 50;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Debes iniciar sesión.' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_employee FROM public.employees_v2
  WHERE id = (p_request->>'employee_id')::uuid FOR SHARE;
  IF NOT FOUND OR NOT v_employee.is_active OR v_employee.status <> 'active' THEN
    RAISE EXCEPTION 'El empleado no existe o no se encuentra activo.' USING ERRCODE = '22023';
  END IF;
  IF NOT (v_employee.id = public.get_my_employee_id() OR public.is_super_admin()
    OR (public.is_company_member(v_employee.company_id)
      AND (public.is_admin_or_rrhh() OR public.check_user_permission(v_user_id, 'vacaciones', 'create')))) THEN
    RAISE EXCEPTION 'No tienes permiso para crear esta solicitud.' USING ERRCODE = '42501';
  END IF;
  IF v_start_date IS NULL OR v_end_date IS NULL OR v_end_date < v_start_date THEN
    RAISE EXCEPTION 'Las fechas de disfrute no son válidas.' USING ERRCODE = '22023';
  END IF;
  IF v_enjoyment < 0 OR v_compensated < 0 OR v_enjoyment + v_compensated <= 0 THEN
    RAISE EXCEPTION 'El total de días solicitados debe ser mayor que cero.' USING ERRCODE = '22023';
  END IF;

  SELECT cycle.id, cycle.start_date INTO v_cycle_id, v_contract_start
  FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = v_employee.id AND cycle.company_id = v_employee.company_id AND cycle.status = 'active'
  ORDER BY cycle.start_date DESC LIMIT 1;
  IF v_cycle_id IS NULL THEN RAISE EXCEPTION 'El empleado no tiene un ciclo laboral activo.' USING ERRCODE = '22023'; END IF;

  PERFORM private.sync_employee_vacation_balances(v_employee.id, CURRENT_DATE);
  SELECT COALESCE(SUM(balance.days_available), 0),
    COALESCE(SUM(balance.days_accrued + balance.days_adjusted), 0),
    COALESCE(SUM(balance.days_compensated), 0),
    (ARRAY_AGG(balance.id ORDER BY balance.period_start) FILTER (WHERE balance.days_available > 0))[1]
  INTO v_available, v_accrued, v_already_compensated, v_balance_id
  FROM public.vacation_balances balance
  WHERE balance.employee_id = v_employee.id AND balance.company_id = v_employee.company_id
    AND balance.employment_cycle_id = v_cycle_id;

  SELECT COALESCE(config.max_compensation_percentage, 50) INTO v_max_compensation
  FROM public.vacation_config config WHERE config.company_id = v_employee.company_id;
  v_max_compensation := COALESCE(v_max_compensation, 50);
  IF v_enjoyment + v_compensated > v_available THEN
    RAISE EXCEPTION 'Los días solicitados (%) exceden el saldo disponible (%).', v_enjoyment + v_compensated, v_available USING ERRCODE = '22023';
  END IF;
  IF v_already_compensated + v_compensated > ROUND(v_accrued * v_max_compensation / 100, 2) THEN
    RAISE EXCEPTION 'Los días compensados exceden el máximo permitido (% por ciento).', v_max_compensation USING ERRCODE = '22023';
  END IF;

  v_request_type := CASE WHEN v_enjoyment = 0 THEN 'compensacion'::public.vacation_request_type ELSE 'disfrute'::public.vacation_request_type END;
  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);
  INSERT INTO public.vacation_requests (
    employee_id, company_id, balance_id, request_type, status, request_date,
    start_date, end_date, business_days, calendar_days, enjoyment_days, compensated_days,
    approval_stage, contract_start_date, accrued_days_at_request, pending_days_to_enjoy, notes, created_by
  ) VALUES (
    v_employee.id, v_employee.company_id, v_balance_id, v_request_type, 'borrador', CURRENT_DATE,
    v_start_date, v_end_date, v_enjoyment, (v_end_date - v_start_date) + 1, v_enjoyment, v_compensated,
    'pending_manager', v_contract_start, v_available, GREATEST(v_available - v_enjoyment - v_compensated, 0),
    NULLIF(BTRIM(p_request->>'notes'), ''), v_user_id
  ) RETURNING * INTO v_request;

  PERFORM private.reserve_vacation_request(v_request.id);
  INSERT INTO public.audit_logs (user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id), v_employee.company_id,
    'create', 'vacation_request', v_request.id, CONCAT(v_employee.first_name, ' ', v_employee.last_name),
    jsonb_build_object('approval_stage', v_request.approval_stage, 'enjoyment_days', v_enjoyment,
      'compensated_days', v_compensated, 'reserved_days', v_enjoyment + v_compensated,
      'start_date', v_start_date, 'end_date', v_end_date));
  RETURN v_request;
END;
$$;

-- Replace final approval so a reservation is consumed exactly once.
CREATE OR REPLACE FUNCTION public.decide_vacation_as_area_leader(
  p_request_id uuid, p_approved boolean, p_payroll_recorded_days numeric, p_observations text DEFAULT NULL
)
RETURNS public.vacation_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.vacation_requests%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_request FROM public.vacation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitud no encontrada.' USING ERRCODE = 'P0002'; END IF;
  IF NOT (public.is_super_admin() OR public.is_admin_or_rrhh()
    OR (public.is_company_member(v_request.company_id)
      AND public.check_user_permission(v_user_id, 'vac_approve_area_leader', 'approve'))) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar como líder de área.' USING ERRCODE = '42501';
  END IF;
  IF v_request.approval_stage <> 'pending_area_leader' OR v_request.manager_approved IS DISTINCT FROM true THEN
    IF v_request.area_leader_approved IS NOT DISTINCT FROM p_approved THEN RETURN v_request; END IF;
    RAISE EXCEPTION 'La solicitud aún no ha sido aprobada por el jefe inmediato.' USING ERRCODE = '22023';
  END IF;
  IF p_payroll_recorded_days IS NULL OR p_payroll_recorded_days < 0 THEN
    RAISE EXCEPTION 'Los días grabados en nómina deben ser cero o mayores.' USING ERRCODE = '22023';
  END IF;

  IF p_approved THEN PERFORM private.consume_vacation_reservation(p_request_id);
  ELSE PERFORM private.release_vacation_reservation(p_request_id, 'Solicitud rechazada por líder de área'); END IF;

  v_name := public.vacation_approver_name(v_user_id);
  PERFORM set_config('app.vacation_workflow_rpc', 'on', true);
  UPDATE public.vacation_requests SET
    payroll_recorded_days = p_payroll_recorded_days,
    pending_days_to_enjoy = GREATEST(accrued_days_at_request - total_requested_days, 0),
    area_leader_approved = p_approved, area_leader_approved_by = v_user_id,
    area_leader_approved_at = now(), area_leader_approver_name = v_name,
    area_leader_observations = NULLIF(BTRIM(p_observations), ''),
    approval_stage = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    status = CASE WHEN p_approved THEN 'aprobado'::public.vacation_status ELSE 'cancelado'::public.vacation_status END,
    approved_by = CASE WHEN p_approved THEN v_user_id ELSE NULL END,
    approved_at = CASE WHEN p_approved THEN now() ELSE NULL END
  WHERE id = p_request_id RETURNING * INTO v_request;

  INSERT INTO public.audit_logs (user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (v_user_id, (SELECT email FROM auth.users WHERE id = v_user_id), v_request.company_id,
    CASE WHEN p_approved THEN 'area_leader_approve' ELSE 'area_leader_reject' END,
    'vacation_request', v_request.id, v_name,
    jsonb_build_object('approved', p_approved, 'payroll_recorded_days', p_payroll_recorded_days,
      'pending_days_to_enjoy', v_request.pending_days_to_enjoy, 'observations', p_observations));
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION private.release_vacation_reservation_on_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM private.release_vacation_reservation(OLD.id, 'Solicitud eliminada');
    RETURN OLD;
  END IF;
  IF NEW.approval_stage = 'rejected' AND OLD.approval_stage IS DISTINCT FROM 'rejected' THEN
    PERFORM private.release_vacation_reservation(NEW.id, 'Solicitud rechazada');
  ELSIF NEW.status = 'cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    PERFORM private.release_vacation_reservation(NEW.id, 'Solicitud cancelada');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_vacation_reservation_on_status ON public.vacation_requests;
CREATE TRIGGER release_vacation_reservation_on_status
  AFTER UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION private.release_vacation_reservation_on_status();
DROP TRIGGER IF EXISTS release_vacation_reservation_before_delete ON public.vacation_requests;
CREATE TRIGGER release_vacation_reservation_before_delete
  BEFORE DELETE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION private.release_vacation_reservation_on_status();

CREATE OR REPLACE FUNCTION private.sync_vacation_balance_from_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  PERFORM private.sync_employee_vacation_balances(NEW.employee_id, COALESCE(NEW.end_date, CURRENT_DATE));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_vacation_balance_from_cycle ON public.employee_employment_cycles;
CREATE TRIGGER sync_vacation_balance_from_cycle
  AFTER INSERT OR UPDATE OF status, start_date, end_date ON public.employee_employment_cycles
  FOR EACH ROW EXECUTE FUNCTION private.sync_vacation_balance_from_cycle();

REVOKE ALL ON FUNCTION private.sync_employee_vacation_balances(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.reserve_vacation_request(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.release_vacation_reservation(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.consume_vacation_reservation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_employee_vacation_balances(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_company_vacation_balances(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.adjust_vacation_balance(uuid, numeric, text, date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_vacation_request_workflow(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_employee_vacation_balances(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_company_vacation_balances(uuid, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_vacation_balance(uuid, numeric, text, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_vacation_request_workflow(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_area_leader(uuid, boolean, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decide_vacation_as_manager(uuid, boolean, boolean, uuid, text, date, text) TO authenticated, service_role;

-- Initial synchronization is safe: it only increases accrual to the proportional target.
DO $$
DECLARE v_employee record;
BEGIN
  FOR v_employee IN
    SELECT employee.id FROM public.employees_v2 employee
    WHERE employee.is_active = true AND employee.status = 'active'
    ORDER BY employee.id
  LOOP
    PERFORM private.sync_employee_vacation_balances(v_employee.id, CURRENT_DATE);
  END LOOP;
END;
$$;

COMMENT ON COLUMN public.vacation_balances.days_reserved IS
  'Days set aside by pending approval workflows; they are unavailable but not consumed.';
COMMENT ON COLUMN public.vacation_balances.days_available IS
  'Current usable balance: accrued + adjustments - enjoyed - compensated - reserved.';
COMMENT ON TABLE public.vacation_balance_movements IS
  'Immutable vacation ledger containing accrual, reservation, consumption and adjustment events.';

COMMIT;
