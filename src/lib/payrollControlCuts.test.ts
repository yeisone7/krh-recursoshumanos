import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { cutFormError, effectiveCut } from './payrollControlCuts';
import { scheduleForDate } from './effectiveSchedule';
import { crossingDeductionVersions } from './deductionVersions';

describe('payroll control cuts', () => {
  it('uses the furthest date rather than the highest level', () => {
    expect(effectiveCut([{ level: 1, cutoff_date: '2026-01-20' }, { level: 2, cutoff_date: '2026-01-15' }])?.level).toBe(1);
    expect(effectiveCut([])).toBeUndefined();
  });
  it('accepts equality with the superior and rejects moving/reopening below it', () => {
    expect(cutFormError('create', '2026-01-15', 'Motivo válido', 1, '2026-01-15')).toBeNull();
    expect(cutFormError('update', '2026-01-14', 'Motivo válido', 1, '2026-01-15')).toContain('inclusive');
    expect(cutFormError('reopen', '', 'Motivo válido', 1, '2026-01-15', '2026-01-14')).toContain('inclusive');
    expect(cutFormError('reopen', '', 'Motivo válido', 2)).toBeNull();
  });
  it('requires a meaningful reason and rejects a future date', () => {
    expect(cutFormError('create', '2099-01-01', 'Motivo válido', 2)).toContain('hasta hoy');
    expect(cutFormError('create', '2026-01-01', '   x  ', 1)).toContain('cinco');
  });
  it('selects the schedule by date, including a superseded historical version', () => {
    const rows = [
      { id: 'old', employee_id: 'e', start_date: '2026-01-01', end_date: '2026-01-15', is_active: false },
      { id: 'new', employee_id: 'e', start_date: '2026-01-16', end_date: null, is_active: true },
    ];
    expect(scheduleForDate(rows, 'e', '2026-01-15')?.id).toBe('old');
    expect(scheduleForDate(rows, 'e', '2026-01-16')?.id).toBe('new');
    expect(scheduleForDate(rows, 'other', '2026-01-15')).toBeUndefined();
  });
  it('does not silently charge both versions for a period crossing new terms', () => {
    const rows = [{ id: 'old', start_date: '2026-01-01', end_date: '2026-01-15' }, { id: 'new', previous_version_id: 'old', start_date: '2026-01-16', end_date: null }, { id: 'unrelated', start_date: '2026-01-01' }];
    expect([...crossingDeductionVersions(rows, '2026-01-01', '2026-01-31')]).toEqual(['old', 'new']);
    expect(crossingDeductionVersions(rows, '2026-01-01', '2026-01-15').size).toBe(0);
    expect(crossingDeductionVersions(rows, '2026-01-16', '2026-01-31').size).toBe(0);
  });
});
