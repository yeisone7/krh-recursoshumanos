import { describe, expect, it } from 'vitest';
import { getSelectionTimeByLaborType } from './selectionLaborTiming';

const today = new Date(2026, 7, 30, 12);
const requisitions = [
  { id: 'moc', seleccion_tipo_mano_obra: 'calificada', seleccion_fecha_inicio_proceso: '2026-08-01' },
  { id: 'monc', seleccion_tipo_mano_obra: 'no_calificada' },
];

describe('selection duration by labor type', () => {
  it('compares MOC and MONC, separating completed duration from active age', () => {
    const result = getSelectionTimeByLaborType([
      { requisition_id: 'moc', status: 'closed', open_date: '2026-08-05', actual_close_date: '2026-08-11' },
      { requisition_id: 'moc', status: 'closed', open_date: '2026-08-05', actual_close_date: '2026-08-21' },
      { requisition_id: 'moc', status: 'open', open_date: '2026-08-05' },
      { requisition_id: 'monc', status: 'closed', open_date: '2026-08-10', actual_close_date: '2026-08-15' },
      { requisition_id: 'monc', status: 'in_process', open_date: '2026-08-20' },
      { requisition_id: 'monc', status: 'pending_placed', open_date: '2026-08-22' },
    ], requisitions, today);
    expect(result.groups[0]).toMatchObject({ name: 'MOC', closedAverageDays: 15, activeAverageDays: 29, closedCount: 2, activeCount: 1 });
    expect(result.groups[1]).toMatchObject({ name: 'MONC', closedAverageDays: 5, activeAverageDays: 9, closedCount: 1, activeCount: 2 });
  });

  it('does not turn missing data into zero or classify unknown labor types as MONC', () => {
    const result = getSelectionTimeByLaborType([
      { requisition_id: 'missing', status: 'open', open_date: '2026-08-01' },
      { requisition_id: 'unknown', status: 'closed', open_date: '2026-08-01', actual_close_date: '2026-08-10' },
    ], [{ id: 'unknown', seleccion_tipo_mano_obra: 'otro' }], today);
    expect(result.unclassifiedCount).toBe(2);
    expect(result.groups.every((group) => group.activeAverageDays === null && group.closedAverageDays === null)).toBe(true);
  });

  it('excludes cancelled, paused and unsupported statuses even with closure dates', () => {
    const result = getSelectionTimeByLaborType(['cancelled', 'paused', 'draft'].map((status) => ({
      requisition_id: 'moc', status, open_date: '2026-08-01', actual_close_date: '2026-08-10',
    })), requisitions, today);
    expect(result.groups[0].closedCount).toBe(0);
    expect(result.groups[0].activeCount).toBe(0);
    expect(result.invalidDatesCount).toBe(0);
  });

  it('rejects missing, invalid, reversed and future dates without diluting averages', () => {
    const result = getSelectionTimeByLaborType([
      { status: 'closed', open_date: '2026-08-01' },
      { status: 'open', open_date: 'invalid' },
      { status: 'open', open_date: '2026-02-30' },
      { status: 'closed', open_date: '2026-08-10', actual_close_date: '2026-08-09' },
      { status: 'closed', open_date: '2026-08-01', actual_close_date: '2026-09-01' },
      { status: 'open', open_date: '2026-09-01' },
      { status: 'open', open_date: null },
      { status: 'closed', open_date: '2026-08-01', actual_close_date: '2026-08-11' },
    ].map((vacancy) => ({ ...vacancy, requisition_id: 'monc' })), requisitions, today);
    expect(result.invalidDatesCount).toBe(7);
    expect(result.groups[1]).toMatchObject({ closedAverageDays: 10, closedCount: 1, activeAverageDays: null });
  });

  it('preserves same-day zero durations and normalizes explicit abbreviations', () => {
    const result = getSelectionTimeByLaborType([
      { requisition_id: 'a', status: 'closed', open_date: '2026-08-20', actual_close_date: '2026-08-20' },
      { requisition_id: 'b', status: 'open', open_date: '2026-08-30' },
    ], [
      { id: 'a', seleccion_tipo_mano_obra: ' MOC ' },
      { id: 'b', seleccion_tipo_mano_obra: 'MONC' },
    ], today);
    expect(result.groups[0]).toMatchObject({ closedAverageDays: 0, closedCount: 1, activeAverageDays: null });
    expect(result.groups[1]).toMatchObject({ activeAverageDays: 0, activeCount: 1, closedAverageDays: null });
  });

  it('uses only supplied filtered vacancies while looking up all requisitions', () => {
    const result = getSelectionTimeByLaborType([
      { requisition_id: 'old', status: 'open', open_date: '2026-08-20' },
    ], [
      { id: 'old', seleccion_tipo_mano_obra: 'calificada', seleccion_fecha_inicio_proceso: '2026-07-01' },
      ...requisitions,
    ], today);
    expect(result.groups[0]).toMatchObject({ activeAverageDays: 60, activeCount: 1 });
    expect(result.groups[1].activeCount).toBe(0);
  });

  it('does not hide a malformed recorded start by substituting the opening date', () => {
    const result = getSelectionTimeByLaborType([
      { requisition_id: 'a', status: 'open', open_date: '2026-08-01' },
    ], [{ id: 'a', seleccion_tipo_mano_obra: 'calificada', seleccion_fecha_inicio_proceso: 'invalid' }], today);
    expect(result.invalidDatesCount).toBe(1);
    expect(result.groups[0].activeAverageDays).toBeNull();
  });

  it('returns both groups without fabricated values when no vacancies match', () => {
    const result = getSelectionTimeByLaborType([], requisitions, today);
    expect(result.groups).toHaveLength(2);
    expect(result.groups.every((group) => group.closedAverageDays === null && group.activeAverageDays === null)).toBe(true);
  });
});
