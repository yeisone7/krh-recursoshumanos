import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths } from 'date-fns';
import type { 
  TrainingCourse, 
  TrainingSession, 
  TrainingAttendance,
  TrainingCertificate,
  TrainingPlan,
  CreateCourseData,
  CreateSessionData,
  EnrollEmployeeData,
  RecordAttendanceData,
  AttendanceStatus
} from '@/types/training';
import type { Database } from '@/integrations/supabase/types';

type CourseInsert = Database['public']['Tables']['training_courses']['Insert'];
type SessionInsert = Database['public']['Tables']['training_sessions']['Insert'];
type AttendanceInsert = Database['public']['Tables']['training_attendance']['Insert'];
type CertificateInsert = Database['public']['Tables']['training_certificates']['Insert'];

// =====================================================
// COURSES HOOKS
// =====================================================

export function useTrainingCourses() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['training_courses', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('company_id', currentCompanyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as TrainingCourse[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCourseData) => {
      if (!currentCompanyId) throw new Error('No company assigned');

      const insertData: CourseInsert = {
        company_id: currentCompanyId,
        code: data.code || null,
        name: data.name,
        description: data.description || null,
        category: data.category,
        modality: data.modality,
        duration_hours: data.durationHours,
        is_mandatory: data.isMandatory,
        requires_certification: data.requiresCertification,
        validity_months: data.validityMonths || null,
        provider: data.provider || null,
        objectives: data.objectives || null,
        prerequisites: data.prerequisites || null,
        is_active: true,
      };

      const { data: course, error } = await supabase
        .from('training_courses')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return course;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateCourseData> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.modality !== undefined) updateData.modality = data.modality;
      if (data.durationHours !== undefined) updateData.duration_hours = data.durationHours;
      if (data.isMandatory !== undefined) updateData.is_mandatory = data.isMandatory;
      if (data.requiresCertification !== undefined) updateData.requires_certification = data.requiresCertification;
      if (data.validityMonths !== undefined) updateData.validity_months = data.validityMonths;

      const { error } = await supabase
        .from('training_courses')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_courses')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
    },
  });
}

// =====================================================
// SESSIONS HOOKS
// =====================================================

export function useTrainingSessions(courseId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['training_sessions', currentCompanyId, courseId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = supabase
        .from('training_sessions')
        .select(`
          *,
          course:training_courses(*)
        `)
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TrainingSession[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateSessionData) => {
      if (!currentCompanyId) throw new Error('No company assigned');

      const sessionCode = `SES-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const { data: session, error } = await supabase
        .from('training_sessions')
        .insert({
          course_id: data.courseId,
          company_id: currentCompanyId,
          session_code: sessionCode,
          instructor_name: data.instructorName || null,
          start_date: format(data.startDate, 'yyyy-MM-dd'),
          end_date: format(data.endDate, 'yyyy-MM-dd'),
          start_time: data.startTime || null,
          end_time: data.endTime || null,
          location: data.location || null,
          max_participants: data.maxParticipants || null,
          status: 'programado',
          observations: data.observations || null,
        })
        .select()
        .single();

      if (error) throw error;
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
    },
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'programado' | 'en_curso' | 'completado' | 'cancelado' }) => {
      const { error } = await supabase
        .from('training_sessions')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_sessions'] });
    },
  });
}

// =====================================================
// ATTENDANCE HOOKS
// =====================================================

export function useSessionAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['training_attendance', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('training_attendance')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('session_id', sessionId)
        .order('enrollment_date');

      if (error) throw error;
      return data as TrainingAttendance[];
    },
    enabled: !!sessionId,
  });
}

export function useEnrollEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EnrollEmployeeData) => {
      const { data: attendance, error } = await supabase
        .from('training_attendance')
        .insert({
          session_id: data.sessionId,
          employee_id: data.employeeId,
          attendance_status: 'inscrito',
          enrollment_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;
      return attendance;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training_attendance', variables.sessionId] });
    },
  });
}

export function useRecordAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RecordAttendanceData) => {
      const updateData: Record<string, unknown> = {
        attendance_status: data.status,
      };

      if (data.status === 'asistio') {
        updateData.attendance_date = format(new Date(), 'yyyy-MM-dd');
      }
      if (data.score !== undefined) updateData.score = data.score;
      if (data.passed !== undefined) updateData.passed = data.passed;
      if (data.observations !== undefined) updateData.observations = data.observations;

      const { error } = await supabase
        .from('training_attendance')
        .update(updateData)
        .eq('id', data.attendanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_attendance'] });
    },
  });
}

// =====================================================
// CERTIFICATES HOOKS
// =====================================================

export function useTrainingCertificates(employeeId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['training_certificates', currentCompanyId, employeeId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = supabase
        .from('training_certificates')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number),
          course:training_courses(*)
        `)
        .eq('company_id', currentCompanyId)
        .order('issue_date', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TrainingCertificate[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      sessionId,
      employeeId, 
      courseId,
      validityMonths 
    }: { 
      sessionId?: string;
      employeeId: string;
      courseId: string;
      validityMonths?: number;
    }) => {
      if (!currentCompanyId) throw new Error('No company assigned');

      const certNumber = `CERT-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const issueDate = new Date();
      const expiryDate = validityMonths ? addMonths(issueDate, validityMonths) : null;

      const { data: cert, error } = await supabase
        .from('training_certificates')
        .insert({
          employee_id: employeeId,
          course_id: courseId,
          company_id: currentCompanyId,
          session_id: sessionId || null,
          certificate_number: certNumber,
          issue_date: format(issueDate, 'yyyy-MM-dd'),
          expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
          status: 'emitido',
          issued_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return cert;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_certificates'] });
      queryClient.invalidateQueries({ queryKey: ['training_attendance'] });
    },
  });
}

// =====================================================
// EXPIRING CERTIFICATES (ALERTS)
// =====================================================

export function useExpiringCertificates(daysAhead: number = 30) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['expiring_certificates', currentCompanyId, daysAhead],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      const futureDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('training_certificates')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number),
          course:training_courses(*)
        `)
        .eq('company_id', currentCompanyId)
        .eq('status', 'emitido')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate)
        .order('expiry_date');

      if (error) throw error;
      return data as TrainingCertificate[];
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// TRAINING PLANS HOOKS
// =====================================================

export function useTrainingPlans(year?: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['training_plans', currentCompanyId, year],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = supabase
        .from('training_plans')
        .select(`
          *,
          items:training_plan_items(
            *,
            course:training_courses(*)
          )
        `)
        .eq('company_id', currentCompanyId)
        .order('year', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TrainingPlan[];
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// TRAINING STATS
// =====================================================

export function useTrainingStats() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['training_stats', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return null;

      // Get courses count
      const { count: coursesCount } = await supabase
        .from('training_courses')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .eq('is_active', true);

      // Get active sessions
      const { count: activeSessionsCount } = await supabase
        .from('training_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .in('status', ['programado', 'en_curso']);

      // Get certificates issued this year
      const startOfYear = format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd');
      const { count: certificatesCount } = await supabase
        .from('training_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .gte('issue_date', startOfYear);

      // Get expiring certificates (next 30 days)
      const futureDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');
      const { count: expiringCount } = await supabase
        .from('training_certificates')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .eq('status', 'emitido')
        .lte('expiry_date', futureDate);

      return {
        totalCourses: coursesCount || 0,
        activeSessions: activeSessionsCount || 0,
        certificatesThisYear: certificatesCount || 0,
        expiringCertificates: expiringCount || 0,
      };
    },
    enabled: !!currentCompanyId,
  });
}
