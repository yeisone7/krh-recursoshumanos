import { describe, expect, it } from 'vitest';
import { allocateIncapacity, allocationWeekdays, hasValidIncapacityInterval } from './incapacityAllocation';
import { buildIncapacityDurationBuckets, buildMonthlyEpsRecovery, getIncapacityRecoveryAmounts } from './incapacityAnalytics';
import { buildIncapacityOperationsTimeline, filterIncapacityOperationsRows, getIncapacityOperationsMonths, type IncapacityOperationsRow } from './incapacityOperationsReport';

const date = (value: string) => new Date(`${value}T12:00:00`);
const maternity = {
  start_date: '2026-09-24', end_date: '2026-11-02', total_days: 40,
  origin: 'licencia_maternidad' as const, total_amount: 4000, eps_amount: 4000,
  recovery_status: 'pendiente', recovered_amount: 0,
};

describe('calendar allocation of incapacity analytics', () => {
  it('counts today inclusively and accrues later months only as days pass', () => {
    expect(allocateIncapacity(maternity, null, date('2026-09-24'))).toMatchObject({ total_days: 1, total_amount: 100, eps_amount: 100 });
    const september = allocateIncapacity(maternity, null, date('2026-09-30'))!;
    expect(september.total_days).toBe(7);
    expect(allocationWeekdays(september)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    const october = allocateIncapacity(maternity, { start: date('2026-10-01'), end: date('2026-10-31') }, date('2026-10-05'))!;
    expect(october).toMatchObject({ total_days: 5, total_amount: 500, eps_amount: 500 });
    expect(buildIncapacityDurationBuckets([october])[1].cases).toBe(1);
    expect(maternity.total_days).toBe(40);
  });

  it('reconciles monthly amounts, recovery allocation and repeated filtering', () => {
    const row = { ...maternity, total_amount: 4000.03, recovered_amount: 1000, actual_payment_date: '2026-11-02' };
    const full = allocateIncapacity(row, null, date('2026-11-02'))!;
    const months = buildMonthlyEpsRecovery([full]);
    expect(months.map(row => [row.monthKey, row.expected, row.recovered])).toEqual([
      ['2026-11', 200, 50], ['2026-10', 3100, 775], ['2026-09', 700, 175],
    ]);
    const slices = ['09', '10', '11'].map(month => allocateIncapacity(full, { start: date(`2026-${month}-01`), end: date(`2026-${month}-${month === '10' ? '31' : '30'}`) }, date('2026-11-02'))!);
    expect(slices.reduce((sum, row) => sum + row.total_amount, 0)).toBeCloseTo(4000.03, 2);
    expect(slices.reduce((sum, row) => sum + row.total_days, 0)).toBe(40);
    expect(allocateIncapacity(slices[0], null, date('2026-11-02'))).toMatchObject({ total_days: 7, eps_amount: 700 });
  });

  it('does not infer payments from status or include undated/future payments', () => {
    for (const payment of [
      { recovered_amount: 0, actual_payment_date: '2026-09-25' },
      { recovered_amount: 1000, actual_payment_date: null },
      { recovered_amount: 1000, actual_payment_date: '2026-11-01' },
    ]) {
      const row = allocateIncapacity({ ...maternity, ...payment, recovery_status: 'pagado' }, null, date('2026-09-30'))!;
      expect(getIncapacityRecoveryAmounts(row)).toEqual({ expected: 700, recovered: 0, pending: 700 });
    }
  });

  it('assigns payer days across month and extension boundaries without restarting stages', () => {
    const root = { start_date: '2026-09-30', end_date: '2026-10-03', origin: 'comun' as const, total_amount: 400, eps_amount: 200 };
    expect(allocateIncapacity(root, null, date('2026-09-30'))).toMatchObject({ employer_days: 1, eps_days: 0, eps_amount: 0 });
    expect(allocateIncapacity(root, { start: date('2026-10-01'), end: date('2026-10-31') }, date('2026-10-03'))).toMatchObject({ employer_days: 1, eps_days: 2, eps_amount: 200 });
    const extension = { ...root, start_date: '2026-10-04', end_date: '2026-10-06', accumulatedDays: 180, eps_amount: 0, afp_amount: 300 };
    expect(allocateIncapacity(extension, null, date('2026-10-04'))).toMatchObject({ employer_days: 0, eps_days: 0, afp_days: 1, afp_amount: 100 });
  });

  it('respects company-assumed cases and changes in EPS rates', () => {
    const assumed = allocateIncapacity({ ...maternity, recovery_status: 'asumido_empresa' }, null, date('2026-09-30'))!;
    expect(assumed).toMatchObject({ employer_days: 7, eps_days: 0, eps_amount: 0, total_amount: 700 });
    expect(getIncapacityRecoveryAmounts(assumed).expected).toBe(0);
    const extension = { ...maternity, origin: 'comun' as const, accumulatedDays: 89,
      start_date: '2026-09-30', end_date: '2026-10-01', daily_base_salary: 300000, eps_amount: 350010 };
    const september = allocateIncapacity(extension, null, date('2026-09-30'))!;
    const october = allocateIncapacity(extension, { start: date('2026-10-01'), end: date('2026-10-31') }, date('2026-10-01'))!;
    expect(september.eps_amount).toBe(200010);
    expect(october.eps_amount).toBe(150000);
  });

  it('handles leap days, year changes, single days and invalid intervals', () => {
    expect(allocateIncapacity({ ...maternity, start_date: '2024-02-28', end_date: '2024-03-01' }, null, date('2024-03-01'))?.total_days).toBe(3);
    expect(allocateIncapacity({ ...maternity, start_date: '2025-12-31', end_date: '2026-01-01' }, null, date('2026-01-01'))?.total_days).toBe(2);
    expect(allocateIncapacity({ ...maternity, end_date: maternity.start_date }, null, date('2026-09-24'))?.total_days).toBe(1);
    expect(allocateIncapacity(maternity, null, date('2026-09-23'))).toBeNull();
    for (const end_date of ['2026-02-30', 'invalid', '2026-09-23']) {
      expect(hasValidIncapacityInterval({ ...maternity, end_date })).toBe(false);
      expect(allocateIncapacity({ ...maternity, end_date }, null, date('2026-09-30'))).toBeNull();
    }
  });

  it('intersects operational months with the general period and today', () => {
    const row = { id: '1', startDate: '2026-09-24', endDate: '2026-11-02', effectiveStart: '2026-10-01', effectiveEnd: '2026-10-05', totalDays: 5 } as IncapacityOperationsRow;
    expect(getIncapacityOperationsMonths([row])).toEqual(['2026-10']);
    const filters = { month: '2026-10', employeeId: 'all', operationCenterId: 'all', positionName: 'all' };
    expect(filterIncapacityOperationsRows([row], filters)[0]).toMatchObject({ totalDays: 5, effectiveStart: '2026-10-01', effectiveEnd: '2026-10-05' });
    expect(filterIncapacityOperationsRows([row], { ...filters, month: '2026-09' })).toEqual([]);
    expect(buildIncapacityOperationsTimeline([row])).toEqual([
      { date: '2026-10-01', cases: 1 }, { date: '2026-10-02', cases: 1 },
      { date: '2026-10-03', cases: 1 }, { date: '2026-10-04', cases: 1 },
      { date: '2026-10-05', cases: 1 },
    ]);
  });
});
