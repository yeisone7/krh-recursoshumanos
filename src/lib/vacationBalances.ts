import type { VacationBalance, VacationBalanceSummary } from '@/types/vacation';

const amount = (value: number | null | undefined) => Number(value ?? 0);

export function buildVacationBalanceSummaries(balances: VacationBalance[]): VacationBalanceSummary[] {
  const grouped = new Map<string, VacationBalanceSummary>();

  balances.forEach((balance) => {
    const current = grouped.get(balance.employee_id) ?? {
      employee_id: balance.employee_id,
      employee: balance.employee,
      periods: [],
      days_accrued: 0,
      days_adjusted: 0,
      days_taken: 0,
      days_compensated: 0,
      days_reserved: 0,
      days_available: 0,
      last_accrual_date: null,
    };

    current.periods.push(balance);
    current.employee ??= balance.employee;
    current.days_accrued += amount(balance.days_accrued);
    current.days_adjusted += amount(balance.days_adjusted);
    current.days_taken += amount(balance.days_taken);
    current.days_compensated += amount(balance.days_compensated);
    current.days_reserved += amount(balance.days_reserved);
    current.days_available += amount(balance.days_available ?? balance.days_pending);
    if (balance.last_accrual_date && (!current.last_accrual_date || balance.last_accrual_date > current.last_accrual_date)) {
      current.last_accrual_date = balance.last_accrual_date;
    }
    grouped.set(balance.employee_id, current);
  });

  return [...grouped.values()]
    .map((summary) => ({
      ...summary,
      periods: summary.periods.sort((a, b) => b.period_start.localeCompare(a.period_start)),
    }))
    .sort((a, b) => {
      const aName = `${a.employee?.first_name ?? ''} ${a.employee?.last_name ?? ''}`;
      const bName = `${b.employee?.first_name ?? ''} ${b.employee?.last_name ?? ''}`;
      return aName.localeCompare(bName, 'es');
    });
}
