-- Isolated fixtures. Run with migration inside one transaction; always rollback.
CREATE FUNCTION pg_temp.assert(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %',message; END IF; END $$;
CREATE FUNCTION pg_temp.denied(command text, pattern text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE message text; BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS message=MESSAGE_TEXT; END;
 IF message IS NULL OR position(pattern IN message)=0 THEN RAISE EXCEPTION 'Expected error containing %, got %',pattern,message; END IF;
END $$;
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES('ac000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','amendments-test@example.invalid','','{}','{}',now(),now());
INSERT INTO public.companies(id,name,nit) VALUES('ac000000-0000-4000-8000-000000000010','Amendment test','AMENDMENT-TEST');
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000010');
INSERT INTO public.user_roles(user_id,role) VALUES('ac000000-0000-4000-8000-000000000001','admin');
INSERT INTO public.operation_centers(id,company_id,name) VALUES
('ac000000-0000-4000-8000-000000000030','ac000000-0000-4000-8000-000000000010','Centro inicial'),
('ac000000-0000-4000-8000-000000000031','ac000000-0000-4000-8000-000000000010','Centro nuevo');
INSERT INTO public.positions(id,company_id,name) VALUES('ac000000-0000-4000-8000-000000000032','ac000000-0000-4000-8000-000000000010','Nuevo cargo');
INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name) VALUES('ac000000-0000-4000-8000-000000000040','ac000000-0000-4000-8000-000000000010','AMENDMENT-TEST','Amendment','Test');
INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date) VALUES('ac000000-0000-4000-8000-000000000050','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000040',1,'active','backfill','2020-01-01');
INSERT INTO public.employee_work_info(employee_id,company_id,employment_cycle_id,position_name,operation_center_id,hire_date,valid_from)
VALUES('ac000000-0000-4000-8000-000000000040','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000050','Inicial','ac000000-0000-4000-8000-000000000030','2020-01-01','2020-01-01');
INSERT INTO public.employee_schedule(employee_id,company_id,employment_cycle_id,rest_day,valid_from)
VALUES('ac000000-0000-4000-8000-000000000040','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000050','domingo','2020-01-01');
INSERT INTO public.work_schedules(id,company_id,name,start_time,end_time) VALUES
('ac000000-0000-4000-8000-000000000060','ac000000-0000-4000-8000-000000000010','Horario inicial','08:00','17:00'),
('ac000000-0000-4000-8000-000000000061','ac000000-0000-4000-8000-000000000010','Horario nuevo','07:00','16:00');
INSERT INTO public.employee_time_config(employee_id,company_id,employment_cycle_id,mode,work_schedule_id,start_date,operation_center_id)
VALUES('ac000000-0000-4000-8000-000000000040','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000050','administrative','ac000000-0000-4000-8000-000000000060','2020-01-01','ac000000-0000-4000-8000-000000000030');
INSERT INTO public.contracts(id,employee_id,company_id,employment_cycle_id,contract_type,start_date,salary)
VALUES('ac000000-0000-4000-8000-000000000070','ac000000-0000-4000-8000-000000000040','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000050','indefinido','2020-01-01',1500000);
SELECT set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"ac000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000080','employee_id','ac000000-0000-4000-8000-000000000040','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date,'reason','Cambio acordado de condiciones','changes','{"salary":{"amount":2000000},"position":{"id":"ac000000-0000-4000-8000-000000000032"},"rest_day":{"value":"sabado"},"schedule":{"mode":"administrative","work_schedule_id":"ac000000-0000-4000-8000-000000000061"}}'::jsonb));
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000080","revision":1}')$q$,'PDF firmado');
RESET ROLE;
SELECT pg_temp.assert((SELECT salary=1500000 FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000070'),'draft must not change salary');
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('amendments','ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000080/1/signed.pdf','{"mimetype":"application/pdf"}');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000080","revision":1,"signed_path":"ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000080/1/signed.pdf"}');
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000080","revision":1}');
SELECT pg_temp.assert(public.employee_amendments('ac000000-0000-4000-8000-000000000040')#>>'{records,0,status}'='applied','visible applied event');
RESET ROLE;
SELECT pg_temp.assert((SELECT salary=2000000 AND start_date='2020-01-01' FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000070'),'salary and identity');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.employee_employment_cycles WHERE employee_id='ac000000-0000-4000-8000-000000000040'),'no rehire');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.employee_work_info WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050'),'position history retained');
SELECT pg_temp.assert((SELECT rest_day='sabado' FROM public.employee_schedule WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050' AND is_current),'rest day projected');
SELECT pg_temp.assert((SELECT work_schedule_id='ac000000-0000-4000-8000-000000000061' FROM public.employee_time_config WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050' AND is_active),'schedule projected');
SELECT pg_temp.denied($q$DELETE FROM public.employee_documents WHERE id=(SELECT document_id FROM amendment_private.records WHERE id='ac000000-0000-4000-8000-000000000080')$q$,'inmutable');
-- Corrections and retroactive evidence retain later signed values.
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000082','employee_id','ac000000-0000-4000-8000-000000000040','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date-10,'reason','Reconstruir con evidencia','changes','{"salary":{"amount":1500000}}'::jsonb))$q$,'No hay evidencia');
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000082','employee_id','ac000000-0000-4000-8000-000000000040','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date-10,'reason','Corrección según soporte histórico','changes','{"salary":{"amount":1500000}}'::jsonb,'declared_before','{"salary":{"amount":1200000}}'::jsonb));
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000082","revision":1}');
SELECT pg_temp.assert(public.employee_amendments('ac000000-0000-4000-8000-000000000040',(now() AT TIME ZONE 'America/Bogota')::date-5)#>>'{snapshot,salary,amount}'='1500000','historical salary');
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000083','employee_id','ac000000-0000-4000-8000-000000000040','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date-15,'reason','Conflicto histórico intencional','changes','{"salary":{"amount":1300000}}'::jsonb,'declared_before','{"salary":{"amount":1000000}}'::jsonb)); SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000083","revision":1}')$q$,'contradice');
RESET ROLE;
SELECT pg_temp.assert((SELECT salary=2000000 FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000070'),'retroactive must preserve later salary');
INSERT INTO public.contract_type_config(company_id,contract_type,display_name,requires_end_date) VALUES('ac000000-0000-4000-8000-000000000010','fijo','Fijo',true) ON CONFLICT(company_id,contract_type) DO UPDATE SET requires_end_date=true;
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000084','employee_id','ac000000-0000-4000-8000-000000000040','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date,'reason','Corregir tipo según contrato','changes',jsonb_build_object('contract_type',jsonb_build_object('code','fijo','end_date',(now() AT TIME ZONE 'America/Bogota')::date+90))));
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000084","revision":1}');
RESET ROLE;
SELECT pg_temp.assert((SELECT contract_type='fijo' AND amendment_effective_on IS NOT NULL AND salary=2000000 FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000070'),'type correction projects only its values');
-- Closed periods remain unchanged; true effective dates remain queryable.
INSERT INTO public.payroll_control_cuts(company_id,operation_center_id,level,cutoff_date,reason,created_by,created_by_name)
VALUES('ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000030',1,(now() AT TIME ZONE 'America/Bogota')::date-1,'Test cierre','ac000000-0000-4000-8000-000000000001','Admin');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000085','employee_id','ac000000-0000-4000-8000-000000000040','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date-3,'reason','Corrección de horario histórico','changes','{"schedule":{"mode":"administrative","work_schedule_id":"ac000000-0000-4000-8000-000000000060"}}'::jsonb,'declared_before','{"schedule":{"mode":"administrative","work_schedule_id":"ac000000-0000-4000-8000-000000000061","shift_cycle_id":null,"shift_type_id":null,"cycle_start_date":null,"label":"Anterior declarado"}}'::jsonb));
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000085","revision":1}');
RESET ROLE;
SELECT pg_temp.assert((SELECT jsonb_array_length(affected_cuts)=1 FROM amendment_private.records WHERE id='ac000000-0000-4000-8000-000000000085'),'affected cut identified');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.employee_time_config WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050'),'closed schedule not rewritten');
-- Revision checks are server-side; editing invalidates every prior attachment.
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000086','employee_id','ac000000-0000-4000-8000-000000000040','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date+5,'reason','Borrador salarial','changes','{"salary":{"amount":2200000}}'::jsonb));
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000086','employee_id','ac000000-0000-4000-8000-000000000040','kind','amendment','revision',1,'effective_on',(now() AT TIME ZONE 'America/Bogota')::date+5,'reason','Ahora cambia solo centro','changes','{"center":{"id":"ac000000-0000-4000-8000-000000000031"}}'::jsonb));
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000086","revision":1}')$q$,'desactualizado');
SELECT pg_temp.assert(NOT amendment_private.file_access('ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000086/1/salary.pdf'),'old salary attachment never becomes public after editing');
SELECT public.employee_amendment_command('cancel','{"id":"ac000000-0000-4000-8000-000000000086","reason":"Ya no se requiere"}');
RESET ROLE;
-- A viewer can read the employee history, but not salary or salary documents.
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES('ac000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','amendments-viewer@example.invalid','','{}','{}',now(),now());
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES('ac000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000010');
INSERT INTO public.custom_roles(id,company_id,name) VALUES('ac000000-0000-4000-8000-000000000020','ac000000-0000-4000-8000-000000000010','Visor de Otrosí');
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES('ac000000-0000-4000-8000-000000000002','ac000000-0000-4000-8000-000000000020');
INSERT INTO public.role_permissions(role_id,permission_id) SELECT 'ac000000-0000-4000-8000-000000000020',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id WHERE m.code IN ('otrosi','empleados') AND p.action='view';
SELECT set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert(NOT (public.employee_amendments('ac000000-0000-4000-8000-000000000040')->'snapshot') ? 'salary','salary snapshot redacted');
SELECT pg_temp.assert(NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.employee_amendments('ac000000-0000-4000-8000-000000000040')->'records') r WHERE r->'changes' ? 'salary' OR r->'before_values' ? 'salary'),'salary history redacted');
SELECT pg_temp.assert(NOT amendment_private.file_access('ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000080/1/signed.pdf'),'salary PDF denied');
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('cancel','{"id":"ac000000-0000-4000-8000-000000000080","reason":"No autorizado"}')$q$,'no autorizado');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000081','employee_id','ac000000-0000-4000-8000-000000000040','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date+2,'reason','Traslado futuro acordado','changes','{"center":{"id":"ac000000-0000-4000-8000-000000000031"}}'::jsonb));
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('amendments','ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000081/1/signed.pdf','{"mimetype":"application/pdf"}');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000081","revision":1,"signed_path":"ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000081/1/signed.pdf"}');
RESET ROLE;
SELECT pg_temp.assert((SELECT operation_center_id='ac000000-0000-4000-8000-000000000030' FROM public.employee_work_info WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050' AND is_current),'future center not applied early');
-- Simulate the scheduled date arriving, then reconcile twice.
UPDATE amendment_private.records SET effective_on=(now() AT TIME ZONE 'America/Bogota')::date WHERE id='ac000000-0000-4000-8000-000000000081';
SELECT amendment_private.reconcile();
SELECT amendment_private.reconcile();
SELECT pg_temp.assert((SELECT operation_center_id='ac000000-0000-4000-8000-000000000031' FROM public.employee_work_info WHERE employment_cycle_id='ac000000-0000-4000-8000-000000000050' AND is_current),'scheduled center applied on its date');
SELECT pg_temp.assert((SELECT count(*)=1 FROM amendment_private.events WHERE amendment_id='ac000000-0000-4000-8000-000000000081' AND action='applied'),'scheduler idempotent');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000087','employee_id','ac000000-0000-4000-8000-000000000040','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date+3,'reason','Regreso posterior acordado','changes','{"center":{"id":"ac000000-0000-4000-8000-000000000030"}}'::jsonb));
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('amendments','ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000087/1/signed.pdf','{"mimetype":"application/pdf"}');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000087","revision":1,"signed_path":"ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000087/1/signed.pdf"}');
RESET ROLE;
UPDATE public.employee_employment_cycles SET status='terminated',end_date=(now() AT TIME ZONE 'America/Bogota')::date WHERE id='ac000000-0000-4000-8000-000000000050';
UPDATE amendment_private.records SET effective_on=(now() AT TIME ZONE 'America/Bogota')::date WHERE id='ac000000-0000-4000-8000-000000000087';
SELECT amendment_private.reconcile();
SELECT pg_temp.assert((SELECT status='needs_review' FROM amendment_private.records WHERE id='ac000000-0000-4000-8000-000000000087'),'terminated cycle not revived');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('cancel','{"id":"ac000000-0000-4000-8000-000000000087","reason":"Vinculación terminada"}');
RESET ROLE;
INSERT INTO public.companies(id,name,nit) VALUES('ac000000-0000-4000-8000-000000000011','Otra empresa prueba','AMENDMENT-OTHER');
INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name) VALUES('ac000000-0000-4000-8000-000000000041','ac000000-0000-4000-8000-000000000011','OTHER-TEST','Otra','Empresa');
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied($q$SELECT public.employee_amendments('ac000000-0000-4000-8000-000000000041')$q$,'no autorizado');
RESET ROLE;

