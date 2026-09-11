// Integration test against the local Supabase container only. All owned fixtures are removed.
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const container = process.env.REQUISITION_TEST_CONTAINER || 'supabase_db_qmfyecdeiupgscegxbmo';
const args = ['exec', '-i', container, 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'];
const sql = query => {
  const result = spawnSync('docker', args, { input: query, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
  return result.stdout;
};
const id = Object.fromEntries(['company','user','role','request','step'].map(k => [k, randomUUID()]));
const claims = `SELECT set_config('request.jwt.claims','{"sub":"${id.user}","role":"authenticated"}',true);`;
const approve = `SELECT id FROM public.approve_requisition_step('${id.request}','${id.step}',true);`;
let seeded = false;
try {
  sql(`BEGIN;
    INSERT INTO auth.users(id,instance_id,aud,role,email,encrypted_password,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
      VALUES ('${id.user}','00000000-0000-0000-0000-000000000000','authenticated','authenticated','workflow-${id.user}@example.com','','{}','{}',now(),now());
    INSERT INTO public.companies(id,name,nit) VALUES ('${id.company}','Workflow concurrency test','${id.company}');
    INSERT INTO public.user_company_assignments(user_id,company_id) VALUES ('${id.user}','${id.company}');
    INSERT INTO public.custom_roles(id,company_id,name) VALUES ('${id.role}','${id.company}','Workflow test role');
    INSERT INTO public.user_custom_roles(user_id,role_id) VALUES ('${id.user}','${id.role}');
    INSERT INTO public.role_permissions(role_id,permission_id) SELECT '${id.role}',p.id FROM public.permissions p
      JOIN public.modules m ON m.id=p.module_id WHERE m.code='req_workflow_config' AND p.action='update';
    ${claims}
    SELECT id FROM public.publish_requisition_workflow('${id.company}',
      '[{"id":"${id.step}","name":"Finance","kind":"custom","role_ids":["${id.role}"],"fields":[]}]');
    INSERT INTO public.personnel_requisitions(id,company_id,cargo_solicitado,motivo_solicitud,solicitante_nombre,created_by,solicitante_id,lider_proceso)
      VALUES ('${id.request}','${id.company}','Test position','nuevo_cargo','Requester','${id.user}','${id.user}','Leader');
    SELECT id FROM public.submit_requisition('${id.request}');
    COMMIT;`);
  seeded = true;
  let second;
  let startedSecond = false;
  const first = spawn('docker', args);
  let firstOutput = '', firstError = '';
  first.stdout.on('data', chunk => {
    firstOutput += chunk;
    if (!startedSecond && firstOutput.includes('APPROVAL_LOCK_HELD')) {
      startedSecond = true;
      second = new Promise(resolve => {
        const process = spawn('docker', args);
        let stderr = '';
        process.stderr.on('data', chunk => { stderr += chunk; });
        process.on('close', code => resolve({ code, stderr }));
        process.stdin.end(`BEGIN; SET LOCAL ROLE authenticated; ${claims} ${approve} COMMIT;`);
      });
    }
  });
  first.stderr.on('data', chunk => { firstError += chunk; });
  const firstDone = new Promise(resolve => first.on('close', resolve));
  first.stdin.end(`BEGIN; SET LOCAL ROLE authenticated; ${claims} ${approve}
    SELECT 'APPROVAL_LOCK_HELD'; SELECT pg_sleep(1); COMMIT;`);
  assert.equal(await firstDone, 0, firstError);
  assert.ok(startedSecond, 'second transaction started while the approval lock was held');
  const secondResult = await second;
  assert.notEqual(secondResult.code, 0, 'a second concurrent approval must fail');
  assert.match(secondResult.stderr, /ya no est|fuera de secuencia/i);
  const decisions = sql(`SELECT count(*) FROM public.requisition_step_executions WHERE requisition_id='${id.request}' AND approved=true;`).trim();
  assert.equal(decisions, '1', 'only one decision is recorded');
  console.log('PASS: concurrent approvals record exactly one decision; the other transaction is rejected.');
} finally {
  if (seeded) sql(`BEGIN;
    DELETE FROM public.personnel_requisitions WHERE id='${id.request}';
    DELETE FROM public.requisition_workflow_settings WHERE company_id='${id.company}';
    DELETE FROM public.requisition_workflow_versions WHERE company_id='${id.company}';
    DELETE FROM public.custom_roles WHERE id='${id.role}';
    DELETE FROM auth.users WHERE id='${id.user}';
    DELETE FROM public.companies WHERE id='${id.company}';
    COMMIT;`);
}
