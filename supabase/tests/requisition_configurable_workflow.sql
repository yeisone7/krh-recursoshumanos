BEGIN;
SELECT no_plan();
GRANT SELECT, UPDATE ON public.personnel_requisitions TO authenticated;
-- Local databases may lack seeded legacy permission catalog entries.
INSERT INTO public.modules(code,name) VALUES ('req_approve_seleccion','Selección') ON CONFLICT (code) DO NOTHING;
INSERT INTO public.permissions(module_id,action) SELECT id,'approve' FROM public.modules WHERE code='req_approve_seleccion' ON CONFLICT DO NOTHING;
INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
SELECT ('b1000000-0000-0000-0000-00000000000'||n)::uuid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  'workflow-test-'||n||'@example.com','',now(),'{}','{}',now(),now() FROM generate_series(1,3) n;
INSERT INTO public.companies(id,name,nit) VALUES
  ('b2000000-0000-0000-0000-000000000001','Workflow company A','WFTESTA'),
  ('b2000000-0000-0000-0000-000000000002','Workflow company B','WFTESTB');
INSERT INTO public.user_company_assignments(user_id,company_id) VALUES
  ('b1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000002');
INSERT INTO public.custom_roles(id,company_id,name) VALUES
  ('b3000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Workflow publisher'),
  ('b3000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000001','Finance'),
  ('b3000000-0000-0000-0000-000000000003','b2000000-0000-0000-0000-000000000002','Other company');
INSERT INTO public.user_custom_roles(user_id,role_id) SELECT
  ('b1000000-0000-0000-0000-00000000000'||n)::uuid,('b3000000-0000-0000-0000-00000000000'||n)::uuid FROM generate_series(1,3) n;
INSERT INTO public.role_permissions(role_id,permission_id)
  SELECT 'b3000000-0000-0000-0000-000000000001',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id
  WHERE (m.code='req_workflow_config' AND p.action='update') OR (m.code='requisiciones' AND p.action IN ('create','update'));
INSERT INTO public.role_permissions(role_id,permission_id)
  SELECT 'b3000000-0000-0000-0000-000000000003',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id
  WHERE m.code='req_workflow_config' AND p.action='update';
INSERT INTO public.role_permissions(role_id,permission_id)
  SELECT 'b3000000-0000-0000-0000-000000000002',p.id FROM public.permissions p JOIN public.modules m ON m.id=p.module_id
  WHERE m.code='req_approve_seleccion' AND p.action='approve';
INSERT INTO public.vacancy_publication_platforms(id,company_id,name) VALUES ('b7000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Test platform');
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
INSERT INTO public.personnel_requisitions(id,company_id,cargo_solicitado,motivo_solicitud,solicitante_nombre,created_by,solicitante_id,lider_proceso,is_confidential)
SELECT ('b4000000-0000-0000-0000-00000000000'||n)::uuid,'b2000000-0000-0000-0000-000000000001','Test position','nuevo_cargo','Publisher',
  'b1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','Leader',true FROM generate_series(1,3) n;
