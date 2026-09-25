-- Run only against the local test database. Every fixture is rolled back.
BEGIN;
CREATE FUNCTION pg_temp.assert(ok boolean,message text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'ASSERT: %',message; END IF; END $$;
CREATE FUNCTION pg_temp.denied(command text, expected text DEFAULT 'PCC01') RETURNS void LANGUAGE plpgsql AS $$
DECLARE code text; BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS code=RETURNED_SQLSTATE; END;
 IF code IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Expected %, got %: %',expected,code,command; END IF;
END $$;
CREATE FUNCTION pg_temp.denied_message(command text, expected_code text, expected_message text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE code text; message text; BEGIN
 BEGIN EXECUTE command; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS code=RETURNED_SQLSTATE,message=MESSAGE_TEXT; END;
 IF code IS DISTINCT FROM expected_code OR position(expected_message IN coalesce(message,''))=0 THEN
   RAISE EXCEPTION 'Expected % containing %, got %: %',expected_code,expected_message,code,message;
 END IF;
END $$;
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
VALUES('cc000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','payroll-cuts-test@example.invalid','','{}','{}',now(),now());
INSERT INTO public.companies(id,name,nit) VALUES('cc000000-0000-4000-8000-000000000010','Payroll cut test','CUT-TEST');
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES('cc000000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000010');
INSERT INTO public.user_roles(user_id,role) VALUES('cc000000-0000-4000-8000-000000000001','admin');
INSERT INTO public.custom_roles(id,company_id,name,is_system) VALUES('cc000000-0000-4000-8000-000000000020','cc000000-0000-4000-8000-000000000010','Cut test admin',true);
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES('cc000000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000020');
INSERT INTO public.operation_centers(id,company_id,name) VALUES('cc000000-0000-4000-8000-000000000030','cc000000-0000-4000-8000-000000000010','Centro de prueba');
INSERT INTO public.time_clock_center_settings(company_id,operation_center_id,tracking_start_date,enabled) VALUES('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030','2026-01-01',true);
INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name) VALUES('cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000010','CUT-TEST','Payroll','Test');
INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date) VALUES('cc000000-0000-4000-8000-000000000050','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040',1,'active','backfill','2020-01-01');
INSERT INTO public.employees_v2(id,company_id,document_number,first_name,last_name) VALUES('cc000000-0000-4000-8000-000000000041','cc000000-0000-4000-8000-000000000010','CUT-LEGACY','Legacy','Center');
INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,cycle_number,status,source,start_date) VALUES('cc000000-0000-4000-8000-000000000051','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000041',1,'active','backfill','2020-01-01');
INSERT INTO public.employee_work_info(employee_id,company_id,operation_center_id,employment_cycle_id,valid_from,hire_date,is_current,position_name) VALUES('cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030','cc000000-0000-4000-8000-000000000050','2020-01-01','2020-01-01',true,'Prueba');
INSERT INTO public.payroll_novelties(id,company_id,employee_id,novelty_date,novelty_type,hours) VALUES('cc000000-0000-4000-8000-000000000081','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','2026-01-05','jornada',2);
INSERT INTO public.employee_loans(id,company_id,employee_id,total_amount,total_with_interest,installments,installment_amount,remaining_balance,start_date,status) VALUES('cc000000-0000-4000-8000-000000000060','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040',1000,1000,10,100,1000,'2026-01-01','activo');
INSERT INTO public.employee_deductions(id,company_id,employee_id,deduction_type,description,amount,start_date) VALUES('cc000000-0000-4000-8000-000000000070','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','otro','Test',100,'2026-01-01');
INSERT INTO public.payroll_novelties(id,company_id,employee_id,novelty_date,novelty_type,hours) VALUES('cc000000-0000-4000-8000-000000000080','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','2026-01-10','jornada',2);
INSERT INTO public.time_clock_days(id,company_id,employee_id,employment_cycle_id,operation_center_id,work_date,status) VALUES('cc000000-0000-4000-8000-000000000090','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000050','cc000000-0000-4000-8000-000000000030','2026-01-10','open');
SELECT set_config('request.jwt.claims','{"sub":"cc000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
INSERT INTO public.work_schedules(id,company_id,name,start_time,end_time) VALUES('cc000000-0000-4000-8000-000000000100','cc000000-0000-4000-8000-000000000010','Horario prueba','08:00','16:00');
-- Reproduce an imported configuration created before its labor history. The
-- later work row starts after the configuration, but the cycle has one center.
INSERT INTO public.employee_time_config(id,employee_id,company_id,employment_cycle_id,mode,work_schedule_id,start_date,is_active) VALUES('cc000000-0000-4000-8000-000000000130','cc000000-0000-4000-8000-000000000041','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000051','administrative','cc000000-0000-4000-8000-000000000100','2026-01-01',true);
INSERT INTO public.employee_work_info(employee_id,company_id,operation_center_id,employment_cycle_id,valid_from,hire_date,is_current,position_name) VALUES('cc000000-0000-4000-8000-000000000041','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030','cc000000-0000-4000-8000-000000000051','2026-02-01','2020-01-01',true,'Prueba histórica');
INSERT INTO public.shifts(id,company_id,name,start_time,end_time) VALUES('cc000000-0000-4000-8000-000000000110','cc000000-0000-4000-8000-000000000010','Turno prueba','08:00','16:00');
INSERT INTO public.employee_shift_assignments(id,company_id,employee_id,shift_id,assignment_date) VALUES('cc000000-0000-4000-8000-000000000120','cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000110','2026-01-10');
SELECT public.payroll_set_time_config('cc000000-0000-4000-8000-000000000010','{"employee_id":"cc000000-0000-4000-8000-000000000040","mode":"administrative","work_schedule_id":"cc000000-0000-4000-8000-000000000100","start_date":"2026-01-01"}');
UPDATE public.payroll_novelties SET created_by=auth.uid() WHERE company_id='cc000000-0000-4000-8000-000000000010';
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied_message($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-15','Unresolved center test')$q$,'23514','Configuraciones de jornada: Legacy Center (CUT-LEGACY)');
SELECT pg_temp.assert((SELECT sum(unresolved_count)=0 FROM public.payroll_cut_resolve_centers('cc000000-0000-4000-8000-000000000010')),'center repair uses labor evidence');
SELECT pg_temp.assert((SELECT operation_center_id='cc000000-0000-4000-8000-000000000030' FROM public.employee_time_config WHERE id='cc000000-0000-4000-8000-000000000130'),'legacy time config uses unique employment-cycle center');
SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-15','Prueba operativo');
SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',2::smallint,'create','2026-01-10','Prueba superior');
SELECT pg_temp.assert((SELECT count(*)=2 FROM public.payroll_control_cut_events),'audit events');
SELECT pg_temp.denied($q$SELECT public.time_clock_refresh_absences('cc000000-0000-4000-8000-000000000010','2026-01-10')$q$);
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-15','Duplicate attempt')$q$,'23505');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'update',current_date+2,'Future date')$q$,'22023');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-15','x')$q$,'22023');
SELECT pg_temp.denied($q$UPDATE public.employee_shift_assignments SET assignment_date='2026-02-01' WHERE id='cc000000-0000-4000-8000-000000000120'$q$);
SELECT pg_temp.denied($q$UPDATE public.shifts SET start_time='09:00' WHERE id='cc000000-0000-4000-8000-000000000110'$q$);
SELECT pg_temp.denied($q$UPDATE public.work_schedules SET start_time='09:00' WHERE id='cc000000-0000-4000-8000-000000000100'$q$);
SELECT public.payroll_set_time_config('cc000000-0000-4000-8000-000000000010','{"employee_id":"cc000000-0000-4000-8000-000000000040","mode":"administrative","work_schedule_id":"cc000000-0000-4000-8000-000000000100","start_date":"2026-01-16"}');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.employee_time_config WHERE employee_id='cc000000-0000-4000-8000-000000000040' AND start_date='2026-01-01' AND end_date='2026-01-15'),'historical schedule interval');
SELECT pg_temp.denied($q$INSERT INTO public.employee_shift_assignments(company_id,employee_id,shift_id,assignment_date) VALUES('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000110','2026-02-01'),('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000110','2026-01-15')$q$);
SELECT pg_temp.assert(NOT EXISTS(SELECT 1 FROM public.employee_shift_assignments WHERE employee_id='cc000000-0000-4000-8000-000000000040' AND assignment_date='2026-02-01'),'bulk operation rolled back');
SELECT pg_temp.denied($q$UPDATE public.payroll_novelties SET novelty_date='2026-02-01' WHERE id='cc000000-0000-4000-8000-000000000080'$q$);
SELECT pg_temp.denied($q$DELETE FROM public.payroll_novelties WHERE id='cc000000-0000-4000-8000-000000000080'$q$);
SELECT pg_temp.denied($q$INSERT INTO public.payroll_novelties(company_id,employee_id,novelty_date,novelty_type,hours) VALUES('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','2026-01-15','jornada',2)$q$);
INSERT INTO public.payroll_novelties(company_id,employee_id,novelty_date,novelty_type,hours) VALUES('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','2026-01-16','jornada',2);
SELECT pg_temp.denied($q$UPDATE public.employee_loans SET remaining_balance=1 WHERE id='cc000000-0000-4000-8000-000000000060'$q$);
SELECT public.payroll_register_loan_payment('cc000000-0000-4000-8000-000000000060','2026-01-16',100,NULL,NULL,'cc000000-0000-4000-8000-000000000061');
SELECT public.payroll_register_loan_payment('cc000000-0000-4000-8000-000000000060','2026-01-16',100,NULL,NULL,'cc000000-0000-4000-8000-000000000061');
SELECT pg_temp.assert((SELECT remaining_balance=900 AND paid_installments=1 FROM public.employee_loans WHERE id='cc000000-0000-4000-8000-000000000060'),'atomic idempotent payment');
SELECT pg_temp.denied($q$SELECT public.payroll_register_loan_payment('cc000000-0000-4000-8000-000000000060','2026-01-15',100)$q$);
SELECT pg_temp.denied($q$UPDATE public.employee_deductions SET amount=200 WHERE id='cc000000-0000-4000-8000-000000000070'$q$);
SELECT public.payroll_version_deduction('cc000000-0000-4000-8000-000000000070','2026-01-16','{"amount":200}');
SELECT pg_temp.assert((SELECT amount=100 AND end_date='2026-01-15' FROM public.employee_deductions WHERE id='cc000000-0000-4000-8000-000000000070'),'deduction history preserved');
SELECT pg_temp.assert((SELECT count(*)=1 FROM public.employee_deductions WHERE previous_version_id='cc000000-0000-4000-8000-000000000070' AND amount=200 AND start_date='2026-01-16'),'future deduction');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'update','2026-01-09','Below superior', (SELECT id FROM public.payroll_control_cuts WHERE company_id='cc000000-0000-4000-8000-000000000010' AND level=1 AND active))$q$,'42501');
SELECT public.payroll_cut_change(company_id,operation_center_id,level,'reopen',NULL,'Reabrir operativo',id) FROM public.payroll_control_cuts WHERE company_id='cc000000-0000-4000-8000-000000000010' AND level=1 AND active;
SELECT pg_temp.denied($q$UPDATE public.payroll_novelties SET hours=3 WHERE id='cc000000-0000-4000-8000-000000000080'$q$);
RESET ROLE;
SELECT pg_temp.denied($q$UPDATE public.time_clock_days SET status='complete' WHERE id='cc000000-0000-4000-8000-000000000090'$q$);
SELECT time_clock_private.refresh_date('cc000000-0000-4000-8000-000000000030','2026-01-10');
SELECT pg_temp.assert((SELECT status='open' FROM public.time_clock_days WHERE id='cc000000-0000-4000-8000-000000000090'),'automatic refresh preserves closed pending day');
SELECT pg_temp.denied($q$INSERT INTO public.time_clock_events(company_id,employee_id,employment_cycle_id,operation_center_id,day_id,action,source,occurred_at) VALUES('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000040','cc000000-0000-4000-8000-000000000050','cc000000-0000-4000-8000-000000000030','cc000000-0000-4000-8000-000000000090','clock_out','supervised','2026-01-11T06:00:00Z')$q$);
SELECT pg_temp.denied($q$SELECT public.payroll_refinance_loan('cc000000-0000-4000-8000-000000000060',12,1,'2026-02-01',900,'Intento cerrado')$q$);
-- Failed audit must roll back the entire cut, including its active flag.
CREATE FUNCTION pg_temp.fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END $$;
CREATE TRIGGER fixture_audit_failure BEFORE INSERT ON public.payroll_control_cut_events FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_audit();
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-20','Atomic audit test')$q$,'P0001');
SELECT pg_temp.assert(NOT EXISTS(SELECT 1 FROM public.payroll_control_cuts WHERE company_id='cc000000-0000-4000-8000-000000000010' AND level=1 AND active),'failed audit rolls back cut');
RESET ROLE;
DROP TRIGGER fixture_audit_failure ON public.payroll_control_cut_events;
-- A failure after the payment insert must not leave a payment or a trusted context.
CREATE TRIGGER fixture_payment_failure AFTER UPDATE ON public.employee_loans FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_audit();
SET LOCAL ROLE authenticated;
SELECT pg_temp.denied($q$SELECT public.payroll_register_loan_payment('cc000000-0000-4000-8000-000000000060','2026-01-17',100,NULL,NULL,'cc000000-0000-4000-8000-000000000062')$q$,'P0001');
SELECT pg_temp.assert(NOT EXISTS(SELECT 1 FROM public.employee_loan_payments WHERE id='cc000000-0000-4000-8000-000000000062'),'failed payment rolled back');
RESET ROLE;
DROP TRIGGER fixture_payment_failure ON public.employee_loans;
SELECT pg_temp.assert(NOT EXISTS(SELECT 1 FROM payroll_private.write_context WHERE tx=txid_current()),'no leaked write context');
SELECT pg_temp.assert(NOT has_table_privilege('authenticated','public.payroll_control_cuts','INSERT'),'no direct cuts write');
SELECT pg_temp.assert(NOT has_table_privilege('authenticated','public.payroll_control_cut_events','INSERT'),'no audit forgery');
SELECT pg_temp.assert(NOT has_function_privilege('anon','public.payroll_cut_change(uuid,uuid,smallint,text,date,text,uuid)','EXECUTE'),'no anonymous RPC');
-- Revoking full access leaves only explicitly assigned level-one rights.
DELETE FROM public.user_roles WHERE user_id='cc000000-0000-4000-8000-000000000001';
UPDATE public.custom_roles SET is_system=false WHERE id='cc000000-0000-4000-8000-000000000020';
INSERT INTO public.role_permissions(role_id,permission_id) SELECT 'cc000000-0000-4000-8000-000000000020',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id WHERE m.code IN('cortes_control','cortes_control_nivel_uno');
SET LOCAL ROLE authenticated;
SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-10','Igual al superior');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change(company_id,operation_center_id,level,'reopen',NULL,'No tiene permiso superior',id) FROM public.payroll_control_cuts WHERE company_id='cc000000-0000-4000-8000-000000000010' AND level=2 AND active$q$,'42501');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_centers('cc000000-0000-4000-8000-000000000999')$q$,'42501');
RESET ROLE;
INSERT INTO public.operation_centers(id,company_id,name) VALUES('cc000000-0000-4000-8000-000000000031','cc000000-0000-4000-8000-000000000010','Otro centro');
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES('cc000000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000031');
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.payroll_control_cuts),'assigned center isolates cuts');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_change('cc000000-0000-4000-8000-000000000010','cc000000-0000-4000-8000-000000000030',1::smallint,'create','2026-01-20','Other center forbidden')$q$,'42501');
RESET ROLE;
DELETE FROM public.role_permissions WHERE role_id='cc000000-0000-4000-8000-000000000020';
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert((SELECT count(*)=0 FROM public.payroll_control_cuts),'revoked read grant');
SELECT pg_temp.denied($q$SELECT public.payroll_cut_centers('cc000000-0000-4000-8000-000000000010')$q$,'42501');
SELECT 'PASS payroll control cuts';
ROLLBACK;