-- Use a second isolated active cycle to exercise direct edits alongside agreements.
INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name)
VALUES('ac000000-0000-4000-8000-000000000042','ac000000-0000-4000-8000-000000000010','DIRECT-TEST','Direct','Test');
INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date)
VALUES('ac000000-0000-4000-8000-000000000052','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000042',1,'active','backfill','2020-01-01');
INSERT INTO public.employee_work_info(employee_id,company_id,employment_cycle_id,position_name,operation_center_id,hire_date,valid_from)
VALUES('ac000000-0000-4000-8000-000000000042','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000052','Directo inicial','ac000000-0000-4000-8000-000000000030','2020-01-01','2020-01-01');
INSERT INTO public.employee_schedule(employee_id,company_id,employment_cycle_id,rest_day,valid_from)
VALUES('ac000000-0000-4000-8000-000000000042','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000052','domingo','2020-01-01');
INSERT INTO public.employee_time_config(employee_id,company_id,employment_cycle_id,mode,work_schedule_id,start_date,operation_center_id)
VALUES('ac000000-0000-4000-8000-000000000042','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000052','administrative','ac000000-0000-4000-8000-000000000060',(now() AT TIME ZONE 'America/Bogota')::date,'ac000000-0000-4000-8000-000000000030');
SET LOCAL ROLE authenticated;
UPDATE public.employee_work_info SET position_name='Editado sin contrato' WHERE employee_id='ac000000-0000-4000-8000-000000000042';
SELECT pg_temp.assert(public.employee_amendments('ac000000-0000-4000-8000-000000000042')#>>'{records,0,kind}'='direct','history without contract');
UPDATE public.employees_v2 SET middle_name='Personal' WHERE id='ac000000-0000-4000-8000-000000000042';
UPDATE public.employee_work_info SET position_name=position_name WHERE employee_id='ac000000-0000-4000-8000-000000000042';
RESET ROLE;
SELECT pg_temp.assert((SELECT count(*)=1 FROM amendment_private.records WHERE cycle_id='ac000000-0000-4000-8000-000000000052'),'no entry for personal and no-op writes');
INSERT INTO public.contracts(id,employee_id,company_id,employment_cycle_id,contract_type,start_date,salary)
VALUES('ac000000-0000-4000-8000-000000000072','ac000000-0000-4000-8000-000000000042','ac000000-0000-4000-8000-000000000010','ac000000-0000-4000-8000-000000000052','indefinido','2020-01-01',1600000);
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000091','employee_id','ac000000-0000-4000-8000-000000000042','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date+5,'reason','Cambio futuro de salario','changes','{"salary":{"amount":2200000}}'::jsonb));
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000092','employee_id','ac000000-0000-4000-8000-000000000042','kind','amendment','effective_on',(now() AT TIME ZONE 'America/Bogota')::date+5,'reason','Cambiar descanso futuro','changes','{"rest_day":{"value":"viernes"}}'::jsonb));
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000093','employee_id','ac000000-0000-4000-8000-000000000042','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date,'reason','Borrador antes de cambio directo','changes','{"salary":{"amount":1900000}}'::jsonb));
RESET ROLE;
INSERT INTO storage.objects(bucket_id,name,metadata)
SELECT 'amendments','ac000000-0000-4000-8000-000000000010/'||id||'/1/signed.pdf','{"mimetype":"application/pdf"}'
FROM unnest(ARRAY['ac000000-0000-4000-8000-000000000091','ac000000-0000-4000-8000-000000000092']) id;
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000091","revision":1,"signed_path":"ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000091/1/signed.pdf"}');
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000092","revision":1,"signed_path":"ac000000-0000-4000-8000-000000000010/ac000000-0000-4000-8000-000000000092/1/signed.pdf"}');
UPDATE public.contracts SET salary=1800000,contract_type='fijo',end_date=current_date+90 WHERE id='ac000000-0000-4000-8000-000000000072';
SELECT pg_temp.denied($q$SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000093","revision":1}')$q$,'Las condiciones cambiaron');
UPDATE public.employee_work_info SET operation_center_id='ac000000-0000-4000-8000-000000000031',position_id='ac000000-0000-4000-8000-000000000032',position_name='Nuevo cargo'
WHERE employee_id='ac000000-0000-4000-8000-000000000042' AND is_current;
UPDATE public.employee_time_config SET work_schedule_id='ac000000-0000-4000-8000-000000000061' WHERE employee_id='ac000000-0000-4000-8000-000000000042' AND is_active;
RESET ROLE;
SELECT pg_temp.assert((SELECT status='needs_review' AND signed_path IS NOT NULL FROM amendment_private.records WHERE id='ac000000-0000-4000-8000-000000000091'),'conflicting scheduled salary retained for review');
SELECT pg_temp.assert((SELECT status='scheduled' FROM amendment_private.records WHERE id='ac000000-0000-4000-8000-000000000092'),'unrelated scheduled rest day retained');
SELECT pg_temp.assert((SELECT (before_values#>>'{salary,amount}')::numeric=1600000 AND (changes#>>'{salary,amount}')::numeric=1800000
  AND created_by='ac000000-0000-4000-8000-000000000001' AND (changes ? 'contract_type')
  FROM amendment_private.records WHERE cycle_id='ac000000-0000-4000-8000-000000000052' AND kind='direct' AND changes ? 'salary'),'direct contract audit');
SELECT pg_temp.assert((SELECT count(*)=2 FROM amendment_private.records WHERE cycle_id='ac000000-0000-4000-8000-000000000052' AND kind='direct' AND (changes ? 'center' OR changes ? 'schedule')),'direct workplace and schedule audit');
UPDATE amendment_private.records SET effective_on=(now() AT TIME ZONE 'America/Bogota')::date WHERE id='ac000000-0000-4000-8000-000000000092';
SELECT amendment_private.apply_record('ac000000-0000-4000-8000-000000000092');
SELECT pg_temp.assert((SELECT salary=1800000 AND contract_type='fijo' FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000072'),'unrelated amendment preserves contract edits');
SET LOCAL ROLE authenticated;
SELECT public.employee_amendment_command('save',jsonb_build_object('id','ac000000-0000-4000-8000-000000000094','employee_id','ac000000-0000-4000-8000-000000000042','kind','correction','effective_on',(now() AT TIME ZONE 'America/Bogota')::date-2,'reason','Corrección retroactiva antes de edición','changes','{"salary":{"amount":1700000}}'::jsonb,'declared_before','{"salary":{"amount":1600000}}'::jsonb));
SELECT public.employee_amendment_command('confirm','{"id":"ac000000-0000-4000-8000-000000000094","revision":1}');
SELECT pg_temp.assert(public.employee_amendments('ac000000-0000-4000-8000-000000000042',(now() AT TIME ZONE 'America/Bogota')::date-1)#>>'{snapshot,salary,amount}'='1700000','retro history before direct salary');
SELECT pg_temp.assert((public.employee_amendments('ac000000-0000-4000-8000-000000000042',(now() AT TIME ZONE 'America/Bogota')::date)#>>'{snapshot,salary,amount}')::numeric=1800000,'dated direct salary remains');
UPDATE public.employee_schedule SET rest_day='sabado' WHERE employee_id='ac000000-0000-4000-8000-000000000042' AND is_current;
RESET ROLE;
SELECT pg_temp.assert((SELECT salary=1800000 FROM public.contracts WHERE id='ac000000-0000-4000-8000-000000000072'),'retro cannot overwrite later direct salary');
SELECT set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert(NOT EXISTS(
 SELECT 1 FROM jsonb_array_elements(public.employee_amendments('ac000000-0000-4000-8000-000000000042')->'records') AS r
 WHERE r->>'kind'='direct' AND (r->'changes' ? 'salary' OR r->'before_values' ? 'salary' OR r ? 'base_snapshot')
),'direct salaries omitted for unauthorized reader');
RESET ROLE;
SELECT 'employee_amendments: all assertions passed' AS result;
