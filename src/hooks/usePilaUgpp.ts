import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export type PilaPeriodStatus = 'borrador' | 'validado' | 'con_alertas' | 'cerrado';
export type PilaValidationStatus = 'ok' | 'advertencia' | 'critico';

export interface PilaUgppSettings {
  id: string;
  company_id: string;
  health_employee_rate: number;
  health_employer_rate: number;
  pension_employee_rate: number;
  pension_employer_rate: number;
  ccf_rate: number;
  sena_rate: number;
  icbf_rate: number;
  arl_rate_i: number;
  arl_rate_ii: number;
  arl_rate_iii: number;
  arl_rate_iv: number;
  arl_rate_v: number;
  salary_floor_enabled: boolean;
  notes: string | null;
}

export interface PilaUgppPeriod {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  period_label: string;
  status: PilaPeriodStatus;
  total_employees: number;
  critical_count: number;
  warning_count: number;
  ok_count: number;
  total_ibc: number;
  estimated_total_contributions: number;
  generated_by: string | null;
  generated_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PilaUgppValidation {
  id: string;
  period_id: string;
  company_id: string;
  employee_id: string;
  contract_id: string | null;
  employee_name: string;
  document_type: string | null;
  document_number: string | null;
  position_name: string | null;
  operation_center_name: string | null;
  salary: number;
  ibc: number;
  risk_level: string | null;
  eps: string | null;
  afp: string | null;
  arl: string | null;
  ccf: string | null;
  novelty_summary: Record<string, unknown>;
  estimated_contributions: Record<string, number>;
  issues: Array<{ code: string; level: PilaValidationStatus; message: string }>;
  issue_count: number;
  status: PilaValidationStatus;
  created_at: string;
}

const defaultSettings: Omit<PilaUgppSettings, 'id' | 'company_id' | 'notes'> = {
  health_employee_rate: 0.04,
  health_employer_rate: 0.085,
  pension_employee_rate: 0.04,
  pension_employer_rate: 0.12,
  ccf_rate: 0.04,
  sena_rate: 0.02,
  icbf_rate: 0.03,
  arl_rate_i: 0.00522,
  arl_rate_ii: 0.01044,
  arl_rate_iii: 0.02436,
  arl_rate_iv: 0.0435,
  arl_rate_v: 0.0696,
  salary_floor_enabled: true,
};

function monthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  const periodStart = start.toISOString().slice(0, 10);
  const periodEnd = end.toISOString().slice(0, 10);
  const periodLabel = start.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return { periodStart, periodEnd, periodLabel };
}

