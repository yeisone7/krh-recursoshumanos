import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import type { 
  TrainingCourse, 
  TrainingSession, 
  TrainingAttendance,
  TrainingCertificate,
  TrainingPlan,
  TrainingAccessToken,
  TrainingCompletion,
  TrainingMedia,
  CreateCourseData,
  CreateSessionData,
  EnrollEmployeeData,
  RecordAttendanceData,
  AttendanceStatus,
  TrainingCourseContent,
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
        .select(`
          *,
          media_count:training_media(count)
        `)
        .eq('company_id', currentCompanyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Map the data to include the media count as a simple number
      const coursesWithCounts = data.map(course => ({
        ...course,
        media_count: (course.media_count as any)?.[0]?.count || 0
      }));

      return coursesWithCounts as TrainingCourse[];
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

export function usePublishCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_courses')
        .update({ status: 'publicado' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
      toast.success('Capacitación publicada con éxito');
    },
    onError: (error) => {
      console.error('Error publishing course:', error);
      toast.error('No se pudo publicar la capacitación');
    }
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
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: EnrollEmployeeData) => {
      const { data: attendance, error } = await supabase
        .from('training_attendance')
        .insert({
          company_id: currentCompanyId!,
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
        .eq('status', 'emitido')
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

// =====================================================
// ACCESS TOKENS HOOKS
// =====================================================

export function useTrainingAccessTokens() {
  const { currentCompanyId, user, isAdmin, isSuperAdmin } = useAuth();
  const canViewAllTokens = isAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['training_access_tokens', currentCompanyId, user?.id, canViewAllTokens],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = supabase
        .from('training_access_tokens')
        .select(`*, course:training_courses(id, name, category, status), center:operation_centers(id, name, code)`)
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });

      if (!canViewAllTokens) {
        if (!user?.id) return [];
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as unknown as TrainingAccessToken[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateAccessToken() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      courseId: string;
      accessType: string;
      usageType: string;
      maxUses?: number;
      expiresInDays: number;
      requiresEvaluation: boolean;
      operationCenterId?: string;
    }) => {
      if (!currentCompanyId || !user) throw new Error('No company assigned');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

      const { data: token, error } = await supabase
        .from('training_access_tokens')
        .insert({
          company_id: currentCompanyId,
          course_id: data.courseId,
          access_type: data.accessType,
          usage_type: data.usageType,
          max_uses: data.maxUses || null,
          expires_at: expiresAt.toISOString(),
          requires_evaluation: data.requiresEvaluation,
          created_by: user.id,
          operation_center_id: data.operationCenterId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_access_tokens'] });
    },
  });
}

export function useToggleAccessToken() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const canManageAllTokens = isAdmin || isSuperAdmin;

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      let query = supabase
        .from('training_access_tokens')
        .update({ is_active: isActive })
        .eq('id', id);

      if (!canManageAllTokens) {
        if (!user?.id) throw new Error('User not authenticated');
        query = query.eq('created_by', user.id);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_access_tokens'] });
    },
  });
}

export function useDeleteAccessToken() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const canManageAllTokens = isAdmin || isSuperAdmin;

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete: deactivate instead of removing to preserve compliance history
      let query = supabase
        .from('training_access_tokens')
        .update({ is_active: false })
        .eq('id', id);

      if (!canManageAllTokens) {
        if (!user?.id) throw new Error('User not authenticated');
        query = query.eq('created_by', user.id);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_access_tokens'] });
    },
  });
}

// =====================================================
// COMPLETIONS HOOKS
// =====================================================

export function useTrainingCompletions(courseId?: string) {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useQuery({
    queryKey: ['training_completions', currentCompanyId, courseId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = supabase
        .from('training_completions')
        .select(`*, course:training_courses(id, name, category, legal_framework, target_audience), token:training_access_tokens(id, operation_center_id, center:operation_centers(id, name))`)
        .eq('company_id', currentCompanyId)
        .order('completed_at', { ascending: false });

      if (courseId) {
        query = query.eq('course_id', courseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const completions = (data || []) as unknown as TrainingCompletion[];
      if (!shouldLimitByAssignedCenters) return completions;

      return completions.filter((completion) => {
        const centerId =
          (completion as any).token?.operation_center_id ||
          (completion as any).token?.center?.id ||
          null;

        return centerId ? assignedCenterIds.includes(centerId) : false;
      });
    },
    enabled: !!currentCompanyId,
  });
}

export function useDeleteCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('training_completions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_completions'] });
    },
  });
}

export function useBulkDeleteCompletions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('training_completions')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_completions'] });
    },
  });
}

// =====================================================
// MEDIA HOOKS
// =====================================================

export function useTrainingMedia(courseId: string | undefined) {
  return useQuery({
    queryKey: ['training_media', courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from('training_media')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as TrainingMedia[];
    },
    enabled: !!courseId,
  });
}

