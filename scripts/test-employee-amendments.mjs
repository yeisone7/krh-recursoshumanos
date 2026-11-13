import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const linked = process.argv.includes('--linked');
if (linked && readFileSync('supabase/.temp/project-ref','utf8').trim() !== 'qmfyecdeiupgscegxbmo') throw new Error('Unexpected project');
const migration = readFileSync('supabase/migrations/20261113042457_employee_amendments.sql','utf8');
const optionalMigration = readFileSync('supabase/migrations/20261113162258_optional_employee_amendments.sql','utf8').replace(/^\uFEFF/, '');
const tests = readFileSync('supabase/tests/employee_amendments.sql','utf8');
mkdirSync('tmp/amendments-tests', { recursive: true });
const path = 'tmp/amendments-tests/test.sql';
writeFileSync(path, `BEGIN;\n${process.argv.includes('--installed') ? '' :
  process.argv.includes('--base-installed') ? optionalMigration : migration + '\n' + optionalMigration}\n${tests}\nROLLBACK;`);
const result = spawnSync('supabase', ['db','query',linked ? '--linked' : '--local','--file',path], { shell: process.platform === 'win32', encoding:'utf8',maxBuffer:8*1024*1024 });
process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || ''); process.exitCode=result.status ?? 1;
