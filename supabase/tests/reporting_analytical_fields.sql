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
INSERT INTO public.role_permissions(role_id,permission_id) SELECT current_setting('report.test_role')::uuid,p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id WHERE m.code IN ('asistente_ia','empleados','contratos') AND p.action='view';
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_role')::uuid),(current_setting('report.test_other_user')::uuid,current_setting('report.test_role')::uuid);
INSERT INTO public.operation_centers(id,company_id,name,code) VALUES(current_setting('report.test_center')::uuid,current_setting('report.test_company')::uuid,'Allowed','REPORT-A'),(current_setting('report.test_other_center')::uuid,current_setting('report.test_company')::uuid,'Denied','REPORT-B');
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES(current_setting('report.test_user')::uuid,current_setting('report.test_center')::uuid);

DO $$ DECLARE e uuid;cy uuid;c uuid:=current_setting('report.test_company')::uuid; center uuid;birth date;contract uuid;today date:=(now() AT TIME ZONE 'America/Bogota')::date; BEGIN
 FOR i IN 1..6 LOOP
  e:=gen_random_uuid();cy:=gen_random_uuid();
  center:=current_setting(CASE WHEN i=6 THEN 'report.test_other_center' ELSE 'report.test_center' END)::uuid;
  birth:=CASE i WHEN 1 THEN '2000-06-16'::date WHEN 2 THEN '2000-06-15'::date WHEN 3 THEN NULL WHEN 4 THEN '2025-06-16'::date ELSE '2000-01-01'::date END;
  INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name,birth_date,is_active) VALUES(e,c,e::text,'Age fixture '||i,'Test',birth,true);
  INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date,end_date) VALUES(cy,c,e,1,'active','manual','2025-06-15',NULL);
  INSERT INTO public.employee_work_info(company_id,employee_id,employment_cycle_id,position_name,hire_date,valid_from,is_current,operation_center_id) VALUES(c,e,cy,'Fixture','2025-06-15','2025-06-15',true,center);
  IF i=1 THEN
   UPDATE public.employee_employment_cycles SET status='terminated',end_date='2025-06-30' WHERE id=cy;
   UPDATE public.employee_work_info SET is_current=false,valid_to='2025-06-30' WHERE employee_id=e;
   cy:=gen_random_uuid();
   INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date) VALUES(cy,c,e,2,'active','manual','2025-07-01');
   INSERT INTO public.employee_work_info(company_id,employee_id,employment_cycle_id,position_name,hire_date,valid_from,is_current,operation_center_id) VALUES(c,e,cy,'Rehire','2025-07-01','2025-07-01',true,center);
   contract:=gen_random_uuid();
   INSERT INTO public.contracts(id,company_id,employee_id,contract_type,start_date,end_date,salary) VALUES(contract,c,e,'termino_fijo','2025-07-01',today+10,1000000);
   INSERT INTO public.contract_extensions(company_id,contract_id,extension_number,start_date,end_date) VALUES(c,contract,1,today+11,today+30);
  END IF;
 END LOOP;
