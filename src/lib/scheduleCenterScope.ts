import type { EmployeeV2WithRelations } from '@/types/employee';
import type { Shift } from '@/types/schedule';

export function getEmployeeOperationCenterIds(
  employee: Pick<EmployeeV2WithRelations, 'work_info' | 'operation_center_assignments'>,
): string[] {
  const centerIds = new Set<string>();

  if (employee.work_info?.operation_center_id) {
    centerIds.add(employee.work_info.operation_center_id);
  }

  employee.operation_center_assignments?.forEach((assignment) => {
    if (assignment.operation_center_id) {
      centerIds.add(assignment.operation_center_id);
    }
  });

  return [...centerIds];
}

export function getShiftOperationCenterIds(
  shift: Pick<Shift, 'shift_operation_centers'>,
): string[] {
  return [...new Set(
    (shift.shift_operation_centers ?? []).map((scope) => scope.operation_center_id),
  )];
}

export function isGlobalDayShift(shift: Pick<Shift, 'shift_operation_centers'>): boolean {
  return getShiftOperationCenterIds(shift).length === 0;
}

export function isShiftEligibleForEmployee(
  shift: Pick<Shift, 'kind' | 'shift_operation_centers'>,
  employee: Pick<EmployeeV2WithRelations, 'work_info' | 'operation_center_assignments'>,
): boolean {
  if (shift.kind !== 'day' || isGlobalDayShift(shift)) {
    return true;
  }

  const employeeCenterIds = new Set(getEmployeeOperationCenterIds(employee));
  return getShiftOperationCenterIds(shift).some((centerId) => employeeCenterIds.has(centerId));
}

export function isShiftEligibleForEmployees(
  shift: Pick<Shift, 'kind' | 'shift_operation_centers'>,
  employees: Array<Pick<EmployeeV2WithRelations, 'work_info' | 'operation_center_assignments'>>,
): boolean {
  return employees.every((employee) => isShiftEligibleForEmployee(shift, employee));
}

export function filterDayShiftsForCenter(shifts: Shift[], centerId: string): Shift[] {
  if (centerId === 'all') return shifts;
  if (centerId === 'global') return shifts.filter(isGlobalDayShift);

  return shifts.filter((shift) => (
    isGlobalDayShift(shift)
    || getShiftOperationCenterIds(shift).includes(centerId)
  ));
}
