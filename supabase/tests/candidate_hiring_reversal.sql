BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('91000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reversal-admin@example.com','',now(),'{}','{}',now(),now()),
('91000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reversal-user@example.com','',now(),'{}','{}',now(),now());
INSERT INTO public.super_admins(user_id) VALUES('91000000-0000-0000-0000-000000000001');
SELECT set_config('request.jwt.claims','{"sub":"91000000-0000-0000-0000-000000000001","email":"reversal-admin@example.com","role":"authenticated"}',true);
INSERT INTO public.companies(id,name,nit) VALUES('92000000-0000-0000-0000-000000000001','Reversiones TEST','900919191');
INSERT INTO public.operation_centers(id,company_id,name) VALUES('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Centro TEST');
INSERT INTO public.vacancies(id,company_id,operation_center_id,position_title,status) VALUES('94000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','Cargo no ingreso TEST','pending_placed');
INSERT INTO public.candidates(id,vacancy_id,company_id,first_name,last_name,document_number,status) VALUES('95000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Candidato','No ingreso TEST','919191919','applied');
INSERT INTO public.employees_v2(id,company_id,first_name,last_name,document_number,status,is_active) VALUES('96000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Candidato','No ingreso TEST','919191919','active',true);
INSERT INTO public.employee_employment_cycles(id,company_id,employee_id,candidate_id,cycle_number,status,source,start_date) VALUES('97000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000001',1,'active','selection',current_date);
INSERT INTO public.employee_work_info(employee_id,company_id,operation_center_id,employment_cycle_id,position_name,hire_date) VALUES('96000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001','Cargo TEST',current_date);
UPDATE public.candidates SET status='hired',is_selected=true,employee_id='96000000-0000-0000-0000-000000000001' WHERE id='95000000-0000-0000-0000-000000000001';
INSERT INTO public.contracts(id,company_id,employee_id,employment_cycle_id,contract_number,contract_type,start_date,salary) VALUES('98000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001','CT-TEST-NO-INGRESO','indefinido',current_date,2000000);
INSERT INTO public.employee_documents(company_id,employee_id,employment_cycle_id,document_name,document_type,file_url,file_name) VALUES('92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001','Documento TEST','cedula','company/employees/test/document.pdf','document.pdf');
INSERT INTO public.medical_exams(company_id,employee_id,employment_cycle_id,exam_type,exam_date,result,concept,provider,doctor_name,document_url) VALUES('92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001','97000000-0000-0000-0000-000000000001','ingreso',current_date,'apto','Apto TEST','IPS TEST','Médico TEST','company/employees/test/examen.pdf');
INSERT INTO public.selection_steps(company_id,candidate_id,step_type,step_order,status,notes) VALUES('92000000-0000-0000-0000-000000000001','95000000-0000-0000-0000-000000000001','prefiltro',1,'passed','Historia intacta');

CREATE FUNCTION pg_temp.preview_reversal() RETURNS jsonb LANGUAGE sql AS $$
 SELECT public.preview_candidate_hiring_reversal('95000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001');
$$;
CREATE TEMP TABLE reviewed AS SELECT pg_temp.preview_reversal() value;
GRANT SELECT ON reviewed TO authenticated;
CREATE FUNCTION pg_temp.reverse_hiring(reason text DEFAULT 'No se presentó al ingreso',doc text DEFAULT '919191919',token text DEFAULT NULL) RETURNS jsonb LANGUAGE sql AS $$
 SELECT public.revert_candidate_hiring('95000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000001',coalesce(token,(SELECT value->>'review_token' FROM reviewed)),reason,doc);
