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

export interface Employee360DataQualityIssue {
  id: string;
  label: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface Employee360DataQuality {
  score: number;
  completed: number;
  total: number;
  issues: Employee360DataQualityIssue[];
}

export interface Employee360TimelineEvent {
  id: string;
  date: string;
  type: 'contract' | 'termination' | 'vacation' | 'leave' | 'incapacity' | 'disciplinary' | 'document' | 'training';
  title: string;
  description?: string;
  status?: string;
  meta?: string;
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

  // Termination processes - shown in the contracts view
  const terminationsQuery = useQuery({
    queryKey: ['employee_360_terminations', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_terminations')
        .select(`
          *,
          contracts(id, contract_number, contract_type, start_date, end_date)
        `)
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId && ['contracts', 'labor'].includes(activeTab),
  });

  const qualityContractsQuery = useQuery({
    queryKey: ['employee_360_quality_contracts', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, contract_type, start_date, end_date, is_terminated')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  const latestTerminationQuery = useQuery({
    queryKey: ['employee_360_latest_termination', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_terminations')
        .select('id, termination_type, effective_date, reason, is_completed, created_at, contracts(contract_number)')
        .eq('employee_id', employeeId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
    staleTime: 60_000,
  });

  const timelineQuery = useQuery({
    queryKey: ['employee_360_timeline', employeeId],
    queryFn: async (): Promise<Employee360TimelineEvent[]> => {
      const [
        contractsRes,
        terminationsRes,
        vacationsRes,
        leavesRes,
        incapacitiesRes,
        disciplinaryRes,
        documentsRes,
        trainingRes,
      ] = await Promise.all([
        supabase
          .from('contracts')
          .select('id, contract_number, contract_type, start_date, end_date, is_terminated, termination_date, termination_reason, created_at')
          .eq('employee_id', employeeId!)
          .order('start_date', { ascending: false })
          .limit(30),
        supabase
          .from('employee_terminations')
          .select('id, contract_id, termination_type, termination_date, effective_date, reason, is_completed, created_at, contracts(contract_number)')
          .eq('employee_id', employeeId!)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('vacation_requests')
          .select('id, start_date, end_date, status, days_requested, created_at')
          .eq('employee_id', employeeId!)
          .order('start_date', { ascending: false })
          .limit(20),
        supabase
          .from('leave_requests')
          .select('id, start_date, end_date, status, leave_type, reason, created_at')
          .eq('employee_id', employeeId!)
          .order('start_date', { ascending: false })
          .limit(20),
        supabase
          .from('employee_incapacities')
          .select('id, start_date, end_date, diagnosis, status, created_at')
          .eq('employee_id', employeeId!)
          .order('start_date', { ascending: false })
          .limit(20),
        supabase
          .from('disciplinary_processes')
          .select('*')
          .eq('employee_id', employeeId!)
          .order('opening_date', { ascending: false })
          .limit(20),
        supabase
          .from('employee_documents')
          .select('id, document_type, document_name, upload_date, expiry_date, is_valid, created_at')
          .eq('employee_id', employeeId!)
          .order('upload_date', { ascending: false })
          .limit(20),
        supabase
          .from('training_completions')
          .select('id, completed_at, status, score, course:training_courses(name)')
          .eq('employee_id', employeeId!)
          .order('completed_at', { ascending: false })
          .limit(20),
      ]);

      const firstError = [
        contractsRes.error,
        terminationsRes.error,
        vacationsRes.error,
        leavesRes.error,
        incapacitiesRes.error,
        disciplinaryRes.error,
        documentsRes.error,
        trainingRes.error,
      ].find(Boolean);
      if (firstError) throw firstError;

      const events: Employee360TimelineEvent[] = [];

      for (const contract of contractsRes.data || []) {
        events.push({
          id: `contract-${contract.id}`,
          date: contract.start_date,
          type: 'contract',
          title: `Contrato ${contract.contract_number || contract.contract_type}`,
          description: contract.is_terminated ? 'Contrato terminado' : 'Contrato registrado',
          status: contract.is_terminated ? 'Terminado' : 'Vigente',
          meta: contract.end_date ? `Vigencia hasta ${contract.end_date}` : 'Sin fecha fin',
        });
      }

      for (const termination of terminationsRes.data || []) {
        events.push({
          id: `termination-${termination.id}`,
          date: termination.effective_date || termination.termination_date || termination.created_at,
          type: 'termination',
          title: 'Proceso de retiro',
          description: termination.reason || 'Sin motivo registrado',
          status: termination.is_completed ? 'Completado' : 'En proceso',
          meta: termination.termination_type,
        });
      }

      for (const vacation of vacationsRes.data || []) {
        events.push({
          id: `vacation-${vacation.id}`,
          date: vacation.start_date,
          type: 'vacation',
          title: 'Vacaciones',
          description: `${vacation.days_requested || 0} dia(s) solicitados`,
          status: vacation.status,
          meta: vacation.end_date ? `Hasta ${vacation.end_date}` : undefined,
        });
      }

      for (const leave of leavesRes.data || []) {
        events.push({
          id: `leave-${leave.id}`,
          date: leave.start_date,
          type: 'leave',
          title: 'Permiso',
          description: leave.reason || leave.leave_type || 'Solicitud de permiso',
          status: leave.status,
          meta: leave.end_date ? `Hasta ${leave.end_date}` : undefined,
        });
      }

      for (const incapacity of incapacitiesRes.data || []) {
        events.push({
          id: `incapacity-${incapacity.id}`,
          date: incapacity.start_date,
          type: 'incapacity',
          title: 'Incapacidad',
          description: incapacity.diagnosis || 'Sin diagnostico registrado',
          status: incapacity.status,
          meta: incapacity.end_date ? `Hasta ${incapacity.end_date}` : undefined,
        });
      }

      for (const process of disciplinaryRes.data || []) {
        events.push({
          id: `disciplinary-${process.id}`,
          date: process.opening_date || process.created_at,
          type: 'disciplinary',
          title: 'Proceso disciplinario',
          description: process.reason || process.description || process.process_type || 'Proceso registrado',
          status: process.status,
          meta: process.process_number,
        });
      }

      for (const document of documentsRes.data || []) {
        events.push({
          id: `document-${document.id}`,
          date: document.upload_date || document.created_at,
          type: 'document',
          title: document.document_name || document.document_type || 'Documento',
          description: document.expiry_date ? `Vence ${document.expiry_date}` : 'Documento cargado',
          status: document.is_valid ? 'Vigente' : 'No vigente',
        });
      }

      for (const completion of trainingRes.data || []) {
        events.push({
          id: `training-${completion.id}`,
          date: completion.completed_at,
          type: 'training',
          title: completion.course?.name || 'Capacitacion completada',
          description: completion.score != null ? `Puntaje ${completion.score}` : undefined,
          status: completion.status,
        });
      }

      return events
        .filter((event) => Boolean(event.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 80);
    },
    enabled: !!employeeId && activeTab === 'timeline',
    staleTime: 60_000,
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
    const currentContract = contractsQuery.data?.find((contract: any) => !contract.is_terminated)
      || qualityContractsQuery.data?.find((contract: any) => !contract.is_terminated);
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
    qualityContractsQuery.data,
    trainingQuery.data,
    disciplinaryQuery.data,
  ]);

  const dataQuality = useMemo<Employee360DataQuality | null>(() => {
    const employee = employeeQuery.data;
    if (!employee) return null;

    const checks: Array<{
      id: string;
      ok: boolean;
      label: string;
      description: string;
      severity: Employee360DataQualityIssue['severity'];
    }> = [
      {
        id: 'identity',
        ok: Boolean(employee.document_number && employee.document_type && employee.document_issue_date),
        label: 'Identidad incompleta',
        description: 'Falta tipo, numero o fecha de expedicion del documento.',
        severity: 'critical',
      },
      {
        id: 'birth',
        ok: Boolean(employee.birth_date && employee.birth_city && employee.birth_country),
        label: 'Datos de nacimiento incompletos',
        description: 'Completa fecha, ciudad y pais de nacimiento.',
        severity: 'warning',
      },
      {
        id: 'contact',
        ok: Boolean(employee.contact?.phone || employee.contact?.email || employee.contact?.address),
        label: 'Contacto incompleto',
        description: 'No hay telefono, correo o direccion de contacto registrada.',
        severity: 'warning',
      },
      {
        id: 'work',
        ok: Boolean(employee.work_info?.hire_date && employee.work_info?.position_name),
        label: 'Informacion laboral incompleta',
        description: 'Falta fecha de ingreso o cargo actual.',
        severity: 'critical',
      },
      {
        id: 'contract',
        ok: Boolean(qualityContractsQuery.data?.some((contract: any) => !contract.is_terminated)),
        label: 'Sin contrato vigente',
        description: 'No se encontro un contrato activo para el empleado.',
        severity: employee.is_active ? 'critical' : 'info',
      },
      {
        id: 'social_security',
        ok: Boolean(employee.social_security?.health_provider || employee.social_security?.pension_fund),
        label: 'Seguridad social incompleta',
        description: 'Falta EPS o fondo de pension.',
        severity: 'warning',
      },
      {
        id: 'bank',
        ok: Boolean(employee.bank_info?.bank_name && employee.bank_info?.account_number),
        label: 'Datos bancarios incompletos',
        description: 'Falta banco o numero de cuenta.',
        severity: 'warning',
      },
      {
        id: 'documents',
        ok: Boolean(employee.documents && employee.documents.length > 0),
        label: 'Sin documentos adjuntos',
        description: 'No hay soportes documentales cargados en el expediente.',
        severity: 'info',
      },
    ];

    const completed = checks.filter((check) => check.ok).length;
    const issues = checks
      .filter((check) => !check.ok)
      .map(({ id, label, description, severity }) => ({ id, label, description, severity }));

    return {
      score: Math.round((completed / checks.length) * 100),
      completed,
      total: checks.length,
      issues,
    };
  }, [employeeQuery.data, qualityContractsQuery.data]);

  return {
    employee: employeeQuery.data,
    isLoadingEmployee: employeeQuery.isLoading,
    contracts: contractsQuery.data || [],
    isLoadingContracts: contractsQuery.isLoading,
    terminations: terminationsQuery.data || [],
    isLoadingTerminations: terminationsQuery.isLoading,
    timeline: timelineQuery.data || [],
    isLoadingTimeline: timelineQuery.isLoading,
    dataQuality,
    isLoadingDataQuality: qualityContractsQuery.isLoading,
    summaryContracts: qualityContractsQuery.data || [],
    latestTermination: latestTerminationQuery.data || null,
    isLoadingExecutiveSummary: qualityContractsQuery.isLoading || latestTerminationQuery.isLoading,
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
