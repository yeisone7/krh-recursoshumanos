-- Run in a transaction against a database with the report migration installed.
-- Every fixture, favorite and result is rolled back, including auth users.
BEGIN;
SELECT set_config('report.test_company',gen_random_uuid()::text,true);
SELECT set_config('report.test_other_company',gen_random_uuid()::text,true);
SELECT set_config('report.test_user',gen_random_uuid()::text,true);
SELECT set_config('report.test_other_user',gen_random_uuid()::text,true);
SELECT set_config('report.test_role',gen_random_uuid()::text,true);
SELECT set_config('report.test_center',gen_random_uuid()::text,true);
SELECT set_config('report.test_other_center',gen_random_uuid()::text,true);
INSERT INTO public.companies(id,name,nit) VALUES(current_setting('report.test_company')::uuid,'Report transaction test',current_setting('report.test_company')),(current_setting('report.test_other_company')::uuid,'Report other test',current_setting('report.test_other_company'));
INSERT INTO auth.users(id,email) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_user')||'@example.invalid'),(current_setting('report.test_other_user')::uuid,current_setting('report.test_other_user')||'@example.invalid');
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_company')::uuid),(current_setting('report.test_other_user')::uuid,current_setting('report.test_company')::uuid);
INSERT INTO public.user_preferences(user_id,ai_data_assistant_enabled) VALUES(current_setting('report.test_user')::uuid,true),(current_setting('report.test_other_user')::uuid,true) ON CONFLICT(user_id) DO UPDATE SET ai_data_assistant_enabled=true;
INSERT INTO public.custom_roles(id,name,company_id,is_active,is_system) VALUES(current_setting('report.test_role')::uuid,'Report test '||current_setting('report.test_role'),current_setting('report.test_company')::uuid,true,false);
INSERT INTO public.role_permissions(role_id,permission_id) SELECT current_setting('report.test_role')::uuid,p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id WHERE m.code IN ('asistente_ia','empleados') AND p.action='view';
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_role')::uuid),(current_setting('report.test_other_user')::uuid,current_setting('report.test_role')::uuid);
INSERT INTO public.operation_centers(id,company_id,name,code) VALUES(current_setting('report.test_center')::uuid,current_setting('report.test_company')::uuid,'Allowed','REPORT-A'),(current_setting('report.test_other_center')::uuid,current_setting('report.test_company')::uuid,'Denied','REPORT-B');
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_center')::uuid);
DO $$ DECLARE employee uuid;cycle uuid;center uuid; BEGIN
 FOR center IN SELECT id FROM public.operation_centers WHERE company_id=current_setting('report.test_company')::uuid LOOP
  employee:=gen_random_uuid();
  INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name,is_active) VALUES(employee,current_setting('report.test_company')::uuid,employee::text,'Fixture '||employee::text,'Center',true);
  SELECT id INTO cycle FROM public.employee_employment_cycles WHERE employee_id=employee AND status='active' LIMIT 1;
  IF cycle IS NULL THEN cycle:=gen_random_uuid();INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,start_date) VALUES(cycle,current_setting('report.test_company')::uuid,employee,1,'active','2026-01-01');END IF;
  INSERT INTO public.employee_work_info(company_id,employee_id,employment_cycle_id,position_name,hire_date,valid_from,is_current,operation_center_id) VALUES(current_setting('report.test_company')::uuid,employee,cycle,'Fixture','2026-01-01','2026-01-01',true,center);
 END LOOP;
END $$;
CREATE VIEW report_data.report_test_volume WITH(security_invoker=true) AS
 SELECT g id,current_setting('report.test_company')::uuid company_id,current_setting('report.test_center')::uuid center_id FROM generate_series(1,1507) g WHERE public.check_center_access(current_setting('report.test_company')::uuid,current_setting('report.test_center')::uuid)
 UNION ALL SELECT 9999,current_setting('report.test_company')::uuid,current_setting('report.test_other_center')::uuid WHERE public.check_center_access(current_setting('report.test_company')::uuid,current_setting('report.test_other_center')::uuid);
