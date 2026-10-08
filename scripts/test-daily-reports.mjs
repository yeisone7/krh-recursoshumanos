import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const installed = process.argv.includes('--installed');
const upgrade = process.argv.includes('--upgrade');
if (readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== 'qmfyecdeiupgscegxbmo') throw new Error('Unexpected linked project');
const migration = readFileSync('supabase/migrations/20261008143532_daily_reports.sql', 'utf8');
const filters = readFileSync('supabase/migrations/20261008153303_daily_report_filters.sql', 'utf8');
const tests = readFileSync('supabase/tests/daily_reports.sql', 'utf8');
const directory = mkdtempSync(join(tmpdir(), 'daily-report-tests-'));
const file = join(directory, 'test.sql');
try {
  writeFileSync(file, `BEGIN; SET LOCAL statement_timeout='90s';\n${installed ? '' : (upgrade ? '' : migration) + filters}\n${tests}\nROLLBACK;`);
  const cli = [join(process.cwd(), 'node_modules/supabase/dist/supabase.js'), join(process.env.APPDATA || '', 'npm/node_modules/supabase/dist/supabase.js')].find(existsSync);
  const result = spawnSync(cli ? process.execPath : 'supabase', [...(cli ? [cli] : []), 'db', 'query', '--linked', '--file', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 150000 });
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  process.exitCode = result.status ?? 1;
} finally { rmSync(directory, { recursive: true }); }
