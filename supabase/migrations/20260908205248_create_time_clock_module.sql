-- Reloj de Asistencia: secure attendance events, rotating QR challenges and reviewed corrections.

CREATE TABLE public.time_clock_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_center_id uuid NOT NULL REFERENCES public.operation_centers(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  radius_meters integer NOT NULL DEFAULT 100 CHECK (radius_meters BETWEEN 20 AND 5000),
  max_accuracy_meters integer NOT NULL DEFAULT 50 CHECK (max_accuracy_meters BETWEEN 5 AND 1000),
  late_tolerance_minutes integer NOT NULL DEFAULT 5 CHECK (late_tolerance_minutes BETWEEN 0 AND 240),
  require_break_punches boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operation_center_id, name)
);

CREATE TABLE public.time_clock_qr_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id uuid NOT NULL REFERENCES public.time_clock_points(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  issued_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.time_clock_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE CASCADE,
  employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE RESTRICT,
  operation_center_id uuid REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  schedule_name text,
  expected_start timestamptz,
  expected_end timestamptz,
  scheduled_break_minutes integer NOT NULL DEFAULT 0,
  late_minutes integer NOT NULL DEFAULT 0,
  early_leave_minutes integer NOT NULL DEFAULT 0,
  first_clock_in timestamptz,
  last_clock_out timestamptz,
  worked_minutes integer NOT NULL DEFAULT 0 CHECK (worked_minutes >= 0),
  break_minutes integer NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'on_break', 'complete', 'needs_review')),
  incident_codes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, employment_cycle_id, work_date)
);

CREATE TABLE public.time_clock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_id uuid NOT NULL REFERENCES public.time_clock_days(id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE RESTRICT,
  employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE RESTRICT,
  operation_center_id uuid REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  point_id uuid REFERENCES public.time_clock_points(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('clock_in', 'break_start', 'break_end', 'clock_out')),
  source text NOT NULL CHECK (source IN ('qr', 'web', 'supervised', 'correction')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  distance_meters double precision,
  location_verified boolean NOT NULL DEFAULT false,
  qr_verified boolean NOT NULL DEFAULT false,
  recorded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  supervisor_reason text,
  idempotency_key uuid NOT NULL,
  supersedes_event_id uuid REFERENCES public.time_clock_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recorded_by, idempotency_key)
);

