import type {
  BuildQueryOptions,
  PayrollQuerySources,
} from '@/lib/payrollDynamicQuery';

export function payrollQueryFixture(): PayrollQuerySources {
  return {
    employees: [
      {
        id: 'emp-1',
        company_id: 'company-1',
        first_name: 'María',
        middle_name: null,
        last_name: 'Muñoz',
        second_last_name: null,
        document_type: 'CC',
        document_number: '001234',
        status: 'active',
        is_active: true,
      },
    ],
    cycles: [
      {
        id: 'cycle-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        cycle_number: 1,
        start_date: '2026-09-01',
        end_date: null,
      } as PayrollQuerySources['cycles'][number],
    ],
    workInfos: [
      {
        id: 'work-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        employment_cycle_id: 'cycle-1',
        valid_from: '2026-09-01',
        valid_to: null,
        hire_date: '2026-09-01',
        operation_center_id: 'center-1',
        cost_center: '001',
        position_name: 'Auxiliar',
        operation_centers: { name: 'Bogotá' },
        areas: { name: 'Operaciones' },
      } as PayrollQuerySources['workInfos'][number],
    ],
    contracts: [
      {
        id: 'contract-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        employment_cycle_id: 'cycle-1',
        start_date: '2026-09-01',
        end_date: null,
        contract_number: '00042',
        salary: 2000000,
      } as PayrollQuerySources['contracts'][number],
    ],
    schedules: [
      {
        id: 'schedule-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        employment_cycle_id: 'cycle-1',
        valid_from: '2026-09-01',
        valid_to: null,
        payroll_type: 'quincenal',
        rest_day: 'domingo',
      } as PayrollQuerySources['schedules'][number],
    ],
    socialSecurities: [
      {
        id: 'social-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        employment_cycle_id: 'cycle-1',
        valid_from: '2026-09-01',
        valid_to: null,
        eps: 'EPS prueba',
      } as PayrollQuerySources['socialSecurities'][number],
    ],
    timeConfigs: [
      {
        id: 'config-1',
        company_id: 'company-1',
        employee_id: 'emp-1',
        employment_cycle_id: 'cycle-1',
        start_date: '2026-09-01',
        end_date: null,
        mode: 'shift',
        shift_cycles: { name: 'Rotación' },
      } as PayrollQuerySources['timeConfigs'][number],
    ],
    assignments: ['2026-09-14', '2026-09-15', '2026-09-16'].map(
      (date, index) =>
        ({
          id: `assignment-${index}`,
          company_id: 'company-1',
          employee_id: 'emp-1',
          employment_cycle_id: 'cycle-1',
          assignment_date: date,
          shift_id: 'shift-1',
          source: 'manual',
          shifts: {
            id: 'shift-1',
            name: 'Diurno',
            code: 'D1',
            start_time: '08:00',
            end_time: '17:00',
            break_minutes: 60,
            crosses_midnight: false,
            is_rest_day: false,
            is_not_worked_day: false,
            is_suspension_day: false,
          },
        }) as PayrollQuerySources['assignments'][number],
    ),
    novelties: [],
    overtime: [],
    incapacities: [],
    vacations: [],
    leaves: [],
    holidays: [],
    config: {
      id: 'payroll-1',
      company_id: 'company-1',
      daily_hours: 8,
    } as PayrollQuerySources['config'],
    centers: [
      { id: 'center-1', name: 'Bogotá' },
      { id: 'center-2', name: 'Medellín' },
    ],
  };
}
export const payrollQueryOptions: BuildQueryOptions = {
  companyId: 'company-1',
  companyName: 'Empresa Prueba',
  startDate: '2026-09-14',
  endDate: '2026-09-16',
  authorizedCenterIds: ['center-1', 'center-2'],
  allowUnresolvedCenter: false,
};
