import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { EmployeeFullFormData, EmployeeV2WithRelations } from '@/types/employee';
import { PREDEFINED_TASKS } from '@/hooks/useOnboardingTasks';

const NEW_EMPLOYEE_WINDOW_MS = 10 * 24 * 60 * 60 * 1000;

function getEmployeeWorkInfoSelect(centerId?: string, requireCenterScope = false) {
  const joinType = (centerId && centerId !== 'all') || requireCenterScope ? '!inner' : '';

  return `
          employee_work_info${joinType}(
            id, operation_center_id, position_id, position_name, hire_date, link_type, area_id, is_current,
            operation_centers(id, name, city),
            areas(id, name)
          )
        `;
}

function getDisplayWorkInfo(employee: any) {
  const workInfoRows = employee.employee_work_info || [];

  return pickBestRelatedRecord(workInfoRows, 'is_current');
}

function hasMeaningfulValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function getRecordTimestamp(record: any) {
  const rawTimestamp = record?.updated_at || record?.created_at;
  const timestamp = rawTimestamp ? new Date(rawTimestamp).getTime() : 0;

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getRecordCompletenessScore(record: any) {
  if (!record) return 0;

  return Object.entries(record).reduce((score, [key, value]) => {
    if (key === 'id' || key === 'employee_id' || key === 'company_id' || key === 'created_by') {
      return score;
    }

    if (typeof value === 'object' && value !== null) {
      return score;
    }

    return hasMeaningfulValue(value) ? score + 1 : score;
  }, 0);
}

function pickBestRelatedRecord<T extends Record<string, any>>(records: T[] | null | undefined, currentColumn: string): T | null {
  const rows = records || [];
  if (rows.length === 0) return null;

  const currentRows = rows.filter((row) => row?.[currentColumn] === true);
  const candidates = currentRows.length > 0 ? currentRows : rows;

  return [...candidates].sort((a, b) => {
    const completenessDelta = getRecordCompletenessScore(b) - getRecordCompletenessScore(a);
    if (completenessDelta !== 0) return completenessDelta;

    return getRecordTimestamp(b) - getRecordTimestamp(a);
  })[0] || null;
}

async function fetchBestEmployeeRelatedRecord(
  table: string,
  select: string,
  employeeId: string,
  currentColumn = 'is_current'
) {
  const { data: rows, error } = await (supabase.from(table as any) as any)
    .select(select)
    .eq('employee_id', employeeId);

  if (error) throw error;

  return pickBestRelatedRecord(rows || [], currentColumn);
}

async function deactivateOtherCurrentRecords(
  table: string,
  employeeId: string,
  keepId: string | null | undefined,
  currentColumn = 'is_current'
) {
  if (!keepId) return;

  const { error } = await (supabase.from(table as any) as any)
    .update({ [currentColumn]: false })
    .eq('employee_id', employeeId)
    .eq(currentColumn, true)
    .neq('id', keepId);

  if (error) throw error;
}

function applyEmployeeStatusFilter(query: any, status?: string) {
  if (!status || status === 'all') return query;

  if (status === 'active') {
    return query.eq('is_active', true).eq('status', 'active');
  }

  if (status === 'inactive') {
    return query.eq('is_active', false).eq('status', 'suspended');
  }

  if (status === 'retired') {
    return query.or('status.eq.retired,and(is_active.eq.false,status.eq.active)');
  }

  if (status === 'en_retiro') {
    return query.eq('status', 'en_retiro');
  }

  if (status === 'new') {
    const threshold = new Date(Date.now() - NEW_EMPLOYEE_WINDOW_MS).toISOString();
    return query.gte('created_at', threshold);
  }

  return query;
}

function applyEmployeeCenterFilter(query: any, centerId?: string, allowedCenterIds: string[] = []) {
  if (centerId && centerId !== 'all') {
    query = query.eq('employee_work_info.operation_center_id', centerId);
  }

  if (allowedCenterIds.length > 0) {
    query = query.in('employee_work_info.operation_center_id', allowedCenterIds);
  }

  return query;
}

function applyRetiredVisibilityFilter(query: any, includeRetired?: boolean) {
  if (includeRetired) return query;

  return query
    .not('status', 'eq', 'retired')
    .or('is_active.eq.true,status.neq.active');
}

function getEmployeeSearchTerms(search?: string) {
  return search?.trim().toLowerCase().split(/\s+/).filter(Boolean) || [];
}

function normalizeEmployeeSearchValue(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function employeeMatchesSearch(employee: EmployeeV2WithRelations, search?: string) {
  const searchTerms = getEmployeeSearchTerms(search);
  if (searchTerms.length === 0) return true;

  const workInfo = employee.work_info || getDisplayWorkInfo(employee);
  const searchableText = [
    employee.first_name,
    employee.middle_name,
    employee.last_name,
    employee.second_last_name,
    employee.document_number,
    employee.document_type,
    workInfo?.position_name,
  ]
    .map(normalizeEmployeeSearchValue)
    .join(' ');

  return searchTerms.every((term) => searchableText.includes(term));
}

function transformEmployees(data: any[] | null | undefined) {
  return (data || []).map((emp: any) => {
    const workInfo = getDisplayWorkInfo(emp);

    return {
      ...emp,
      work_info: workInfo,
      operation_centers: workInfo?.operation_centers || null,
      areas: workInfo?.areas || null,
    };
  }) as EmployeeV2WithRelations[];
}

async function resolveValidShiftTypeId(shiftTypeId?: string | null, companyId?: string | null) {
  if (!shiftTypeId || !companyId) return null;

  const { data, error } = await supabase
    .from('shift_types')
    .select('id')
    .eq('id', shiftTypeId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    console.warn('No se pudo validar shift_type_id, se guardará null:', error.message);
    return null;
  }

  return data?.id ?? null;
}

// =====================================================
// AUDIT HELPER
// =====================================================

async function logAuditEvent(
  userId: string,
  userEmail: string | undefined,
  companyId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      company_id: companyId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: oldValues,
      new_values: newValues,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

// =====================================================
// LIST EMPLOYEES
// =====================================================

export function useEmployees() {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useQuery({
    queryKey: ['employees_v2', currentCompanyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // Get employees with their current related data
      // Use left joins so retired employees (without is_current records) still appear
      let query = supabase
        .from('employees_v2')
        .select(`
          *,
          identification_types(id, name, code),
          employee_contact(
            id, email, mobile, phone, residence_city, residence_department,
            residence_address, emergency_contact_name, emergency_contact_phone
          ),
          ${getEmployeeWorkInfoSelect(undefined, shouldLimitByAssignedCenters)}
        `)
        .eq('company_id', currentCompanyId)
        .eq('employee_contact.is_current', true)
        .eq('employee_work_info.is_current', true);

      query = applyEmployeeCenterFilter(
        query,
        undefined,
        shouldLimitByAssignedCenters ? assignedCenterIds : []
      );

      const { data: employees, error } = await query
        .order('last_name', { ascending: true });

      if (error) throw error;

      // Transform data to include nested relations
      return (employees || []).map((emp: any) => {
        const workInfo = getDisplayWorkInfo(emp);

        return {
          ...emp,
          contact: pickBestRelatedRecord(emp.employee_contact || [], 'is_current'),
          work_info: workInfo,
          operation_centers: workInfo?.operation_centers || null,
          areas: workInfo?.areas || null,
        };
      }) as EmployeeV2WithRelations[];
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// LIST EMPLOYEES PAGINATED (OPTIMIZED FOR LIST VIEW)
// =====================================================

export function useEmployeesPaginated(options: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  centerId?: string;
  includeRetired?: boolean;
}) {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const { page = 1, pageSize = 12, search, status, centerId, includeRetired = false } = options;
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useQuery({
    queryKey: ['employees_v2_paginated', currentCompanyId, page, pageSize, search, status, centerId, includeRetired, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      if (!currentCompanyId) return { data: [], count: 0 };

      const workInfoSelect = getEmployeeWorkInfoSelect(centerId, shouldLimitByAssignedCenters);

      // Base query with essential fields only for better performance
      let query = supabase
        .from('employees_v2')
        .select(`
          *,
          identification_types(id, name, code),
          ${workInfoSelect}
        `, { count: 'exact' })
        .eq('company_id', currentCompanyId);

      // 1. Server-side filtering
      query = applyEmployeeCenterFilter(
        query,
        centerId,
        shouldLimitByAssignedCenters ? assignedCenterIds : []
      );

      query = applyEmployeeStatusFilter(query, status);
      query = applyRetiredVisibilityFilter(query, includeRetired || status === 'retired');

      // 2. Pagination range
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const hasSearch = getEmployeeSearchTerms(search).length > 0;

      if (hasSearch) {
        const { data, error } = await query.order('last_name', { ascending: true });

        if (error) throw error;

        const filtered = transformEmployees(data).filter((employee) => employeeMatchesSearch(employee, search));

        return { data: filtered.slice(from, to + 1), count: filtered.length };
      }

      const { data, error, count } = await query
        .order('last_name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      return { data: transformEmployees(data), count: count || 0 };
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// LIST EMPLOYEES INFINITE (OPTIMIZED FOR SCROLLING)
// =====================================================

export function useEmployeesInfinite(options: {
  pageSize?: number;
  search?: string;
  status?: string;
  centerId?: string;
  includeRetired?: boolean;
}) {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const { pageSize = 12, search, status, centerId, includeRetired = false } = options;
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useInfiniteQuery({
    queryKey: ['employees_v2_infinite', currentCompanyId, pageSize, search, status, centerId, includeRetired, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentCompanyId) return { data: [], nextCursor: null, totalCount: 0 };

      const workInfoSelect = getEmployeeWorkInfoSelect(centerId, shouldLimitByAssignedCenters);

      // Base query
      let query = supabase
        .from('employees_v2')
        .select(`
          *,
          identification_types(id, name, code),
          ${workInfoSelect}
        `, { count: 'exact' })
        .eq('company_id', currentCompanyId);

      // 1. Filters
      query = applyEmployeeCenterFilter(
        query,
        centerId,
        shouldLimitByAssignedCenters ? assignedCenterIds : []
      );
      query = applyEmployeeStatusFilter(query, status);
      query = applyRetiredVisibilityFilter(query, includeRetired || status === 'retired');

      // 2. Pagination
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      const hasSearch = getEmployeeSearchTerms(search).length > 0;

      if (hasSearch) {
        const { data, error } = await query.order('last_name', { ascending: true });

        if (error) throw error;

        const filtered = transformEmployees(data).filter((employee) => employeeMatchesSearch(employee, search));
        const pageData = filtered.slice(from, to + 1);

        return {
          data: pageData,
          nextCursor: to + 1 < filtered.length ? pageParam + 1 : null,
          totalCount: filtered.length
        };
      }

      const { data, error, count } = await query
        .order('last_name', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const transformed = transformEmployees(data);

      return {
        data: transformed,
        nextCursor: transformed.length === pageSize ? pageParam + 1 : null,
        totalCount: count || 0
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!currentCompanyId,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee_v2', id],
    queryFn: async () => {
      if (!id) return null;

      // Get core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .select('*, identification_types(id, name, code), professions(id, name), education_levels(id, name)')
        .eq('id', id)
        .single();

      if (empError) throw empError;

      // Get all related data in parallel
      const [
        contact,
        family,
        workInfo,
        socialSecurity,
        bankInfo,
        schedule,
        { data: documents },
        { data: certifications },
        { data: vaccinations },
        timeConfig,
        { data: familyMembers },
      ] = await Promise.all([
        fetchBestEmployeeRelatedRecord('employee_contact', '*', id),
        fetchBestEmployeeRelatedRecord('employee_family', '*', id),
        fetchBestEmployeeRelatedRecord('employee_work_info', `
          *,
          operation_centers(id, name, city),
          areas(id, name),
          positions(id, name)
        `, id),
        fetchBestEmployeeRelatedRecord('employee_social_security', '*', id),
        fetchBestEmployeeRelatedRecord('employee_bank_info', '*', id),
        fetchBestEmployeeRelatedRecord('employee_schedule', '*', id),
        supabase.from('employee_documents').select('*').eq('employee_id', id).eq('is_valid', true).order('upload_date', { ascending: false }),
        supabase.from('employee_certifications').select('*').eq('employee_id', id).eq('is_valid', true).order('expiry_date', { ascending: true }),
        supabase.from('employee_vaccinations').select('*').eq('employee_id', id).order('application_date', { ascending: false }),
        fetchBestEmployeeRelatedRecord('employee_time_config', `
          *,
          work_schedules(id, name, days_of_week, start_time, end_time, break_minutes),
          shift_cycles(id, name, code, total_days)
        `, id, 'is_active'),
        supabase.from('employee_family_members').select('*').eq('employee_id', id).order('created_at', { ascending: true }),
      ]);



      return {
        ...employee,
        contact: contact || null,
        family: family || null,
        family_members: familyMembers || [],
        work_info: workInfo || null,
        social_security: socialSecurity || null,
        bank_info: bankInfo || null,
        schedule: schedule || null,
        documents: documents || [],
        certifications: certifications || [],
        vaccinations: vaccinations || [],
        time_config: timeConfig || null,
        operation_centers: workInfo?.operation_centers || null,
        areas: workInfo?.areas || null,
        positions: workInfo?.positions || null,
        education_levels: (employee as any).education_levels ? [(employee as any).education_levels] : [],
        education_level_ids: (employee as any).education_level_id ? [(employee as any).education_level_id] : [],
      } as EmployeeV2WithRelations;
    },
    enabled: !!id,
  });
}

// =====================================================
// CREATE EMPLOYEE (TRANSACTIONAL)
// =====================================================

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: EmployeeFullFormData & { avatarUrl?: string | null }) => {
      if (!currentCompanyId || !user) {
        throw new Error('No hay empresa o usuario activo');
      }
      const validShiftTypeId = await resolveValidShiftTypeId(data.shiftTypeId, currentCompanyId);

      // 1. Create core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .insert({
          company_id: currentCompanyId,
          identification_type_id: data.identificationTypeId,
          document_type: data.documentType || 'CC',
          document_number: data.documentNumber,
          document_issue_city: data.documentIssueCity || null,
          document_issue_date: data.documentIssueDate ? format(data.documentIssueDate, 'yyyy-MM-dd') : null,
          first_name: data.firstName,
          middle_name: data.middleName || null,
          last_name: data.lastName,
          second_last_name: data.secondLastName || null,
          birth_country: data.birthCountry || 'Colombia',
          birth_department: data.birthDepartment || null,
          birth_city: data.birthCity || null,
          birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
          gender: data.gender || null,
          gender_identity: (data as any).genderIdentity || null,
          gender_identity_other: (data as any).genderIdentity === 'otro' ? ((data as any).genderIdentityOther || null) : null,
          blood_type: data.bloodType || null,
          marital_status: data.maritalStatus || null,
          education_level_id: data.educationLevelId || null,
          profession_id: data.professionId || null,
          is_first_job: data.isFirstJob || false,
          is_head_of_household: data.isHeadOfHousehold || false,
          disability_type: data.disabilityType && data.disabilityType !== 'ninguna' ? data.disabilityType : null,
          ethnic_group: data.ethnicGroup && data.ethnicGroup !== 'ninguno' ? data.ethnicGroup : null,
          is_conflict_victim: data.isConflictVictim || false,
          is_demobilized: data.isDemobilized || false,
          avatar_url: data.avatarUrl || null,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (empError) throw empError;

      const employeeId = employee.id;



      // 2. Create related records in parallel
      const relatedInserts = [
        // B. Contact
        supabase.from('employee_contact').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          residence_department: data.residenceDepartment || null,
          residence_city: data.residenceCity || null,
          residence_address: data.residenceAddress || null,
          residence_neighborhood: data.residenceNeighborhood || null,
          email: data.email || null,
          personal_email: data.personalEmail || null,
          phone: data.phone || null,
          mobile: data.mobile || null,
          emergency_contact_name: data.emergencyContactName || null,
          emergency_contact_phone: data.emergencyContactPhone || null,
          emergency_contact_relationship: data.emergencyContactRelationship || null,
          is_current: true,
        }),
        // C. Family (legacy table - keep for backward compat)
        supabase.from('employee_family').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          spouse_name: null,
          spouse_gender: null,
          spouse_birth_date: null,
          spouse_works: false,
          children_count: 0,
          is_current: true,
        }),
        // C2. Family Members
        ...(data.familyMembers && data.familyMembers.filter(m => m.fullName && m.relationship).length > 0
          ? [supabase.from('employee_family_members').insert(
              data.familyMembers.filter(m => m.fullName && m.relationship).map(m => ({
                employee_id: employeeId,
                company_id: currentCompanyId!,
                relationship: m.relationship,
                full_name: m.fullName,
                age: m.age || null,
                gender: m.gender || null,
                observations: m.observations || null,
              }))
            )]
          : []),
        // D. Work Info
        supabase.from('employee_work_info').insert({
          employee_id: employeeId,
          company_id: currentCompanyId,
          operation_center_id: data.operationCenterId || null,
          cost_center: data.costCenter || null,
          area_id: data.areaId || null,
          position_id: data.positionId || null,
          position_name: data.positionName,
          work_city: data.workCity || null,
          hire_date: format(data.hireDate, 'yyyy-MM-dd'),
          link_type: data.linkType || 'indefinido',
          observations: data.observations || null,
          is_current: true,
          created_by: user.id,
        }),
        // E. Social Security
        supabase.from('employee_social_security').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          risk_level: data.riskLevel || null,
          arl: data.arl || null,
          eps: data.eps || null,
          afp: data.afp || null,
          ccf: data.ccf || null,
          afc: data.afc || null,
          ips: data.ips || null,
          is_current: true,
        }),
        // F. Bank Info
        supabase.from('employee_bank_info').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          bank_name: data.bankName || null,
          account_type: data.accountType || null,
          account_number: data.accountNumber || null,
          account_registered: data.accountRegistered || false,
          is_current: true,
        }),
        // J. Schedule
        supabase.from('employee_schedule').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          payroll_type: data.payrollType || 'quincenal',
          shift_type_id: validShiftTypeId,
          is_office_schedule: data.isOfficeSchedule ?? true,
          rest_day: data.restDay || null,
          is_current: true,
        }),
        // K. Time Config (Modalidad de Tiempo)
        supabase.from('employee_time_config').insert({
          employee_id: employeeId,
          company_id: currentCompanyId!,
          mode: data.timeMode,
          work_schedule_id: data.timeMode === 'administrative' ? data.workScheduleId : null,
          shift_cycle_id: data.timeMode === 'shift' ? data.shiftCycleId : null,
          cycle_start_date: data.cycleStartDate ? format(data.cycleStartDate, 'yyyy-MM-dd') : null,
          start_date: format(data.timeModeStartDate, 'yyyy-MM-dd'),
          notes: data.timeModeNotes || null,
          is_active: true,
          created_by: user.id,
        }),
      ];

      const results = await Promise.all(relatedInserts);
      
      // Check for errors
      for (const result of results) {
        if (result.error) {
          console.error('Error creating related record:', result.error);
          // Note: In production you'd want to rollback the employee creation
        }
      }

      // Generate onboarding tasks: use position template if available, else predefined
      const { fetchPositionTemplates } = await import('@/hooks/useOnboardingTemplates');
      let taskSource: { task_key: string; task_label: string; task_description: string | null; sort_order: number }[] | null = null;
      if (data.positionId) {
        taskSource = await fetchPositionTemplates(currentCompanyId, data.positionId);
      }
      const finalTasks = (taskSource || PREDEFINED_TASKS).map(t => ({
        task_key: t.task_key,
        task_label: t.task_label,
        task_description: t.task_description,
        sort_order: t.sort_order,
        employee_id: employeeId,
        company_id: currentCompanyId,
      }));
      const { error: onboardingError } = await supabase
        .from('employee_onboarding_tasks')
        .insert(finalTasks);
      if (onboardingError) {
        console.error('Error creating onboarding tasks:', onboardingError);
      }

      // Audit log
      await logAuditEvent(
        user.id,
        user.email,
        currentCompanyId,
        'create',
        'employee_v2',
        employeeId,
        `${data.firstName} ${data.lastName}`,
        undefined,
        { firstName: data.firstName, lastName: data.lastName, position: data.positionName }
      );

      return employee;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees_v2'] }),
        queryClient.invalidateQueries({ queryKey: ['employees_v2_paginated'] }),
        queryClient.invalidateQueries({ queryKey: ['employees_v2_infinite'] }),
        queryClient.invalidateQueries({ queryKey: ['employee_v2', data.id] }),
        queryClient.invalidateQueries({ queryKey: ['employee_time_configs'] }),
        queryClient.invalidateQueries({ queryKey: ['employee_time_config_active'] }),
        queryClient.invalidateQueries({ queryKey: ['onboarding-tasks'] }),
      ]);
    },
  });
}

