-- Repair records left without an employment cycle by the initial cycle backfill.
--
-- Safety rule: a record is updated only when its employee has exactly one cycle,
-- the record belongs to the same company, and employment_cycle_id is still NULL.
-- Existing values and already-scoped records are never overwritten.
DO $$
DECLARE
  target_table text;
BEGIN
  PERFORM set_config('lock_timeout', '5s', true);
  PERFORM set_config('statement_timeout', '60s', true);

  CREATE TEMP TABLE single_cycle_employee_scope ON COMMIT DROP AS
  SELECT
    cycle.employee_id,
    (array_agg(cycle.id))[1] AS cycle_id,
    (array_agg(cycle.company_id))[1] AS company_id
  FROM public.employee_employment_cycles cycle
  GROUP BY cycle.employee_id
  HAVING count(*) = 1;

  CREATE UNIQUE INDEX ON single_cycle_employee_scope (employee_id);

  FOREACH target_table IN ARRAY ARRAY[
    'contracts',
    'employee_work_info',
    'employee_terminations',
    'employee_contact',
    'employee_family',
    'employee_family_members',
    'employee_bank_info',
    'employee_social_security',
    'employee_schedule',
    'employee_time_config',
    'employee_operation_center_assignments',
    'employee_documents',
    'medical_exams',
    'employee_onboarding_tasks',
    'vacation_balances',
    'leave_balances'
  ]
  LOOP
    EXECUTE format(
      'UPDATE public.%I record
       SET employment_cycle_id = scope.cycle_id
       FROM pg_temp.single_cycle_employee_scope scope
       WHERE record.employee_id = scope.employee_id
         AND record.company_id = scope.company_id
         AND record.employment_cycle_id IS NULL',
      target_table
    );
  END LOOP;
END
$$;