SELECT set_config('test.workflow_steps','[
  {"id":"b5000000-0000-0000-0000-000000000001","kind":"custom","name":"Finanzas","role_ids":["b3000000-0000-0000-0000-000000000002"],"fields":[
    {"id":"b6000000-0000-0000-0000-000000000001","type":"number","label":"Presupuesto","required":true},
    {"id":"b6000000-0000-0000-0000-000000000002","type":"boolean","label":"Anticipo","required":true}]},
  {"id":"b5000000-0000-0000-0000-000000000002","kind":"seleccion","name":"Selección","role_ids":[],"fields":[]}
]',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',current_setting('test.workflow_steps')::jsonb)$$,'delegated publisher can publish');
SELECT throws_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',current_setting('test.workflow_steps')::jsonb)$$,'40001',NULL,'concurrent stale publication is rejected');
SELECT throws_ok($$UPDATE public.personnel_requisitions SET estado_requisicion='en_coordinadores' WHERE id='b4000000-0000-0000-0000-000000000001'$$,NULL,NULL,'direct submission cannot bypass configured cycle');
SELECT lives_ok($$SELECT public.submit_requisition('b4000000-0000-0000-0000-000000000001')$$,'configured submission needs no autoriza');
SELECT throws_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001','[]', (SELECT active_version_id FROM public.requisition_workflow_settings WHERE company_id='b2000000-0000-0000-0000-000000000001'))$$,'23514',NULL,'cannot publish an empty cycle');
SELECT throws_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',jsonb_build_array(current_setting('test.workflow_steps')::jsonb->1,current_setting('test.workflow_steps')::jsonb->0), (SELECT active_version_id FROM public.requisition_workflow_settings WHERE company_id='b2000000-0000-0000-0000-000000000001'))$$,NULL,NULL,'selection cannot be placed before another stage');
SELECT throws_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',jsonb_set(current_setting('test.workflow_steps')::jsonb,'{0,role_ids}','["b3000000-0000-0000-0000-000000000003"]'), (SELECT active_version_id FROM public.requisition_workflow_settings WHERE company_id='b2000000-0000-0000-0000-000000000001'))$$,NULL,NULL,'role from another company rejected');
SELECT is((SELECT estado_requisicion::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),'en_aprobacion','starts at custom first step');
RESET ROLE;
SELECT throws_ok($$INSERT INTO public.vacancies(company_id,position_title,requisition_id) VALUES ('b2000000-0000-0000-0000-000000000001','Early vacancy','b4000000-0000-0000-0000-000000000001')$$,'23514',NULL,'cannot create vacancies before final selection');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.submit_requisition('b4000000-0000-0000-0000-000000000001')$$,'40001',NULL,'duplicate submission rejected');
SELECT throws_ok($$UPDATE public.personnel_requisitions SET rrhh_aprobado=true WHERE id='b4000000-0000-0000-0000-000000000001'$$,'42501',NULL,'cannot forge standard approval');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001',true)$$,'42501',NULL,'publisher is not an approver');
SELECT set_config('test.version1',(SELECT active_version_id::text FROM public.requisition_workflow_settings WHERE company_id='b2000000-0000-0000-0000-000000000001'),true);
SELECT lives_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',jsonb_build_array(jsonb_set(current_setting('test.workflow_steps')::jsonb->0,'{name}','"Tesorería"')),current_setting('test.version1')::uuid)$$,'publish second version without selection');
SELECT is((SELECT workflow_version_id::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),current_setting('test.version1'),'pending request retains version');
SELECT lives_ok($$SELECT public.submit_requisition('b4000000-0000-0000-0000-000000000002')$$,'next submission uses latest version');
SELECT lives_ok($$SELECT public.submit_requisition('b4000000-0000-0000-0000-000000000003')$$,'second request with no selection');
SELECT isnt((SELECT workflow_version_id::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000002'),current_setting('test.version1'),'new version assigned');
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
SELECT is((SELECT count(*)::int FROM public.requisition_workflow_settings WHERE company_id='b2000000-0000-0000-0000-000000000001'),0,'settings isolated by company');
SELECT is((SELECT count(*)::int FROM public.requisition_step_executions),0,'history isolated by company');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001',true)$$,'42501',NULL,'other company cannot approve');
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
SELECT ok(public.has_requisition_workflow_assignment('b2000000-0000-0000-0000-000000000001'),'custom role grants module access');
SELECT throws_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000001',current_setting('test.workflow_steps')::jsonb)$$,'42501',NULL,'approver cannot configure the cycle');
RESET ROLE;
INSERT INTO public.operation_centers(id,company_id,name,code) VALUES ('b8000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','Restricted center','WFT');
INSERT INTO public.user_center_assignments(user_id,operation_center_id) VALUES ('b1000000-0000-0000-0000-000000000002','b8000000-0000-0000-0000-000000000001');
SELECT ok(NOT public.can_approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001'),'custom role does not bypass assigned center restrictions');
DELETE FROM public.user_center_assignments WHERE user_id='b1000000-0000-0000-0000-000000000002';
SET LOCAL ROLE authenticated;
SELECT is((SELECT count(*)::int FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),1,'current custom approver sees confidential request');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000002',true)$$,'42501',NULL,'cannot skip to selection');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001',true)$$,NULL,NULL,'required fields checked on server');
SELECT lives_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001',true,'Accepted','{"b6000000-0000-0000-0000-000000000001":0,"b6000000-0000-0000-0000-000000000002":false}')$$,'zero and false are valid answers');
SELECT is((SELECT estado_requisicion::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),'en_seleccion','selection enables vacancy compatibility');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000001',true)$$,'42501',NULL,'duplicate approval rejected');
SELECT throws_ok($$UPDATE public.requisition_step_executions SET approved=false$$,'42501',NULL,'history cannot be edited directly');
SELECT throws_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000002',true)$$,NULL,NULL,'standard selection fields remain required');
SELECT lives_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000001','b5000000-0000-0000-0000-000000000002',true,'Done','{}','{"seleccion_fecha_inicio_proceso":"2026-09-11","seleccion_tipo_mano_obra":"directa"}', '[{"platform_id":"b7000000-0000-0000-0000-000000000001","codigo_vacante_externa":"TEST-1","fecha_creacion":"2026-09-11","fecha_cierre":null}]')$$,'standard step and vacancy codes approve atomically');
SELECT lives_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000002','b5000000-0000-0000-0000-000000000001',false,'Rejected')$$,'rejection permits missing required fields');
SELECT lives_ok($$SELECT public.approve_requisition_step('b4000000-0000-0000-0000-000000000003','b5000000-0000-0000-0000-000000000001',true,'Done','{"b6000000-0000-0000-0000-000000000001":0,"b6000000-0000-0000-0000-000000000002":false}')$$,'a cycle without selection completes after final custom approval');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.requisition_vacancy_codes WHERE requisition_id='b4000000-0000-0000-0000-000000000001' AND codigo_vacante_externa='TEST-1'),1,'selection vacancy code persisted');
SELECT lives_ok($$INSERT INTO public.vacancies(company_id,position_title,requisition_id) VALUES ('b2000000-0000-0000-0000-000000000001','Approved vacancy','b4000000-0000-0000-0000-000000000003')$$,'no-selection approved cycle permits vacancies');
SELECT is((SELECT estado_requisicion::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),'aprobada','last step completes the cycle');
SELECT ok((SELECT seleccion_aprobado AND seleccion_aprobador_id='b1000000-0000-0000-0000-000000000002' FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000001'),'standard audit columns synchronized');
SELECT is((SELECT estado_requisicion::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000002'),'rechazada','rejection is terminal');
SELECT throws_ok($$UPDATE public.custom_roles SET is_active=false WHERE id='b3000000-0000-0000-0000-000000000002'$$,'23514',NULL,'published roles protected against deactivation');
SELECT throws_ok($$DELETE FROM public.custom_roles WHERE id='b3000000-0000-0000-0000-000000000002'$$,'23514',NULL,'published roles protected against deletion');
SELECT ok(NOT has_function_privilege('anon','public.submit_requisition(uuid)','execute'),'anonymous RPC denied');
SELECT ok(NOT has_table_privilege('anon','public.requisition_workflow_versions','select'),'anonymous table access denied');
-- Existing legacy requests keep their original route even after their company publishes.
INSERT INTO public.personnel_requisitions(id,company_id,cargo_solicitado,motivo_solicitud,solicitante_nombre,created_by,solicitante_id,lider_proceso,autoriza)
VALUES ('b4000000-0000-0000-0000-000000000009','b2000000-0000-0000-0000-000000000002','Legacy position','nuevo_cargo','Legacy requester','b1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000003','Leader','gerencia_operaciones');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000003","role":"authenticated"}',true);
SELECT lives_ok($$SELECT public.submit_requisition('b4000000-0000-0000-0000-000000000009')$$,'company without configuration retains legacy submission');
SELECT lives_ok($$SELECT public.publish_requisition_workflow('b2000000-0000-0000-0000-000000000002','[{"id":"b5000000-0000-0000-0000-000000000009","kind":"custom","name":"Dirección","role_ids":["b3000000-0000-0000-0000-000000000003"],"fields":[]}]')$$,'second company publishes its own distinct cycle');
SELECT is((SELECT workflow_version_id FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000009'),NULL::uuid,'legacy request not reassigned after publication');
SELECT is((SELECT estado_requisicion::text FROM public.personnel_requisitions WHERE id='b4000000-0000-0000-0000-000000000009'),'en_coordinadores','legacy current stage preserved');
SELECT * FROM finish();
ROLLBACK;