$$;
SET LOCAL ROLE authenticated;
SELECT is((SELECT value->>'documents_to_preserve' FROM reviewed),'2','preview includes documents and medical attachments');
SELECT is((SELECT value->>'vacancy_status_after' FROM reviewed),'in_process','preview reopens the vacancy');
SELECT is((SELECT count(*) FROM public.candidate_hiring_reversals),0::bigint,'preview makes no changes');
SELECT ok(NOT has_table_privilege('authenticated','private.candidate_hiring_reversal_archives','SELECT'),'archive cannot be read through authenticated role');
SELECT throws_like($$SELECT pg_temp.reverse_hiring('breve')$$,'%motivo de 10 a 2000%','reason required server-side');
SELECT throws_like($$SELECT pg_temp.reverse_hiring('No se presentó al ingreso','000')$$,'%documento de confirmación%','typed identity required server-side');
SELECT throws_like($$SELECT pg_temp.reverse_hiring('No se presentó al ingreso','919191919','stale')$$,'%información cambió%','stale preview rejected');
SELECT throws_like($$SELECT private.candidate_hiring_reversal('95000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001',NULL)$$,'%tipo de operación%','null operation cannot bypass confirmation');
RESET ROLE;

INSERT INTO public.candidates(id,vacancy_id,company_id,first_name,last_name,document_number,status) VALUES('95000000-0000-0000-0000-000000000002','94000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Otro','Candidato TEST','919191920','hired');
SELECT is(pg_temp.preview_reversal()->>'vacancy_status_after','pending_placed','another hire keeps vacancy status');
SELECT throws_like($$SELECT pg_temp.reverse_hiring()$$,'%información cambió%','another hire invalidates original review');
DELETE FROM public.candidates WHERE id='95000000-0000-0000-0000-000000000002';

UPDATE public.contracts SET is_approved=true WHERE id='98000000-0000-0000-0000-000000000001';
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%contrato aprobado%','approved contract blocks reversal');
UPDATE public.contracts SET is_approved=false WHERE id='98000000-0000-0000-0000-000000000001';
UPDATE public.vacancies SET status='closed' WHERE id='94000000-0000-0000-0000-000000000001';
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%sin cierre ni colocado%','closed vacancy blocked');
UPDATE public.vacancies SET status='pending_placed' WHERE id='94000000-0000-0000-0000-000000000001';
UPDATE public.candidates SET rehire_employee_id=employee_id WHERE id='95000000-0000-0000-0000-000000000001';
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%reingreso%','rehire protected');
UPDATE public.candidates SET rehire_employee_id=NULL WHERE id='95000000-0000-0000-0000-000000000001';

-- A newly introduced FK relation also blocks deletion by default.
CREATE TABLE public.reversal_test_activity(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),employee_ref uuid REFERENCES public.employees_v2(id) ON DELETE CASCADE);
INSERT INTO public.reversal_test_activity(employee_ref) VALUES('96000000-0000-0000-0000-000000000001');
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%reversal_test_activity%','unknown employee activity protected');
DELETE FROM public.reversal_test_activity;
CREATE TABLE public.reversal_test_contract_activity(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contract_ref uuid REFERENCES public.contracts(id) ON DELETE CASCADE);
INSERT INTO public.reversal_test_contract_activity(contract_ref) VALUES('98000000-0000-0000-0000-000000000001');
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%reversal_test_contract_activity%','unknown indirect activity protected');
DELETE FROM public.reversal_test_contract_activity;

