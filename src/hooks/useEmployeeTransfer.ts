import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TransferData {
  sourceEmployeeId: string;
  sourceCompanyId: string;
  targetCompanyId: string;
  transferDate: string;
  notes?: string;
}

export function useAvailableCompaniesForTransfer(currentCompanyId?: string) {
  return useQuery({
    queryKey: ['companies-for-transfer', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, nit')
        .order('name');
      if (error) throw error;
      return data.filter(c => c.id !== currentCompanyId);
    },
    enabled: !!currentCompanyId,
  });
}

export function useEmployeeTransfers(employeeId?: string) {
  return useQuery({
    queryKey: ['employee-transfers', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from('employee_transfers' as any)
        .select('*')
        .or(`source_employee_id.eq.${employeeId},target_employee_id.eq.${employeeId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!employeeId,
  });
}

export function useExecuteTransfer() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transferData: TransferData) => {
      const { sourceEmployeeId, sourceCompanyId, targetCompanyId, transferDate, notes } = transferData;

      // 1. Fetch source employee data
      const { data: srcEmployee, error: empErr } = await supabase
        .from('employees_v2')
        .select('*')
        .eq('id', sourceEmployeeId)
        .single();
      if (empErr) throw new Error('No se pudo obtener datos del empleado: ' + empErr.message);

      // 2. Fetch related data in parallel
      const [contactRes, socialRes, familyRes, bankRes, familyMembersRes] = await Promise.all([
        supabase.from('employee_contact').select('*').eq('employee_id', sourceEmployeeId).eq('is_current', true).maybeSingle(),
        supabase.from('employee_social_security').select('*').eq('employee_id', sourceEmployeeId).eq('is_current', true).maybeSingle(),
        supabase.from('employee_family').select('*').eq('employee_id', sourceEmployeeId).eq('is_current', true).maybeSingle(),
        supabase.from('employee_bank_info').select('*').eq('employee_id', sourceEmployeeId).eq('is_current', true).maybeSingle(),
        supabase.from('employee_family_members').select('*').eq('employee_id', sourceEmployeeId),
      ]);

      // 3. Create new employee in target company
      const { data: newEmployee, error: newEmpErr } = await supabase
        .from('employees_v2')
        .insert({
          company_id: targetCompanyId,
          document_type: srcEmployee.document_type,
          document_number: srcEmployee.document_number,
          document_issue_city: srcEmployee.document_issue_city,
          document_issue_date: srcEmployee.document_issue_date,
          first_name: srcEmployee.first_name,
          middle_name: srcEmployee.middle_name,
          last_name: srcEmployee.last_name,
          second_last_name: srcEmployee.second_last_name,
          birth_country: srcEmployee.birth_country,
          birth_department: srcEmployee.birth_department,
          birth_city: srcEmployee.birth_city,
          birth_date: srcEmployee.birth_date,
          gender: srcEmployee.gender,
          blood_type: srcEmployee.blood_type,
          marital_status: srcEmployee.marital_status,
          gender_identity: srcEmployee.gender_identity,
          gender_identity_other: srcEmployee.gender_identity_other,
          is_first_job: srcEmployee.is_first_job,
          is_head_of_household: srcEmployee.is_head_of_household,
          disability_type: srcEmployee.disability_type,
          ethnic_group: srcEmployee.ethnic_group,
          is_conflict_victim: srcEmployee.is_conflict_victim,
          is_demobilized: srcEmployee.is_demobilized,
          avatar_url: srcEmployee.avatar_url,
          is_active: true,
          created_by: user?.id || null,
        })
        .select('id')
        .single();
      if (newEmpErr) throw new Error('Error al crear empleado en empresa destino: ' + newEmpErr.message);

      const newId = newEmployee.id;

      // 4. Copy contact
      if (contactRes.data) {
        const c = contactRes.data;
        await supabase.from('employee_contact').insert({
          employee_id: newId,
          company_id: targetCompanyId,
          residence_department: c.residence_department,
          residence_city: c.residence_city,
          residence_address: c.residence_address,
          residence_neighborhood: c.residence_neighborhood,
          email: c.email,
          personal_email: c.personal_email,
          phone: c.phone,
          mobile: c.mobile,
          emergency_contact_name: c.emergency_contact_name,
          emergency_contact_phone: c.emergency_contact_phone,
          emergency_contact_relationship: c.emergency_contact_relationship,
          is_current: true,
        });
      }

      // 5. Copy social security
      if (socialRes.data) {
        const s = socialRes.data;
        await supabase.from('employee_social_security').insert({
          employee_id: newId,
          company_id: targetCompanyId,
          risk_level: s.risk_level,
          arl: s.arl,
          eps: s.eps,
          afp: s.afp,
          ccf: s.ccf,
          afc: s.afc,
          ips: s.ips,
          is_current: true,
        });
      }

      // 6. Copy family
      if (familyRes.data) {
        const f = familyRes.data;
        await supabase.from('employee_family').insert({
          employee_id: newId,
          spouse_name: f.spouse_name,
          spouse_gender: f.spouse_gender,
          spouse_birth_date: f.spouse_birth_date,
          spouse_works: f.spouse_works,
          children_count: f.children_count,
          is_current: true,
        });
      }

      // 7. Copy family members
      if (familyMembersRes.data && familyMembersRes.data.length > 0) {
        await supabase.from('employee_family_members').insert(
          familyMembersRes.data.map(fm => ({
            employee_id: newId,
            company_id: targetCompanyId,
            relationship: fm.relationship,
            full_name: fm.full_name,
            age: fm.age,
            gender: fm.gender,
            observations: fm.observations,
          }))
        );
      }

      // 8. Copy bank info
      if (bankRes.data) {
        const b = bankRes.data;
        await supabase.from('employee_bank_info').insert({
          employee_id: newId,
          bank_name: b.bank_name,
          account_type: b.account_type,
          account_number: b.account_number,
          account_registered: b.account_registered,
          is_current: true,
        });
      }

      // 9. Assign user to target company (if linked)
      const { data: userLink } = await supabase
        .from('employee_user_links')
        .select('user_id')
        .eq('employee_id', sourceEmployeeId)
        .eq('is_active', true)
        .maybeSingle();

      if (userLink?.user_id) {
        // Check if assignment already exists
        const { data: existing } = await supabase
          .from('user_company_assignments')
          .select('id')
          .eq('user_id', userLink.user_id)
          .eq('company_id', targetCompanyId)
          .maybeSingle();

        if (!existing) {
          await supabase.from('user_company_assignments').insert({
            user_id: userLink.user_id,
            company_id: targetCompanyId,
          });
        }
      }

      // 10. Create transfer record
      const { error: transferErr } = await supabase
        .from('employee_transfers' as any)
        .insert({
          source_company_id: sourceCompanyId,
          target_company_id: targetCompanyId,
          source_employee_id: sourceEmployeeId,
          target_employee_id: newId,
          transfer_date: transferDate,
          status: 'completed',
          notes,
          created_by: user?.id || null,
        });
      if (transferErr) throw new Error('Error al registrar traslado: ' + transferErr.message);

      // 11. Audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id || '',
        action: 'transfer',
        entity_type: 'employee',
        entity_id: sourceEmployeeId,
        company_id: sourceCompanyId,
        entity_name: `${srcEmployee.first_name} ${srcEmployee.last_name}`,
        new_values: {
          target_company_id: targetCompanyId,
          target_employee_id: newId,
          transfer_date: transferDate,
        },
      });

      return { newEmployeeId: newId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-transfers'] });
    },
  });
}
