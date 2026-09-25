// Two real PostgreSQL sessions, LOCAL container only. Never accepts a remote URL.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const args = ['exec', '-i', 'supabase_db_qmfyecdeiupgscegxbmo', 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'];
function sql(input) {
  const r = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.error?.message || r.stderr || 'Local PostgreSQL unavailable');
  return r.stdout.trim().split('\n').at(-1);
}
const company = 'dd000000-0000-4000-8000-000000000010';
const employee = 'dd000000-0000-4000-8000-000000000040';
const center = 'dd000000-0000-4000-8000-000000000030';
const actor = 'dd000000-0000-4000-8000-000000000001';
const reviewer = 'dd000000-0000-4000-8000-000000000002';
const ticket = 'dd000000-0000-4000-8000-000000000200';
const assignment = 'dd000000-0000-4000-8000-000000000120';
const claims = (id = actor) => `SELECT set_config('request.jwt.claims','{"sub":"${id}","role":"authenticated"}',true); SET LOCAL ROLE authenticated;`;
const write = (ops) => `SELECT public.payroll_correction_write('${company}','${JSON.stringify(ops).replaceAll("'", "''")}'::jsonb,'${ticket}');`;
const update = (shift) => write([{ module: 'jornadas', action: 'update', id: assignment, values: { shift_id: shift } }]);
async function race(first, second) {
  let follower;
  const writer = spawn('docker', args, { timeout: 20000 });
  let stdout = '', stderr = '';
  writer.stderr.on('data', c => { stderr += c; });
  writer.stdout.on('data', c => {
    stdout += c;
    if (!follower && stdout.includes('LOCK_HELD')) follower = new Promise((resolve, reject) => {
      const reader = spawn('docker', args, { timeout: 20000 }); let errors = '';
      reader.on('error', reject); reader.stderr.on('data', c => { errors += c; });
      reader.on('close', code => resolve({ code, errors }));
      reader.stdin.end(`BEGIN; SET LOCAL statement_timeout='12s'; ${claims()} ${second} COMMIT;`);
    });
  });
  const completed = new Promise((resolve, reject) => { writer.on('error', reject); writer.on('close', resolve); });
  writer.stdin.end(`BEGIN; SET LOCAL statement_timeout='12s'; ${first} SELECT 'LOCK_HELD'; SELECT pg_sleep(2); COMMIT;`);
  assert.equal(await completed, 0, stderr); assert.ok(follower, 'writer must expose its held lock');
  return follower;
}

assert.equal(sql(`SELECT count(*) FROM public.companies WHERE id='${company}';`), '0', 'fixture must be absent');
assert.equal(sql("SELECT to_regclass('public.payroll_correction_tickets') IS NOT NULL;"), 't', 'install the correction migration in the local database first');
const tests = readFileSync(new URL('../supabase/tests/payroll_corrections.sql', import.meta.url), 'utf8');
const setup = tests.slice(0, tests.indexOf('SET LOCAL ROLE authenticated;'));
let seeded = false;
try {
  sql(`BEGIN; ${setup}
    INSERT INTO public.employee_shift_assignments(id,company_id,employee_id,shift_id,assignment_date,created_by) VALUES('${assignment}','${company}','${employee}','dd000000-0000-4000-8000-000000000110','2026-09-05','${actor}');
    INSERT INTO public.payroll_control_cuts(company_id,operation_center_id,level,cutoff_date,reason,created_by,created_by_name) VALUES('${company}','${center}',2,'2026-09-10','Concurrency fixture','${reviewer}','Test reviewer');
    INSERT INTO public.payroll_correction_tickets(id,company_id,employee_id,operation_center_id,requested_by,requested_by_name,employee_name,center_name,start_date,end_date,expires_at,actions,reason,status,authorized_by,authorized_at)
    VALUES('${ticket}','${company}','${employee}','${center}','${actor}','Test operator','Test employee','Test center','2026-09-05','2026-09-10',clock_timestamp()+interval '1 hour',ARRAY['jornadas:update','jornadas:approve'],'Concurrency test','active','${reviewer}',clock_timestamp()); COMMIT;`);
  seeded = true;
  const day = JSON.parse(sql(`BEGIN; ${claims()} SELECT public.payroll_schedule_days('${company}',ARRAY['${employee}'::uuid],'2026-09-05','2026-09-05')->0; COMMIT;`));
  const staleReview = write([{ module: 'jornadas', action: 'approve', values: { employee_id: employee, work_date: '2026-09-05', snapshot: day.snapshot, status: 'approved' } }]);
  const approvalRace = await race(`${claims()} ${update('dd000000-0000-4000-8000-000000000111')}`, staleReview);
  assert.notEqual(approvalRace.code, 0); assert.match(approvalRace.errors, /programación cambió/);
  const revocationRace = await race(`${claims(reviewer)} SELECT public.payroll_ticket_transition('${ticket}','revoke','Concurrent revocation');`, update('dd000000-0000-4000-8000-000000000110'));
  assert.notEqual(revocationRace.code, 0); assert.match(revocationRace.errors, /Ticket vencido, revocado/);
  sql(`UPDATE public.payroll_correction_tickets SET status='active',expires_at=clock_timestamp()+interval '1 second' WHERE id='${ticket}';`);
  const expiryRace = await race('SELECT payroll_private.review_lock();', update('dd000000-0000-4000-8000-000000000110'));
  assert.notEqual(expiryRace.code, 0); assert.match(expiryRace.errors, /Ticket vencido, revocado/);
  assert.equal(sql(`SELECT shift_id FROM public.employee_shift_assignments WHERE id='${assignment}';`), 'dd000000-0000-4000-8000-000000000111');
  console.log('PASS: concurrent edit/review, revocation/write and expiry while waiting for lock.');
} finally {
  if (seeded) sql(`BEGIN;
    DELETE FROM public.payroll_control_cut_events WHERE company_id='${company}';
    DELETE FROM public.payroll_control_cuts WHERE company_id='${company}';
    DELETE FROM public.schedule_day_reviews WHERE company_id='${company}';
    DELETE FROM public.employee_shift_assignments WHERE company_id='${company}';
    DELETE FROM public.employee_time_config WHERE company_id='${company}';
    DELETE FROM public.payroll_correction_events WHERE company_id='${company}';
    DELETE FROM public.payroll_correction_tickets WHERE company_id='${company}';
    DELETE FROM public.companies WHERE id='${company}';
    DELETE FROM auth.users WHERE id IN('${actor}','${reviewer}'); COMMIT;`);
}
