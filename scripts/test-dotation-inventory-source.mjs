import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Run against the local database; schema and fixture changes always roll back.
const migrations = [
  ...(process.argv.includes('--with-prerequisites') ? [
    '20260908150937_dotation_inventory_center_transfers.sql',
    '20260908153804_track_dotation_inventory_initial_stock.sql',
    '20260908154218_harden_dotation_inventory_trigger_functions.sql',
    '20260908181800_allow_dotation_inventory_deletion_after_transfers.sql',
  ] : []),
  '20260925124356_dotation_delivery_inventory_source.sql',
].map(name => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')).join('\n');
// The local snapshot has Data API table grants revoked. Restore only the test
// surface inside this rolled-back transaction so RLS/trigger checks can run.
const localGrants = `grant select, insert, update, delete on
  public.dotation_inventory, public.dotation_inventory_movements,
  public.dotation_inventory_transfers, public.dotation_deliveries,
  public.dotation_delivery_transactions to authenticated;`;

for (const name of ['dotation_delivery_inventory_source.sql', 'dotation_inventory_center_transfers.sql']) {
  const tests = readFileSync(new URL(`../supabase/tests/${name}`, import.meta.url), 'utf8');
  const result = spawnSync('docker', [
    'exec', '-i', 'supabase_db_qmfyecdeiupgscegxbmo',
    'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
  ], { input: `begin;\n${migrations}\n${localGrants}\n${tests.replace(/^begin;/i, '')}`, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  if (result.error) throw result.error;
  if (result.status !== 0 || /not ok|Looks like you (?:failed|planned)/i.test(result.stdout)) {
    process.exitCode = 1;
    break;
  }
}