GRANT SELECT ON report_data.report_test_volume TO authenticated;
INSERT INTO report_private.sources(key,label,module,fields,center_field,description) VALUES('report_test_volume','Test rows','empleados','[{"key":"id","label":"ID","type":"number"}]','center_id','Transaction-only volume fixture');
SELECT set_config('request.jwt.claim.sub',current_setting('report.test_user'),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE c uuid:=current_setting('report.test_company')::uuid;p jsonb:='{"source":"report_test_volume","columns":["id"],"dimensions":[],"metrics":[],"filters":[],"related":[],"order":[],"chart":"none","limit":null,"comparePrevious":false}';r jsonb;rid uuid;fid uuid;denied boolean;total integer;
BEGIN
 IF NOT report_private.allowed(c,'empleados','view') THEN RAISE EXCEPTION 'fixture role not enabled'; END IF;
 r:=report_private.query(c,p||'{"source":"employees_v2","columns":["id","report_center_name"]}','{}');IF r->>'totalRows'<>'1' OR r->'rows'->0->>'report_center_name'<>'Allowed' THEN RAISE EXCEPTION 'Real employee RLS center isolation failed';END IF;
 rid:=public.create_ai_report(c,p,'{}','Test 1507','Test','fixture');
 PERFORM set_config('report.test_run',rid::text,true);
 r:=public.get_ai_report(c,rid,1000,1000);
 IF r->>'totalRows'<>'1507' OR jsonb_array_length(r->'rows')<>507 THEN RAISE EXCEPTION 'Volume or center isolation failed'; END IF;
 IF r->'rows'->0->>'id'<>'1001' OR r->'rows'->506->>'id'<>'1507' THEN RAISE EXCEPTION 'Pagination lost or duplicated rows'; END IF;
 IF (r->>'canExport')::boolean THEN RAISE EXCEPTION 'Unexpected export permission'; END IF;
 denied:=false;BEGIN PERFORM public.get_ai_report(c,rid,0,NULL);EXCEPTION WHEN OTHERS THEN denied:=SQLERRM='INVALID_PAGE';END;IF NOT denied THEN RAISE EXCEPTION 'Null pagination bypass';END IF;
 denied:=false;BEGIN PERFORM report_private.query(c,p||'{"filters":[{"field":"id","op":null,"values":["1"]}]}','{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'INVALID_PLAN%';END;IF NOT denied THEN RAISE EXCEPTION 'Null operator accepted';END IF;
 r:=report_private.query(c,p||jsonb_build_object('source','employees_v2','filters',jsonb_build_array(jsonb_build_object('field','first_name','op','eq','values',jsonb_build_array($value$x' OR true --$value$)))),'{}');IF r->>'totalRows'<>'0' THEN RAISE EXCEPTION 'Filter literal injection';END IF;
 denied:=false;BEGIN PERFORM public.get_ai_report(c,rid,0,1000,true);EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'EXPORT_FORBIDDEN%';END;IF NOT denied THEN RAISE EXCEPTION 'Export bypass';END IF;
 denied:=false;BEGIN PERFORM report_private.query(current_setting('report.test_other_company')::uuid,p,'{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'FORBIDDEN%';END;IF NOT denied THEN RAISE EXCEPTION 'Company bypass';END IF;
 denied:=false;BEGIN PERFORM report_private.query(c,p,jsonb_build_object('centerIds',jsonb_build_array(current_setting('report.test_other_center'))));EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'FORBIDDEN%';END;IF NOT denied THEN RAISE EXCEPTION 'Center bypass';END IF;
 denied:=false;BEGIN PERFORM report_private.query(c,p||'{"sql":"select * from auth.users"}','{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'INVALID_PLAN%';END;IF NOT denied THEN RAISE EXCEPTION 'SQL accepted';END IF;
 denied:=false;BEGIN PERFORM report_private.query(c,p||'{"columns":["password"]}','{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'INVALID_FIELD%';END;IF NOT denied THEN RAISE EXCEPTION 'Field bypass';END IF;
 denied:=false;BEGIN PERFORM report_private.query(c,p||'{"source":"contracts"}','{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'FORBIDDEN%';END;IF NOT denied THEN RAISE EXCEPTION 'Module bypass';END IF;
 r:=report_private.query(c,p||'{"columns":[],"metrics":[{"field":"*","op":"count","key":"total"}]}','{}');IF r->'rows'->0->>'total'<>'1507' THEN RAISE EXCEPTION 'Aggregate capped by page';END IF;
 r:=public.ai_report_library(c,'favorite',rid);fid:=(r->>'id')::uuid;
 PERFORM public.ai_report_library(c,'rename',fid,'Renamed');
 IF public.ai_report_library(c,'favorite_get',fid)->>'title'<>'Renamed' THEN RAISE EXCEPTION 'Favorite rename failed';END IF;
 PERFORM public.ai_report_library(c,'delete',fid);
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('report.test_other_user'),true);
SET LOCAL ROLE authenticated;
DO $$DECLARE denied boolean:=false;BEGIN
 BEGIN PERFORM public.get_ai_report(current_setting('report.test_company')::uuid,current_setting('report.test_run')::uuid);EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'NOT_FOUND%';END;
 IF NOT denied THEN RAISE EXCEPTION 'Foreign history leaked';END IF;
END $$;
RESET ROLE;
-- A changed center grant invalidates all stored results before returning any rows.
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_other_center')::uuid);
SELECT set_config('request.jwt.claim.sub',current_setting('report.test_user'),true);
SET LOCAL ROLE authenticated;
DO $$DECLARE denied boolean:=false;BEGIN
 BEGIN PERFORM public.get_ai_report(current_setting('report.test_company')::uuid,current_setting('report.test_run')::uuid);EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'STALE_ACCESS%';END;
 IF NOT denied THEN RAISE EXCEPTION 'Stale snapshot leaked';END IF;
END $$;
RESET ROLE;
SELECT 'PASS: 1507 rows, complete aggregates, pagination, tenant/center/module/field isolation, SQL rejection, export denial, favorite lifecycle, foreign history and permission revocation' AS result;
ROLLBACK;
