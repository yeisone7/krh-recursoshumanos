import { describe, expect, it } from 'vitest';
import { buildCyclePreview, type CycleGenerationData, type CycleGenerationRequest } from './cycleGeneration';
import type { EmployeeTimeConfig, ShiftCycle } from '@/types/schedule';

const request: CycleGenerationRequest = { companyId: 'company', employeeIds: ['e1'], start: '2026-11-26', end: '2026-12-09' };
const cycle = { id: 'c1', name: 'Rotación', total_days: 3, is_active: true, cycle_days: [
  { day_number: 1, shift_id: 'day', shifts: { is_active: true } },
  { day_number: 2, shift_id: 'night', shifts: { is_active: true } },
  { day_number: 3, shift_id: 'rest', shifts: { is_active: true, is_rest_day: true } },
] } as ShiftCycle;
const config = { id: 'cfg1', employee_id: 'e1', mode: 'shift', shift_cycle_id: 'c1', start_date: '2026-11-26', cycle_start_date: '2026-11-26', is_active: true } as EmployeeTimeConfig;
const data = (overrides: Partial<CycleGenerationData> = {}): CycleGenerationData => ({ configs: [config], cycles: [cycle], existing: [], absences: [], activeEmployeeIds: ['e1'], ...overrides });

describe('cycle generation safety', () => {
  it('repeats day, night and rest across a month boundary without mutating cached cycle days', () => {
    const before = JSON.stringify(cycle);
    const result = buildCyclePreview(request, data());
    expect(result.assignments).toHaveLength(14);
    expect(result.assignments.map(a => a.shift_id)).toEqual(['day','night','rest','day','night','rest','day','night','rest','day','night','rest','day','night']);
    expect(result.assignments[5].assignment_date).toBe('2026-12-01');
    expect(JSON.stringify(cycle)).toBe(before);
  });
  it('uses the configuration start as a stable anchor when cycle_start_date is absent', () => {
    const result = buildCyclePreview({ ...request, start: '2026-11-27', end: '2026-11-27' }, data({ configs: [{ ...config, cycle_start_date: undefined }] }));
    expect(result.assignments[0].shift_id).toBe('night');
  });
  it('respects historical configuration validity and applies a new configuration on its start date', () => {
    const result = buildCyclePreview(request, data({ configs: [
      { ...config, is_active: false, end_date: '2026-11-28' },
      { ...config, id: 'cfg2', start_date: '2026-12-01', cycle_start_date: '2026-12-01' },
    ] }));
    expect(result.outsideConfig).toBe(2);
    expect(result.assignments.find(a => a.assignment_date === '2026-12-01')?.shift_id).toBe('day');
  });
  it('preserves existing assignments and skips work during absences while retaining rest days', () => {
    const result = buildCyclePreview(request, data({ existing: [{ employee_id: 'e1', assignment_date: '2026-11-26' }], absences: [{ employee_id: 'e1', start_date: '2026-11-27', end_date: '2026-11-28' }] }));
    expect(result.preserved).toBe(1); expect(result.absent).toBe(1);
    expect(result.assignments.find(a => a.assignment_date === '2026-11-28')?.shift_id).toBe('rest');
  });
  it('does not generate for unselected employees or inactive configured cycles', () => {
    const result = buildCyclePreview(request, data({ configs: [config, { ...config, employee_id: 'e2' }], activeEmployeeIds: ['e1','e2'] }));
    expect(result.assignments.every(a => a.employee_id === 'e1')).toBe(true);
    expect(buildCyclePreview(request, data({ cycles: [{ ...cycle, is_active: false }] })).assignments).toEqual([]);
  });
  it('rejects reversed dates, inactive selected cycles, incomplete cycles and inactive employees', () => {
    expect(() => buildCyclePreview({ ...request, end: '2026-11-01' }, data())).toThrow('período válido');
    expect(() => buildCyclePreview({ ...request, cycleId: 'c1' }, data({ cycles: [{ ...cycle, is_active: false }] }))).toThrow('no está activo');
    expect(() => buildCyclePreview(request, data({ cycles: [{ ...cycle, total_days: 4 }] }))).toThrow('secuencia incompleta');
    expect(() => buildCyclePreview(request, data({ activeEmployeeIds: [] }))).toThrow('ya no está activo');
  });
  it('handles cycle dates before the anchor with positive modulo', () => {
    expect(buildCyclePreview(request, data({ configs: [{ ...config, cycle_start_date: '2026-11-27' }] })).assignments[0].shift_id).toBe('rest');
  });
});