function fullName(employee: any) {
  return [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function activeContractForEmployee(contracts: any[], employeeId: string, periodEnd: string) {
  return contracts
    .filter((contract) => contract.employee_id === employeeId)
    .filter((contract) => !contract.is_terminated || !contract.termination_date || contract.termination_date > periodEnd)
    .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')))[0] || null;
}

function arlRate(settings: PilaUgppSettings | null, riskLevel?: string | null) {
  const normalized = String(riskLevel || '').toUpperCase();
  const source = settings || ({ ...defaultSettings } as PilaUgppSettings);
  if (normalized === 'II') return source.arl_rate_ii;
  if (normalized === 'III') return source.arl_rate_iii;
  if (normalized === 'IV') return source.arl_rate_iv;
  if (normalized === 'V') return source.arl_rate_v;
  return source.arl_rate_i;
}

function contributionEstimate(ibc: number, settings: PilaUgppSettings | null, riskLevel?: string | null) {
  const source = settings || ({ ...defaultSettings } as PilaUgppSettings);
  const healthEmployee = ibc * Number(source.health_employee_rate || 0);
  const healthEmployer = ibc * Number(source.health_employer_rate || 0);
  const pensionEmployee = ibc * Number(source.pension_employee_rate || 0);
  const pensionEmployer = ibc * Number(source.pension_employer_rate || 0);
  const arl = ibc * arlRate(settings, riskLevel);
  const ccf = ibc * Number(source.ccf_rate || 0);
  const sena = ibc * Number(source.sena_rate || 0);
  const icbf = ibc * Number(source.icbf_rate || 0);

  return {
    health_employee: Math.round(healthEmployee),
    health_employer: Math.round(healthEmployer),
    pension_employee: Math.round(pensionEmployee),
    pension_employer: Math.round(pensionEmployer),
    arl: Math.round(arl),
    ccf: Math.round(ccf),
    sena: Math.round(sena),
    icbf: Math.round(icbf),
    total: Math.round(healthEmployee + healthEmployer + pensionEmployee + pensionEmployer + arl + ccf + sena + icbf),
  };
}

function buildEmployeeValidation({
  employee,
  contract,
  settings,
  novelties,
  incapacities,
  periodEnd,
  companyId,
  periodId,
}: {
  employee: any;
  contract: any;
  settings: PilaUgppSettings | null;
  novelties: any[];
  incapacities: any[];
  periodEnd: string;
  companyId: string;
  periodId: string;
}) {
  const social = (employee.employee_social_security || []).find((item: any) => item.is_current) || employee.employee_social_security?.[0] || {};
  const work = (employee.employee_work_info || []).find((item: any) => item.is_current) || employee.employee_work_info?.[0] || {};
  const salary = Number(contract?.salary || 0);
  const ibc = salary > 0 ? salary : 0;
  const issues: Array<{ code: string; level: PilaValidationStatus; message: string }> = [];

  if (!contract) issues.push({ code: 'NO_CONTRACT', level: 'critico', message: 'Empleado activo sin contrato vigente para el periodo.' });
  if (contract && contract.is_approved === false) issues.push({ code: 'CONTRACT_NOT_APPROVED', level: 'advertencia', message: 'Contrato vigente pendiente de aprobacion.' });
  if (salary <= 0) issues.push({ code: 'NO_SALARY', level: 'critico', message: 'No se encontro salario base para calcular IBC.' });
  if (!social.eps) issues.push({ code: 'NO_EPS', level: 'critico', message: 'Falta EPS vigente.' });
  if (!social.afp) issues.push({ code: 'NO_AFP', level: 'critico', message: 'Falta fondo de pension vigente.' });
  if (!social.arl) issues.push({ code: 'NO_ARL', level: 'critico', message: 'Falta ARL vigente.' });
  if (!social.ccf) issues.push({ code: 'NO_CCF', level: 'advertencia', message: 'Falta caja de compensacion vigente.' });
  if (!social.risk_level) issues.push({ code: 'NO_RISK_LEVEL', level: 'advertencia', message: 'Falta nivel de riesgo ARL.' });
  if (employee.is_active === false) issues.push({ code: 'INACTIVE_EMPLOYEE', level: 'advertencia', message: 'Empleado marcado como inactivo.' });
  if (contract?.end_date && contract.end_date < periodEnd && !contract.is_terminated) {
    issues.push({ code: 'EXPIRED_CONTRACT', level: 'advertencia', message: 'El contrato tiene fecha fin anterior al cierre del periodo.' });
  }

  const employeeNovelties = novelties.filter((item) => item.employee_id === employee.id);
  const employeeIncapacities = incapacities.filter((item) => item.employee_id === employee.id);
  const noveltySummary = {
    payroll_novelties: employeeNovelties.length,
    incapacity_records: employeeIncapacities.length,
    incapacity_days: employeeIncapacities.reduce((sum, item) => sum + Number(item.total_days || 0), 0),
    novelty_types: Array.from(new Set(employeeNovelties.map((item) => item.novelty_type).filter(Boolean))),
  };
  const estimated = contributionEstimate(ibc, settings, social.risk_level);
  const hasCritical = issues.some((issue) => issue.level === 'critico');
  const status: PilaValidationStatus = hasCritical ? 'critico' : issues.length ? 'advertencia' : 'ok';

  return {
    period_id: periodId,
    company_id: companyId,
    employee_id: employee.id,
    contract_id: contract?.id || null,
    employee_name: fullName(employee) || 'Empleado sin nombre',
    document_type: employee.document_type,
    document_number: employee.document_number,
    position_name: work.position_name || null,
    operation_center_name: work.operation_centers?.name || null,
    salary,
    ibc,
    risk_level: social.risk_level || null,
    eps: social.eps || null,
    afp: social.afp || null,
    arl: social.arl || null,
    ccf: social.ccf || null,
    novelty_summary: noveltySummary,
    estimated_contributions: estimated,
    issues,
    issue_count: issues.length,
    status,
  };
}

export function usePilaUgppSettings() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['pila-ugpp-settings', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return null;
      const { data, error } = await db
        .from('pila_ugpp_settings')
        .select('*')
        .eq('company_id', currentCompanyId)
        .maybeSingle();

      if (error) throw error;
      return (data || null) as PilaUgppSettings | null;
    },
    enabled: !!currentCompanyId,
  });
}