END $$;
SELECT set_config('request.jwt.claim.sub',current_setting('report.test_user'),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE c uuid:=current_setting('report.test_company')::uuid; r jsonb; denied boolean:=false;
 p jsonb:='{"source":"employees_v2","columns":[],"dimensions":[],"metrics":[{"field":"id","op":"distinct","key":"people"}],"filters":[{"field":"age_at_first_hire","op":"lt","values":["25"]}],"related":[],"order":[],"chart":"none","limit":null,"comparePrevious":false}';
BEGIN
 IF report_private.completed_years('2000-06-16','2025-06-15') IS DISTINCT FROM 24 OR report_private.completed_years('2000-06-15','2025-06-15') IS DISTINCT FROM 25 OR report_private.completed_years('2000-02-29','2025-03-01') IS DISTINCT FROM 25 THEN RAISE EXCEPTION 'Completed birthday calculation failed';END IF;
 IF report_private.completed_years(NULL,'2025-06-15') IS NOT NULL OR report_private.completed_years('2025-06-16','2025-06-15') IS NOT NULL THEN RAISE EXCEPTION 'Missing/invalid dates converted to zero';END IF;
 IF (SELECT count(*) FROM report_data.employees_v2 WHERE company_id=c)<>5 THEN RAISE EXCEPTION 'Employee center isolation failed: %', (SELECT jsonb_agg(jsonb_build_object('name',first_name,'center',report_center_name)) FROM report_data.employees_v2 WHERE company_id=c);END IF;
 IF (SELECT count(*) FROM report_data.employee_employment_cycles WHERE company_id=c)<>6 THEN RAISE EXCEPTION 'Cycle center isolation failed';END IF;
 IF (SELECT count(*) FROM report_data.employees_v2 WHERE company_id=c AND age_at_first_hire IS NULL)<>2 THEN RAISE EXCEPTION 'Missing/invalid birth handling failed';END IF;
 r:=report_private.query(c,p,'{}');IF r->'rows'->0->>'people'<>'1' THEN RAISE EXCEPTION 'Hiring-age count mismatch: %',r;END IF;
 p:=p||'{"source":"employee_employment_cycles","metrics":[{"field":"employee_id","op":"distinct","key":"people"}],"filters":[{"field":"is_first_hire","op":"eq","values":["true"]},{"field":"age_at_hire","op":"lt","values":["25"]}]}';
 r:=report_private.query(c,p,'{"startDate":"2025-06-01","endDate":"2025-06-30"}');IF r->'rows'->0->>'people'<>'1' THEN RAISE EXCEPTION 'First-hire dated count mismatch';END IF;
 IF EXISTS(SELECT 1 FROM report_data.employee_employment_cycles WHERE company_id=c AND is_first_hire AND end_date IS NOT NULL AND (tenure_days<>15 OR tenure_years<>0)) THEN RAISE EXCEPTION 'Closed cycle tenure incorrect';END IF;
 IF (SELECT days_until_end FROM report_data.contracts WHERE company_id=c) IS DISTINCT FROM 30 THEN RAISE EXCEPTION 'Days until end ignored extension';END IF;
 IF (SELECT contract_duration_days FROM report_data.contracts WHERE company_id=c) IS DISTINCT FROM ((now() AT TIME ZONE 'America/Bogota')::date+30-'2025-07-01'::date) THEN RAISE EXCEPTION 'Contract duration ignored extension';END IF;
 BEGIN PERFORM report_private.query(current_setting('report.test_other_company')::uuid,p,'{}');EXCEPTION WHEN OTHERS THEN denied:=SQLERRM LIKE 'FORBIDDEN%';END;IF NOT denied THEN RAISE EXCEPTION 'Cross-company query accepted';END IF;
END $$;
RESET ROLE;
-- Restrict the historical first center while keeping current employee access.
UPDATE public.employee_work_info SET valid_to='2025-06-30',is_current=false WHERE company_id=current_setting('report.test_company')::uuid;
INSERT INTO public.employee_work_info(company_id,employee_id,position_name,hire_date,valid_from,is_current,operation_center_id)
 SELECT DISTINCT company_id,employee_id,'Current','2025-07-01'::date,'2025-07-01'::date,true,current_setting('report.test_center')::uuid FROM public.employee_work_info WHERE company_id=current_setting('report.test_company')::uuid;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM report_data.employees_v2 WHERE company_id=current_setting('report.test_company')::uuid)<>6 THEN RAISE EXCEPTION 'Current employee fixture failed';END IF;
 IF (SELECT age_at_first_hire FROM report_data.employees_v2 WHERE company_id=current_setting('report.test_company')::uuid AND first_name='Age fixture 6') IS NOT NULL THEN RAISE EXCEPTION 'Hidden historical center leaked hire age';END IF;
END $$;
RESET ROLE;
SELECT 'PASS: birthday boundaries, unknown dates, first hires/rehires, distinct people, date filters, tenure, company/current/historical center isolation' AS result;
ROLLBACK;
