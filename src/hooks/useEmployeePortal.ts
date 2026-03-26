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
        .select(`*, employee_contact!employee_contact_employee_id_fkey(*)`)
        .eq('id', employeeLink.employee_id)
        .maybeSingle();
      if (error) throw error;

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

  // Get vacation balances
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

  // Get leave requests
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

  // Get incapacities
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

  // Get change requests
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

  // Get payroll receipts
  const { data: payrollReceipts, isLoading: isLoadingPayroll } = useQuery({
    queryKey: ['portal-payroll', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      const { data, error } = await supabase
        .from('payroll_receipts')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .order('period_end', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get leave type config (for forms)
  const { data: leaveTypeConfig } = useQuery({
    queryKey: ['portal-leave-types', employee?.company_id],
    queryFn: async () => {
      if (!employee?.company_id) return [];
      const { data, error } = await supabase
        .from('leave_type_config')
        .select('id, leave_type, display_name')
        .eq('company_id', employee.company_id)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.company_id,
  });

  // Get active contract info (for certificates)
  const { data: contractInfo } = useQuery({
    queryKey: ['portal-contract', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return null;
      const { data, error } = await supabase
        .from('contracts')
        .select('salary, contract_type')
        .eq('employee_id', employeeLink.employee_id)
        .eq('is_terminated', false)
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeLink?.employee_id,
  });

  // Get company info (for certificates)
  const { data: companyInfo } = useQuery({
    queryKey: ['portal-company', employee?.company_id],
    queryFn: async () => {
      if (!employee?.company_id) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('name, nit')
        .eq('id', employee.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employee?.company_id,
  });

  // Get vacation requests (employee's own)
  const { data: vacationRequests } = useQuery({
    queryKey: ['portal-vacation-requests', employeeLink?.employee_id],
    queryFn: async () => {
      if (!employeeLink?.employee_id) return [];
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employeeLink.employee_id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
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
      toast({ title: 'Solicitud enviada', description: 'Tu solicitud de cambio ha sido enviada a RRHH para revisión.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'No se pudo enviar la solicitud: ' + error.message, variant: 'destructive' });
    },
  });

  // Create vacation request from portal
  const createVacationRequest = useMutation({
    mutationFn: async (request: {
      request_type: string;
      start_date: string;
      end_date: string;
      business_days: number;
      notes?: string;
    }) => {
      if (!employeeLink?.employee_id || !employee?.company_id || !user?.id) {
        throw new Error('No hay empleado vinculado');
      }
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      const calendarDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase
        .from('vacation_requests')
        .insert({
          employee_id: employeeLink.employee_id,
          company_id: employee.company_id,
          request_type: request.request_type,
          start_date: request.start_date,
          end_date: request.end_date,
          business_days: request.business_days,
          calendar_days: calendarDays,
          notes: request.notes,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['portal-vacations'] });
      toast({ title: 'Solicitud enviada', description: 'Tu solicitud de vacaciones ha sido registrada.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create leave request from portal
  const createLeaveRequest = useMutation({
    mutationFn: async (request: {
      leave_type: string;
      start_date: string;
      end_date: string;
      total_days: number;
      reason: string;
    }) => {
      if (!employeeLink?.employee_id || !employee?.company_id || !user?.id) {
        throw new Error('No hay empleado vinculado');
      }
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          employee_id: employeeLink.employee_id,
          company_id: employee.company_id,
          leave_type: request.leave_type,
          duration_type: 'dias_completos',
          start_date: request.start_date,
          end_date: request.end_date,
          total_days: request.total_days,
          reason: request.reason,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-leaves'] });
      toast({ title: 'Solicitud enviada', description: 'Tu solicitud de permiso ha sido registrada.' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    employeeLink,
    employee,
    documents,
    vacationBalances,
    vacationRequests,
    leaveRequests,
    incapacities,
    changeRequests,
    payrollReceipts,
    leaveTypeConfig,
    contractInfo,
    companyInfo,
    isLoading: isLoadingLink || isLoadingEmployee,
    isLoadingDocs,
    isLoadingPayroll,
    hasAccess: !!employeeLink?.employee_id,
    createChangeRequest,
    createVacationRequest,
    createLeaveRequest,
  };
}