export function useCreateTrainingMedia() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      courseId: string;
      type: string;
      title: string;
      description?: string;
      fileUrl: string;
      fileSize?: number;
      duration?: number;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: media, error } = await supabase
        .from('training_media')
        .insert({
          company_id: currentCompanyId!,
          course_id: data.courseId,
          type: data.type,
          title: data.title,
          description: data.description || null,
          file_url: data.fileUrl,
          file_size: data.fileSize || null,
          duration: data.duration || null,
          metadata: (data.metadata || {}) as any,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return media;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['training_media', variables.courseId] });
    },
  });
}

export function useDeleteTrainingMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('training_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return courseId;
    },
    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ['training_media', courseId] });
    },
  });
}

// =====================================================
// FULL COURSE CRUD (with content/status support)
// =====================================================

export function useCreateFullCourse() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      code?: string;
      category: string;
      description?: string;
      modality: string;
      durationHours: number;
      isMandatory: boolean;
      requiresCertification: boolean;
      validityMonths?: number;
      level?: string;
      audience?: string;
      targetAudience?: string;
      objective?: string;
      legalFramework?: string;
      riskLevel?: string;
      language?: string;
      content?: TrainingCourseContent;
      status?: string;
    }) => {
      if (!currentCompanyId || !user) throw new Error('No company assigned');

      const { data: course, error } = await supabase
        .from('training_courses')
        .insert({
          company_id: currentCompanyId,
          name: data.name,
          code: data.code || null,
          category: data.category,
          description: data.description || null,
          modality: data.modality as any,
          duration_hours: data.durationHours,
          is_mandatory: data.isMandatory,
          requires_certification: data.requiresCertification,
          validity_months: data.validityMonths || null,
          level: data.level || 'basico',
          audience: data.audience || null,
          target_audience: data.targetAudience || null,
          objective: data.objective || null,
          legal_framework: data.legalFramework || null,
          risk_level: data.riskLevel || 'medio',
          language: data.language || 'es',
          content: data.content as any || null,
          status: data.status || 'borrador',
          is_active: true,
          created_by: user.id,
        })
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

export function useUpdateFullCourse() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      name?: string;
      code?: string;
      category?: string;
      description?: string;
      modality?: string;
      durationHours?: number;
      isMandatory?: boolean;
      requiresCertification?: boolean;
      validityMonths?: number;
      level?: string;
      audience?: string;
      targetAudience?: string;
      objective?: string;
      legalFramework?: string;
      riskLevel?: string;
      language?: string;
      content?: TrainingCourseContent;
      status?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data: previousCourse, error: fetchError } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

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
      if (data.level !== undefined) updateData.level = data.level;
      if (data.audience !== undefined) updateData.audience = data.audience;
      if (data.targetAudience !== undefined) updateData.target_audience = data.targetAudience;
      if (data.objective !== undefined) updateData.objective = data.objective;
      if (data.legalFramework !== undefined) updateData.legal_framework = data.legalFramework;
      if (data.riskLevel !== undefined) updateData.risk_level = data.riskLevel;
      if (data.language !== undefined) updateData.language = data.language;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.status !== undefined) updateData.status = data.status;
      updateData.version = ((previousCourse as TrainingCourse).version || 1) + 1;
      updateData.updated_at = new Date().toISOString();

      const { data: updatedCourse, error } = await supabase
        .from('training_courses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        company_id: currentCompanyId || previousCourse.company_id,
        action: 'update',
        entity_type: 'training_course',
        entity_id: id,
        entity_name: updatedCourse.name,
        old_values: previousCourse as any,
        new_values: updatedCourse as any,
        user_agent: navigator.userAgent,
      });

      if (auditError) throw auditError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
      queryClient.invalidateQueries({ queryKey: ['training_course'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    },
  });
}

export function useDuplicateCourse() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (courseId: string) => {
      if (!currentCompanyId || !user) throw new Error('No company assigned');

      const { data: original, error: fetchError } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (fetchError || !original) throw fetchError || new Error('Course not found');

      const { data: copy, error } = await supabase
        .from('training_courses')
        .insert({
          company_id: currentCompanyId,
          name: `${original.name} (copia)`,
          code: null,
          category: original.category,
          description: original.description,
          modality: original.modality,
          duration_hours: original.duration_hours,
          is_mandatory: original.is_mandatory,
          requires_certification: original.requires_certification,
          validity_months: original.validity_months,
          level: (original as any).level || 'basico',
          audience: (original as any).audience || null,
          objective: (original as any).objective || null,
          legal_framework: (original as any).legal_framework || null,
          risk_level: (original as any).risk_level || 'medio',
          language: (original as any).language || 'es',
          content: original.content as any,
          status: 'borrador',
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return copy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
    },
  });
}

export function useShareCourse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ courseId, targetCompanyId }: { courseId: string; targetCompanyId: string }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('duplicate_training_course', {
        p_course_id: courseId,
        p_target_company_id: targetCompanyId,
        p_created_by: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training_courses'] });
      toast.success('Capacitación compartida con éxito');
    },
    onError: (error) => {
      console.error('Error sharing course:', error);
      toast.error('Error al compartir la capacitación');
    },
  });
}

export function useTrainingCourse(id: string | undefined) {
  return useQuery({
    queryKey: ['training_course', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as TrainingCourse;
    },
    enabled: !!id,
  });
}
