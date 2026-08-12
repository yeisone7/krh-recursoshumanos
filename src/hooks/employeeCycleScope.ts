export type EmploymentCycleScope = string | null;

type CycleScopedQuery<T> = {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
};

export function scopeToEmploymentCycle<T>(
  query: CycleScopedQuery<T>,
  employmentCycleId: EmploymentCycleScope,
): T {
  return employmentCycleId
    ? query.eq('employment_cycle_id', employmentCycleId)
    : query.is('employment_cycle_id', null);
}

export function withEmploymentCycle<T extends Record<string, unknown>>(
  record: T,
  employmentCycleId: EmploymentCycleScope,
): T & { employment_cycle_id: EmploymentCycleScope } {
  return { ...record, employment_cycle_id: employmentCycleId };
}
