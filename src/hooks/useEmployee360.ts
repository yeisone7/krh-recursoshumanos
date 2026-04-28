import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployee } from './useEmployees';
import { useMemo } from 'react';
import { differenceInYears, differenceInMonths } from 'date-fns';

// =============================================
// EMPLOYEE 360 HOOK
// Consolidates all employee-related data
// =============================================

export interface Employee360KPIs {
  seniority: { years: number; months: number; formatted: string };
  pendingVacationDays: number;
  incapacitiesYTD: number;
  lastMedicalExam: { date: string; type: string } | null;
  currentContract: { type: string; endDate: string | null } | null;
  nextTraining: { name: string; date: string } | null;
  totalTrainingsCompleted: number;
  activeDisciplinaryProcesses: number;
}

export function useEmployee360(employeeId: string | undefined, activeTab: string) {
  // Core employee data (always loaded)
  const employeeQuery = useEmployee(employeeId);

  // Contracts - lazy loaded
  const contractsQuery = useQuery({
    queryKey: ['employee_360_contracts', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          contract_extensions(*)
        `)
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && ['contracts', 'labor'].includes(activeTab),
  });

  // Vacation balances
  const vacationBalancesQuery = useQuery({
    queryKey: ['employee_360_vacation_balances', employeeId],
    queryFn: async (): Promise<any[]> => {
      const currentYear = new Date().getFullYear();
      // Using any to avoid TypeScript depth limit issues with Supabase chains
      const query = supabase.from('vacation_balances').select('*') as any;
      const result = await query.eq('employee_id', employeeId).eq('year', currentYear);
      if (result.error) throw result.error;
      return result.data || [];
    },
    enabled: !!employeeId && ['timeoff', 'kpis'].includes(activeTab),
  });

  // Vacation requests
  const vacationRequestsQuery = useQuery({
    queryKey: ['employee_360_vacation_requests', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && ['timeoff', 'kpis'].includes(activeTab),
  });

  // Leave requests
  const leavesQuery = useQuery({
    queryKey: ['employee_360_leaves', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && activeTab === 'timeoff',
  });

  // Incapacities
  const incapacitiesQuery = useQuery({
    queryKey: ['employee_360_incapacities', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && ['incapacities', 'kpis'].includes(activeTab),
  });

  // Training sessions
  const trainingQuery = useQuery({
    queryKey: ['employee_360_training', employeeId],
    queryFn: async () => {
      const employee = employeeQuery.data;
      const documentNumber = employee?.document_number;

      // Get sessions where employee is an attendee
      const { data: sessions, error: sessionsError } = await supabase
        .from('training_sessions')
        .select('*, training_courses(*)')
        .order('start_date', { ascending: false });
      
      if (sessionsError) throw sessionsError;
      
      // Filter sessions that contain the employee in attendees array
      const employeeSessions = (sessions || []).filter((s: any) => 
        s.attendees && Array.isArray(s.attendees) && s.attendees.includes(employeeId)
      );

      // Get training completions by employee_id OR operator_cedula
      let completions: any[] = [];
      if (employeeId || documentNumber) {
        let query = supabase
          .from('training_completions')
          .select('*, course:training_courses(id, name, category, legal_framework, target_audience), token:training_access_tokens(id, operation_center_id, center:operation_centers(id, name))')
          .order('completed_at', { ascending: false });

        if (documentNumber) {
          query = query.or(`employee_id.eq.${employeeId},operator_cedula.eq.${documentNumber}`);
        } else {
          query = query.eq('employee_id', employeeId!);
        }

        const { data, error } = await query;
        if (!error) completions = data || [];
      }
      
      return { sessions: employeeSessions, courses: [], completions };
    },
    enabled: !!employeeId && ['training', 'kpis'].includes(activeTab),
  });

  // Evaluations
  const evaluationsQuery = useQuery({
    queryKey: ['employee_360_evaluations', employeeId],
    queryFn: async () => {
      const [evaluationsRes, goalsRes] = await Promise.all([
        supabase
          .from('performance_evaluations')
          .select('*, evaluation_cycles(*, evaluation_templates(*)), evaluation_scores(*, evaluation_criteria(*))')
          .eq('employee_id', employeeId!)
          .order('created_at', { ascending: false }),
        supabase
          .from('performance_goals')
          .select('*')
          .eq('employee_id', employeeId!)
          .order('created_at', { ascending: false }),
      ]);
      return { 
        evaluations: evaluationsRes.data || [], 
        goals: goalsRes.data || [] 
      };
    },
    enabled: !!employeeId && activeTab === 'evaluations',
  });

  // Medical exams
  const examsQuery = useQuery({
    queryKey: ['employee_360_exams', employeeId],
    queryFn: async () => {
      const { data: transactions, error: txError } = await supabase
        .from('exam_delivery_transactions' as any)
        .select('*')
        .eq('employee_id', employeeId!)
        .order('exam_date', { ascending: false });
      if (txError) throw txError;

      const txs = (transactions as any[]) || [];
      const [itemsResult, legacyResult] = await Promise.all([
        txs.length > 0
          ? supabase
          .from('exam_delivery_items' as any)
          .select('id, transaction_id, exam_catalog_id, exam_name, result, concept, restrictions, expiration_date, document_url')
              .in('transaction_id', txs.map((tx) => tx.id))
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('medical_exams')
          .select('*')
          .eq('employee_id', employeeId!)
          .order('exam_date', { ascending: false }),
      ]);
      if (itemsResult.error) throw itemsResult.error;
      if (legacyResult.error) throw legacyResult.error;

      const itemsByTransaction = new Map<string, any[]>();
      for (const item of ((itemsResult.data as any[]) || [])) {
        if (!itemsByTransaction.has(item.transaction_id)) itemsByTransaction.set(item.transaction_id, []);
        itemsByTransaction.get(item.transaction_id)!.push(item);
      }

      const transactionGroups = txs.map((tx) => ({ ...tx, items: itemsByTransaction.get(tx.id) || [] }));

      const grouped = new Map<string, any>();
      for (const exam of legacyResult.data || []) {
        const key = `${exam.exam_date}-${exam.exam_type}-${exam.provider || ''}-${exam.doctor_name || ''}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            id: key,
            employee_id: exam.employee_id,
            exam_date: exam.exam_date,
            exam_type: exam.exam_type,
            provider: exam.provider,
            doctor_name: exam.doctor_name,
            observations: exam.observations,
            document_url: exam.document_url,
            items: [],
          });
        }
        grouped.get(key).items.push({
          id: exam.id,
          exam_name: exam.exam_type,
          result: exam.result,
          concept: exam.concept,
          restrictions: exam.restrictions,
          expiration_date: exam.expiration_date,
          document_url: exam.document_url,
        });
      }

      return [...transactionGroups, ...Array.from(grouped.values())].sort(
        (a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime(),
      );
    },
    enabled: !!employeeId && ['health', 'kpis'].includes(activeTab),
  });

  // Dotation
  const dotationQuery = useQuery({
    queryKey: ['employee_360_dotation', employeeId],
    queryFn: async () => {
      const [{ data: transactions, error: txError }, { data: deliveries, error: deliveriesError }] = await Promise.all([
        supabase
          .from('dotation_delivery_transactions')
          .select('*')
          .eq('employee_id', employeeId!)
          .order('delivery_date', { ascending: false }),
        supabase
        .from('dotation_deliveries')
        .select('*')
        .eq('employee_id', employeeId!)
          .order('delivery_date', { ascending: false }),
      ]);
      if (txError) throw txError;
      if (deliveriesError) throw deliveriesError;

      const itemsByTransaction = new Map<string, any[]>();
      const legacyGroups = new Map<string, any>();

      for (const item of deliveries || []) {
        if (item.transaction_id) {
          if (!itemsByTransaction.has(item.transaction_id)) itemsByTransaction.set(item.transaction_id, []);
          itemsByTransaction.get(item.transaction_id)!.push(item);
          continue;
        }

        const key = `legacy-${item.delivery_date}-${item.delivered_by || ''}-${item.received_by || ''}`;
        if (!legacyGroups.has(key)) {
          legacyGroups.set(key, {
            id: key,
            employee_id: item.employee_id,
            delivery_date: item.delivery_date,
            delivered_by: item.delivered_by,
            received_by: item.received_by,
            observations: item.observations,
            document_url: item.document_url,
            signature_url: item.signature_url,
            items: [],
          });
        }
        legacyGroups.get(key).items.push(item);
      }

      const groupedTransactions = (transactions || []).map((tx) => ({
        ...tx,
        items: itemsByTransaction.get(tx.id) || [],
      }));

      return [...groupedTransactions, ...Array.from(legacyGroups.values())].sort(
        (a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime(),
      );
    },
    enabled: !!employeeId && activeTab === 'dotation',
  });

  // Overtime
  const overtimeQuery = useQuery({
    queryKey: ['employee_360_overtime', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overtime_records')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && activeTab === 'overtime',
  });

  // Disciplinary processes
  const disciplinaryQuery = useQuery({
    queryKey: ['employee_360_disciplinary', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disciplinary_processes')
        .select('*, disciplinary_timeline(*), disciplinary_evidence(*), disciplinary_defenses(*)')
        .eq('employee_id', employeeId!)
        .order('opening_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && ['disciplinary', 'kpis'].includes(activeTab),
  });

  // Time configurations (schedules/shifts)
  const timeConfigsQuery = useQuery({
    queryKey: ['employee_360_time_configs', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_time_config')
        .select(`
          *,
          work_schedules(*),
          shift_cycles(*)
        `)
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && activeTab === 'schedules',
  });

  // Audit logs for this employee
  const auditQuery = useQuery({
    queryKey: ['employee_360_audit', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', employeeId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId && activeTab === 'audit',
  });

  // Calculate KPIs
  const kpis = useMemo<Employee360KPIs | null>(() => {
    if (!employeeQuery.data?.work_info?.hire_date) return null;

    const hireDate = new Date(employeeQuery.data.work_info.hire_date);
    const today = new Date();
    const years = differenceInYears(today, hireDate);
    const months = differenceInMonths(today, hireDate) % 12;

    // Vacation days pending
    const pendingVacationDays = vacationBalancesQuery.data?.reduce(
      (sum: number, b: any) => sum + (b.days_pending || 0), 0
    ) || 0;

    // Incapacities YTD
    const currentYear = new Date().getFullYear();
    const incapacitiesYTD = incapacitiesQuery.data?.filter(
      (inc: any) => new Date(inc.start_date).getFullYear() === currentYear
    ).length || 0;

    // Last medical exam
    const lastExam = examsQuery.data?.[0];
    const lastMedicalExam = lastExam 
      ? { date: lastExam.exam_date, type: lastExam.exam_type }
      : null;

    // Current contract
    const currentContract = contractsQuery.data?.[0];
    const contractInfo = currentContract && !currentContract.is_terminated
      ? { type: currentContract.contract_type, endDate: currentContract.end_date }
      : null;

    // Next training session - use start_date
    const upcomingSessions = trainingQuery.data?.sessions?.filter(
      (s: any) => new Date(s.start_date) > today && s.status !== 'cancelado'
    );
    const nextSession = upcomingSessions?.sort(
      (a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )[0];
    const nextTraining = nextSession
      ? { name: nextSession.training_courses?.name || 'Capacitación', date: nextSession.start_date }
      : null;

    // Total trainings completed
    const totalTrainingsCompleted = trainingQuery.data?.sessions?.filter(
      (s: any) => s.status === 'completado'
    ).length || 0;

    // Active disciplinary processes
    const activeDisciplinaryProcesses = disciplinaryQuery.data?.filter(
      (p: any) => !['cerrado', 'archivado'].includes(p.status)
    ).length || 0;

    return {
      seniority: {
        years,
        months,
        formatted: years > 0 
          ? `${years} año${years > 1 ? 's' : ''}${months > 0 ? `, ${months} mes${months > 1 ? 'es' : ''}` : ''}`
          : `${months} mes${months !== 1 ? 'es' : ''}`,
      },
      pendingVacationDays,
      incapacitiesYTD,
      lastMedicalExam,
      currentContract: contractInfo,
      nextTraining,
      totalTrainingsCompleted,
      activeDisciplinaryProcesses,
    };
  }, [
    employeeQuery.data,
    vacationBalancesQuery.data,
    incapacitiesQuery.data,
    examsQuery.data,
    contractsQuery.data,
    trainingQuery.data,
    disciplinaryQuery.data,
  ]);

  return {
    employee: employeeQuery.data,
    isLoadingEmployee: employeeQuery.isLoading,
    contracts: contractsQuery.data || [],
    isLoadingContracts: contractsQuery.isLoading,
    vacations: { balances: vacationBalancesQuery.data || [], requests: vacationRequestsQuery.data || [] },
    isLoadingVacations: vacationBalancesQuery.isLoading || vacationRequestsQuery.isLoading,
    leaves: leavesQuery.data || [],
    isLoadingLeaves: leavesQuery.isLoading,
    incapacities: incapacitiesQuery.data || [],
    isLoadingIncapacities: incapacitiesQuery.isLoading,
    training: trainingQuery.data,
    isLoadingTraining: trainingQuery.isLoading,
    evaluations: evaluationsQuery.data,
    isLoadingEvaluations: evaluationsQuery.isLoading,
    exams: examsQuery.data || [],
    isLoadingExams: examsQuery.isLoading,
    dotation: dotationQuery.data || [],
    isLoadingDotation: dotationQuery.isLoading,
    overtime: overtimeQuery.data || [],
    isLoadingOvertime: overtimeQuery.isLoading,
    disciplinary: disciplinaryQuery.data || [],
    isLoadingDisciplinary: disciplinaryQuery.isLoading,
    timeConfigs: timeConfigsQuery.data || [],
    isLoadingTimeConfigs: timeConfigsQuery.isLoading,
    auditLogs: auditQuery.data || [],
    isLoadingAudit: auditQuery.isLoading,
    kpis,
  };
}