SELECT set_config('request.jwt.claims','{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SET LOCAL ROLE authenticated;
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%Requiere actualizar Selección%','no permission cannot inspect or reverse');
SELECT is((SELECT count(*) FROM public.candidate_hiring_reversals),0::bigint,'unauthorized history is hidden');
RESET ROLE;
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES('91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000001');
INSERT INTO public.custom_roles(id,company_id,name) VALUES('99000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000001','Reversor TEST');
INSERT INTO public.user_custom_roles(user_id,role_id) VALUES('91000000-0000-0000-0000-000000000002','99000000-0000-0000-0000-000000000001');
INSERT INTO public.role_permissions(role_id,permission_id) SELECT '99000000-0000-0000-0000-000000000001',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id WHERE (m.code='seleccion' AND p.action::text IN ('update','view')) OR (m.code='empleados' AND p.action::text='delete');
INSERT INTO public.operation_centers(id,company_id,name) VALUES('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-000000000001','Centro ajeno TEST');
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES('91000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%No tiene acceso%','permissions alone do not bypass center scope');
RESET ROLE;
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES('91000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT pg_temp.preview_reversal()$$,'explicit permissions and center allow preview');
SELECT throws_like($$SELECT public.preview_candidate_hiring_reversal('95000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002')$$,'%Requiere actualizar Selección%','different company rejected');
RESET ROLE;

-- Fresh preview after all intervening record changes.
UPDATE reviewed SET value=pg_temp.preview_reversal();
-- A failure after copying documents/deleting the employee must roll everything back.
CREATE FUNCTION pg_temp.reject_reversal_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.action='revert_candidate_hiring' THEN RAISE EXCEPTION 'TEST audit failure'; END IF; RETURN NEW; END $$;
CREATE TRIGGER reversal_test_audit_failure BEFORE INSERT ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_reversal_audit();
SET LOCAL ROLE authenticated;
SELECT throws_like($$SELECT pg_temp.reverse_hiring()$$,'%TEST audit failure%','late failure rejects the transaction');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.employees_v2 WHERE id='96000000-0000-0000-0000-000000000001'),1::bigint,'late failure restores employee');
SELECT is((SELECT count(*) FROM public.candidate_hiring_reversals WHERE candidate_id='95000000-0000-0000-0000-000000000001'),0::bigint,'late failure restores receipts');
SELECT is((SELECT count(*) FROM public.candidate_documents WHERE candidate_id='95000000-0000-0000-0000-000000000001'),0::bigint,'late failure restores document copies');
DROP TRIGGER reversal_test_audit_failure ON public.audit_logs;
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT pg_temp.reverse_hiring()$$,'authorized reversal succeeds atomically');
SELECT is((SELECT status::text FROM public.candidates WHERE id='95000000-0000-0000-0000-000000000001'),'withdrawn','candidate withdrawn');
SELECT is((SELECT count(*) FROM public.candidate_documents WHERE candidate_id='95000000-0000-0000-0000-000000000001'),2::bigint,'document and medical attachment retained');
SELECT is((SELECT count(*) FROM public.candidate_hiring_reversals),1::bigint,'history visible within scope');
SELECT is((SELECT pg_temp.reverse_hiring()->>'existing'),'true','retry is idempotent');
SELECT is((SELECT count(*) FROM public.candidate_hiring_reversals),1::bigint,'retry does not duplicate receipt');
SELECT throws_like($$DELETE FROM public.candidate_hiring_reversals$$,'%permission denied%','receipt is immutable');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.employees_v2 WHERE id='96000000-0000-0000-0000-000000000001'),0::bigint,'employee removed');
SELECT is((SELECT count(*) FROM public.contracts WHERE id='98000000-0000-0000-0000-000000000001'),0::bigint,'unapproved contract removed');
SELECT is((SELECT status::text FROM public.vacancies WHERE id='94000000-0000-0000-0000-000000000001'),'in_process','vacancy reopened');
SELECT is((SELECT notes FROM public.selection_steps WHERE candidate_id='95000000-0000-0000-0000-000000000001'),'Historia intacta','selection history unchanged');
SELECT is((SELECT snapshot->'employee'->>'document_number' FROM private.candidate_hiring_reversal_archives WHERE reversal_id IN (SELECT id FROM public.candidate_hiring_reversals WHERE candidate_id='95000000-0000-0000-0000-000000000001')),'919191919','private employee snapshot preserved');
SELECT is((SELECT count(*) FROM public.audit_logs WHERE action='revert_candidate_hiring' AND entity_id='95000000-0000-0000-0000-000000000001'),1::bigint,'actor and reason audited');
SELECT set_config('request.jwt.claims','{}',true);
SELECT throws_like($$SELECT pg_temp.preview_reversal()$$,'%Debe iniciar sesión%','missing session denied');
SELECT * FROM finish();
ROLLBACK;
