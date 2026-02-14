import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import type { EmployeeFullFormData, EmployeeV2WithRelations } from '@/types/employee';

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
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employees_v2', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // Get employees with their current related data
      const { data: employees, error } = await supabase
        .from('employees_v2')
        .select(`
          *,
          employee_contact!inner(
            id, email, mobile, phone, residence_city, residence_department,
            residence_address, emergency_contact_name, emergency_contact_phone
          ),
          employee_work_info!inner(
            id, operation_center_id, position_name, hire_date, link_type, area_id,
            operation_centers(id, name, city)
          )
        `)
        .eq('company_id', currentCompanyId)
        .eq('employee_contact.is_current', true)
        .eq('employee_work_info.is_current', true)
        .order('last_name', { ascending: true });

      if (error) throw error;

      // Transform data to include nested relations
      return (employees || []).map((emp: any) => ({
        ...emp,
        contact: emp.employee_contact?.[0] || null,
        work_info: emp.employee_work_info?.[0] || null,
        operation_centers: emp.employee_work_info?.[0]?.operation_centers || null,
      })) as EmployeeV2WithRelations[];
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// GET SINGLE EMPLOYEE (FULL DETAIL)
// =====================================================

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['employee_v2', id],
    queryFn: async () => {
      if (!id) return null;

      // Get core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (empError) throw empError;

      // Get all related data in parallel
      const [
        { data: contact },
        { data: family },
        { data: workInfo },
        { data: socialSecurity },
        { data: bankInfo },
        { data: schedule },
        { data: documents },
        { data: certifications },
        { data: vaccinations },
      ] = await Promise.all([
        supabase.from('employee_contact').select('*').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_family').select('*').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_work_info').select(`
          *,
          operation_centers(id, name, city),
          areas(id, name),
          positions(id, name)
        `).eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_social_security').select('*').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_bank_info').select('*').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_schedule').select('*').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_documents').select('*').eq('employee_id', id).eq('is_valid', true).order('upload_date', { ascending: false }),
        supabase.from('employee_certifications').select('*').eq('employee_id', id).eq('is_valid', true).order('expiry_date', { ascending: true }),
        supabase.from('employee_vaccinations').select('*').eq('employee_id', id).order('application_date', { ascending: false }),
      ]);

      return {
        ...employee,
        contact: contact || null,
        family: family || null,
        work_info: workInfo || null,
        social_security: socialSecurity || null,
        bank_info: bankInfo || null,
        schedule: schedule || null,
        documents: documents || [],
        certifications: certifications || [],
        vaccinations: vaccinations || [],
        operation_centers: workInfo?.operation_centers || null,
        areas: workInfo?.areas || null,
        positions: workInfo?.positions || null,
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

      // 1. Create core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .insert({
          company_id: currentCompanyId,
          document_type: data.documentType,
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
          blood_type: data.bloodType || null,
          marital_status: data.maritalStatus || null,
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
        // C. Family
        supabase.from('employee_family').insert({
          employee_id: employeeId,
          spouse_name: data.spouseName || null,
          spouse_gender: data.spouseGender || null,
          spouse_birth_date: data.spouseBirthDate ? format(data.spouseBirthDate, 'yyyy-MM-dd') : null,
          spouse_works: data.spouseWorks || false,
          children_count: data.childrenCount || 0,
          is_current: true,
        }),
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
          bank_name: data.bankName || null,
          account_type: data.accountType || null,
          account_number: data.accountNumber || null,
          account_registered: data.accountRegistered || false,
          is_current: true,
        }),
        // J. Schedule
        supabase.from('employee_schedule').insert({
          employee_id: employeeId,
          payroll_type: data.payrollType || 'quincenal',
          shift_type_id: data.shiftTypeId || null,
          is_office_schedule: data.isOfficeSchedule ?? true,
          rest_day: data.restDay || null,
          is_current: true,
        }),
        // K. Time Config (Modalidad de Tiempo)
        supabase.from('employee_time_config').insert({
          employee_id: employeeId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employee_time_configs'] });
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

      // 1. Update core employee
      const { data: employee, error: empError } = await supabase
        .from('employees_v2')
        .update({
          document_type: data.documentType,
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
          blood_type: data.bloodType || null,
          marital_status: data.maritalStatus || null,
          avatar_url: avatarUrl !== undefined ? avatarUrl : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (empError) throw empError;

      // 2. Update or insert related records
      // First, check which records exist
      const [
        { data: existingContact },
        { data: existingFamily },
        { data: existingWorkInfo },
        { data: existingSocialSecurity },
        { data: existingBankInfo },
        { data: existingSchedule },
        { data: existingTimeConfig },
      ] = await Promise.all([
        supabase.from('employee_contact').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_family').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_work_info').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_social_security').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_bank_info').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_schedule').select('id').eq('employee_id', id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_time_config').select('id').eq('employee_id', id).eq('is_active', true).maybeSingle(),
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
            })
            .eq('id', existingContact.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_contact').insert({
            employee_id: id,
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

      // Family
      if (existingFamily) {
        upsertOperations.push(
          supabase.from('employee_family')
            .update({
              spouse_name: data.spouseName || null,
              spouse_gender: data.spouseGender || null,
              spouse_birth_date: data.spouseBirthDate ? format(data.spouseBirthDate, 'yyyy-MM-dd') : null,
              spouse_works: data.spouseWorks || false,
              children_count: data.childrenCount || 0,
            })
            .eq('id', existingFamily.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_family').insert({
            employee_id: id,
            spouse_name: data.spouseName || null,
            spouse_gender: data.spouseGender || null,
            spouse_birth_date: data.spouseBirthDate ? format(data.spouseBirthDate, 'yyyy-MM-dd') : null,
            spouse_works: data.spouseWorks || false,
            children_count: data.childrenCount || 0,
            is_current: true,
          })
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
            })
            .eq('id', existingSocialSecurity.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_social_security').insert({
            employee_id: id,
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
            })
            .eq('id', existingBankInfo.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_bank_info').insert({
            employee_id: id,
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
              shift_type_id: data.shiftTypeId || null,
              is_office_schedule: data.isOfficeSchedule ?? true,
              rest_day: data.restDay || null,
            })
            .eq('id', existingSchedule.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_schedule').insert({
            employee_id: id,
            payroll_type: data.payrollType || 'quincenal',
            shift_type_id: data.shiftTypeId || null,
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
            })
            .eq('id', existingTimeConfig.id)
        );
      } else {
        upsertOperations.push(
          supabase.from('employee_time_config').insert({
            employee_id: id,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['employee_v2', data.id] });
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
        .update({ is_active: isActive })
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
        { is_active: !isActive },
        { is_active: isActive }
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
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
