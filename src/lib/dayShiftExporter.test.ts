import { describe, expect, it } from 'vitest';
import type { Shift } from '@/types/schedule';
import { buildDayShiftExportRows } from './dayShiftExporter';

const shift = (overrides: Partial<Shift> = {}): Shift => ({
  id: 'shift-1',
  company_id: 'company-1',
  name: 'Turno Mañana',
  code: 'TM',
  description: 'Turno de apertura',
  start_time: '06:00:00',
  end_time: '14:00:00',
  break_minutes: 30,
  crosses_midnight: false,
  color: '#087F9C',
  is_rest_day: false,
  is_not_worked_day: false,
  is_suspension_day: false,
  is_active: true,
  kind: 'day',
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('buildDayShiftExportRows', () => {
  it('exports a Turno Día global with friendly values', () => {
    expect(buildDayShiftExportRows([shift()])).toEqual([{
      name: 'Turno Mañana',
      code: 'TM',
      description: 'Turno de apertura',
      startTime: '06:00',
      endTime: '14:00',
      crossesMidnight: 'No',
      centers: 'Todos los centros',
      scope: 'Global',
      breakMinutes: 30,
      type: 'Laboral',
      status: 'Vigente',
    }]);
  });

  it('sorts and joins all associated centers', () => {
    const scoped = shift({
      shift_operation_centers: [
        {
          id: 'scope-2',
          shift_id: 'shift-1',
          operation_center_id: 'center-2',
          operation_centers: { id: 'center-2', name: 'Zona Norte' },
        },
        {
          id: 'scope-1',
          shift_id: 'shift-1',
          operation_center_id: 'center-1',
          operation_centers: { id: 'center-1', name: 'Canacol' },
        },
      ],
      crosses_midnight: true,
      is_rest_day: true,
      is_active: false,
    });

    expect(buildDayShiftExportRows([scoped])[0]).toMatchObject({
      centers: 'Canacol, Zona Norte',
      scope: 'Específico',
      crossesMidnight: 'No aplica',
      type: 'Descanso',
      status: 'Inactivo',
    });
  });

  it.each([
    ['is_not_worked_day', 'No trabajado'],
    ['is_suspension_day', 'Suspensión'],
  ] as const)('exports %s as a zero-hour non-working shift', (flag, label) => {
    const row = buildDayShiftExportRows([shift({ [flag]: true })])[0];
    expect(row).toMatchObject({ startTime: 'No aplica', endTime: 'No aplica', crossesMidnight: 'No aplica', type: label });
  });

  it('provides readable fallbacks for optional fields', () => {
    expect(buildDayShiftExportRows([shift({ code: undefined, description: undefined })])[0])
      .toMatchObject({ code: 'Sin código', description: 'Sin descripción' });
  });
});
