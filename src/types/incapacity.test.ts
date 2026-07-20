import { describe, expect, it } from 'vitest';
import {
  calculatePaymentDistribution,
  getAccumulatedDays,
  getAccumulatedDaysForNewExtension,
  getCurrentLegalStage,
  type EmployeeIncapacity,
} from './incapacity';

const baseIncapacity = (overrides: Partial<EmployeeIncapacity>): EmployeeIncapacity => ({
  id: 'root',
  employee_id: 'employee',
  company_id: 'company',
  origin: 'comun',
  start_date: '2026-01-01',
  end_date: '2026-01-05',
  total_days: 5,
  cie10_code: null,
  diagnosis: 'Diagnóstico',
  treating_doctor: null,
  certificate_number: null,
  medical_entity: null,
  eps_name: null,
  arl_name: null,
  afp_name: null,
  employer_days: 2,
  eps_days: 3,
  arl_days: 0,
  afp_days: 0,
  daily_base_salary: 100_000,
  employer_amount: 0,
  eps_amount: 0,
  arl_amount: 0,
  afp_amount: 0,
  total_amount: 0,
  recovery_status: 'pendiente',
  filing_date: null,
  filing_number: null,
  expected_payment_date: null,
  actual_payment_date: null,
  recovered_amount: 0,
  recovery_notes: null,
  is_extension: false,
  parent_incapacity_id: null,
  extension_number: 0,
  certificate_url: null,
  clinical_history_url: null,
  requires_reintegration_exam: false,
  reintegration_exam_id: null,
  observations: null,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('calculatePaymentDistribution', () => {
  it('liquida desde el día 1 al 66.67% para origen común', () => {
    const result = calculatePaymentDistribution('comun', 3, 100_000, 0, 1);

    expect(result.employerDays).toBe(2);
    expect(result.epsDays).toBe(1);
    expect(result.employerAmount).toBeCloseTo(133_340, 2);
    expect(result.epsAmount).toBeCloseTo(66_670, 2);
  });

  it('aplica el piso diario del salario mínimo cuando el porcentaje queda por debajo', () => {
    const minimumMonthlyWage = 1_750_905;
    const result = calculatePaymentDistribution('comun', 1, 60_000, 0, minimumMonthlyWage);

    expect(result.usesMinimumWageFloor).toBe(true);
    expect(result.employerAmount).toBeCloseTo(minimumMonthlyWage / 30, 2);
    expect(result.totalAmount).toBeCloseTo(minimumMonthlyWage / 30, 2);
  });

  it('carga la licencia de maternidad completa a la EPS al 100%', () => {
    const result = calculatePaymentDistribution('licencia_maternidad', 10, 100_000, 0, 1);

    expect(result.employerDays).toBe(0);
    expect(result.epsDays).toBe(10);
    expect(result.epsAmount).toBe(1_000_000);
    expect(result.totalAmount).toBe(1_000_000);
    expect(getCurrentLegalStage('licencia_maternidad', 10).responsible).toBe('EPS (100%)');
  });
});

describe('incapacity extension chains', () => {
  it('acumula todas las prórrogas anteriores aunque compartan el mismo padre', () => {
    const root = baseIncapacity({});
    const firstExtension = baseIncapacity({
      id: 'extension-1',
      is_extension: true,
      parent_incapacity_id: root.id,
      extension_number: 1,
      start_date: '2026-01-06',
      end_date: '2026-01-15',
      total_days: 10,
    });
    const secondExtension = baseIncapacity({
      id: 'extension-2',
      is_extension: true,
      parent_incapacity_id: root.id,
      extension_number: 2,
      start_date: '2026-01-16',
      end_date: '2026-01-20',
      total_days: 5,
    });
    const chain = [root, firstExtension, secondExtension];

    expect(getAccumulatedDays(secondExtension, chain)).toBe(15);
    expect(getAccumulatedDaysForNewExtension(root.id, chain)).toBe(20);
  });
});
