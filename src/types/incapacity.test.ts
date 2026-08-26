import { describe, expect, it } from 'vitest';
import {
  applyRecoveryStatusToPaymentDistribution,
  calculatePaymentDistribution,
  calculateIncapacityEmployerCost,
  getAccumulatedDays,
  getAccumulatedDaysForNewExtension,
  getCurrentLegalStage,
  getFollowUpDocumentAvailability,
  getIncapacityRootId,
  getLegalMilestones,
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

  it('carga todo el valor al empleador cuando el recobro es asumido por la empresa', () => {
    const legalDistribution = calculatePaymentDistribution('laboral', 3, 58_363.5, 0, 1);
    const result = applyRecoveryStatusToPaymentDistribution(
      legalDistribution,
      'asumido_empresa',
      3,
    );

    expect(result.employerDays).toBe(3);
    expect(result.arlDays).toBe(0);
    expect(result.epsDays).toBe(0);
    expect(result.afpDays).toBe(0);
    expect(result.employerAmount).toBe(result.totalAmount);
    expect(result.arlAmount).toBe(0);
    expect(result.epsAmount).toBe(0);
    expect(result.afpAmount).toBe(0);
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

  it('carga solo el primer día laboral a la empresa y los demás a la ARL al 100%', () => {
    const result = calculatePaymentDistribution('laboral', 3, 100_000, 0, 1);

    expect(result.employerDays).toBe(1);
    expect(result.arlDays).toBe(2);
    expect(result.employerAmount).toBe(100_000);
    expect(result.arlAmount).toBe(200_000);
    expect(result.totalAmount).toBe(300_000);
  });

  it('carga las prórrogas laborales completamente a la ARL', () => {
    const result = calculatePaymentDistribution('laboral', 4, 100_000, 3, 1);

    expect(result.employerDays).toBe(0);
    expect(result.arlDays).toBe(4);
    expect(result.employerAmount).toBe(0);
    expect(result.arlAmount).toBe(400_000);
  });

  it('carga la licencia de paternidad completa a la EPS al 100%', () => {
    const result = calculatePaymentDistribution('licencia_paternidad', 14, 100_000, 0, 1);

    expect(result.employerDays).toBe(0);
    expect(result.epsDays).toBe(14);
    expect(result.epsAmount).toBe(1_400_000);
    expect(result.totalAmount).toBe(1_400_000);
    expect(getCurrentLegalStage('licencia_paternidad', 14)).toEqual({
      stage: 'eps_paternity',
      label: 'Licencia de paternidad',
      responsible: 'EPS (100%)',
    });
  });
});

describe('calculateIncapacityEmployerCost', () => {
  it('calcula prestaciones y aportes con las tarifas configuradas', () => {
    const result = calculateIncapacityEmployerCost(116_727, 'V', {
      health_employer_rate: 0,
      pension_employer_rate: 0.12,
      arl_rate_v: 0.0696,
      ccf_rate: 0.04,
    });

    expect(result.benefits.map((item) => item.amount)).toEqual([9727, 1167, 9727, 4868]);
    expect(result.contributions.map((item) => item.amount)).toEqual([0, 14007, 8124, 4669]);
    expect(result.benefits.find((item) => item.key === 'vacation')?.rate).toBe(0.0417);
    expect(result.contributions.find((item) => item.key === 'health')?.rate).toBe(0);
    expect(result.additionalCost).toBe(52289);
    expect(result.totalCost).toBe(169016);
  });

  it('usa el nivel de riesgo ARL del empleado y las tarifas legales por defecto', () => {
    const result = calculateIncapacityEmployerCost(100_000, 'III');
    const arl = result.contributions.find((item) => item.key === 'arl');
    const health = result.contributions.find((item) => item.key === 'health');

    expect(health).toMatchObject({ rate: 0, amount: 0 });
    expect(arl?.rate).toBe(0.02436);
    expect(arl?.amount).toBe(2436);
  });

  it('normaliza valores negativos y configuraciones con tarifa cero', () => {
    const result = calculateIncapacityEmployerCost(-50_000, null, {
      health_employer_rate: 0,
    });

    expect(result.paymentBase).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.contributions[0]).toMatchObject({ rate: 0, amount: 0 });
  });
});

describe('incapacity follow-up documents', () => {
  it('habilita el concepto de rehabilitación desde el día 120', () => {
    expect(getFollowUpDocumentAvailability('comun', 119)[0].isAvailable).toBe(false);
    expect(getFollowUpDocumentAvailability('comun', 119)[0].daysRemaining).toBe(1);
    expect(getFollowUpDocumentAvailability('comun', 120)[0].isAvailable).toBe(true);
  });

  it('habilita la calificación PCL desde el día 540', () => {
    const beforeThreshold = getFollowUpDocumentAvailability('comun', 539)
      .find((document) => document.entityType === 'incapacity_capacity_loss_rating');
    const atThreshold = getFollowUpDocumentAvailability('comun', 540)
      .find((document) => document.entityType === 'incapacity_capacity_loss_rating');

    expect(beforeThreshold?.isAvailable).toBe(false);
    expect(atThreshold?.isAvailable).toBe(true);
  });

  it('asigna una categoría documental independiente a cada hito legal', () => {
    expect(getLegalMilestones('comun', 540).map((milestone) => [
      milestone.key,
      milestone.documentEntityType,
    ])).toEqual([
      ['day_120', 'incapacity_rehabilitation_concept'],
      ['day_150', 'incapacity_afp_follow_up'],
      ['day_180', 'incapacity_economic_responsibility'],
      ['day_540', 'incapacity_capacity_loss_rating'],
    ]);
  });

  it('excluye los hitos y documentos para orígenes distintos al común', () => {
    for (const origin of ['laboral', 'accidente_transito', 'licencia_maternidad', 'licencia_paternidad'] as const) {
      expect(getLegalMilestones(origin, 600)).toEqual([]);
      expect(getFollowUpDocumentAvailability(origin, 600)).toEqual([]);
    }
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
    expect(getIncapacityRootId(secondExtension)).toBe(root.id);
  });
});
