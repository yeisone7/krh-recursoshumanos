-- Run against the installed schema; every fixture is rolled back.
BEGIN;
SET LOCAL statement_timeout = '60s';

CREATE TEMP TABLE schedule_permission_results (test text, passed boolean) ON COMMIT DROP;
GRANT INSERT, SELECT ON schedule_permission_results TO authenticated, anon;

INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES ('f9100000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','schedule-permission-regression@example.invalid','',now(),'{}','{}',now(),now());
INSERT INTO public.companies(id,name,nit) VALUES
 ('f9200000-0000-0000-0000-000000000001','Schedule permission regression A','schedule-regression-a'),
 ('f9200000-0000-0000-0000-000000000002','Schedule permission regression B','schedule-regression-b');
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES
 ('f9100000-0000-0000-0000-000000000001','f9200000-0000-0000-0000-000000000001'),
 ('f9100000-0000-0000-0000-000000000001','f9200000-0000-0000-0000-000000000002');
INSERT INTO public.custom_roles(id,company_id,name,is_system) VALUES
 ('f9300000-0000-0000-0000-000000000001','f9200000-0000-0000-0000-000000000001','Schedule creator regression',false);
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES
 ('f9100000-0000-0000-0000-000000000001','f9300000-0000-0000-0000-000000000001');
INSERT INTO public.role_permissions(role_id,permission_id)
SELECT 'f9300000-0000-0000-0000-000000000001',p.id FROM public.permissions p
JOIN public.modules m ON m.id=p.module_id WHERE m.code='jornadas' AND p.action='view';

CREATE FUNCTION pg_temp.assert_schedule_creation(p_company uuid, allowed boolean, test_name text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE blocked boolean:=false; inserted uuid;
BEGIN
 BEGIN
  INSERT INTO public.work_schedules(company_id,name,days_of_week,start_time,end_time,break_minutes,created_by)
  VALUES(p_company,test_name,ARRAY[1,2,3,4,5],'08:00','17:00',60,auth.uid()) RETURNING id INTO inserted;
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF blocked=allowed THEN RAISE EXCEPTION 'Failed: % (allowed=%, blocked=%)',test_name,allowed,blocked; END IF;
 IF allowed AND NOT EXISTS(SELECT 1 FROM public.work_schedules WHERE id=inserted) THEN RAISE EXCEPTION 'Inserted schedule not readable: %',test_name; END IF;
 INSERT INTO schedule_permission_results VALUES(test_name,true);
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"f9100000-0000-0000-0000-000000000001","role":"authenticated"}',true);
DO $$ BEGIN
 IF public.is_admin_or_rrhh() OR NOT public.is_company_member('f9200000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'Fixture must be a non-admin company member'; END IF;
END $$;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',false,'View-only role cannot create');
RESET ROLE;

INSERT INTO public.role_permissions(role_id,permission_id)
SELECT 'f9300000-0000-0000-0000-000000000001',p.id FROM public.permissions p
JOIN public.modules m ON m.id=p.module_id WHERE m.code='jornadas' AND p.action='create';
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id=rp.permission_id JOIN public.modules m ON m.id=p.module_id WHERE rp.role_id='f9300000-0000-0000-0000-000000000001' AND m.code='jornadas' AND p.action='create') THEN RAISE EXCEPTION 'Missing Jornadas create permission'; END IF; END $$;

SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',true,'Non-admin with Jornadas create can insert and read');
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000002',false,'Permission in company A does not grant creation in company B');
DO $$ DECLARE affected integer; BEGIN
 UPDATE public.work_schedules SET name='Unexpected update' WHERE company_id='f9200000-0000-0000-0000-000000000001';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Create permission must not grant update'; END IF;
 INSERT INTO schedule_permission_results VALUES('Create-only role cannot update',true);
 DELETE FROM public.work_schedules WHERE company_id='f9200000-0000-0000-0000-000000000001';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>0 THEN RAISE EXCEPTION 'Create permission must not grant delete'; END IF;
 INSERT INTO schedule_permission_results VALUES('Create-only role cannot delete',true);
END $$;
RESET ROLE;

UPDATE public.custom_roles SET is_active=false WHERE id='f9300000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',false,'Inactive role cannot create');
RESET ROLE;
UPDATE public.custom_roles SET is_active=true WHERE id='f9300000-0000-0000-0000-000000000001';
DELETE FROM public.user_company_assignments WHERE user_id='f9100000-0000-0000-0000-000000000001' AND company_id='f9200000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',false,'Role without company membership cannot create');
RESET ROLE;

INSERT INTO public.user_company_assignments(user_id,company_id) VALUES('f9100000-0000-0000-0000-000000000001','f9200000-0000-0000-0000-000000000001');
UPDATE public.custom_roles SET is_active=false WHERE id='f9300000-0000-0000-0000-000000000001';
INSERT INTO public.user_roles(user_id,role) VALUES('f9100000-0000-0000-0000-000000000001','rrhh');
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',true,'Legacy HR retains creation access');
RESET ROLE;
UPDATE public.user_roles SET role='admin' WHERE user_id='f9100000-0000-0000-0000-000000000001' AND role='rrhh';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',true,'Legacy administrator retains creation access');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims','{}',true);
SELECT pg_temp.assert_schedule_creation('f9200000-0000-0000-0000-000000000001',false,'Anonymous caller cannot create');
RESET ROLE;

SELECT jsonb_build_object('passed',count(*),'tests',jsonb_agg(test ORDER BY test)) AS result FROM schedule_permission_results;
ROLLBACK;
