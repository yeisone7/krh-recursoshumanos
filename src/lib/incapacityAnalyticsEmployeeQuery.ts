import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/integrations/supabase/types';

export function createIncapacityAnalyticsEmployeesQuery(
  client: SupabaseClient<Database>,
  companyId: string,
) {
  return client
    .from('employees_v2')
    .select(`
      id,
      is_active,
      status,
      gender,
      selection_candidates:candidates!candidates_employee_id_fkey(gender, updated_at),
      rehire_candidates:candidates!candidates_rehire_employee_id_fkey(gender, updated_at),
      employee_employment_cycles(id, status),
      employee_work_info(
        employment_cycle_id, position_name, is_current, created_at, updated_at,
        operation_centers(id, name)
      )
    `)
    .eq('company_id', companyId);
}
