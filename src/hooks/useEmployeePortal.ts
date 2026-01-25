import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { EmployeeV2WithRelations } from '@/types/employee';
import type { EmployeeChangeRequest } from '@/types/portal';

export function useEmployeePortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current user's employee link
  const { data: employeeLink, isLoading: isLoadingLink } = useQuery({
    queryKey: ['employee-link', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('employee_user_links')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get employee data with all relations
  const { data: employee, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['portal-employee', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return null;

      const { data, error } = await supabase
        .from('employees_v2')
        .select(`
          *,
          employee_contact!employee_contact_employee_id_fkey(*)
        `)
        .eq('id', employeeLink.employee_id)
        .maybeSingle();

      if (error) throw error;
      
      // Get related data
      const [contactRes, familyRes, workRes, socialRes, bankRes, scheduleRes] = await Promise.all([
        supabase.from('employee_contact').select('*').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_family').select('*').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_work_info').select('*, operation_centers(id, name, city), areas(id, name), positions(id, name)').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_social_security').select('*').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_bank_info').select('*').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
        supabase.from('employee_schedule').select('*').eq('employee_id', employeeLink.employee_id).eq('is_current', true).maybeSingle(),
      ]);

      return {
        ...data,
        contact: contactRes.data,
        family: familyRes.data,
        work_info: workRes.data,
        social_security: socialRes.data,
        bank_info: bankRes.data,
        schedule: scheduleRes.data,
        operation_centers: workRes.data?.operation_centers,
        areas: workRes.data?.areas,
        positions: workRes.data?.positions,
      } as EmployeeV2WithRelations;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get employee's documents
  const { data: documents, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['portal-documents', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .eq('is_valid', true)
        .order('upload_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get employee's vacation balances
  const { data: vacationBalances } = useQuery({
    queryKey: ['portal-vacations', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('vacation_balances')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .order('period_year', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get employee's leave requests
  const { data: leaveRequests } = useQuery({
    queryKey: ['portal-leaves', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, leave_type_config(*)')
        .eq('employee_id', employeeLink.employee_id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get employee's incapacities
  const { data: incapacities } = useQuery({
    queryKey: ['portal-incapacities', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .order('start_date', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get employee's change requests
  const { data: changeRequests } = useQuery({
    queryKey: ['portal-change-requests', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      
      const { data, error } = await supabase
        .from('employee_change_requests')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeChangeRequest[];
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Create change request
  const createChangeRequest = useMutation({
    mutationFn: async (request: {
      request_type: string;
      field_name: string;
      current_value: string | null;
      requested_value: string;
    }) => {
      if (!employeeLink?.employee_id || !employee?.company_id || !user?.id) {
        throw new Error('No hay empleado vinculado');
      }

      const { error } = await supabase
        .from('employee_change_requests')
        .insert({
          employee_id: employeeLink.employee_id,
          company_id: employee.company_id,
          requested_by: user.id,
          ...request,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-change-requests'] });
      toast({
        title: 'Solicitud enviada',
        description: 'Tu solicitud de cambio ha sido enviada a RRHH para revisión.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la solicitud: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    employeeLink,
    employee,
    documents,
    vacationBalances,
    leaveRequests,
    incapacities,
    changeRequests,
    isLoading: isLoadingLink || isLoadingEmployee,
    isLoadingDocs,
    hasAccess: !!employeeLink?.employee_id,
    createChangeRequest,
  };
}
