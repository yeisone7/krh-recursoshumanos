import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const linked = process.argv.includes('--linked');
const installed = process.argv.includes('--installed');
const syntaxOnly = process.argv.includes('--syntax-only');
const regression = process.argv.includes('--cuts-regression');
const migration = readFileSync(new URL('../supabase/migrations/20260925030834_schedule_reviews_correction_tickets.sql', import.meta.url), 'utf8');
const tests = syntaxOnly ? '' : regression ? readFileSync(new URL('../supabase/tests/payroll_control_cuts.sql', import.meta.url), 'utf8').replace(/^BEGIN;$/m, '').replace(/^ROLLBACK;$/m, '') : readFileSync(new URL('../supabase/tests/payroll_corrections.sql', import.meta.url), 'utf8');
const sql = `BEGIN; SET LOCAL statement_timeout = '60s';\n${installed ? '' : migration}\n${tests}\nROLLBACK;`;
if (linked && readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim() !== 'qmfyecdeiupgscegxbmo') throw new Error('Unexpected linked project');
const dir = mkdtempSync(join(tmpdir(), 'payroll-corrections-test-'));
try {
  const file = join(dir, 'test.sql');
  writeFileSync(file, sql);
  // Invoke the npm entrypoint directly on Windows; no shell interpolation of paths.
  const cliScript = process.platform === 'win32' ? [
    process.env.SUPABASE_CLI_JS,
    join(process.cwd(), 'node_modules', 'supabase', 'dist', 'supabase.js'),
    process.env.APPDATA && join(process.env.APPDATA, 'npm', 'node_modules', 'supabase', 'dist', 'supabase.js'),
  ].find(path => path && existsSync(path)) : undefined;
  const result = linked
    ? spawnSync(cliScript ? process.execPath : 'supabase', [...(cliScript ? [cliScript] : []), 'db', 'query', '--linked', '--file', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
    : spawnSync('docker', ['exec', '-i', 'supabase_db_qmfyecdeiupgscegxbmo', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], { input: sql, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  process.exitCode = result.status ?? 1;
} finally { rmSync(dir, { recursive: true }); }
