import { describe, expect, it } from 'vitest';
import { buildSelectionAlerts } from './selectionAlerts';

const now = new Date(2026, 7, 30, 12);
const vacancy = { id: 'v1', position_title: 'Auxiliar', status: 'open', open_date: '2026-08-01', candidates: [] };
const requisition = { id: 'r1', requisition_code: 'RQ-01', cargo_solicitado: 'Auxiliar', estado_requisicion: 'en_rrhh', fecha_ingreso_estimada: '2026-09-01', vacancies: [] };
const candidate = { id: 'c1', vacancy_id: 'v1', first_name: 'Ana', last_name: 'Pérez', status: 'in_interview', current_step: 'entrevista_seleccion', application_date: '2026-08-01', updated_at: '2026-08-14', selection_steps: [] };

describe('buildSelectionAlerts', () => {
  it('returns no pending work for empty sources', () => {
    expect(buildSelectionAlerts([], [], [], now)).toEqual([]);
  });
  it.each(['enviada', 'en_coordinadores', 'en_rrhh', 'en_juridico', 'en_operaciones', 'en_gerencia', 'en_seleccion'])('includes pending approval at %s', estado_requisicion => {
    const [alert] = buildSelectionAlerts([{ ...requisition, estado_requisicion }], [], [], now);
    expect(alert).toMatchObject({ source: 'requisition', entityId: 'r1', level: 'warning', title: 'Requisición pendiente de aprobación' });
  });
  it('replaces approval warning with critical overdue coverage, preserving the approval stage', () => {
    const alerts = buildSelectionAlerts([{ ...requisition, fecha_ingreso_estimada: '2026-08-29' }], [], [], now);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({ level: 'critical', days: 1 });
    expect(alerts[0].description).toContain('En RRHH');
  });
  it.each(['borrador', 'rechazada', 'cerrada', 'cancelada'])('ignores inactive requisition %s', estado_requisicion => {
    expect(buildSelectionAlerts([{ ...requisition, estado_requisicion, fecha_ingreso_estimada: '2026-08-01' }], [], [], now)).toEqual([]);
  });
  it.each(['closed', 'cancelled', 'paused'])('does not flag fully inactive requisition vacancies: %s', status => {
    expect(buildSelectionAlerts([{ ...requisition, fecha_ingreso_estimada: '2026-08-01', vacancies: [{ status }] }], [], [], now)).toEqual([]);
  });
  it('flags overdue requisitions with a mix of closed and active vacancies', () => {
    expect(buildSelectionAlerts([{ ...requisition, estado_requisicion: 'aprobada', fecha_ingreso_estimada: '2026-08-01', vacancies: [{ status: 'closed' }, { status: 'pending_placed' }] }], [], [], now)[0].level).toBe('critical');
  });
  it.each(['2026-08-30', '2026-09-01', null, 'invalid'])('does not expire an approved requisition for %s', fecha_ingreso_estimada => {
    expect(buildSelectionAlerts([{ ...requisition, estado_requisicion: 'aprobada', fecha_ingreso_estimada }], [], [], now)).toEqual([]);
  });
  it('flags an open vacancy without candidates', () => {
    expect(buildSelectionAlerts([], [vacancy], [], now)[0]).toMatchObject({ source: 'vacancy', entityId: 'v1' });
  });
  it('does not flag a vacancy with candidates in either data source', () => {
    expect(buildSelectionAlerts([], [{ ...vacancy, candidates: [{ id: 'c1' }] }], [], now)).toEqual([]);
    expect(buildSelectionAlerts([], [vacancy], [{ ...candidate, updated_at: '2026-08-30' }], now)).toEqual([]);
  });
  it.each(['closed', 'cancelled', 'paused'])('ignores vacancies and their candidates in %s', status => {
    expect(buildSelectionAlerts([], [{ ...vacancy, status }], [candidate], now)).toEqual([]);
  });
  it('ignores vacancies not yet open', () => {
    expect(buildSelectionAlerts([], [{ ...vacancy, open_date: '2026-09-01' }], [], now)).toEqual([]);
  });
  it('flags candidates only after more than 15 days, with stage and correct detail id', () => {
    const [alert] = buildSelectionAlerts([], [vacancy], [candidate], now);
    expect(alert).toMatchObject({ source: 'candidate', entityId: 'c1', days: 16 });
    expect(alert.description).toContain('Entrevista de Selección');
    expect(buildSelectionAlerts([], [vacancy], [{ ...candidate, updated_at: '2026-08-15' }], now)).toEqual([]);
  });
  it('recent step activity clears a stale candidate alert', () => {
    expect(buildSelectionAlerts([], [vacancy], [{ ...candidate, selection_steps: [{ updated_at: '2026-08-29', completed_date: null }] }], now)).toEqual([]);
  });
  it.each(['hired', 'not_selected', 'withdrawn'])('ignores finished candidate %s', status => {
    expect(buildSelectionAlerts([], [vacancy], [{ ...candidate, status }], now)).toEqual([]);
  });
  it('sorts critical first without mutating inputs', () => {
    const requisitions = Object.freeze([{ ...requisition, fecha_ingreso_estimada: '2026-08-29' }]);
    const alerts = buildSelectionAlerts(requisitions, [vacancy, { ...vacancy, id: 'v2' }], [candidate], now);
    expect(alerts.map(a => a.source)).toEqual(['requisition', 'vacancy', 'candidate']);
    expect(new Set(alerts.map(a => a.id)).size).toBe(alerts.length);
  });
});
