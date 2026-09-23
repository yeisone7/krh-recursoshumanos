export function scheduleForDate<T extends { employee_id: string; start_date: string; end_date?: string | null; is_active?: boolean }>(configs: T[], employeeId: string, date: string): T | undefined {
  return configs.filter(c => c.employee_id === employeeId && (c.is_active || c.end_date) && c.start_date <= date && (!c.end_date || c.end_date >= date))
    .sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
}
