import { describe, expect, it } from 'vitest';
import { getApprovalTimeByArea } from './selectionAnalytics';

describe('approval time by approving area', () => {
  it('averages elapsed time per area, not cumulative time, and sorts by delay', () => {
    const result = getApprovalTimeByArea([
      {
        created_at: '2026-08-01T00:00:00Z',
        coordinadores_aprobado: true,
        coordinadores_fecha_aprobacion: '2026-08-02T00:00:00Z',
        rrhh_aprobado: true,
        rrhh_fecha_aprobacion: '2026-08-05T00:00:00Z',
      },
      {
        created_at: '2026-08-01T00:00:00Z',
        coordinadores_aprobado: true,
        coordinadores_fecha_aprobacion: '2026-08-02T00:00:00Z',
        rrhh_aprobado: true,
        rrhh_fecha_aprobacion: '2026-08-03T00:00:00Z',
      },
    ]);
    expect(result).toEqual([
      { step: 'rrhh', name: 'RRHH', averageDays: 2, approvals: 2 },
      { step: 'coordinadores', name: 'Coordinadores', averageDays: 1, approvals: 2 },
    ]);
  });

  it.each([
    ['gerencia_administrativa', 'gerencia'],
    ['gerencia_operaciones', 'operaciones'],
  ])('uses the preceding area in the %s route and ignores the other branch', (autoriza, step) => {
    const result = getApprovalTimeByArea([{
      autoriza,
      juridico_aprobado: true,
      juridico_fecha_aprobacion: '2026-08-04T00:00:00Z',
      gerencia_aprobado: true,
      gerencia_fecha_aprobacion: '2026-08-05T00:00:00Z',
      operaciones_aprobado: true,
      operaciones_fecha_aprobacion: '2026-08-05T00:00:00Z',
      seleccion_aprobado: true,
      seleccion_fecha_aprobacion: '2026-08-05T12:00:00Z',
    }]);
    expect(result.map((item) => item.step)).toEqual([step, 'seleccion']);
    expect(result.map((item) => item.averageDays)).toEqual([1, 0.5]);
  });

  it('follows the default route through operations before management', () => {
    const result = getApprovalTimeByArea([{
      juridico_aprobado: true,
      juridico_fecha_aprobacion: '2026-08-01T00:00:00Z',
      operaciones_aprobado: true,
      operaciones_fecha_aprobacion: '2026-08-02T00:00:00Z',
      gerencia_aprobado: true,
      gerencia_fecha_aprobacion: '2026-08-04T00:00:00Z',
      seleccion_aprobado: true,
      seleccion_fecha_aprobacion: '2026-08-07T00:00:00Z',
    }]);
    expect(result.map((item) => [item.step, item.averageDays])).toEqual([
      ['seleccion', 3], ['gerencia', 2], ['operaciones', 1],
    ]);
  });

  it('excludes pending, rejected, missing, malformed and reversed dates', () => {
    const base = {
      created_at: '2026-08-02T00:00:00Z',
      coordinadores_aprobado: true,
      coordinadores_fecha_aprobacion: '2026-08-03T00:00:00Z',
    };
    expect(getApprovalTimeByArea([
      { ...base, coordinadores_aprobado: false },
      { ...base, coordinadores_aprobado: null },
      { ...base, coordinadores_fecha_aprobacion: null },
      { ...base, coordinadores_fecha_aprobacion: 'invalid' },
      { ...base, coordinadores_fecha_aprobacion: '2026-08-01T00:00:00Z' },
      { ...base, created_at: null },
      { ...base, created_at: 'invalid' },
      { rrhh_aprobado: true, rrhh_fecha_aprobacion: '2026-08-03T00:00:00Z' },
      { ...base, coordinadores_aprobado: false, rrhh_aprobado: true, rrhh_fecha_aprobacion: '2026-08-04T00:00:00Z' },
    ])).toEqual([]);
  });

  it('keeps valid zero and sub-day durations without rounding before averaging', () => {
    const result = getApprovalTimeByArea([{
      created_at: '2026-08-01T00:00:00Z',
      coordinadores_aprobado: true,
      coordinadores_fecha_aprobacion: '2026-08-01T00:00:00Z',
      rrhh_aprobado: true,
      rrhh_fecha_aprobacion: '2026-08-01T01:00:00Z',
    }]);
    expect(result[0].averageDays).toBeCloseTo(1 / 24);
    expect(result[1].averageDays).toBe(0);
    expect(result[1].approvals).toBe(1);
  });

  it('returns no fabricated areas for an empty filtered set', () => {
    expect(getApprovalTimeByArea([])).toEqual([]);
  });
});
