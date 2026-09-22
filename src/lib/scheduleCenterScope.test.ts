import { describe, expect, it } from 'vitest';
import type { EmployeeV2WithRelations } from '@/types/employee';
import type { Shift } from '@/types/schedule';
import {
  filterDayShiftsForCenter,
  getEmployeeOperationCenterIds,
  isShiftEligibleForEmployee,
  isShiftEligibleForEmployees,
} from './scheduleCenterScope';

const dayShift = (id: string, centerIds: string[]): Shift => ({
  id,
  company_id: 'company-1',
  name: id,
  start_time: '06:00',
  end_time: '14:00',
  break_minutes: 0,
  crosses_midnight: false,
  color: 'transparent',
  is_rest_day: false,
  is_active: true,
  kind: 'day',
  created_at: '',
  updated_at: '',
  shift_operation_centers: centerIds.map((operationCenterId) => ({
    id: `${id}-${operationCenterId}`,
    shift_id: id,
    operation_center_id: operationCenterId,
  })),
});

const employee = (primary: string | null, additional: string[]): EmployeeV2WithRelations => ({
  id: 'employee-1',
  company_id: 'company-1',
  identification_type_id: null,
  document_type: null,
  document_number: '1',
  document_issue_city: null,
  document_issue_date: null,
  first_name: 'Ana',
  middle_name: null,
  last_name: 'Perez',
  second_last_name: null,
  birth_country: null,
  birth_department: null,
  birth_city: null,
  birth_date: null,
  gender: null,
  blood_type: null,
  marital_status: null,
  education_level_id: null,
  profession_id: null,
  is_active: true,
  proceso_exclusivo_pcd: false,
  avatar_url: null,
  created_by: null,
  created_at: '',
  updated_at: '',
  work_info: primary ? ({ operation_center_id: primary } as EmployeeV2WithRelations['work_info']) : null,
  operation_center_assignments: additional.map((operationCenterId) => ({
    id: operationCenterId,
    employee_id: 'employee-1',
    company_id: 'company-1',
    operation_center_id: operationCenterId,
    created_by: null,
    created_at: '',
    updated_at: '',
  })),
});

describe('schedule center eligibility', () => {
  it('returns the union of the primary and additional centers without duplicates', () => {
    expect(getEmployeeOperationCenterIds(employee('center-a', ['center-a', 'center-b'])))
      .toEqual(['center-a', 'center-b']);
  });

  it('makes global day shifts available to employees with or without centers', () => {
    expect(isShiftEligibleForEmployee(dayShift('global', []), employee(null, []))).toBe(true);
  });

  it('accepts an intersection with any active employee center', () => {
    const scoped = dayShift('scoped', ['center-b', 'center-c']);
    expect(isShiftEligibleForEmployee(scoped, employee('center-a', ['center-b']))).toBe(true);
    expect(isShiftEligibleForEmployee(scoped, employee('center-a', []))).toBe(false);
  });

  it('only offers a shift to a group when every selected employee is eligible', () => {
    const scoped = dayShift('scoped', ['center-b']);
    expect(isShiftEligibleForEmployees(scoped, [
      employee('center-a', ['center-b']),
      employee('center-b', []),
    ])).toBe(true);
    expect(isShiftEligibleForEmployees(scoped, [
      employee('center-b', []),
      employee('center-c', []),
    ])).toBe(false);
  });

  it('includes global shifts when filtering a concrete center', () => {
    const shifts = [dayShift('global', []), dayShift('a', ['center-a']), dayShift('b', ['center-b'])];
    expect(filterDayShiftsForCenter(shifts, 'center-a').map((shift) => shift.id)).toEqual(['global', 'a']);
    expect(filterDayShiftsForCenter(shifts, 'global').map((shift) => shift.id)).toEqual(['global']);
  });
});