CREATE TABLE public.time_clock_correction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees_v2(id) ON DELETE RESTRICT,
  employment_cycle_id uuid REFERENCES public.employee_employment_cycles(id) ON DELETE RESTRICT,
  operation_center_id uuid REFERENCES public.operation_centers(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.time_clock_events(id) ON DELETE RESTRICT,
  requested_action text NOT NULL CHECK (requested_action IN ('clock_in', 'break_start', 'break_end', 'clock_out')),
  requested_at timestamptz NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX time_clock_days_company_date_idx ON public.time_clock_days(company_id, work_date DESC);
CREATE INDEX time_clock_days_employee_date_idx ON public.time_clock_days(employee_id, work_date DESC);
CREATE INDEX time_clock_events_day_time_idx ON public.time_clock_events(day_id, occurred_at, created_at);
CREATE INDEX time_clock_events_company_time_idx ON public.time_clock_events(company_id, occurred_at DESC);
CREATE INDEX time_clock_corrections_company_status_idx ON public.time_clock_correction_requests(company_id, status, created_at DESC);
CREATE INDEX time_clock_qr_expiry_idx ON public.time_clock_qr_sessions(expires_at);

ALTER TABLE public.time_clock_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_qr_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_correction_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.time_clock_points, public.time_clock_qr_sessions, public.time_clock_days,
  public.time_clock_events, public.time_clock_correction_requests FROM anon, authenticated;
GRANT SELECT ON public.time_clock_points, public.time_clock_days, public.time_clock_events,
  public.time_clock_correction_requests TO authenticated;
GRANT INSERT, UPDATE ON public.time_clock_points TO authenticated;

INSERT INTO public.modules (code, name, icon, sort_order, is_active)
VALUES ('reloj_checador', 'Reloj de Asistencia', 'ScanLine', 19, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, is_active = true;

INSERT INTO public.permissions (module_id, action, description)
SELECT module.id, action.value::public.permission_action,
  'Reloj de Asistencia - ' || action.label
FROM public.modules module
CROSS JOIN (VALUES
  ('view', 'Ver'), ('create', 'Registrar'), ('update', 'Configurar'),
  ('delete', 'Desactivar'), ('approve', 'Aprobar correcciones'), ('export', 'Exportar')
) AS action(value, label)
WHERE module.code = 'reloj_checador'
ON CONFLICT (module_id, action) DO UPDATE SET description = EXCLUDED.description;

CREATE OR REPLACE FUNCTION public.time_clock_is_self(_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employee_user_links link
    WHERE link.employee_id = _employee_id
      AND link.user_id = (SELECT auth.uid())
      AND link.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.time_clock_can(_company_id uuid, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.is_super_admin()
    OR public.is_admin()
    OR (
      public.is_company_member(_company_id)
      AND public.check_user_permission((SELECT auth.uid()), 'reloj_checador', _action)
    );
$$;

CREATE POLICY "Time clock points are visible in scope" ON public.time_clock_points
FOR SELECT TO authenticated USING (
  (public.time_clock_can(company_id, 'view') AND public.check_center_access(company_id, operation_center_id))
  OR EXISTS (
    SELECT 1 FROM public.employee_user_links link
    JOIN public.employees_v2 employee ON employee.id = link.employee_id
    WHERE link.user_id = (SELECT auth.uid()) AND link.is_active
      AND employee.company_id = time_clock_points.company_id
      AND (
        EXISTS (SELECT 1 FROM public.employee_work_info work_info
          WHERE work_info.employee_id = employee.id AND work_info.is_current
            AND work_info.operation_center_id = time_clock_points.operation_center_id)
        OR EXISTS (SELECT 1 FROM public.employee_operation_center_assignments assignment
          JOIN public.employee_employment_cycles cycle ON cycle.id = assignment.employment_cycle_id AND cycle.status = 'active'
          WHERE assignment.employee_id = employee.id
            AND assignment.operation_center_id = time_clock_points.operation_center_id)
      )
  )
);
CREATE POLICY "Time clock points can be created" ON public.time_clock_points
FOR INSERT TO authenticated WITH CHECK (
  public.time_clock_can(company_id, 'update') AND public.check_center_access(company_id, operation_center_id)
);
CREATE POLICY "Time clock points can be updated" ON public.time_clock_points
FOR UPDATE TO authenticated USING (
  public.time_clock_can(company_id, 'update') AND public.check_center_access(company_id, operation_center_id)
)
WITH CHECK (public.time_clock_can(company_id, 'update') AND public.check_center_access(company_id, operation_center_id));

CREATE POLICY "Time clock days are visible to owner or managers" ON public.time_clock_days
FOR SELECT TO authenticated USING (
  public.time_clock_is_self(employee_id)
  OR (public.time_clock_can(company_id, 'view') AND public.has_employee_v2_access(employee_id))
);
CREATE POLICY "Time clock events are visible to owner or managers" ON public.time_clock_events
FOR SELECT TO authenticated USING (
  public.time_clock_is_self(employee_id)
  OR (public.time_clock_can(company_id, 'view') AND public.has_employee_v2_access(employee_id))
);
CREATE POLICY "Time clock corrections are visible to owner or managers" ON public.time_clock_correction_requests
FOR SELECT TO authenticated USING (
  public.time_clock_is_self(employee_id)
  OR (public.time_clock_can(company_id, 'view') AND public.has_employee_v2_access(employee_id))
);

CREATE OR REPLACE FUNCTION public.time_clock_distance_m(
  _latitude_a double precision, _longitude_a double precision,
  _latitude_b double precision, _longitude_b double precision
) RETURNS double precision LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT 6371000 * 2 * asin(sqrt(
    power(sin(radians((_latitude_b - _latitude_a) / 2)), 2) +
    cos(radians(_latitude_a)) * cos(radians(_latitude_b)) *
    power(sin(radians((_longitude_b - _longitude_a) / 2)), 2)
  ));
$$;

CREATE OR REPLACE FUNCTION public.time_clock_recalculate_day(_day_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  event_row record;
  day_row public.time_clock_days%ROWTYPE;
  schedule_row record;
  work_started timestamptz;
  break_started timestamptz;
  first_in timestamptz;
  last_out timestamptz;
  work_seconds numeric := 0;
  break_seconds numeric := 0;
  day_status text := 'open';
  incidents text[] := '{}';
  tolerance_minutes integer := 5;
BEGIN
  SELECT * INTO day_row FROM public.time_clock_days WHERE id = _day_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  -- Snapshot the expected schedule once. Daily assignments take precedence over administrative schedules.
  IF day_row.expected_start IS NULL THEN
    SELECT shift.name, shift.start_time, shift.end_time, shift.break_minutes, shift.crosses_midnight
    INTO schedule_row
    FROM public.employee_shift_assignments assignment
    JOIN public.shifts shift ON shift.id = assignment.shift_id
    WHERE assignment.employee_id = day_row.employee_id AND assignment.assignment_date = day_row.work_date
    LIMIT 1;

    IF NOT FOUND THEN
      SELECT schedule.name, schedule.start_time, schedule.end_time, schedule.break_minutes,
        schedule.end_time <= schedule.start_time AS crosses_midnight
      INTO schedule_row
      FROM public.employee_time_config config
      JOIN public.work_schedules schedule ON schedule.id = config.work_schedule_id
      WHERE config.employee_id = day_row.employee_id AND config.is_active
        AND config.mode = 'administrative'
        AND config.start_date <= day_row.work_date
        AND (config.end_date IS NULL OR config.end_date >= day_row.work_date)
        AND extract(dow FROM day_row.work_date)::integer = ANY(schedule.days_of_week)
      ORDER BY config.start_date DESC LIMIT 1;
    END IF;

    IF schedule_row.name IS NOT NULL THEN
      UPDATE public.time_clock_days SET
        schedule_name = schedule_row.name,
        expected_start = (day_row.work_date + schedule_row.start_time) AT TIME ZONE 'America/Bogota',
        expected_end = (day_row.work_date + schedule_row.end_time +
          CASE WHEN schedule_row.crosses_midnight THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'America/Bogota',
        scheduled_break_minutes = coalesce(schedule_row.break_minutes, 0)
      WHERE id = _day_id;
      SELECT * INTO day_row FROM public.time_clock_days WHERE id = _day_id;
    ELSE
      incidents := array_append(incidents, 'no_schedule');
    END IF;
  END IF;

  FOR event_row IN
    SELECT action, occurred_at FROM public.time_clock_events
    WHERE day_id = _day_id ORDER BY occurred_at, created_at
  LOOP
    IF event_row.action = 'clock_in' THEN
      first_in := coalesce(first_in, event_row.occurred_at);
      work_started := event_row.occurred_at;
      break_started := NULL;
      day_status := 'open';
    ELSIF event_row.action = 'break_start' AND work_started IS NOT NULL THEN
      work_seconds := work_seconds + extract(epoch FROM (event_row.occurred_at - work_started));
      work_started := NULL;
      break_started := event_row.occurred_at;
      day_status := 'on_break';
    ELSIF event_row.action = 'break_end' AND break_started IS NOT NULL THEN
      break_seconds := break_seconds + extract(epoch FROM (event_row.occurred_at - break_started));
      break_started := NULL;
      work_started := event_row.occurred_at;
      day_status := 'open';
    ELSIF event_row.action = 'clock_out' THEN
      IF work_started IS NOT NULL THEN
        work_seconds := work_seconds + extract(epoch FROM (event_row.occurred_at - work_started));
      END IF;
      IF break_started IS NOT NULL THEN
        break_seconds := break_seconds + extract(epoch FROM (event_row.occurred_at - break_started));
      END IF;
      work_started := NULL;
      break_started := NULL;
      last_out := event_row.occurred_at;
      day_status := 'complete';
    END IF;
  END LOOP;

  SELECT coalesce(max(point.late_tolerance_minutes), 5) INTO tolerance_minutes
  FROM public.time_clock_points point WHERE point.operation_center_id = day_row.operation_center_id AND point.is_active;

  IF first_in IS NOT NULL AND day_row.expected_start IS NOT NULL
    AND first_in > day_row.expected_start + make_interval(mins => tolerance_minutes) THEN
    incidents := array_append(incidents, 'late');
  END IF;
  IF last_out IS NOT NULL AND day_row.expected_end IS NOT NULL AND last_out < day_row.expected_end THEN
    incidents := array_append(incidents, 'early_leave');
  END IF;
  IF first_in IS NOT NULL AND last_out IS NULL AND first_in < now() - interval '24 hours' THEN
    incidents := array_append(incidents, 'missing_checkout');
    day_status := 'needs_review';
  END IF;
  IF first_in IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.vacation_requests vacation WHERE vacation.employee_id = day_row.employee_id
      AND day_row.work_date BETWEEN vacation.start_date AND vacation.end_date AND vacation.status::text = 'aprobado')
    OR EXISTS (SELECT 1 FROM public.leave_requests leave_request WHERE leave_request.employee_id = day_row.employee_id
      AND day_row.work_date BETWEEN leave_request.start_date AND leave_request.end_date AND leave_request.status::text = 'aprobado')
    OR EXISTS (SELECT 1 FROM public.employee_incapacities incapacity WHERE incapacity.employee_id = day_row.employee_id
      AND day_row.work_date BETWEEN incapacity.start_date AND incapacity.end_date)
  ) THEN incidents := array_append(incidents, 'absence_overlap'); END IF;

  IF day_status = 'complete' AND break_seconds = 0 AND day_row.scheduled_break_minutes > 0 THEN
    work_seconds := greatest(0, work_seconds - day_row.scheduled_break_minutes * 60);
    break_seconds := day_row.scheduled_break_minutes * 60;
  END IF;

  UPDATE public.time_clock_days SET
    first_clock_in = first_in,
    last_clock_out = last_out,
    worked_minutes = greatest(0, floor(work_seconds / 60)::integer),
    break_minutes = greatest(0, floor(break_seconds / 60)::integer),
    late_minutes = CASE WHEN first_in IS NOT NULL AND expected_start IS NOT NULL
      THEN greatest(0, floor(extract(epoch FROM (first_in - expected_start)) / 60)::integer) ELSE 0 END,
    early_leave_minutes = CASE WHEN last_out IS NOT NULL AND expected_end IS NOT NULL
      THEN greatest(0, floor(extract(epoch FROM (expected_end - last_out)) / 60)::integer) ELSE 0 END,
    status = day_status,
    incident_codes = incidents,
    updated_at = now()
  WHERE id = _day_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.time_clock_issue_qr(_point_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  point_row public.time_clock_points%ROWTYPE;
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  expiry timestamptz := now() + interval '30 seconds';
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO point_row FROM public.time_clock_points WHERE id = _point_id AND is_active;
  IF NOT FOUND OR NOT public.time_clock_can(point_row.company_id, 'create')
    OR NOT public.check_center_access(point_row.company_id, point_row.operation_center_id) THEN
    RAISE EXCEPTION 'POINT_NOT_ALLOWED';
  END IF;

  INSERT INTO public.time_clock_qr_sessions(point_id, company_id, token_hash, expires_at, issued_by)
  VALUES (_point_id, point_row.company_id, extensions.digest(raw_token, 'sha256'), expiry, (SELECT auth.uid()));
  DELETE FROM public.time_clock_qr_sessions WHERE expires_at < now() - interval '1 day';

  RETURN jsonb_build_object('token', raw_token, 'expires_at', expiry, 'point_id', _point_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.time_clock_register_event(
  _action text,
  _point_id uuid,
  _latitude double precision,
  _longitude double precision,
  _accuracy_meters double precision,
  _position_captured_at timestamptz,
  _source text DEFAULT 'web',
  _qr_token text DEFAULT NULL,
  _employee_id uuid DEFAULT NULL,
  _supervisor_reason text DEFAULT NULL,
  _idempotency_key uuid DEFAULT gen_random_uuid()
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  target_employee uuid;
  employee_row public.employees_v2%ROWTYPE;
  cycle_id uuid;
  center_id uuid;
  point_row public.time_clock_points%ROWTYPE;
  distance_value double precision;
  day_id_value uuid;
  event_id_value uuid;
  last_action text;
  allowed_actions text[];
  work_date_value date := (now() AT TIME ZONE 'America/Bogota')::date;
  is_supervised boolean := _source = 'supervised';
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _action NOT IN ('clock_in', 'break_start', 'break_end', 'clock_out') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF _source NOT IN ('qr', 'web', 'supervised') THEN RAISE EXCEPTION 'INVALID_SOURCE'; END IF;
  IF EXISTS (SELECT 1 FROM public.time_clock_events WHERE recorded_by = actor_id AND idempotency_key = _idempotency_key) THEN
    SELECT id INTO event_id_value FROM public.time_clock_events WHERE recorded_by = actor_id AND idempotency_key = _idempotency_key;
    RETURN jsonb_build_object('event_id', event_id_value, 'duplicate', true);
  END IF;

  IF is_supervised THEN
    target_employee := _employee_id;
    IF target_employee IS NULL OR char_length(btrim(coalesce(_supervisor_reason, ''))) < 5 THEN
      RAISE EXCEPTION 'SUPERVISOR_REASON_REQUIRED';
    END IF;
  ELSE
    SELECT link.employee_id INTO target_employee
    FROM public.employee_user_links link
    WHERE link.user_id = actor_id AND link.is_active
    ORDER BY link.linked_at DESC LIMIT 1;
    IF target_employee IS NULL OR (_employee_id IS NOT NULL AND _employee_id <> target_employee) THEN
      RAISE EXCEPTION 'EMPLOYEE_LINK_REQUIRED';
    END IF;
  END IF;

  SELECT * INTO employee_row FROM public.employees_v2 WHERE id = target_employee AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EMPLOYEE_NOT_ACTIVE'; END IF;
  IF is_supervised AND NOT (
    public.time_clock_can(employee_row.company_id, 'create') AND public.has_employee_v2_access(target_employee)
  ) THEN RAISE EXCEPTION 'SUPERVISED_MARK_NOT_ALLOWED'; END IF;
  IF EXISTS (SELECT 1 FROM public.time_clock_events event
    WHERE event.employee_id = target_employee AND event.created_at > now() - interval '30 seconds') THEN
    RAISE EXCEPTION 'TOO_FREQUENT';
  END IF;

  SELECT cycle.id INTO cycle_id FROM public.employee_employment_cycles cycle
  WHERE cycle.employee_id = target_employee AND cycle.status = 'active' LIMIT 1;
  IF cycle_id IS NULL THEN RAISE EXCEPTION 'EMPLOYMENT_CYCLE_REQUIRED'; END IF;
  SELECT info.operation_center_id INTO center_id FROM public.employee_work_info info
  WHERE info.employee_id = target_employee AND info.is_current
    AND (cycle_id IS NULL OR info.employment_cycle_id = cycle_id)
  ORDER BY info.updated_at DESC LIMIT 1;

  IF NOT is_supervised THEN
    IF _point_id IS NULL OR _latitude IS NULL OR _longitude IS NULL OR _accuracy_meters IS NULL OR _position_captured_at IS NULL THEN
      RAISE EXCEPTION 'LOCATION_REQUIRED';
    END IF;
    SELECT * INTO point_row FROM public.time_clock_points
    WHERE id = _point_id AND company_id = employee_row.company_id AND is_active;
    IF NOT FOUND OR NOT (
      point_row.operation_center_id = center_id
      OR EXISTS (
        SELECT 1 FROM public.employee_operation_center_assignments assignment
        WHERE assignment.employee_id = target_employee
          AND assignment.operation_center_id = point_row.operation_center_id
          AND assignment.employment_cycle_id IS NOT DISTINCT FROM cycle_id
      )
    ) THEN
      RAISE EXCEPTION 'POINT_NOT_ALLOWED';
    END IF;
    IF _accuracy_meters < 0 OR _accuracy_meters > point_row.max_accuracy_meters THEN RAISE EXCEPTION 'LOCATION_ACCURACY_LOW'; END IF;
    IF _position_captured_at < now() - interval '30 seconds' OR _position_captured_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION 'LOCATION_STALE';
    END IF;
    distance_value := public.time_clock_distance_m(_latitude, _longitude, point_row.latitude, point_row.longitude);
    IF distance_value > point_row.radius_meters THEN RAISE EXCEPTION 'OUTSIDE_ALLOWED_AREA'; END IF;
    IF _source = 'qr' AND NOT EXISTS (
      SELECT 1 FROM public.time_clock_qr_sessions session
      WHERE session.point_id = _point_id AND session.expires_at >= now()
        AND session.token_hash = extensions.digest(coalesce(_qr_token, ''), 'sha256')
    ) THEN RAISE EXCEPTION 'QR_EXPIRED_OR_INVALID'; END IF;
    center_id := point_row.operation_center_id;
    IF _action IN ('break_start', 'break_end') AND NOT point_row.require_break_punches THEN
      RAISE EXCEPTION 'BREAK_PUNCHES_DISABLED';
    END IF;
  END IF;

  SELECT id INTO day_id_value FROM public.time_clock_days
  WHERE employee_id = target_employee AND employment_cycle_id IS NOT DISTINCT FROM cycle_id
    AND work_date IN (work_date_value, work_date_value - 1)
    AND status IN ('open', 'on_break') ORDER BY work_date DESC LIMIT 1 FOR UPDATE;

  IF day_id_value IS NULL THEN
    INSERT INTO public.time_clock_days(company_id, employee_id, employment_cycle_id, operation_center_id, work_date)
    VALUES (employee_row.company_id, target_employee, cycle_id, center_id, work_date_value)
    ON CONFLICT (employee_id, employment_cycle_id, work_date) DO UPDATE SET updated_at = now()
    RETURNING id INTO day_id_value;
  END IF;

  SELECT action INTO last_action FROM public.time_clock_events
  WHERE day_id = day_id_value ORDER BY occurred_at DESC, created_at DESC LIMIT 1;
  IF NOT is_supervised AND last_action <> 'clock_out' AND EXISTS (
    SELECT 1 FROM public.time_clock_events event WHERE event.day_id = day_id_value
      AND event.action = 'clock_in' AND event.occurred_at < now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'STALE_OPEN_DAY';
  END IF;
  allowed_actions := CASE last_action
    WHEN 'clock_in' THEN ARRAY['break_start', 'clock_out']
    WHEN 'break_start' THEN ARRAY['break_end']
    WHEN 'break_end' THEN ARRAY['break_start', 'clock_out']
    WHEN 'clock_out' THEN ARRAY['clock_in']
    ELSE ARRAY['clock_in']
  END;
  IF NOT (_action = ANY(allowed_actions)) THEN RAISE EXCEPTION 'INVALID_SEQUENCE'; END IF;

  INSERT INTO public.time_clock_events(
    company_id, day_id, employee_id, employment_cycle_id, operation_center_id, point_id,
    action, source, latitude, longitude, accuracy_meters, distance_meters,
    location_verified, qr_verified, recorded_by, supervisor_reason, idempotency_key
  ) VALUES (
    employee_row.company_id, day_id_value, target_employee, cycle_id, center_id, _point_id,
    _action, _source, _latitude, _longitude, _accuracy_meters, distance_value,
    NOT is_supervised, _source = 'qr', actor_id, nullif(btrim(_supervisor_reason), ''), _idempotency_key
  ) RETURNING id INTO event_id_value;

  PERFORM public.time_clock_recalculate_day(day_id_value);
  INSERT INTO public.audit_logs(user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (actor_id, coalesce((SELECT auth.jwt() ->> 'email'), ''), employee_row.company_id,
    'create', 'time_clock_event', event_id_value, _action,
    jsonb_build_object('employee_id', target_employee, 'source', _source, 'location_verified', NOT is_supervised, 'qr_verified', _source = 'qr'));

  RETURN jsonb_build_object('event_id', event_id_value, 'day_id', day_id_value,
    'occurred_at', now(), 'action', _action, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.time_clock_request_correction(
  _requested_action text, _requested_at timestamptz, _reason text, _event_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor_id uuid := (SELECT auth.uid()); employee_id_value uuid; employee_row public.employees_v2%ROWTYPE;
  cycle_id uuid; center_id uuid; result_id uuid;
BEGIN
  SELECT link.employee_id INTO employee_id_value FROM public.employee_user_links link
  WHERE link.user_id = actor_id AND link.is_active ORDER BY link.linked_at DESC LIMIT 1;
  IF employee_id_value IS NULL THEN RAISE EXCEPTION 'EMPLOYEE_LINK_REQUIRED'; END IF;
  IF _requested_action NOT IN ('clock_in','break_start','break_end','clock_out') OR char_length(btrim(coalesce(_reason,''))) < 5 THEN
    RAISE EXCEPTION 'INVALID_CORRECTION';
  END IF;
  IF _requested_at < now() - interval '90 days' OR _requested_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'CORRECTION_DATE_OUT_OF_RANGE';
  END IF;
  IF _event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.time_clock_events event WHERE event.id = _event_id AND event.employee_id = employee_id_value
  ) THEN RAISE EXCEPTION 'CORRECTION_EVENT_NOT_ALLOWED'; END IF;
  SELECT * INTO employee_row FROM public.employees_v2 WHERE id = employee_id_value AND is_active;
  SELECT id INTO cycle_id FROM public.employee_employment_cycles WHERE employee_id = employee_id_value AND status = 'active' LIMIT 1;
  IF cycle_id IS NULL THEN RAISE EXCEPTION 'EMPLOYMENT_CYCLE_REQUIRED'; END IF;
  SELECT operation_center_id INTO center_id FROM public.employee_work_info WHERE employee_id = employee_id_value AND is_current
    AND (cycle_id IS NULL OR employment_cycle_id = cycle_id) ORDER BY updated_at DESC LIMIT 1;
  INSERT INTO public.time_clock_correction_requests(company_id, employee_id, employment_cycle_id, operation_center_id,
    event_id, requested_action, requested_at, reason, requested_by)
  VALUES(employee_row.company_id, employee_id_value, cycle_id, center_id, _event_id, _requested_action, _requested_at, btrim(_reason), actor_id)
  RETURNING id INTO result_id;
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.time_clock_refresh_absences(_company_id uuid, _work_date date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  employee_row record;
  schedule_row record;
  expected_start_value timestamptz;
  expected_end_value timestamptz;
  incident text;
  inserted_count integer := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.time_clock_can(_company_id, 'view') THEN
    RAISE EXCEPTION 'ATTENDANCE_VIEW_NOT_ALLOWED';
  END IF;
  IF _work_date < current_date - 366 OR _work_date > current_date THEN RAISE EXCEPTION 'DATE_OUT_OF_RANGE'; END IF;

  UPDATE public.time_clock_days day SET status = 'needs_review',
    incident_codes = array_append(day.incident_codes, 'missing_checkout'), updated_at = now()
  WHERE day.company_id = _company_id AND day.status IN ('open', 'on_break')
    AND day.first_clock_in < now() - interval '24 hours'
    AND NOT ('missing_checkout' = ANY(day.incident_codes))
    AND (day.operation_center_id IS NULL OR public.check_center_access(_company_id, day.operation_center_id));

  FOR employee_row IN
    SELECT employee.id AS employee_id, cycle.id AS cycle_id, info.operation_center_id
    FROM public.employees_v2 employee
    JOIN public.employee_employment_cycles cycle ON cycle.employee_id = employee.id AND cycle.status = 'active'
    JOIN public.employee_work_info info ON info.employee_id = employee.id AND info.employment_cycle_id = cycle.id AND info.is_current
    WHERE employee.company_id = _company_id AND employee.is_active
      AND public.check_center_access(_company_id, info.operation_center_id)
  LOOP
    schedule_row := NULL;
    SELECT shift.name, shift.start_time, shift.end_time, shift.break_minutes, shift.crosses_midnight, shift.is_rest_day
    INTO schedule_row FROM public.employee_shift_assignments assignment
    JOIN public.shifts shift ON shift.id = assignment.shift_id
    WHERE assignment.employee_id = employee_row.employee_id AND assignment.assignment_date = _work_date LIMIT 1;

    IF NOT FOUND THEN
      SELECT schedule.name, schedule.start_time, schedule.end_time, schedule.break_minutes,
        schedule.end_time <= schedule.start_time AS crosses_midnight, false AS is_rest_day
      INTO schedule_row FROM public.employee_time_config config
      JOIN public.work_schedules schedule ON schedule.id = config.work_schedule_id
      WHERE config.employee_id = employee_row.employee_id AND config.employment_cycle_id IS NOT DISTINCT FROM employee_row.cycle_id
        AND config.is_active AND config.mode = 'administrative' AND config.start_date <= _work_date
        AND (config.end_date IS NULL OR config.end_date >= _work_date)
        AND extract(dow FROM _work_date)::integer = ANY(schedule.days_of_week)
      ORDER BY config.start_date DESC LIMIT 1;
    END IF;

    IF schedule_row.name IS NULL OR schedule_row.is_rest_day THEN CONTINUE; END IF;
    expected_start_value := (_work_date + schedule_row.start_time) AT TIME ZONE 'America/Bogota';
    expected_end_value := (_work_date + schedule_row.end_time + CASE WHEN schedule_row.crosses_midnight THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'America/Bogota';
    IF expected_end_value >= now() THEN CONTINUE; END IF;

    incident := CASE WHEN
      EXISTS (SELECT 1 FROM public.vacation_requests vacation WHERE vacation.employee_id = employee_row.employee_id AND _work_date BETWEEN vacation.start_date AND vacation.end_date AND vacation.status::text = 'aprobado')
      OR EXISTS (SELECT 1 FROM public.leave_requests leave_request WHERE leave_request.employee_id = employee_row.employee_id AND _work_date BETWEEN leave_request.start_date AND leave_request.end_date AND leave_request.status::text = 'aprobado')
      OR EXISTS (SELECT 1 FROM public.employee_incapacities incapacity WHERE incapacity.employee_id = employee_row.employee_id AND _work_date BETWEEN incapacity.start_date AND incapacity.end_date)
      THEN 'justified_absence' ELSE 'absence' END;

    INSERT INTO public.time_clock_days(company_id, employee_id, employment_cycle_id, operation_center_id, work_date,
      schedule_name, expected_start, expected_end, scheduled_break_minutes, status, incident_codes)
    VALUES(_company_id, employee_row.employee_id, employee_row.cycle_id, employee_row.operation_center_id, _work_date,
      schedule_row.name, expected_start_value, expected_end_value, coalesce(schedule_row.break_minutes, 0),
      CASE WHEN incident = 'absence' THEN 'needs_review' ELSE 'complete' END, ARRAY[incident])
    ON CONFLICT (employee_id, employment_cycle_id, work_date) DO NOTHING;
    IF FOUND THEN inserted_count := inserted_count + 1; END IF;
  END LOOP;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.time_clock_resolve_correction(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE request_row public.time_clock_correction_requests%ROWTYPE; actor_id uuid := (SELECT auth.uid()); day_id_value uuid; event_id_value uuid;
BEGIN
  SELECT * INTO request_row FROM public.time_clock_correction_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending' THEN RAISE EXCEPTION 'CORRECTION_NOT_PENDING'; END IF;
  IF actor_id = request_row.requested_by OR public.time_clock_is_self(request_row.employee_id) THEN RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED'; END IF;
  IF NOT (public.time_clock_can(request_row.company_id, 'approve') AND public.has_employee_v2_access(request_row.employee_id)) THEN
    RAISE EXCEPTION 'APPROVAL_NOT_ALLOWED';
  END IF;
  UPDATE public.time_clock_correction_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = actor_id, reviewed_at = now(), review_notes = nullif(btrim(_notes), ''), updated_at = now()
  WHERE id = _request_id;
  IF _approve THEN
    INSERT INTO public.time_clock_days(company_id, employee_id, employment_cycle_id, operation_center_id, work_date, status)
    VALUES(request_row.company_id, request_row.employee_id, request_row.employment_cycle_id, request_row.operation_center_id,
      (request_row.requested_at AT TIME ZONE 'America/Bogota')::date, 'needs_review')
    ON CONFLICT (employee_id, employment_cycle_id, work_date) DO UPDATE SET updated_at = now()
    RETURNING id INTO day_id_value;
    INSERT INTO public.time_clock_events(company_id, day_id, employee_id, employment_cycle_id, operation_center_id,
      action, source, occurred_at, recorded_by, supervisor_reason, idempotency_key, supersedes_event_id)
    VALUES(request_row.company_id, day_id_value, request_row.employee_id, request_row.employment_cycle_id, request_row.operation_center_id,
      request_row.requested_action, 'correction', request_row.requested_at, actor_id, request_row.reason, gen_random_uuid(), request_row.event_id)
    RETURNING id INTO event_id_value;
    PERFORM public.time_clock_recalculate_day(day_id_value);
  END IF;
  RETURN jsonb_build_object('request_id', _request_id, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, 'event_id', event_id_value);
END;
$$;

REVOKE ALL ON FUNCTION public.time_clock_is_self(uuid), public.time_clock_can(uuid,text),
  public.time_clock_distance_m(double precision,double precision,double precision,double precision),
  public.time_clock_recalculate_day(uuid), public.time_clock_issue_qr(uuid),
  public.time_clock_register_event(text,uuid,double precision,double precision,double precision,timestamptz,text,text,uuid,text,uuid),
  public.time_clock_request_correction(text,timestamptz,text,uuid),
  public.time_clock_refresh_absences(uuid,date),
  public.time_clock_resolve_correction(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.time_clock_is_self(uuid), public.time_clock_can(uuid,text),
  public.time_clock_issue_qr(uuid),
  public.time_clock_register_event(text,uuid,double precision,double precision,double precision,timestamptz,text,text,uuid,text,uuid),
  public.time_clock_request_correction(text,timestamptz,text,uuid),
  public.time_clock_refresh_absences(uuid,date),
  public.time_clock_resolve_correction(uuid,boolean,text) TO authenticated;

COMMENT ON TABLE public.time_clock_events IS 'Immutable attendance evidence; changes are appended as reviewed corrections.';
