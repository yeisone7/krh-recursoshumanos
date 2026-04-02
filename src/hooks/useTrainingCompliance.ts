import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

function useActiveEmployeesByCenter(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compliance-employees', companyId],
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
        });
    },
    enabled: !!companyId,
  });
}

function useOperationCentersList(companyId: string | undefined) {
  return useQuery({
    queryKey: ['compliance-centers', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operation_centers')
        .select('id, name')
        .eq('company_id', companyId!)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

function usePublishedCourses() {
  return useQuery({
    queryKey: ['compliance-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_courses')
        .select('id, name, code, status')
        .in('status', ['publicado', 'borrador'])
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}

function useTokenCenterAssociations() {
  return useQuery({
    queryKey: ['compliance-token-center'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_access_tokens')
        .select('course_id, operation_center_id')
        .not('operation_center_id', 'is', null);
      if (error) throw error;
      return data || [];
    },
  });
}

function useAllCompletions() {
  return useQuery({
    queryKey: ['compliance-completions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_completions')
        .select(`
          id, course_id, operator_cedula, employee_id, completed_at, operator_name,
          training_access_tokens!inner(operation_center_id)
        `);
      if (error) throw error;
      return (data || []).map((c: any) => ({
        id: c.id,
        course_id: c.course_id,
        operator_cedula: c.operator_cedula,
        employee_id: c.employee_id,
        completed_at: c.completed_at,
        operator_name: c.operator_name,
        token_center_id: c.training_access_tokens?.operation_center_id || null,
      })) as ComplianceCompletion[];
    },
  });
}

export function useTrainingCompliance() {
  const employees = useActiveEmployeesByCenter();
  const centers = useOperationCentersList();
  const courses = usePublishedCourses();
  const completions = useAllCompletions();
  const tokenAssociations = useTokenCenterAssociations();

  const isLoading = employees.isLoading || centers.isLoading || courses.isLoading || completions.isLoading || tokenAssociations.isLoading;

  const complianceData: CenterComplianceData[] = [];

  if (employees.data && centers.data && courses.data && completions.data && tokenAssociations.data) {
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

      const applicableCourses = courses.data.filter((c) => centerCourseIds.has(c.id));
      if (applicableCourses.length === 0) continue;

      const coursesData: CourseComplianceData[] = [];

      for (const course of applicableCourses) {
        const courseCompletions = completions.data.filter(
          (c) => c.course_id === course.id
        );

        const completed: { employee: ComplianceEmployee; completed_at: string }[] = [];
        const pending: ComplianceEmployee[] = [];

        for (const emp of centerEmployees) {
          const match = courseCompletions.find(
            (c) =>
              (c.operator_cedula && c.operator_cedula === emp.document_number) ||
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
    courses: courses.data || [],
    isLoading,
  };
}
