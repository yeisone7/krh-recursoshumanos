import { describe, expect, it } from 'vitest';
import { buildRequisitionVacancyCodeAlerts } from './requisitionVacancyCodeAlerts';

const now = new Date('2026-10-02T12:00:00');
const requisition = {
  id: 'r1', requisition_code: 'RQ-01', cargo_solicitado: 'Auxiliar', estado_requisicion: 'aprobada',
  requisition_vacancy_codes: [
    { id: 'code-1', codigo_vacante_externa: '1626394994-107', entidad_origen: 'COMFAMILIAR', fecha_cierre: '2026-10-06' },
  ],
};
const alertsFor = (fecha_cierre: string | null) => buildRequisitionVacancyCodeAlerts([
  { ...requisition, requisition_vacancy_codes: [{ ...requisition.requisition_vacancy_codes[0], fecha_cierre }] },
], now);

describe('vacancy code deadline alerts', () => {
  it('uses the code deadline, origin and requisition detail target', () => {
    expect(buildRequisitionVacancyCodeAlerts([requisition], now)[0]).toMatchObject({
      id: 'vacancy-code:code-1', entityId: 'r1', source: 'requisition', level: 'warning', days: 4,
    });
    expect(alertsFor('2026-10-06')[0].description).toContain('1626394994-107 (COMFAMILIAR) vence en 4 día(s). Cierre: 06/10/2026');
  });
  it.each(['2026-10-01', '2026-10-02'])('marks expired or today deadlines critical: %s', date => {
    expect(alertsFor(date)[0].level).toBe('critical');
  });
  it('includes the seventh day but excludes later, missing and invalid dates', () => {
    expect(alertsFor('2026-10-09')).toHaveLength(1);
    for (const date of ['2026-10-10', null, '', 'invalid', '2026-02-30']) expect(alertsFor(date)).toEqual([]);
  });
  it('ignores records without codes and completed or rejected requisitions', () => {
    expect(buildRequisitionVacancyCodeAlerts([{ ...requisition, requisition_vacancy_codes: [] }], now)).toEqual([]);
    for (const status of ['cerrada', 'rechazada']) expect(buildRequisitionVacancyCodeAlerts([{ ...requisition, estado_requisicion: status }], now)).toEqual([]);
  });
  it('keeps separate codes per requisition and sorts earliest deadlines first', () => {
    const codes = [
      ...requisition.requisition_vacancy_codes,
      { ...requisition.requisition_vacancy_codes[0], id: 'code-2', fecha_cierre: '2026-10-01' },
    ];
    expect(buildRequisitionVacancyCodeAlerts([{ ...requisition, requisition_vacancy_codes: codes }], now).map(a => a.id)).toEqual(['vacancy-code:code-2', 'vacancy-code:code-1']);
  });
});
