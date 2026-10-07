import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import {
  collectReportRows,
  formatReportCell,
  safeCsv,
  type ReportResult,
} from './reporting';
import {
  validateFilters,
  validatePlan,
} from '../../supabase/functions/_shared/reporting/validation';
import catalog from '../../supabase/functions/_shared/reporting/catalog.json';
import type { Source } from './reporting';
const sources = catalog as Source[];
const plan = {
  source: 'employees_v2',
  columns: [],
  dimensions: [{ field: 'report_center_name', grain: 'value' }],
  metrics: [{ field: '*', op: 'count', key: 'total' }],
  filters: [],
  related: [],
  order: [],
  chart: 'bar',
  limit: null,
  comparePrevious: false,
};
describe('structured report validation', () => {
  it('supports full aggregation without a hidden 100-row limit', () =>
    expect(validatePlan(plan, sources).limit).toBeNull());
  it('rejects SQL, unknown operations and injected metric names', () => {
    expect(() =>
      validatePlan({ ...plan, sql: 'select * from users' }, sources),
    ).toThrow();
    expect(() =>
      validatePlan(
        { ...plan, metrics: [{ field: '*', op: 'pg_sleep', key: 'total' }] },
        sources,
      ),
    ).toThrow();
    expect(() =>
      validatePlan(
        {
          ...plan,
          metrics: [{ field: '*', op: 'count', key: 'x);drop table x;--' }],
        },
        sources,
      ),
    ).toThrow();
  });
  it('rejects unregistered sources, fields and unrelated joins', () => {
    expect(() =>
      validatePlan({ ...plan, source: 'system_config' }, sources),
    ).toThrow();
    expect(() =>
      validatePlan(
        { ...plan, filters: [{ field: 'password', op: 'eq', values: ['x'] }] },
        sources,
      ),
    ).toThrow();
    expect(() =>
      validatePlan(
        {
          ...plan,
          related: [{ source: 'hr_automations', mode: 'exists', filters: [] }],
        },
        sources,
      ),
    ).toThrow();
  });
  it('rejects mixed aggregates/details, bad periods and forged center values', () => {
    expect(() => validatePlan({ ...plan, columns: ['id'] }, sources)).toThrow();
    expect(() =>
      validateFilters({ startDate: '2026-10-31', endDate: '2026-10-01' }),
    ).toThrow();
    expect(() => validateFilters({ centerIds: ["x' OR true--"] })).toThrow();
  });
  it('has a list and aggregate contract for every registered source', () => {
    for (const source of sources) {
      expect(() =>
        validatePlan({ ...plan, source: source.key, dimensions: [] }, sources),
      ).not.toThrow();
      expect(() =>
        validatePlan(
          {
            ...plan,
            source: source.key,
            columns: [source.fields[0].key],
            dimensions: [],
            metrics: [],
            chart: 'none',
          },
          sources,
        ),
      ).not.toThrow();
      expect(
        source.fields.some((f) =>
          /password|secret|token|signature|_url$/.test(f.key),
        ),
      ).toBe(false);
    }
  });
});
describe('complete exports', () => {
  it('downloads 2,507 rows without gaps or duplicate pages', async () => {
    const ids = Array.from({ length: 2507 }, (_, id) => ({ id: String(id) }));
    const offsets: number[] = [];
    const rows = await collectReportRows(
      async (offset) => {
        offsets.push(offset);
        return {
          rows: ids.slice(offset, offset + 1000),
          offset,
          totalRows: ids.length,
        } as ReportResult;
      },
      new AbortController().signal,
      () => {},
    );
    expect(rows).toEqual(ids);
    expect(offsets).toEqual([0, 1000, 2000]);
  });
  it('does not silently export an incomplete response', async () => {
    await expect(
      collectReportRows(
        async (offset) =>
          ({ rows: [], offset, totalRows: 1200 }) as ReportResult,
        new AbortController().signal,
        () => {},
      ),
    ).rejects.toThrow('incompleta');
  });
  it('cancels between batches', async () => {
    const abort = new AbortController();
    let calls = 0;
    await expect(
      collectReportRows(
        async (offset) => {
          calls++;
          return {
            rows: [{ id: '1' }],
            offset,
            totalRows: 1001,
          } as ReportResult;
        },
        abort.signal,
        () => abort.abort(),
      ),
    ).rejects.toThrow();
    expect(calls).toBe(1);
  });
  it('escapes formula injection and retains document leading zeros', () => {
    expect(safeCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(
      formatReportCell('001234', {
        key: 'document',
        label: 'Documento',
        type: 'text',
      }),
    ).toBe('001234');
    expect(
      formatReportCell('2026-10-01', {
        key: 'date',
        label: 'Fecha',
        type: 'date',
      }),
    ).toBe(
      new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'medium',
      }).format(new Date('2026-10-01T12:00:00Z')),
    );
  });
});
