import { toDateOnlyString } from '@/lib/dateOnly';
import { getIncapacityRecoveryAmounts } from '@/lib/incapacityAnalytics';
import { incapacityOriginValues, type IncapacityOrigin, type IncapacityWithEmployee } from '@/types/incapacity';

export function getIncapacityIndicators(cases: IncapacityWithEmployee[], today: string) {
  const records: IncapacityWithEmployee[] = cases.flatMap((initial) => [
    initial,
    ...(initial.extensions ?? []).map((extension) => ({ ...extension, employee: initial.employee })),
  ]);
  const active: IncapacityWithEmployee[] = [];
  const thisMonth: IncapacityWithEmployee[] = [];
  const pendingRecovery: IncapacityWithEmployee[] = [];
  const pendingBalance: IncapacityWithEmployee[] = [];
  const commonOrigin: IncapacityWithEmployee[] = [];
  const byOrigin = Object.fromEntries(incapacityOriginValues.map((origin) => [origin, 0])) as Record<IncapacityOrigin, number>;
  const currentMonth = today.slice(0, 7);
  let totalDays = 0;
  let totalDaysThisMonth = 0;
  let pendingRecoveryAmount = 0;
  let pendingBalanceAmount = 0;

  for (const record of records) {
    const start = toDateOnlyString(record.start_date);
    const end = toDateOnlyString(record.end_date);
    const balance = getIncapacityRecoveryAmounts(record).pending;

    if (start && end && start <= today && today <= end) active.push(record);
    if (start.slice(0, 7) === currentMonth) {
      thisMonth.push(record);
      totalDaysThisMonth += record.total_days;
    }
    if (record.recovery_status === 'pendiente' && end && end < today) {
      pendingRecovery.push(record);
      pendingRecoveryAmount += record.total_amount ?? 0;
    }
    if (balance > 0) {
      pendingBalance.push(record);
      pendingBalanceAmount += balance;
    }
    if (record.origin === 'comun') commonOrigin.push(record);
    if (record.origin in byOrigin) byOrigin[record.origin]++;
    totalDays += record.total_days;
  }

  return {
    active, thisMonth, pendingRecovery, pendingBalance, commonOrigin,
    totalDaysThisMonth, pendingRecoveryAmount, pendingBalanceAmount, byOrigin,
    avgDuration: records.length ? Math.round((totalDays / records.length) * 10) / 10 : 0,
  };
}
