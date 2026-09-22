-- Attendance-only credentials and public entry points. No payroll writes.
CREATE SCHEMA IF NOT EXISTS time_clock_private;
REVOKE ALL ON SCHEMA time_clock_private FROM PUBLIC, anon, authenticated;
CREATE TABLE time_clock_private.secrets (key text PRIMARY KEY, value text NOT NULL);
INSERT INTO time_clock_private.secrets VALUES ('links', encode(extensions.gen_random_bytes(32),'hex'));
CREATE TABLE time_clock_private.credentials (
  employee_id uuid PRIMARY KEY REFERENCES public.employees_v2(id),
  pin_hash text NOT NULL, must_change boolean NOT NULL DEFAULT true,
  expires_at timestamptz, version integer NOT NULL DEFAULT 1,
  issued_by uuid NOT NULL REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE time_clock_private.links (
  point_id uuid PRIMARY KEY REFERENCES public.time_clock_points(id),
  version uuid NOT NULL DEFAULT gen_random_uuid(), token_hash bytea NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE time_clock_private.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash bytea NOT NULL UNIQUE,
  point_id uuid NOT NULL REFERENCES public.time_clock_points(id),
  link_version uuid, method text NOT NULL CHECK(method IN ('qr_static','qr_dynamic')),
  employee_id uuid REFERENCES public.employees_v2(id), credential_version integer,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  consumed_at timestamptz, event_id uuid REFERENCES public.time_clock_events(id),
  idempotency_key uuid
);
CREATE TABLE time_clock_private.attempts (bucket text PRIMARY KEY, failures integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE INDEX time_clock_sessions_expiry ON time_clock_private.sessions(expires_at);
CREATE INDEX time_clock_sessions_employee ON time_clock_private.sessions(employee_id);
CREATE INDEX time_clock_sessions_point ON time_clock_private.sessions(point_id);
CREATE INDEX time_clock_document_lookup ON public.employees_v2(company_id,(regexp_replace(document_number,'[^0-9]','','g'))) WHERE is_active;
ALTER TABLE time_clock_private.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_private.credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_private.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_private.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_clock_private.attempts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.time_clock_center_settings (
  operation_center_id uuid PRIMARY KEY REFERENCES public.operation_centers(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  tracking_start_date date NOT NULL, enabled boolean NOT NULL DEFAULT false,
  last_scan_date date, updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_clock_center_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.time_clock_center_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.time_clock_center_settings TO authenticated;
CREATE POLICY "Attendance settings in scope" ON public.time_clock_center_settings FOR SELECT TO authenticated
USING (public.time_clock_can(company_id,'view') AND public.check_center_access(company_id,operation_center_id));

ALTER TABLE public.time_clock_days DROP CONSTRAINT time_clock_days_status_check;
ALTER TABLE public.time_clock_days ADD CONSTRAINT time_clock_days_status_check CHECK(status IN ('scheduled','open','on_break','complete','needs_review'));
ALTER TABLE public.time_clock_days ADD COLUMN policy_snapshot jsonb;
ALTER TABLE public.time_clock_events ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE public.time_clock_events ADD COLUMN identity_method text NOT NULL DEFAULT 'portal' CHECK(identity_method IN ('portal','pin','supervisor','correction'));
ALTER TABLE public.time_clock_events ADD COLUMN qr_kind text CHECK(qr_kind IN ('qr_static','qr_dynamic'));
ALTER TABLE public.time_clock_events ADD CONSTRAINT time_clock_event_actor CHECK(recorded_by IS NOT NULL OR identity_method='pin');
CREATE UNIQUE INDEX time_clock_employee_idempotency ON public.time_clock_events(employee_id,idempotency_key);
CREATE UNIQUE INDEX time_clock_one_replacement ON public.time_clock_events(supersedes_event_id) WHERE supersedes_event_id IS NOT NULL;
ALTER TABLE public.time_clock_correction_requests ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE public.time_clock_correction_requests ADD COLUMN identity_method text NOT NULL DEFAULT 'portal' CHECK(identity_method IN ('portal','pin'));
ALTER TABLE public.time_clock_correction_requests ADD COLUMN target_work_date date;
ALTER TABLE public.time_clock_correction_requests ADD COLUMN reviewer_name text;
ALTER TABLE public.time_clock_correction_requests ADD CONSTRAINT time_clock_request_actor CHECK(requested_by IS NOT NULL OR identity_method='pin');

CREATE FUNCTION time_clock_private.allowed_employee(_employee uuid, _point uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.employees_v2 e
 JOIN public.employee_employment_cycles c ON c.employee_id=e.id AND c.status='active'
 JOIN public.time_clock_points p ON p.id=_point AND p.company_id=e.company_id AND p.is_active
 WHERE e.id=_employee AND e.is_active AND (
 EXISTS(SELECT 1 FROM public.employee_work_info w WHERE w.employee_id=e.id AND w.employment_cycle_id=c.id AND w.is_current AND w.operation_center_id=p.operation_center_id)
 OR EXISTS(SELECT 1 FROM public.employee_operation_center_assignments a WHERE a.employee_id=e.id AND a.employment_cycle_id=c.id AND a.operation_center_id=p.operation_center_id)));
$$;

CREATE FUNCTION public.time_clock_manage_link(_point_id uuid, _action text DEFAULT 'get') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.time_clock_points%ROWTYPE; l time_clock_private.links%ROWTYPE; token text; secret text;
BEGIN
 SELECT * INTO p FROM public.time_clock_points WHERE id=_point_id FOR UPDATE;
 IF auth.uid() IS NULL OR p.id IS NULL OR NOT public.time_clock_can(p.company_id,'update') OR NOT public.check_center_access(p.company_id,p.operation_center_id) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 IF _action NOT IN ('get','regenerate','disable','enable') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
 SELECT * INTO l FROM time_clock_private.links WHERE point_id=p.id;
 SELECT value INTO secret FROM time_clock_private.secrets WHERE key='links';
 IF l.point_id IS NULL OR _action='regenerate' THEN
   l.version:=gen_random_uuid();
   token:=encode(extensions.hmac(p.id::text||l.version::text,secret,'sha256'),'hex');
   INSERT INTO time_clock_private.links(point_id,version,token_hash,enabled) VALUES(p.id,l.version,extensions.digest(token,'sha256'),true)
   ON CONFLICT(point_id) DO UPDATE SET version=excluded.version,token_hash=excluded.token_hash,enabled=true;
   DELETE FROM time_clock_private.sessions WHERE point_id=p.id AND method='qr_static';
 END IF;
 IF _action IN ('disable','enable') THEN UPDATE time_clock_private.links SET enabled=(_action='enable') WHERE point_id=p.id; END IF;
 IF _action='disable' THEN DELETE FROM time_clock_private.sessions WHERE point_id=p.id AND method='qr_static'; END IF;
 SELECT * INTO l FROM time_clock_private.links WHERE point_id=p.id;
 token:=encode(extensions.hmac(p.id::text||l.version::text,secret,'sha256'),'hex');
 IF _action<>'get' THEN INSERT INTO public.audit_logs(user_id,company_id,action,entity_type,entity_id,entity_name) VALUES(auth.uid(),p.company_id,'update','time_clock_link',p.id,_action); END IF;
 RETURN jsonb_build_object('token',token,'enabled',l.enabled);
END; $$;

CREATE FUNCTION public.time_clock_issue_pin(_employee_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.employees_v2%ROWTYPE; pin text;
BEGIN
 SELECT * INTO e FROM public.employees_v2 WHERE id=_employee_id AND is_active FOR UPDATE;
 IF auth.uid() IS NULL OR e.id IS NULL OR NOT public.time_clock_can(e.company_id,'update') OR NOT public.has_employee_v2_access(e.id) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 pin:=lpad(((('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint)%1000000)::text,6,'0');
 INSERT INTO time_clock_private.credentials(employee_id,pin_hash,expires_at,issued_by) VALUES(e.id,extensions.crypt(pin,extensions.gen_salt('bf',10)),now()+interval '48 hours',auth.uid())
 ON CONFLICT(employee_id) DO UPDATE SET pin_hash=excluded.pin_hash,must_change=true,expires_at=excluded.expires_at,version=time_clock_private.credentials.version+1,issued_by=auth.uid(),updated_at=now();
 DELETE FROM time_clock_private.sessions WHERE employee_id=e.id;
 INSERT INTO public.audit_logs(user_id,company_id,action,entity_type,entity_id,entity_name) VALUES(auth.uid(),e.company_id,'update','time_clock_pin',e.id,'PIN temporal emitido');
 RETURN jsonb_build_object('pin',pin,'expires_at',now()+interval '48 hours');
END; $$;

CREATE FUNCTION public.time_clock_access_list(_company_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.time_clock_can(_company_id,'update') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',e.id,'name',concat_ws(' ',e.first_name,e.last_name),'document',e.document_number,'status',CASE WHEN c.employee_id IS NULL THEN 'Sin PIN' WHEN c.expires_at<now() THEN 'Temporal vencido' WHEN c.must_change THEN 'Pendiente de activación' ELSE 'Activo' END) ORDER BY e.first_name),'[]') FROM public.employees_v2 e LEFT JOIN time_clock_private.credentials c ON c.employee_id=e.id WHERE e.company_id=_company_id AND e.is_active AND public.has_employee_v2_access(e.id));
END; $$;

CREATE FUNCTION public.time_clock_configure_center(_center_id uuid, _start_date date, _enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE company uuid;
BEGIN
 SELECT company_id INTO company FROM public.operation_centers WHERE id=_center_id;
 IF auth.uid() IS NULL OR company IS NULL OR NOT public.time_clock_can(company,'update') OR NOT public.check_center_access(company,_center_id) THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 IF _start_date IS NULL OR _start_date<(now() AT TIME ZONE 'America/Bogota')::date-366 THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
 INSERT INTO public.time_clock_center_settings(operation_center_id,company_id,tracking_start_date,enabled) VALUES(_center_id,company,_start_date,_enabled)
 ON CONFLICT(operation_center_id) DO UPDATE SET tracking_start_date=excluded.tracking_start_date,enabled=excluded.enabled,last_scan_date=NULL,updated_at=now();
 INSERT INTO public.audit_logs(user_id,company_id,action,entity_type,entity_id,entity_name,new_values) VALUES(auth.uid(),company,'update','time_clock_tracking',_center_id,'Seguimiento de asistencia',jsonb_build_object('start_date',_start_date,'enabled',_enabled));
END; $$;

-- A public Edge Function is the only caller of this RPC. All authority comes from
-- hashed short-lived sessions, never from employee or company IDs in the request.
CREATE FUNCTION public.time_clock_public(_action text, _body jsonb, _ip_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.time_clock_points%ROWTYPE; l time_clock_private.links%ROWTYPE; s time_clock_private.sessions%ROWTYPE;
 e public.employees_v2%ROWTYPE; c time_clock_private.credentials%ROWTYPE;
 token text; doc text; v_bucket text; last_action text; result jsonb; cycle uuid; correction_id uuid; target_date date; old_event public.time_clock_events%ROWTYPE;
BEGIN
 IF _action='context' THEN
   IF nullif(_body->>'point','') IS NOT NULL THEN
     SELECT point.* INTO p FROM public.time_clock_points point JOIN public.time_clock_qr_sessions q ON q.point_id=point.id
     WHERE point.id=(_body->>'point')::uuid AND point.is_active AND q.expires_at>=now() AND q.token_hash=extensions.digest(coalesce(_body->>'token',''),'sha256');
   ELSE
     SELECT * INTO l FROM time_clock_private.links WHERE token_hash=extensions.digest(coalesce(_body->>'token',''),'sha256') AND enabled;
     SELECT * INTO p FROM public.time_clock_points WHERE id=l.point_id AND is_active;
   END IF;
   IF p.id IS NULL THEN RETURN jsonb_build_object('error','LINK_UNAVAILABLE'); END IF;
   -- Bound allocation of anonymous challenges; IP is hashed by the trusted gateway.
   v_bucket:='context:'||_ip_hash;
   INSERT INTO time_clock_private.attempts VALUES(v_bucket,1,now()+interval '5 minutes') ON CONFLICT(bucket) DO UPDATE SET failures=CASE WHEN time_clock_private.attempts.resets_at<now() THEN 1 ELSE time_clock_private.attempts.failures+1 END,resets_at=CASE WHEN time_clock_private.attempts.resets_at<now() THEN now()+interval '5 minutes' ELSE time_clock_private.attempts.resets_at END;
   IF (SELECT failures>300 FROM time_clock_private.attempts WHERE attempts.bucket=v_bucket) THEN RETURN jsonb_build_object('error','RATE_LIMITED'); END IF;
   token:=encode(extensions.gen_random_bytes(32),'hex');
   INSERT INTO time_clock_private.sessions(token_hash,point_id,link_version,method) VALUES(extensions.digest(token,'sha256'),p.id,l.version,CASE WHEN l.point_id IS NULL THEN 'qr_dynamic' ELSE 'qr_static' END);
   RETURN jsonb_build_object('challenge',token,'expires_at',now()+interval '5 minutes','company',(SELECT name FROM public.companies WHERE id=p.company_id),'point',p.name,'center',(SELECT name FROM public.operation_centers WHERE id=p.operation_center_id));
 END IF;
 SELECT * INTO s FROM time_clock_private.sessions WHERE token_hash=extensions.digest(coalesce(_body->>'session',''),'sha256') FOR UPDATE;
 IF s.id IS NULL OR s.expires_at<now() THEN RETURN jsonb_build_object('error','SESSION_EXPIRED'); END IF;
 SELECT * INTO p FROM public.time_clock_points WHERE id=s.point_id AND is_active;
 IF p.id IS NULL OR (s.method='qr_static' AND NOT EXISTS(SELECT 1 FROM time_clock_private.links WHERE point_id=p.id AND enabled AND version=s.link_version)) THEN RETURN jsonb_build_object('error','LINK_UNAVAILABLE'); END IF;
 IF _action='identify' THEN
   IF s.employee_id IS NOT NULL OR s.consumed_at IS NOT NULL THEN RETURN jsonb_build_object('error','SESSION_EXPIRED'); END IF;
   doc:=regexp_replace(coalesce(_body->>'document',''),'[^0-9]','','g');
   IF length(doc)<3 OR length(doc)>25 OR coalesce(_body->>'pin','') !~ '^[0-9]{6}$' THEN RETURN jsonb_build_object('error','INVALID_CREDENTIALS'); END IF;
   -- Serialize both account and IP attempts across challenges and processes.
   PERFORM pg_advisory_xact_lock(hashtextextended('pin-ip:'||_ip_hash,0));
   v_bucket:='doc:'||p.company_id::text||':'||encode(extensions.digest(doc,'sha256'),'hex');
   PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket,0));
   IF EXISTS(SELECT 1 FROM time_clock_private.attempts a WHERE a.resets_at>now() AND ((a.bucket=v_bucket AND a.failures>=5) OR (a.bucket='ip:'||_ip_hash AND a.failures>=50))) THEN RETURN jsonb_build_object('error','RATE_LIMITED'); END IF;
   SELECT * INTO e FROM public.employees_v2 WHERE company_id=p.company_id AND is_active AND regexp_replace(document_number,'[^0-9]','','g')=doc;
   SELECT * INTO c FROM time_clock_private.credentials WHERE employee_id=e.id;
   IF c.employee_id IS NULL OR (c.expires_at IS NOT NULL AND c.expires_at<now()) OR extensions.crypt(_body->>'pin',c.pin_hash)<>c.pin_hash OR NOT time_clock_private.allowed_employee(e.id,p.id) THEN
     INSERT INTO time_clock_private.attempts VALUES(v_bucket,1,now()+interval '15 minutes'),('ip:'||_ip_hash,1,now()+interval '15 minutes') ON CONFLICT(bucket) DO UPDATE SET failures=CASE WHEN time_clock_private.attempts.resets_at<now() THEN 1 ELSE time_clock_private.attempts.failures+1 END,resets_at=CASE WHEN time_clock_private.attempts.resets_at<now() THEN now()+interval '15 minutes' ELSE time_clock_private.attempts.resets_at END;
     RETURN jsonb_build_object('error','INVALID_CREDENTIALS');
   END IF;
   DELETE FROM time_clock_private.attempts a WHERE a.bucket=v_bucket;
   token:=encode(extensions.gen_random_bytes(32),'hex');
   UPDATE time_clock_private.sessions SET employee_id=e.id,credential_version=c.version,token_hash=extensions.digest(token,'sha256') WHERE id=s.id;
   RETURN jsonb_build_object('session',token,'expires_at',s.expires_at,'must_change',c.must_change,'name',concat_ws(' ',e.first_name,e.last_name));
 END IF;
 SELECT * INTO c FROM time_clock_private.credentials WHERE employee_id=s.employee_id FOR UPDATE;
 IF c.employee_id IS NULL OR c.version<>s.credential_version OR NOT time_clock_private.allowed_employee(s.employee_id,p.id) THEN RETURN jsonb_build_object('error','SESSION_EXPIRED'); END IF;
 IF s.consumed_at IS NOT NULL THEN
   IF _action='punch' AND s.idempotency_key=(_body->>'idempotency_key')::uuid THEN
     RETURN (SELECT jsonb_build_object('event_id',id,'occurred_at',occurred_at,'action',action,'duplicate',true) FROM public.time_clock_events WHERE id=s.event_id);
   END IF;
   RETURN jsonb_build_object('error','SESSION_EXPIRED');
 END IF;
 IF _action='change_pin' THEN
   IF coalesce(_body->>'pin','') !~ '^[0-9]{6}$' OR extensions.crypt(_body->>'pin',c.pin_hash)=c.pin_hash THEN RETURN jsonb_build_object('error','INVALID_NEW_PIN'); END IF;
   UPDATE time_clock_private.credentials SET pin_hash=extensions.crypt(_body->>'pin',extensions.gen_salt('bf',10)),must_change=false,expires_at=NULL,version=version+1,updated_at=now() WHERE employee_id=s.employee_id;
   UPDATE time_clock_private.sessions SET credential_version=c.version+1 WHERE id=s.id;
   DELETE FROM time_clock_private.sessions WHERE employee_id=s.employee_id AND id<>s.id;
   RETURN jsonb_build_object('success',true);
 END IF;
 IF c.must_change THEN RETURN jsonb_build_object('error','PIN_CHANGE_REQUIRED'); END IF;
 IF _action='history' THEN
   SELECT action INTO last_action FROM public.time_clock_events ev WHERE employee_id=s.employee_id AND NOT EXISTS(SELECT 1 FROM public.time_clock_events newer WHERE newer.supersedes_event_id=ev.id) ORDER BY occurred_at DESC,created_at DESC LIMIT 1;
   RETURN jsonb_build_object('last_action',last_action,'require_break_punches',p.require_break_punches,
    'events',(SELECT coalesce(jsonb_agg(x ORDER BY x.occurred_at DESC),'[]') FROM (SELECT ev.id,ev.day_id,ev.action,ev.occurred_at,ev.source,ev.supersedes_event_id,d.work_date FROM public.time_clock_events ev JOIN public.time_clock_days d ON d.id=ev.day_id WHERE ev.employee_id=s.employee_id AND ev.occurred_at>=now()-interval '30 days') x),
    'corrections',(SELECT coalesce(jsonb_agg(x ORDER BY x.created_at DESC),'[]') FROM (SELECT id,requested_action,requested_at,reason,status,review_notes,created_at FROM public.time_clock_correction_requests WHERE employee_id=s.employee_id AND created_at>=now()-interval '30 days') x));
 ELSIF _action='punch' THEN
   result:=time_clock_private.register_event(_body->>'action',p.id,(_body->>'latitude')::double precision,(_body->>'longitude')::double precision,(_body->>'accuracy')::double precision,(_body->>'position_captured_at')::timestamptz,'qr',NULL,s.employee_id,NULL,(_body->>'idempotency_key')::uuid,NULL,s.method);
   UPDATE time_clock_private.sessions SET consumed_at=now(),event_id=(result->>'event_id')::uuid,idempotency_key=(_body->>'idempotency_key')::uuid WHERE id=s.id;
   RETURN result;
 ELSIF _action='correction' THEN
   IF coalesce(_body->>'action','') NOT IN ('clock_in','clock_out','break_start','break_end') OR length(btrim(coalesce(_body->>'reason','')))<5 OR length(_body->>'reason')>1000 OR (_body->>'requested_at')::timestamptz<now()-interval '30 days' OR (_body->>'requested_at')::timestamptz>now() OR nullif(_body->>'requested_at','') IS NULL THEN RAISE EXCEPTION 'INVALID_CORRECTION'; END IF;
   SELECT id INTO cycle FROM public.employee_employment_cycles WHERE employee_id=s.employee_id AND status='active';
   target_date:=(_body->>'work_date')::date;
   IF target_date IS NULL OR target_date<((now() AT TIME ZONE 'America/Bogota')::date-30) OR target_date>((now() AT TIME ZONE 'America/Bogota')::date) OR ((_body->>'requested_at')::timestamptz AT TIME ZONE 'America/Bogota')::date NOT BETWEEN target_date AND target_date+1 THEN RAISE EXCEPTION 'INVALID_CORRECTION'; END IF;
   IF nullif(_body->>'event_id','') IS NOT NULL THEN
     SELECT * INTO old_event FROM public.time_clock_events WHERE id=(_body->>'event_id')::uuid AND employee_id=s.employee_id AND employment_cycle_id=cycle;
     IF old_event.id IS NULL THEN RAISE EXCEPTION 'INVALID_CORRECTION'; END IF;
     SELECT work_date INTO target_date FROM public.time_clock_days WHERE id=old_event.day_id;
   END IF;
   IF (SELECT count(*) FROM public.time_clock_correction_requests WHERE employee_id=s.employee_id AND created_at>now()-interval '1 hour')>=10 THEN RETURN jsonb_build_object('error','RATE_LIMITED'); END IF;
   INSERT INTO public.time_clock_correction_requests(company_id,employee_id,employment_cycle_id,operation_center_id,event_id,requested_action,requested_at,reason,requested_by,identity_method,target_work_date)
   VALUES(p.company_id,s.employee_id,cycle,p.operation_center_id,old_event.id,_body->>'action',(_body->>'requested_at')::timestamptz,btrim(_body->>'reason'),NULL,'pin',target_date) RETURNING id INTO correction_id;
   RETURN jsonb_build_object('id',correction_id);
 END IF;
 RETURN jsonb_build_object('error','INVALID_ACTION');
END; $$;

REVOKE ALL ON FUNCTION public.time_clock_public(text,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.time_clock_public(text,jsonb,text) TO service_role;
REVOKE ALL ON FUNCTION public.time_clock_manage_link(uuid,text),public.time_clock_issue_pin(uuid),public.time_clock_access_list(uuid),public.time_clock_configure_center(uuid,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.time_clock_manage_link(uuid,text),public.time_clock_issue_pin(uuid),public.time_clock_access_list(uuid),public.time_clock_configure_center(uuid,date,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION time_clock_private.register_event(
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
  _idempotency_key uuid DEFAULT gen_random_uuid(),
  _actor uuid DEFAULT NULL, _qr_kind text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor_id uuid := _actor;
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
  IF actor_id IS NULL AND _qr_kind IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _action IS NULL OR _source IS NULL OR _idempotency_key IS NULL THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF _action NOT IN ('clock_in', 'break_start', 'break_end', 'clock_out') THEN RAISE EXCEPTION 'INVALID_ACTION'; END IF;
  IF _source NOT IN ('qr', 'web', 'supervised') THEN RAISE EXCEPTION 'INVALID_SOURCE'; END IF;


  IF is_supervised THEN
    target_employee := _employee_id;
    IF target_employee IS NULL OR char_length(btrim(coalesce(_supervisor_reason, ''))) < 5 THEN
      RAISE EXCEPTION 'SUPERVISOR_REASON_REQUIRED';
    END IF;
  ELSIF _qr_kind IS NOT NULL THEN
    target_employee := _employee_id;
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
  SELECT id INTO event_id_value FROM public.time_clock_events WHERE employee_id=target_employee AND idempotency_key=_idempotency_key;
  IF event_id_value IS NOT NULL THEN RETURN (SELECT jsonb_build_object('event_id',id,'day_id',day_id,'occurred_at',occurred_at,'action',action,'duplicate',true) FROM public.time_clock_events WHERE id=event_id_value); END IF;
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
    IF _latitude NOT BETWEEN -90 AND 90 OR _longitude NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'LOCATION_REQUIRED'; END IF;
    distance_value := public.time_clock_distance_m(_latitude, _longitude, point_row.latitude, point_row.longitude);
    IF distance_value > point_row.radius_meters THEN RAISE EXCEPTION 'OUTSIDE_ALLOWED_AREA'; END IF;
    IF _source = 'qr' AND _qr_kind IS NULL AND NOT EXISTS (
      SELECT 1 FROM public.time_clock_qr_sessions session
      WHERE session.point_id = _point_id AND session.expires_at >= now()
        AND session.token_hash = extensions.digest(coalesce(_qr_token, ''), 'sha256')
    ) THEN RAISE EXCEPTION 'QR_EXPIRED_OR_INVALID'; END IF;
    center_id := point_row.operation_center_id;
  END IF;

  SELECT id INTO day_id_value FROM public.time_clock_days
  WHERE employee_id = target_employee AND employment_cycle_id IS NOT DISTINCT FROM cycle_id
    AND (status IN ('open', 'on_break') OR (status='needs_review' AND first_clock_in IS NOT NULL AND last_clock_out IS NULL)) ORDER BY work_date DESC LIMIT 1 FOR UPDATE;

  IF day_id_value IS NULL THEN
    INSERT INTO public.time_clock_days(company_id, employee_id, employment_cycle_id, operation_center_id, work_date)
    VALUES (employee_row.company_id, target_employee, cycle_id, center_id, work_date_value)
    ON CONFLICT (employee_id, employment_cycle_id, work_date) DO UPDATE SET updated_at = now()
    RETURNING id INTO day_id_value;
  END IF;

  SELECT action INTO last_action FROM public.time_clock_events ev
  WHERE day_id = day_id_value AND NOT EXISTS(SELECT 1 FROM public.time_clock_events newer WHERE newer.supersedes_event_id=ev.id) ORDER BY occurred_at DESC, created_at DESC LIMIT 1;
  IF NOT is_supervised AND _action='break_start' AND NOT coalesce((SELECT (policy_snapshot->>'require_break_punches')::boolean FROM public.time_clock_days WHERE id=day_id_value),point_row.require_break_punches,false) THEN
    RAISE EXCEPTION 'BREAK_PUNCHES_DISABLED';
  END IF;
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
    location_verified, qr_verified, recorded_by, supervisor_reason, idempotency_key, identity_method, qr_kind
  ) VALUES (
    employee_row.company_id, day_id_value, target_employee, cycle_id, center_id, _point_id,
    _action, _source, _latitude, _longitude, _accuracy_meters, distance_value,
    NOT is_supervised, _source = 'qr', actor_id, nullif(btrim(_supervisor_reason), ''), _idempotency_key, CASE WHEN _qr_kind IS NOT NULL THEN 'pin' WHEN is_supervised THEN 'supervisor' ELSE 'portal' END, _qr_kind
  ) RETURNING id INTO event_id_value;

  UPDATE public.time_clock_days SET policy_snapshot=coalesce(policy_snapshot,jsonb_build_object('point_id',_point_id,'late_tolerance_minutes',coalesce(point_row.late_tolerance_minutes,5),'require_break_punches',coalesce(point_row.require_break_punches,false))) WHERE id=day_id_value;
  PERFORM public.time_clock_recalculate_day(day_id_value);
  -- PIN actors are recorded in the immutable event itself, without inventing an auth user.
  IF actor_id IS NOT NULL THEN
  INSERT INTO public.audit_logs(user_id, user_email, company_id, action, entity_type, entity_id, entity_name, new_values)
  VALUES (actor_id, coalesce((SELECT auth.jwt() ->> 'email'), ''), employee_row.company_id,
    'create', 'time_clock_event', event_id_value, _action,
    jsonb_build_object('employee_id', target_employee, 'source', _source, 'location_verified', NOT is_supervised, 'qr_verified', _source = 'qr'));
  END IF;

  RETURN jsonb_build_object('event_id', event_id_value, 'day_id', day_id_value,
    'occurred_at', now(), 'action', _action, 'duplicate', false);
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
BEGIN
 RETURN time_clock_private.register_event(_action,_point_id,_latitude,_longitude,_accuracy_meters,_position_captured_at,_source,_qr_token,_employee_id,_supervisor_reason,_idempotency_key,auth.uid(),NULL);
END; $$;
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
  day_status text := 'scheduled';
  previous_action text; invalid_sequence boolean:=false;
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
        AND config.employment_cycle_id IS NOT DISTINCT FROM day_row.employment_cycle_id
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
    SELECT action, occurred_at FROM public.time_clock_events ev
    WHERE day_id = _day_id AND NOT EXISTS(SELECT 1 FROM public.time_clock_events newer WHERE newer.supersedes_event_id=ev.id) ORDER BY occurred_at, created_at
  LOOP
    IF NOT (event_row.action = ANY(CASE previous_action WHEN 'clock_in' THEN ARRAY['break_start','clock_out'] WHEN 'break_start' THEN ARRAY['break_end'] WHEN 'break_end' THEN ARRAY['break_start','clock_out'] ELSE ARRAY['clock_in'] END)) THEN invalid_sequence:=true; END IF;
    previous_action:=event_row.action;
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

  tolerance_minutes:=coalesce((day_row.policy_snapshot->>'late_tolerance_minutes')::integer,5);

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

  IF day_status = 'complete' AND NOT coalesce((day_row.policy_snapshot->>'require_break_punches')::boolean,false) AND break_seconds = 0 AND day_row.scheduled_break_minutes > 0 THEN
    work_seconds := greatest(0, work_seconds - day_row.scheduled_break_minutes * 60);
    break_seconds := day_row.scheduled_break_minutes * 60;
  END IF;

  IF invalid_sequence THEN incidents:=array_append(incidents,'invalid_sequence'); day_status:='needs_review'; END IF;
  IF day_status='complete' AND coalesce((day_row.policy_snapshot->>'require_break_punches')::boolean,false) AND day_row.scheduled_break_minutes>0 AND break_seconds=0 THEN incidents:=array_append(incidents,'missing_break'); day_status:='needs_review'; END IF;
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
CREATE OR REPLACE FUNCTION public.time_clock_resolve_correction(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE request_row public.time_clock_correction_requests%ROWTYPE; actor_id uuid := (SELECT auth.uid()); day_id_value uuid; event_id_value uuid;
BEGIN
  IF auth.uid() IS NULL OR length(btrim(coalesce(_notes,'')))<5 THEN RAISE EXCEPTION 'REVIEW_NOTES_REQUIRED'; END IF;
  SELECT * INTO request_row FROM public.time_clock_correction_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'pending' THEN RAISE EXCEPTION 'CORRECTION_NOT_PENDING'; END IF;
  IF actor_id = request_row.requested_by OR public.time_clock_is_self(request_row.employee_id) THEN RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED'; END IF;
  IF NOT (public.time_clock_can(request_row.company_id, 'approve') AND public.has_employee_v2_access(request_row.employee_id)) THEN
    RAISE EXCEPTION 'APPROVAL_NOT_ALLOWED';
  END IF;
  PERFORM 1 FROM public.employees_v2 WHERE id=request_row.employee_id FOR UPDATE;
  IF request_row.event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.time_clock_events WHERE supersedes_event_id=request_row.event_id) THEN RAISE EXCEPTION 'EVENT_ALREADY_CORRECTED'; END IF;
  UPDATE public.time_clock_correction_requests SET status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = actor_id, reviewer_name = coalesce((SELECT coalesce(nullif(full_name,''),display_name) FROM public.user_profiles WHERE id=actor_id),'Responsable autorizado'), reviewed_at = now(), review_notes = nullif(btrim(_notes), ''), updated_at = now()
  WHERE id = _request_id;
  IF _approve THEN
    INSERT INTO public.time_clock_days(company_id, employee_id, employment_cycle_id, operation_center_id, work_date, status)
    VALUES(request_row.company_id, request_row.employee_id, request_row.employment_cycle_id, request_row.operation_center_id,
      coalesce((SELECT d.work_date FROM public.time_clock_events ev JOIN public.time_clock_days d ON d.id=ev.day_id WHERE ev.id=request_row.event_id), request_row.target_work_date, (SELECT d.work_date FROM public.time_clock_days d WHERE d.employee_id=request_row.employee_id AND d.employment_cycle_id IS NOT DISTINCT FROM request_row.employment_cycle_id AND request_row.requested_action<>'clock_in' AND request_row.requested_at BETWEEN d.expected_start AND d.expected_end+interval '6 hours' ORDER BY d.work_date DESC LIMIT 1), (request_row.requested_at AT TIME ZONE 'America/Bogota')::date), 'needs_review')
    ON CONFLICT (employee_id, employment_cycle_id, work_date) DO UPDATE SET updated_at = now()
    RETURNING id INTO day_id_value;
    INSERT INTO public.time_clock_events(company_id, day_id, employee_id, employment_cycle_id, operation_center_id,
      action, source, occurred_at, recorded_by, supervisor_reason, idempotency_key, supersedes_event_id,identity_method)
    VALUES(request_row.company_id, day_id_value, request_row.employee_id, request_row.employment_cycle_id, request_row.operation_center_id,
      request_row.requested_action, 'correction', request_row.requested_at, actor_id, request_row.reason, gen_random_uuid(), request_row.event_id,'correction')
    RETURNING id INTO event_id_value;
    PERFORM public.time_clock_recalculate_day(day_id_value);
    IF EXISTS(SELECT 1 FROM public.time_clock_days WHERE id=day_id_value AND 'invalid_sequence'=ANY(incident_codes)) THEN RAISE EXCEPTION 'INVALID_SEQUENCE'; END IF;
  END IF;
  RETURN jsonb_build_object('request_id', _request_id, 'status', CASE WHEN _approve THEN 'approved' ELSE 'rejected' END, 'event_id', event_id_value);
END;
$$;
-- Reconciliation runs without a browser session; only the scheduler can call it.
CREATE FUNCTION time_clock_private.refresh_date(_center uuid,_date date) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE employee_row record; schedule_row record; expected_start_value timestamptz; expected_end_value timestamptz; incident text; company uuid;
BEGIN
 SELECT company_id INTO company FROM public.time_clock_center_settings WHERE operation_center_id=_center AND enabled AND tracking_start_date<=_date;
 IF company IS NULL THEN RETURN; END IF;
 FOR employee_row IN SELECT DISTINCT e.id AS employee_id,c.id AS cycle_id FROM public.employees_v2 e
 JOIN public.employee_employment_cycles c ON c.employee_id=e.id AND c.status='active' AND c.start_date<=_date
 JOIN public.employee_work_info w ON w.employee_id=e.id AND w.employment_cycle_id=c.id AND w.is_current
 WHERE e.company_id=company AND e.is_active AND w.operation_center_id=_center
 LOOP
   schedule_row:=NULL;
   SELECT shift.name,shift.start_time,shift.end_time,shift.break_minutes,shift.crosses_midnight,shift.is_rest_day INTO schedule_row
   FROM public.employee_shift_assignments a JOIN public.shifts shift ON shift.id=a.shift_id WHERE a.employee_id=employee_row.employee_id AND a.assignment_date=_date LIMIT 1;
   IF NOT FOUND THEN
     SELECT s.name,s.start_time,s.end_time,s.break_minutes,s.end_time<=s.start_time AS crosses_midnight,false AS is_rest_day INTO schedule_row
     FROM public.employee_time_config c JOIN public.work_schedules s ON s.id=c.work_schedule_id WHERE c.employee_id=employee_row.employee_id AND c.employment_cycle_id=employee_row.cycle_id AND c.is_active AND c.mode='administrative' AND c.start_date<=_date AND (c.end_date IS NULL OR c.end_date>=_date) AND extract(dow FROM _date)::integer=ANY(s.days_of_week) ORDER BY c.start_date DESC LIMIT 1;
   END IF;
   IF schedule_row.name IS NULL OR schedule_row.is_rest_day THEN CONTINUE; END IF;
   expected_start_value:=(_date+schedule_row.start_time) AT TIME ZONE 'America/Bogota';
   expected_end_value:=(_date+schedule_row.end_time+CASE WHEN schedule_row.crosses_midnight THEN interval '1 day' ELSE interval '0 day' END) AT TIME ZONE 'America/Bogota';
   incident:=CASE WHEN EXISTS(SELECT 1 FROM public.vacation_requests v WHERE v.employee_id=employee_row.employee_id AND _date BETWEEN v.start_date AND v.end_date AND v.status::text='aprobado') OR EXISTS(SELECT 1 FROM public.leave_requests l WHERE l.employee_id=employee_row.employee_id AND _date BETWEEN l.start_date AND l.end_date AND l.status::text='aprobado') OR EXISTS(SELECT 1 FROM public.employee_incapacities i WHERE i.employee_id=employee_row.employee_id AND _date BETWEEN i.start_date AND i.end_date) THEN 'justified_absence' WHEN expected_end_value<now() THEN 'absence' ELSE NULL END;
   INSERT INTO public.time_clock_days(company_id,employee_id,employment_cycle_id,operation_center_id,work_date,schedule_name,expected_start,expected_end,scheduled_break_minutes,status,incident_codes)
   VALUES(company,employee_row.employee_id,employee_row.cycle_id,_center,_date,schedule_row.name,expected_start_value,expected_end_value,coalesce(schedule_row.break_minutes,0),CASE WHEN incident='absence' THEN 'needs_review' WHEN incident='justified_absence' THEN 'complete' ELSE 'scheduled' END,CASE WHEN incident IS NULL THEN '{}'::text[] ELSE ARRAY[incident] END)
   ON CONFLICT(employee_id,employment_cycle_id,work_date) DO UPDATE SET status=excluded.status,incident_codes=excluded.incident_codes,updated_at=now()
   WHERE time_clock_days.first_clock_in IS NULL AND NOT EXISTS(SELECT 1 FROM public.time_clock_events WHERE day_id=time_clock_days.id);
 END LOOP;
END; $$;

CREATE FUNCTION time_clock_private.reconcile() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE setting record; work_day date; d record; today date:=(now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtextextended('time-clock-reconcile',0)) THEN RETURN; END IF;
 FOR setting IN SELECT * FROM public.time_clock_center_settings WHERE enabled AND tracking_start_date<=today LOOP
   FOR work_day IN SELECT generate_series(greatest(setting.tracking_start_date,coalesce(setting.last_scan_date-1,setting.tracking_start_date)),today,interval '1 day')::date LOOP
     PERFORM time_clock_private.refresh_date(setting.operation_center_id,work_day);
   END LOOP;
   UPDATE public.time_clock_center_settings SET last_scan_date=today WHERE operation_center_id=setting.operation_center_id;
 END LOOP;
 FOR d IN SELECT id FROM public.time_clock_days WHERE first_clock_in IS NOT NULL AND (status IN ('open','on_break') OR work_date>=today-1) LOOP
   PERFORM public.time_clock_recalculate_day(d.id);
 END LOOP;
 DELETE FROM time_clock_private.sessions WHERE expires_at<now()-interval '1 day';
 DELETE FROM time_clock_private.attempts WHERE resets_at<now()-interval '1 day';
 DELETE FROM public.time_clock_qr_sessions WHERE expires_at<now()-interval '1 day';
END; $$;

-- Preserve the old RPC for existing clients, now bounded by explicit center activation.
CREATE OR REPLACE FUNCTION public.time_clock_refresh_absences(_company_id uuid,_work_date date) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c record;
BEGIN
 IF auth.uid() IS NULL OR NOT public.time_clock_can(_company_id,'view') THEN RAISE EXCEPTION 'NOT_ALLOWED'; END IF;
 IF _work_date<(now() AT TIME ZONE 'America/Bogota')::date-366 OR _work_date>(now() AT TIME ZONE 'America/Bogota')::date THEN RAISE EXCEPTION 'INVALID_DATE'; END IF;
 FOR c IN SELECT operation_center_id FROM public.time_clock_center_settings WHERE company_id=_company_id AND enabled AND public.check_center_access(company_id,operation_center_id) LOOP
   PERFORM time_clock_private.refresh_date(c.operation_center_id,_work_date);
 END LOOP;
 RETURN 0;
END; $$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA time_clock_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA time_clock_private FROM PUBLIC,anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   PERFORM cron.schedule('time-clock-reconcile','*/5 * * * *','SELECT time_clock_private.reconcile()');
 END IF;
END $$;
