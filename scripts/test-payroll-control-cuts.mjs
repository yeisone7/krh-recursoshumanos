import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const linked = process.argv.includes('--linked');
const installed = process.argv.includes('--installed');
const migration = readFileSync(new URL('../supabase/migrations/20260923180831_payroll_control_cuts.sql', import.meta.url), 'utf8');
const attendancePatch = readFileSync(new URL('../supabase/migrations/20260923184325_payroll_cut_explicit_attendance_refresh.sql', import.meta.url), 'utf8');
const tests = readFileSync(new URL('../supabase/tests/payroll_control_cuts.sql', import.meta.url), 'utf8');
const sql = installed ? tests : `BEGIN;\n${process.argv.includes('--patch-only') ? '' : migration}\n${attendancePatch}\n${tests.replace(/^BEGIN;$/m, '')}`;
if (linked && readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim() !== 'qmfyecdeiupgscegxbmo') throw new Error('Unexpected linked project');
const dir = mkdtempSync(join(tmpdir(), 'payroll-cuts-test-'));
try {
  const file = join(dir, 'test.sql');
  writeFileSync(file, sql);
  const result = linked
    ? spawnSync('npx.cmd', ['supabase', 'db', 'query', '--linked', '--file', file], { encoding: 'utf8', shell: true, maxBuffer: 8 * 1024 * 1024 })
    : spawnSync('docker', ['exec', '-i', 'supabase_db_qmfyecdeiupgscegxbmo', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: sql, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  process.exitCode = result.status ?? 1;
} finally { rmSync(dir, { recursive: true }); }