// =====================================================
// UPDATE EMPLOYEE
// =====================================================

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, avatarUrl, ...data }: EmployeeFullFormData & { id: string; avatarUrl?: string | null }) => {
      if (!user) throw new Error('No hay usuario activo');
      const validShiftTypeId = await resolveValidShiftTypeId(data.shiftTypeId, currentCompanyId);

      // 1. Update core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .update({
          identification_type_id: data.identificationTypeId,
          document_type: data.documentType || 'CC',
          document_number: data.documentNumber,
          document_issue_city: data.documentIssueCity || null,
          document_issue_date: data.documentIssueDate ? format(data.documentIssueDate, 'yyyy-MM-dd') : null,
          first_name: data.firstName,
          middle_name: data.middleName || null,
          last_name: data.lastName,
          second_last_name: data.secondLastName || null,
          birth_country: data.birthCountry || 'Colombia',
          birth_department: data.birthDepartment || null,
          birth_city: data.birthCity || null,
          birth_date: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : null,
          gender: data.gender || null,
          gender_identity: (data as any).genderIdentity || null,
          gender_identity_other: (data as any).genderIdentity === 'otro' ? ((data as any).genderIdentityOther || null) : null,
          blood_type: data.bloodType || null,
          marital_status: data.maritalStatus || null,
          education_level_id: data.educationLevelId || null,
          profession_id: data.professionId || null,
          is_first_job: data.isFirstJob || false,
          is_head_of_household: data.isHeadOfHousehold || false,
          disability_type: data.disabilityType && data.disabilityType !== 'ninguna' ? data.disabilityType : null,
          ethnic_group: data.ethnicGroup && data.ethnicGroup !== 'ninguno' ? data.ethnicGroup : null,
          is_conflict_victim: data.isConflictVictim || false,
          is_demobilized: data.isDemobilized || false,
          avatar_url: avatarUrl !== undefined ? avatarUrl : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (empError) throw empError;



      // 2. Update or insert related records
      // First, check which records exist
      const [
        existingContact,
        existingFamily,
        existingWorkInfo,
        existingSocialSecurity,
        existingBankInfo,
        existingSchedule,
        existingTimeConfig,
      ] = await Promise.all([
        fetchBestEmployeeRelatedRecord('employee_contact', '*', id),
        fetchBestEmployeeRelatedRecord('employee_family', '*', id),
        fetchBestEmployeeRelatedRecord('employee_work_info', '*', id),
        fetchBestEmployeeRelatedRecord('employee_social_security', '*', id),
        fetchBestEmployeeRelatedRecord('employee_bank_info', '*', id),
        fetchBestEmployeeRelatedRecord('employee_schedule', '*', id),
        fetchBestEmployeeRelatedRecord('employee_time_config', '*', id, 'is_active'),
      ]);

      await Promise.all([
        deactivateOtherCurrentRecords('employee_contact', id, existingContact?.id),
        deactivateOtherCurrentRecords('employee_family', id, existingFamily?.id),
        deactivateOtherCurrentRecords('employee_work_info', id, existingWorkInfo?.id),
        deactivateOtherCurrentRecords('employee_social_security', id, existingSocialSecurity?.id),
        deactivateOtherCurrentRecords('employee_bank_info', id, existingBankInfo?.id),
        deactivateOtherCurrentRecords('employee_schedule', id, existingSchedule?.id),
        deactivateOtherCurrentRecords('employee_time_config', id, existingTimeConfig?.id, 'is_active'),
      ]);

      // Prepare upsert operations
      const upsertOperations = [];

      // Contact
      if (existingContact) {
        upsertOperations.push(
          supabase.from('employee_contact')
            .update({
              residence_department: data.residenceDepartment || null,
              residence_city: data.residenceCity || null,
              residence_address: data.residenceAddress || null,
              residence_neighborhood: data.residenceNeighborhood || null,
              email: data.email || null,
              personal_email: data.personalEmail || null,
              phone: data.phone || null,
              mobile: data.mobile || null,
              emergency_contact_name: data.emergencyContactName || null,
              emergency_contact_phone: data.emergencyContactPhone || null,
              emergency_contact_relationship: data.emergencyContactRelationship || null,
              is_current: true,
            })
            .eq('id', existingContact.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_contact').insert({
            employee_id: id,
            company_id: currentCompanyId!,
            residence_department: data.residenceDepartment || null,
            residence_city: data.residenceCity || null,
            residence_address: data.residenceAddress || null,
            residence_neighborhood: data.residenceNeighborhood || null,
            email: data.email || null,
            personal_email: data.personalEmail || null,
            phone: data.phone || null,
            mobile: data.mobile || null,
            emergency_contact_name: data.emergencyContactName || null,
            emergency_contact_phone: data.emergencyContactPhone || null,
            emergency_contact_relationship: data.emergencyContactRelationship || null,
            is_current: true,
          })
        );
      }

      // Family Members - delete existing and re-insert (separate from Promise.all)
      await supabase.from('employee_family_members').delete().eq('employee_id', id);
      const members = (data.familyMembers || []).filter(m => m.fullName && m.relationship);
      if (members.length > 0) {
        await supabase.from('employee_family_members').insert(
          members.map(m => ({
            employee_id: id,
            company_id: currentCompanyId!,
            relationship: m.relationship,
            full_name: m.fullName,
            age: m.age || null,
            gender: m.gender || null,
            observations: m.observations || null,
          }))
        );
      }

      // Work Info
      if (existingWorkInfo) {
        upsertOperations.push(
          supabase.from('employee_work_info')
            .update({
              operation_center_id: data.operationCenterId || null,
              cost_center: data.costCenter || null,
              area_id: data.areaId || null,
              position_id: data.positionId || null,
              position_name: data.positionName,
              work_city: data.workCity || null,
              hire_date: format(data.hireDate, 'yyyy-MM-dd'),
              link_type: data.linkType || 'indefinido',
              observations: data.observations || null,
              is_current: true,
            })
            .eq('id', existingWorkInfo.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_work_info').insert({
            employee_id: id,
            company_id: currentCompanyId,
            operation_center_id: data.operationCenterId || null,
            cost_center: data.costCenter || null,
            area_id: data.areaId || null,
            position_id: data.positionId || null,
            position_name: data.positionName,
            work_city: data.workCity || null,
            hire_date: format(data.hireDate, 'yyyy-MM-dd'),
            link_type: data.linkType || 'indefinido',
            observations: data.observations || null,
            is_current: true,
            created_by: user.id,
          })
        );
      }

      // Social Security
      if (existingSocialSecurity) {
        upsertOperations.push(
          supabase.from('employee_social_security')
            .update({
              risk_level: data.riskLevel || null,
              arl: data.arl || null,
              eps: data.eps || null,
              afp: data.afp || null,
              ccf: data.ccf || null,
              afc: data.afc || null,
              ips: data.ips || null,
              is_current: true,
            })
            .eq('id', existingSocialSecurity.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_social_security').insert({
            employee_id: id,
            company_id: currentCompanyId!,
            risk_level: data.riskLevel || null,
            arl: data.arl || null,
            eps: data.eps || null,
            afp: data.afp || null,
            ccf: data.ccf || null,
            afc: data.afc || null,
            ips: data.ips || null,
            is_current: true,
          })
        );
      }

      // Bank Info
      if (existingBankInfo) {
        upsertOperations.push(
          supabase.from('employee_bank_info')
            .update({
              bank_name: data.bankName || null,
              account_type: data.accountType || null,
              account_number: data.accountNumber || null,
              account_registered: data.accountRegistered || false,
              is_current: true,
            })
            .eq('id', existingBankInfo.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_bank_info').insert({
            employee_id: id,
            company_id: currentCompanyId!,
            bank_name: data.bankName || null,
            account_type: data.accountType || null,
            account_number: data.accountNumber || null,
            account_registered: data.accountRegistered || false,
            is_current: true,
          })
        );
      }

      // Schedule
      if (existingSchedule) {
        upsertOperations.push(
          supabase.from('employee_schedule')
            .update({
              payroll_type: data.payrollType || 'quincenal',
              shift_type_id: validShiftTypeId,
              is_office_schedule: data.isOfficeSchedule ?? true,
              rest_day: data.restDay || null,
              is_current: true,
            })
            .eq('id', existingSchedule.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_schedule').insert({
            employee_id: id,
            company_id: currentCompanyId!,
            payroll_type: data.payrollType || 'quincenal',
            shift_type_id: validShiftTypeId,
            is_office_schedule: data.isOfficeSchedule ?? true,
            rest_day: data.restDay || null,
            is_current: true,
          })
        );
      }

      // Time Config (Modalidad de Tiempo)
      if (existingTimeConfig) {
        upsertOperations.push(
          supabase.from('employee_time_config')
            .update({
              mode: data.timeMode,
              work_schedule_id: data.timeMode === 'administrative' ? data.workScheduleId : null,
              shift_cycle_id: data.timeMode === 'shift' ? data.shiftCycleId : null,
              cycle_start_date: data.cycleStartDate ? format(data.cycleStartDate, 'yyyy-MM-dd') : null,
              start_date: format(data.timeModeStartDate, 'yyyy-MM-dd'),
              notes: data.timeModeNotes || null,
              is_active: true,
            })
            .eq('id', existingTimeConfig.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_time_config').insert({
            employee_id: id,
            company_id: currentCompanyId!,
            mode: data.timeMode,
            work_schedule_id: data.timeMode === 'administrative' ? data.workScheduleId : null,
            shift_cycle_id: data.timeMode === 'shift' ? data.shiftCycleId : null,
            cycle_start_date: data.cycleStartDate ? format(data.cycleStartDate, 'yyyy-MM-dd') : null,
            start_date: format(data.timeModeStartDate, 'yyyy-MM-dd'),
            notes: data.timeModeNotes || null,
            is_active: true,
            created_by: user.id,
          })
        );
      }

      // Execute all upsert operations and check for errors
      const upsertResults = await Promise.all(upsertOperations);
      
      // Check for errors in any of the upsert operations
      for (const result of upsertResults) {
        if (result.error) {
          console.error('Error in upsert operation:', result.error);
          throw new Error(`Error guardando datos relacionados: ${result.error.message}`);
        }
      }

      // Audit log
      await logAuditEvent(
        user.id,
        user.email,
        currentCompanyId,
        'update',
        'employee_v2',
        id,
        `${data.firstName} ${data.lastName}`,
        undefined,
        { firstName: data.firstName, lastName: data.lastName, position: data.positionName }
      );

      return employee;
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees_v2'] }),
        queryClient.invalidateQueries({ queryKey: ['employees_v2_paginated'] }),
        queryClient.invalidateQueries({ queryKey: ['employees_v2_infinite'] }),
        queryClient.invalidateQueries({ queryKey: ['employee_v2', data.id] }),
        queryClient.invalidateQueries({ queryKey: ['employee_time_configs'] }),
        queryClient.invalidateQueries({ queryKey: ['employee_time_config_active'] }),
      ]);
    },
  });
}

