BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.super_admins LIMIT 1),true);
DO $$
DECLARE c uuid:=gen_random_uuid();e uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();course uuid:=gen_random_uuid();legacy_course uuid:=gen_random_uuid();contract uuid:=gen_random_uuid();
BEGIN
 PERFORM set_config('report.metrics_company',c::text,true);
 INSERT INTO public.companies(id,name,nit) VALUES(c,'Report metrics fixture',c::text);
 INSERT INTO public.operation_centers(id,company_id,name,code) VALUES(a,c,'Anterior','A'),(b,c,'Actual','B');
 INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name,is_active) VALUES(e,c,'999000123','Reporte','Prueba',true);
 INSERT INTO public.employee_work_info(company_id,employee_id,position_name,hire_date,valid_from,valid_to,is_current,operation_center_id) VALUES(c,e,'Prueba','2025-01-01','2025-01-01','2026-01-31',false,a),(c,e,'Prueba','2026-02-01','2026-02-01',null,true,b);
 INSERT INTO public.contracts(id,company_id,employee_id,contract_type,start_date,end_date,salary) VALUES(contract,c,e,'termino_fijo','2025-01-01','2026-02-28',1000000);
 INSERT INTO public.contract_extensions(company_id,contract_id,extension_number,start_date,end_date) VALUES(c,contract,1,'2026-03-01','2026-05-31');
 INSERT INTO public.employee_incapacities(company_id,employee_id,start_date,end_date,diagnosis) VALUES(c,e,'2026-01-30','2026-02-02','Fixture'),(c,e,'2026-02-01','2026-02-01','Fixture');
 INSERT INTO public.training_courses(id,company_id,name,category,status,is_active) VALUES(course,c,'Curso de prueba','general','publicado',true);
 INSERT INTO public.training_courses(id,company_id,name,category,status,is_active) VALUES(legacy_course,c,'Cúrso de prueba','general','borrador',false);
 INSERT INTO public.training_course_periods(company_id,course_id,year,month) VALUES(c,course,2026,2);
 INSERT INTO public.training_completions(company_id,course_id,employee_id,operator_name,operator_cedula,signature_data,completed_at) VALUES(c,legacy_course,null,'Prueba','999.000.123','fixture','2025-12-01T12:00:00Z');
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE c uuid:=current_setting('report.metrics_company')::uuid;r jsonb;p jsonb;rid uuid;
BEGIN
 IF (SELECT effective_end_date FROM report_data.contracts WHERE company_id=c)<>'2026-05-31'::date THEN RAISE EXCEPTION 'Extension ignored';END IF;
 IF (SELECT count(*) FROM report_data.employees_v2 WHERE company_id=c AND report_center_name='Actual')<>1 THEN RAISE EXCEPTION 'Current center duplicated';END IF;
 IF (SELECT count(*) FROM report_data.absence_days WHERE company_id=c AND absence_date BETWEEN '2026-02-01' AND '2026-02-28')<>2 THEN RAISE EXCEPTION 'Cross-month absence or overlap double counted';END IF;
 IF (SELECT count(*) FROM report_data.absence_days WHERE company_id=c AND report_center_name='Anterior')<>2 THEN RAISE EXCEPTION 'Historical center lost';END IF;
 IF (SELECT count(*) FROM report_data.training_compliance WHERE company_id=c AND period='2026-02-01' AND completed_count=1 AND completion_percent=100)<>1 THEN RAISE EXCEPTION 'Training period/document matching or completion dedup failed';END IF;
 p:='{"source":"absence_days","columns":[],"dimensions":[],"metrics":[{"field":"absent_days","op":"sum","key":"days"}],"filters":[],"related":[],"order":[],"chart":"none","limit":null,"comparePrevious":true}';
 rid:=public.create_ai_report(c,p,'{"startDate":"2026-02-01","endDate":"2026-02-28"}','Ausentismo febrero','Ausentismo','fixture');
 r:=public.get_ai_report(c,rid);
 IF r->'comparison'->>'startDate'<>'2026-01-01' OR r->'comparison'->>'endDate'<>'2026-01-31' OR r->'rows'->0->>'days'<>'2' OR r->'comparison'->'rows'->0->>'days'<>'2' THEN RAISE EXCEPTION 'Calendar comparison failed';END IF;
 p:=p||'{"filters":[{"field":"absence_date","op":"gte","values":["2026-02-01"]},{"field":"absence_date","op":"lte","values":["2026-02-28"]}]}';
 rid:=public.create_ai_report(c,p,'{}','Compara este mes con el anterior','Ausentismo relativo','fixture');r:=public.get_ai_report(c,rid);
 IF r->'comparison'->'rows'->0->>'days'<>'2' OR r->'filters'<>'{}'::jsonb THEN RAISE EXCEPTION 'Resolved period was frozen into reusable definition';END IF;
END $$;
RESET ROLE;
SELECT 'PASS: contract extension, current/historical centers, overlapping cross-month absences, training periods and document matching, calendar comparison and relative definition' result;
ROLLBACK;
