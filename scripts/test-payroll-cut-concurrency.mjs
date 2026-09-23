// Local database only. Own fixtures are verified absent, then removed after both sessions finish.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const args = ['exec', '-i', 'supabase_db_qmfyecdeiupgscegxbmo', 'psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'];
function sql(input) {
  const r = spawnSync('docker', args, { input, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.error?.message); return r.stdout;
}
const company = 'cc000000-0000-4000-8000-000000000010';
const actor = 'cc000000-0000-4000-8000-000000000001';
const center = 'cc000000-0000-4000-8000-000000000030';
const employee = 'cc000000-0000-4000-8000-000000000040';
const claims = `SELECT set_config('request.jwt.claims','{"sub":"${actor}","role":"authenticated"}',true);`;
const migration = readFileSync(new URL('../supabase/migrations/20260923180831_payroll_control_cuts.sql', import.meta.url), 'utf8');
// Refresh only our functions in the already-installed local migration for development.
const functions = [...migration.matchAll(/CREATE (?:OR REPLACE )?FUNCTION [\s\S]*?\$\$;/g)].map(m => m[0].replace(/^CREATE FUNCTION/, 'CREATE OR REPLACE FUNCTION')).join('\n');
const tests = readFileSync(new URL('../supabase/tests/payroll_control_cuts.sql', import.meta.url), 'utf8');
const setup = tests.slice(0, tests.indexOf('SET LOCAL ROLE authenticated;'));
assert.equal(sql(`SELECT count(*) FROM public.companies WHERE id='${company}';`).trim(), '0', 'fixture company must not exist');
let seeded = false;
let childDone;
try {
  sql(`BEGIN; ${functions} COMMIT;`);
  sql(`${setup}\nSELECT * FROM public.payroll_cut_resolve_centers('${company}'); COMMIT;`); seeded = true;
  const writer = spawn('docker', args);
  let output = '', errors = '';
  let started = false;
  writer.stdout.on('data', chunk => {
    output += chunk;
    if (!started && output.includes('CUT_LOCK_HELD')) {
      started = true;
      childDone = new Promise(resolve => {
        const child = spawn('docker', args); let stderr = '';
        child.stderr.on('data', c => { stderr += c; });
        child.on('close', code => resolve({ code, stderr }));
        child.stdin.end(`BEGIN; SET LOCAL statement_timeout='15s'; ${claims}
          INSERT INTO public.payroll_novelties(company_id,employee_id,novelty_date,novelty_type,hours,created_by)
          VALUES('${company}','${employee}','2026-01-15','jornada',2,'${actor}'); COMMIT;`);
      });
    }
  });
  writer.stderr.on('data', chunk => { errors += chunk; });
  const done = new Promise(resolve => writer.on('close', resolve));
  writer.stdin.end(`BEGIN; ${claims} SET LOCAL ROLE authenticated;
    SELECT public.payroll_cut_change('${company}','${center}',1::smallint,'create','2026-01-15','Concurrent cut');
    SELECT 'CUT_LOCK_HELD'; SELECT pg_sleep(2); COMMIT;`);
  assert.equal(await done, 0, errors); assert.ok(started);
  const blocked = await childDone;
  assert.notEqual(blocked.code, 0); assert.match(blocked.stderr, /Corte de control/);
  assert.equal(sql(`SELECT count(*) FROM public.payroll_novelties WHERE company_id='${company}' AND novelty_date='2026-01-15';`).trim(), '0');
  console.log('PASS: a concurrent write waits for the cut transaction and is rejected after commit.');
} finally {
  if (childDone) await childDone;
  if (seeded) sql(`BEGIN;
    DELETE FROM public.payroll_control_cut_events WHERE company_id='${company}';
    DELETE FROM public.payroll_control_cuts WHERE company_id='${company}';
    DELETE FROM public.employee_deductions WHERE company_id='${company}';
    DELETE FROM public.employee_loans WHERE company_id='${company}';
    DELETE FROM public.payroll_novelties WHERE company_id='${company}';
    DELETE FROM public.employee_shift_assignments WHERE company_id='${company}';
    DELETE FROM public.employee_time_config WHERE company_id='${company}';
    DELETE FROM public.time_clock_days WHERE company_id='${company}';
    DELETE FROM public.time_clock_center_settings WHERE company_id='${company}';
    DELETE FROM public.companies WHERE id='${company}';
    DELETE FROM auth.users WHERE id='${actor}'; COMMIT;`);
}