// =====================================================
// TOGGLE EMPLOYEE ACTIVE STATUS
// =====================================================

export function useToggleEmployeeActive() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!user) throw new Error('No hay usuario activo');

      const { data, error } = await supabase
        .from('employees_v2')
        .update({
          is_active: isActive,
          status: isActive ? 'active' : 'suspended',
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent(
        user.id,
        user.email,
        currentCompanyId,
        isActive ? 'reactivate' : 'deactivate',
        'employee_v2',
        id,
        `${data.first_name} ${data.last_name}`,
        { is_active: !isActive, status: isActive ? 'suspended' : 'active' },
        { is_active: isActive, status: isActive ? 'active' : 'suspended' }
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_paginated'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2_infinite'] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.id] });
    },
  });
}

// =====================================================
// UPDATE EMPLOYEE AVATAR
// =====================================================

export function useUpdateEmployeeAvatar() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, avatarUrl }: { id: string; avatarUrl: string | null }) => {
      if (!user) throw new Error('No hay usuario activo');

      const { data, error } = await supabase
        .from('employees_v2')
        .update({ avatar_url: avatarUrl })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent(
        user.id,
        user.email,
        currentCompanyId,
        'update_avatar',
        'employee_v2',
        id,
        `${data.first_name} ${data.last_name}`,
        undefined,
        { avatar_url: avatarUrl }
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.id] });
    },
  });
}
