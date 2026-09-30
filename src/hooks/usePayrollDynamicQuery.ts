import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAllAnalyticsRows } from '@/lib/employeeAnalyticsData';
import type { Database } from '@/integrations/supabase/types';
import {
  buildPayrollQueryRows,
  type PayrollQuerySources,
} from '@/lib/payrollDynamicQuery';

type TableName = keyof Database['public']['Tables'];
export interface PayrollQueryPeriod {
  startDate: string;
  endDate: string;
}
export interface PayrollQueryAccess {
  companyId: string;
  companyName: string;
  restricted: boolean;
  centerIds: string[];
}

// Every request uses the signed-in client and existing RLS. Range pagination also
// applies to catalogs and historical records, not just daily assignments.
export async function fetchPayrollQuerySources(
  access: PayrollQueryAccess,
  period: PayrollQueryPeriod,
  signal?: AbortSignal,
): Promise<PayrollQuerySources> {
  const fetchCompany = async <T>(
    table: TableName,
    select = '*',
    dateColumn?: string,
  ): Promise<T[]> =>
    fetchAllAnalyticsRows<T>(async (from, to) => {
      let query = supabase
        .from(table)
        .select(select)
        .eq('company_id', access.companyId)
        .order('id')
        .range(from, to);
      if (dateColumn)
        query = query
          .gte(dateColumn, period.startDate)
          .lte(dateColumn, period.endDate);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      return { data: data as unknown as T[], error };
    });
  const [employees, centers] = await Promise.all([
    fetchCompany<PayrollQuerySources['employees'][number]>(
      'employees_v2',
      'id,company_id,first_name,middle_name,last_name,second_last_name,document_type,document_number,status,is_active,identification_types(name)',
    ),
    fetchCompany<PayrollQuerySources['centers'][number]>(
      'operation_centers',
      'id,name,company_id',
    ),
  ]);
  const authorizedCenters = centers.filter(
    (center) => !access.restricted || access.centerIds.includes(center.id),
  );
  const ids = employees.map((employee) => employee.id);
  // Batching prevents large URL filters. Child tables are also explicitly scoped
  // to company; histories are fetched without is_current/is_active restrictions.
  async function fetchEmployees<K extends keyof PayrollQuerySources>(
    table: TableName,
    select = '*',
    dateColumn?: string,
    absence = false,
  ): Promise<PayrollQuerySources[K]> {
    const records: unknown[] = [];
    for (let index = 0; index < ids.length; index += 100) {
      const batch = ids.slice(index, index + 100);
      const page = await fetchAllAnalyticsRows<unknown>(async (from, to) => {
        let query = supabase
          .from(table)
          .select(select)
          .eq('company_id', access.companyId)
          .in('employee_id', batch)
          .order('id')
          .range(from, to);
        if (dateColumn)
          query = query
            .gte(dateColumn, period.startDate)
            .lte(dateColumn, period.endDate);
        if (absence) {
          query =
            table === 'vacation_requests'
              ? query.or(
                  `and(start_date.lte.${period.endDate},end_date.gte.${period.startDate}),and(resume_start_date.lte.${period.endDate},resume_end_date.gte.${period.startDate})`,
                )
              : query
                  .lte('start_date', period.endDate)
                  .gte('end_date', period.startDate);
        }
        if (signal) query = query.abortSignal(signal);
        const { data, error } = await query;
        if (error) throw new Error(`${table}: ${error.message}`);
        return { data, error };
      });
      records.push(...page);
    }
    return records as PayrollQuerySources[K];
  }
  const [
    cycles,
    workInfos,
    contracts,
    schedules,
    socialSecurities,
    timeConfigs,
    assignments,
    novelties,
    overtime,
    incapacities,
    vacations,
    leaves,
    holidays,
    configs,
  ] = await Promise.all([
    fetchEmployees<'cycles'>('employee_employment_cycles'),
    fetchEmployees<'workInfos'>(
      'employee_work_info',
      '*,operation_centers(name),areas(name),positions(name)',
    ),
    fetchEmployees<'contracts'>(
      'contracts',
      '*,contract_extensions(extension_number,start_date,end_date)',
    ),
    fetchEmployees<'schedules'>('employee_schedule'),
    fetchEmployees<'socialSecurities'>('employee_social_security'),
    fetchEmployees<'timeConfigs'>(
      'employee_time_config',
      '*,work_schedules(*),shift_cycles(name)',
    ),
    fetchEmployees<'assignments'>(
      'employee_shift_assignments',
      '*,shifts(*)',
      'assignment_date',
    ),
    fetchEmployees<'novelties'>(
      'payroll_novelties',
      '*,novelty_reasons(name)',
      'novelty_date',
    ),
    fetchEmployees<'overtime'>('overtime_records', '*', 'work_date'),
    fetchEmployees<'incapacities'>(
      'employee_incapacities',
      '*',
      undefined,
      true,
    ),
    fetchEmployees<'vacations'>('vacation_requests', '*', undefined, true),
    fetchEmployees<'leaves'>('leave_requests', '*', undefined, true),
    fetchCompany<PayrollQuerySources['holidays'][number]>(
      'company_holidays',
      '*',
      'holiday_date',
    ),
    fetchCompany<NonNullable<PayrollQuerySources['config']>>(
      'payroll_labor_config',
    ),
  ]);
  return {
    employees,
    centers: authorizedCenters,
    cycles,
    workInfos,
    contracts,
    schedules,
    socialSecurities,
    timeConfigs,
    assignments,
    novelties,
    overtime,
    incapacities,
    vacations,
    leaves,
    holidays,
    config: configs[0] || null,
  };
}

export function usePayrollDynamicQuery(period: PayrollQueryPeriod | null) {
  const {
    currentCompanyId,
    companies,
    user,
    assignedCenterIds,
    isAdmin,
    isSuperAdmin,
    canView,
    permissionsLoaded,
  } = useAuth();
  const restricted = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const centerIds = [...assignedCenterIds].sort();
  const allowed = permissionsLoaded && canView('analitica_nomina');
  return useQuery({
    queryKey: [
      'payroll_dynamic_query',
      user?.id,
      currentCompanyId,
      restricted,
      centerIds,
      allowed,
      period,
    ],
    enabled: !!user && !!currentCompanyId && !!period && allowed,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const access = {
        companyId: currentCompanyId!,
        companyName:
          companies.find((company) => company.id === currentCompanyId)?.name ||
          '',
        restricted,
        centerIds,
      };
      const sources = await fetchPayrollQuerySources(access, period!, signal);
      return buildPayrollQueryRows(sources, {
        ...period!,
        companyId: access.companyId,
        companyName: access.companyName,
        authorizedCenterIds: sources.centers.map((center) => center.id),
        allowUnresolvedCenter: !restricted,
      });
    },
  });
}