export function usePilaUgppPeriods() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['pila-ugpp-periods', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await db
        .from('pila_ugpp_periods')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return (data || []) as PilaUgppPeriod[];
    },
    enabled: !!currentCompanyId,
  });
}

export function usePilaUgppValidations(periodId?: string | null) {
  return useQuery({
    queryKey: ['pila-ugpp-validations', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data, error } = await db
        .from('pila_ugpp_employee_validations')
        .select('*')
        .eq('period_id', periodId)
        .order('status', { ascending: true })
        .order('issue_count', { ascending: false });

      if (error) throw error;
      return (data || []) as PilaUgppValidation[];
    },
    enabled: !!periodId,
  });
}

export function useGeneratePilaUgppPeriod() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async ({ month, settings }: { month: string; settings: PilaUgppSettings | null }) => {
      if (!currentCompanyId) throw new Error('No hay empresa activa.');
      const { periodStart, periodEnd, periodLabel } = monthRange(month);

      const { data: period, error: periodError } = await db
        .from('pila_ugpp_periods')
        .upsert({
          company_id: currentCompanyId,
          period_start: periodStart,
          period_end: periodEnd,
          period_label: periodLabel,
          status: 'borrador',
          generated_by: user?.id,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,period_start' })
        .select()
        .single();

      if (periodError) throw periodError;

      const [employeesRes, contractsRes, noveltiesRes, incapacitiesRes] = await Promise.all([
        db
          .from('employees_v2')
          .select(`
            id, company_id, document_type, document_number, first_name, middle_name, last_name, second_last_name, is_active,
            employee_social_security(id, risk_level, arl, eps, afp, ccf, is_current),
            employee_work_info(id, position_name, is_current, hire_date, termination_date, operation_centers(name))
          `)
          .eq('company_id', currentCompanyId),
        db
          .from('contracts')
          .select('id, company_id, employee_id, contract_number, start_date, end_date, salary, salary_type, is_terminated, termination_date, is_approved')
          .eq('company_id', currentCompanyId),
        db
          .from('payroll_novelties')
          .select('id, employee_id, novelty_type, novelty_date, hours, status')
          .eq('company_id', currentCompanyId)
          .gte('novelty_date', periodStart)
          .lte('novelty_date', periodEnd),
        db
          .from('employee_incapacities')
          .select('id, employee_id, start_date, end_date, total_days, origin, recovery_status')
          .eq('company_id', currentCompanyId)
          .lte('start_date', periodEnd)
          .gte('end_date', periodStart),
      ]);

      for (const result of [employeesRes, contractsRes, noveltiesRes, incapacitiesRes]) {
        if (result.error) throw result.error;
      }

      const employees = (employeesRes.data || []).filter((employee: any) => employee.is_active !== false);
      const contracts = contractsRes.data || [];
      const novelties = noveltiesRes.data || [];
      const incapacities = incapacitiesRes.data || [];

      const validations = employees.map((employee: any) => buildEmployeeValidation({
        employee,
        contract: activeContractForEmployee(contracts, employee.id, periodEnd),
        settings,
        novelties,
        incapacities,
        periodEnd,
        companyId: currentCompanyId,
        periodId: period.id,
      }));

      await db
        .from('pila_ugpp_employee_validations')
        .delete()
        .eq('period_id', period.id);

      if (validations.length > 0) {
        const { error: insertError } = await db
          .from('pila_ugpp_employee_validations')
          .insert(validations);
        if (insertError) throw insertError;
      }

      const criticalCount = validations.filter((item) => item.status === 'critico').length;
      const warningCount = validations.filter((item) => item.status === 'advertencia').length;
      const okCount = validations.filter((item) => item.status === 'ok').length;
      const totalIbc = validations.reduce((sum, item) => sum + Number(item.ibc || 0), 0);
      const estimatedTotal = validations.reduce((sum, item) => sum + Number((item.estimated_contributions as any).total || 0), 0);

      const { data: updatedPeriod, error: updateError } = await db
        .from('pila_ugpp_periods')
        .update({
          status: criticalCount || warningCount ? 'con_alertas' : 'validado',
          total_employees: validations.length,
          critical_count: criticalCount,
          warning_count: warningCount,
          ok_count: okCount,
          total_ibc: totalIbc,
          estimated_total_contributions: estimatedTotal,
        })
        .eq('id', period.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedPeriod as PilaUgppPeriod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pila-ugpp-periods'] });
      queryClient.invalidateQueries({ queryKey: ['pila-ugpp-validations'] });
      toast.success('Periodo PILA/UGPP generado');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo generar el periodo PILA/UGPP'),
  });
}
