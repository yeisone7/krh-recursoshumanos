import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TerminationType, TerminationDocumentType } from '@/types/termination';

export interface ActiveTermination {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  employeePosition: string;
  contractId: string;
  terminationType: TerminationType;
  terminationDate: Date;
  effectiveDate: Date;
  createdAt: Date;
  totalDocuments: number;
  completedDocuments: number;
  progress: number; // 0-100
  pendingDocuments: string[];
  daysUntilEffective: number;
}

export function useActiveTerminations() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['active-terminations', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // Fetch all incomplete terminations with their documents
      const { data, error } = await supabase
        .from('employee_terminations')
        .select(`
          *,
          termination_documents(*)
        `)
        .eq('company_id', currentCompanyId)
        .eq('is_completed', false)
        .order('effective_date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get employee IDs for lookup in employees_v2
      const employeeIds = [...new Set(data.map(t => t.employee_id))];

      // Fetch employee info from employees_v2
      const { data: employees } = await supabase
        .from('employees_v2')
        .select(`
          id,
          first_name,
          last_name,
          document_number,
          employee_work_info(
            position_name,
            is_current
          )
        `)
        .in('id', employeeIds);

      const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);

      const now = new Date();
      
      const activeTerminations: ActiveTermination[] = data.map((item) => {
        const documents = item.termination_documents || [];
        const totalDocs = documents.length;
        const completedDocs = documents.filter((d: any) => d.is_generated).length;
        const progress = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
        
        const pendingDocs = documents
          .filter((d: any) => !d.is_generated)
          .map((d: any) => d.document_type as TerminationDocumentType);

        const effectiveDate = new Date(item.effective_date);
        const daysUntilEffective = Math.ceil((effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        const employee = employeeMap.get(item.employee_id);
        const currentWorkInfo = employee?.employee_work_info?.find((w: any) => w.is_current);
        
        return {
          id: item.id,
          employeeId: item.employee_id,
          employeeName: employee ? `${employee.first_name} ${employee.last_name}` : 'Empleado desconocido',
          employeeDocument: employee?.document_number || '',
          employeePosition: currentWorkInfo?.position_name || '',
          contractId: item.contract_id,
          terminationType: item.termination_type as TerminationType,
          terminationDate: new Date(item.termination_date),
          effectiveDate,
          createdAt: new Date(item.created_at),
          totalDocuments: totalDocs,
          completedDocuments: completedDocs,
          progress,
          pendingDocuments: pendingDocs,
          daysUntilEffective,
        };
      });

      return activeTerminations;
    },
    enabled: !!currentCompanyId,
  });
}
