import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTrainingCoursePeriods } from '@/hooks/useTraining';
import type { TrainingPeriodInput } from '@/lib/trainingPeriods';

export interface ComplianceEmployee {
  id: string;
  first_name: string;
  last_name: string;
  document_number: string;
  operation_center_id: string | null;
  center_name: string | null;
}

export interface ComplianceCompletion {
  id: string;
  course_id: string;
  course_name: string | null;
  course_code: string | null;
  operator_cedula: string | null;
  employee_id: string | null;
  completed_at: string;
  operator_name: string | null;
  token_center_id: string | null;
}

export interface CourseComplianceData {
  course_id: string;
  course_name: string;
  course_code: string | null;
  completed: { employee: ComplianceEmployee; completed_at: string }[];
  pending: ComplianceEmployee[];
  total: number;
  completedCount: number;
  percentage: number;
}

export interface CenterComplianceData {
  center_id: string;
  center_name: string;
  courses: CourseComplianceData[];
  totalEmployees: number;
}

function normalizeDocument(value: string | null | undefined) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeCourseKey(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getCourseMatchKeys(course: { id?: string | null; name?: string | null; code?: string | null }) {
  return [
    course.id ? `id:${course.id}` : '',
    course.name ? `name:${normalizeCourseKey(course.name)}` : '',
    course.code ? `code:${normalizeCourseKey(course.code)}` : '',
  ].filter(Boolean);
}

function useActiveEmployeesByCenter(
  companyId: string | undefined,
  assignedCenterIds: string[],
  shouldLimitByAssignedCenters: boolean,
  assignedCenterKey: string
) {
  return useQuery({
    queryKey: ['compliance-employees', companyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees_v2')
        .select(`
          id, first_name, last_name, document_number,
          employee_work_info!inner(operation_center_id, is_current)
        `)
        .eq('company_id', companyId!)
        .eq('is_active', true);

      if (error) throw error;

      return (data || [])
        .filter((e: any) => e.employee_work_info?.some((w: any) => w.is_current))
        .map((e: any) => {
          const currentWork = e.employee_work_info.find((w: any) => w.is_current);
          return {
            id: e.id,
            first_name: e.first_name,
            last_name: e.last_name,
            document_number: e.document_number,
            operation_center_id: currentWork?.operation_center_id || null,
            center_name: null,
          } as ComplianceEmployee;
        })
        .filter((employee) => {
          if (!shouldLimitByAssignedCenters) return true;
          return employee.operation_center_id
            ? assignedCenterIds.includes(employee.operation_center_id)
            : false;
        });
    },
    enabled: !!companyId,
  });
}

function useOperationCentersList(
  companyId: string | undefined,
  assignedCenterIds: string[],
  shouldLimitByAssignedCenters: boolean,
  assignedCenterKey: string
) {
  return useQuery({
    queryKey: ['compliance-centers', companyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      let query = supabase
        .from('operation_centers')
        .select('id, name')
        .eq('company_id', companyId!)
        .order('name');

      if (shouldLimitByAssignedCenters) {
        query = query.in('id', assignedCenterIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

function usePublishedCourses(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compliance-courses', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('id, name, code, status')
        .eq('company_id', companyId!)
        .in('status', ['publicado', 'borrador'])
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

function useTokenCenterAssociations(
  assignedCenterIds: string[],
  shouldLimitByAssignedCenters: boolean,
  assignedCenterKey: string
) {
  return useQuery({
    queryKey: ['compliance-token-center', shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      let query = supabase
        .from('training_access_tokens')
        .select('course_id, operation_center_id')
        .not('operation_center_id', 'is', null);

      if (shouldLimitByAssignedCenters) {
        query = query.in('operation_center_id', assignedCenterIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

function useAllCompletions(
  companyId: string | undefined,
  assignedCenterIds: string[],
  shouldLimitByAssignedCenters: boolean,
  assignedCenterKey: string
) {
  return useQuery({
    queryKey: ['compliance-completions', companyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      const pageSize = 1000;
      const rows: any[] = [];

      for (let from = 0; ; from += pageSize) {
        const to = from + pageSize - 1;
        const { data, error } = await supabase
          .from('training_completions')
          .select(`
            id, course_id, operator_cedula, employee_id, completed_at, operator_name,
            course:training_courses(id, name, code),
            training_access_tokens(operation_center_id)
          `)
          .eq('company_id', companyId!)
          .order('completed_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        rows.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      const mapped = rows.map((c: any) => ({
        id: c.id,
        course_id: c.course_id,
        course_name: c.course?.name || null,
        course_code: c.course?.code || null,
        operator_cedula: c.operator_cedula,
        employee_id: c.employee_id,
        completed_at: c.completed_at,
        operator_name: c.operator_name,
        token_center_id: Array.isArray(c.training_access_tokens)
          ? c.training_access_tokens[0]?.operation_center_id || null
          : c.training_access_tokens?.operation_center_id || null,
      })) as ComplianceCompletion[];

      if (!shouldLimitByAssignedCenters) return mapped;

      return mapped.filter((completion) =>
        completion.token_center_id
          ? assignedCenterIds.includes(completion.token_center_id)
          : false
      );
    },
    enabled: !!companyId,
  });
}

export function useTrainingCompliance(period?: TrainingPeriodInput | null) {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');
  const hasPeriodFilter = !!period;

  const employees = useActiveEmployeesByCenter(
    currentCompanyId,
    assignedCenterIds,
    shouldLimitByAssignedCenters,
    assignedCenterKey
  );
  const centers = useOperationCentersList(
    currentCompanyId,
    assignedCenterIds,
    shouldLimitByAssignedCenters,
    assignedCenterKey
  );
  const courses = usePublishedCourses(currentCompanyId);
  const completions = useAllCompletions(
    currentCompanyId,
    assignedCenterIds,
    shouldLimitByAssignedCenters,
    assignedCenterKey
  );
  const tokenAssociations = useTokenCenterAssociations(
    assignedCenterIds,
    shouldLimitByAssignedCenters,
    assignedCenterKey
  );
  const periodAssignments = useTrainingCoursePeriods(period, { enabled: hasPeriodFilter });

  const isLoading = employees.isLoading || centers.isLoading || courses.isLoading || completions.isLoading || tokenAssociations.isLoading || (hasPeriodFilter && periodAssignments.isLoading);

  const complianceData: CenterComplianceData[] = [];

  if (employees.data && centers.data && courses.data && completions.data && tokenAssociations.data && (!hasPeriodFilter || periodAssignments.data)) {
    const periodCourseIds = period
      ? new Set(periodAssignments.data.map((assignment) => assignment.course_id))
      : null;
    const visibleCourses = periodCourseIds
      ? courses.data.filter((course) => periodCourseIds.has(course.id))
      : courses.data;

    // Build a map: center_id -> Set of course_ids that have tokens for that center
    const centerCourseMap = new Map<string, Set<string>>();
    for (const assoc of tokenAssociations.data) {
      if (!assoc.operation_center_id) continue;
      if (!centerCourseMap.has(assoc.operation_center_id)) {
        centerCourseMap.set(assoc.operation_center_id, new Set());
      }
      centerCourseMap.get(assoc.operation_center_id)!.add(assoc.course_id);
    }

    for (const center of centers.data) {
      const centerEmployees = employees.data.filter(
        (e) => e.operation_center_id === center.id
      );
      if (centerEmployees.length === 0) continue;

      // Only courses that have at least one token associated with this center
      const centerCourseIds = centerCourseMap.get(center.id);
      if (!centerCourseIds || centerCourseIds.size === 0) continue;

      const applicableCourses = visibleCourses.filter((c) => centerCourseIds.has(c.id));
      if (applicableCourses.length === 0) continue;

      const coursesData: CourseComplianceData[] = [];

      for (const course of applicableCourses) {
        const targetCourseKeys = new Set(getCourseMatchKeys(course));
        const courseCompletions = completions.data.filter((completion) => {
          return getCourseMatchKeys({
            id: completion.course_id,
            name: completion.course_name,
            code: completion.course_code,
          }).some((key) => targetCourseKeys.has(key));
        });

        const completed: { employee: ComplianceEmployee; completed_at: string }[] = [];
        const pending: ComplianceEmployee[] = [];

        for (const emp of centerEmployees) {
          const employeeDocument = normalizeDocument(emp.document_number);
          const match = courseCompletions.find(
            (c) =>
              (normalizeDocument(c.operator_cedula) && normalizeDocument(c.operator_cedula) === employeeDocument) ||
              (c.employee_id && c.employee_id === emp.id)
          );
          if (match) {
            completed.push({ employee: { ...emp, center_name: center.name }, completed_at: match.completed_at });
          } else {
            pending.push({ ...emp, center_name: center.name });
          }
        }

        coursesData.push({
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          completed,
          pending,
          total: centerEmployees.length,
          completedCount: completed.length,
          percentage: centerEmployees.length > 0 ? Math.round((completed.length / centerEmployees.length) * 100) : 0,
        });
      }

      complianceData.push({
        center_id: center.id,
        center_name: center.name,
        courses: coursesData,
        totalEmployees: centerEmployees.length,
      });
    }
  }

  return {
    complianceData,
    centers: centers.data || [],
    courses: period
      ? (courses.data || []).filter((course) => (periodAssignments.data || []).some((assignment) => assignment.course_id === course.id))
      : courses.data || [],
    isLoading,
  };
}
