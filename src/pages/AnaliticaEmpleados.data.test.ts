import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(resolve('src/pages/AnaliticaEmpleados.tsx'), 'utf8');
const migrationSource = readFileSync(
  resolve('supabase/migrations/20260910130037_optimize_employee_analytics_query.sql'),
  'utf8',
);

describe('employee analytics dataset query', () => {
  it('loads one paginated server-side dataset instead of ten complete tables', () => {
    const datasetHook = pageSource.slice(
      pageSource.indexOf('function useEmployeeAnalyticsDataset()'),
      pageSource.indexOf('export default function AnaliticaEmpleados()'),
    );

    expect(datasetHook).toContain(".rpc('get_employee_analytics_dataset'");
    expect(datasetHook).toContain('.range(from, to)');
    expect(datasetHook).not.toContain(".from('employee_work_info')");
    expect(datasetHook).not.toContain(".from('employee_documents')");
    expect(datasetHook).not.toContain('Promise.all([');
  });

  it('keeps RLS enforcement and aggregates related records in Postgres', () => {
    expect(migrationSource).toContain('SECURITY INVOKER');
    expect(migrationSource).toContain('GRANT EXECUTE ON FUNCTION public.get_employee_analytics_dataset(uuid) TO authenticated');
    expect(migrationSource).toContain('SELECT count(*) AS document_count');
    expect(migrationSource).toContain('ORDER BY extension.extension_number DESC, extension.id DESC');
    expect(migrationSource).toContain("WHERE is_active = true AND status = 'active'");
  });
});
