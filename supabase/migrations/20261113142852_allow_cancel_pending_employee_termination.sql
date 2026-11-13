CREATE FUNCTION public.cancel_pending_employee_termination(
  p_termination_id uuid,
  p_company_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  retirement public.employee_terminations%ROWTYPE;
  remaining_effective_date date;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.is_user_active(actor), false) OR NOT coalesce((
    public.is_super_admin() OR (
      public.is_company_member(p_company_id)
      AND (
        public.is_admin_or_rrhh()
        OR public.check_user_permission(actor, 'contratos', 'update')
        OR public.check_user_permission(actor, 'empleados', 'update')
      )
    )
  ), false) THEN
    RAISE EXCEPTION 'No tiene permiso para cancelar este proceso de retiro' USING ERRCODE = '42501';
  END IF;

  -- Serialize with finalization, which updates this same row first.
  SELECT * INTO retirement
  FROM public.employee_terminations
  WHERE id = p_termination_id AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.has_employee_v2_access(retirement.employee_id) THEN
    RAISE EXCEPTION 'No se encontró un proceso de retiro accesible' USING ERRCODE = '42501';
  END IF;
  IF retirement.is_completed THEN
    RAISE EXCEPTION 'Este proceso de retiro ya fue finalizado';
  END IF;

  -- Serialize cancellations when an employee has more than one pending process.
  PERFORM 1 FROM public.employees_v2
  WHERE id = retirement.employee_id AND company_id = retirement.company_id
  FOR UPDATE;

  DELETE FROM public.employee_terminations WHERE id = retirement.id;

  SELECT effective_date INTO remaining_effective_date
  FROM public.employee_terminations
  WHERE employee_id = retirement.employee_id AND company_id = retirement.company_id
    AND NOT is_completed
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  UPDATE public.employee_work_info
  SET termination_date = remaining_effective_date
  WHERE employee_id = retirement.employee_id AND company_id = retirement.company_id
    AND is_current AND termination_date = retirement.effective_date
    AND (retirement.employment_cycle_id IS NULL OR employment_cycle_id = retirement.employment_cycle_id);

  IF remaining_effective_date IS NULL THEN
    UPDATE public.employees_v2
    SET status = CASE WHEN is_active THEN 'active'::public.employee_status ELSE 'suspended'::public.employee_status END
    WHERE id = retirement.employee_id AND company_id = retirement.company_id AND status = 'en_retiro';
  END IF;

  INSERT INTO public.audit_logs (user_id, user_email, company_id, action, entity_type, entity_id, old_values)
  VALUES (
    actor, auth.jwt() ->> 'email', retirement.company_id, 'cancel_termination', 'employee_termination',
    retirement.id, jsonb_build_object('employee_id', retirement.employee_id, 'contract_id', retirement.contract_id,
      'termination_type', retirement.termination_type, 'effective_date', retirement.effective_date)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_employee_termination(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_employee_termination(uuid, uuid) TO authenticated;

-- Keep completed retirements protected from direct API deletion as well.
CREATE POLICY "Only pending employee terminations can be deleted"
ON public.employee_terminations AS RESTRICTIVE
FOR DELETE TO authenticated
USING (NOT is_completed);
