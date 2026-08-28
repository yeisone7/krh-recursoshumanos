BEGIN;

-- A rehire workflow can create an empty initial balance immediately after the
-- employment-cycle trigger has already generated the automatic balance for the
-- same period. Historical duplicates must not make the accrual sync choose the
-- empty row and then collide with the automatic-period unique key.
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
    ORDER BY
      (balance.automatic_period_key = v_key) DESC NULLS LAST,
      balance.created_at,
      balance.id
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

CREATE OR REPLACE FUNCTION private.skip_redundant_initial_vacation_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.employment_cycle_id IS NOT NULL
    AND NEW.automatic_period_key IS NULL
    AND COALESCE(NEW.days_accrued, 0) = 0
    AND COALESCE(NEW.days_adjusted, 0) = 0
    AND COALESCE(NEW.days_taken, 0) = 0
    AND COALESCE(NEW.days_compensated, 0) = 0
    AND COALESCE(NEW.days_reserved, 0) = 0
    AND EXISTS (
      SELECT 1
      FROM public.vacation_balances balance
      WHERE balance.employment_cycle_id = NEW.employment_cycle_id
        AND balance.period_start = NEW.period_start
    ) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.skip_redundant_initial_vacation_balance() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS skip_redundant_initial_vacation_balance ON public.vacation_balances;
CREATE TRIGGER skip_redundant_initial_vacation_balance
BEFORE INSERT ON public.vacation_balances
FOR EACH ROW
EXECUTE FUNCTION private.skip_redundant_initial_vacation_balance();

-- Remove only empty, unreferenced legacy duplicates. These rows carry no
-- balance or ledger information; the keyed automatic row remains canonical.
DELETE FROM public.vacation_balances duplicate
USING public.vacation_balances canonical
WHERE duplicate.id <> canonical.id
  AND duplicate.employment_cycle_id = canonical.employment_cycle_id
  AND duplicate.period_start = canonical.period_start
  AND duplicate.automatic_period_key IS NULL
  AND canonical.automatic_period_key IS NOT NULL
  AND COALESCE(duplicate.days_accrued, 0) = 0
  AND COALESCE(duplicate.days_adjusted, 0) = 0
  AND COALESCE(duplicate.days_taken, 0) = 0
  AND COALESCE(duplicate.days_compensated, 0) = 0
  AND COALESCE(duplicate.days_reserved, 0) = 0
  AND NOT EXISTS (
    SELECT 1 FROM public.vacation_balance_movements movement
    WHERE movement.balance_id = duplicate.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.vacation_requests request
    WHERE request.balance_id = duplicate.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.vacation_request_allocations allocation
    WHERE allocation.balance_id = duplicate.id
  );

COMMIT;
