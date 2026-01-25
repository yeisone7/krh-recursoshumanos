import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardAlert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation' | 'certification';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  daysRemaining: number;
  entityName: string;
  entityId: string;
}

function calculateDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}

const certificationTypeLabels: Record<string, string> = {
  licencia_conduccion: 'Licencia de conducción',
  trabajo_alturas: 'Trabajo en alturas',
  manipulacion_alimentos: 'Manipulación de alimentos',
  primeros_auxilios: 'Primeros auxilios',
  montacargas: 'Operación de montacargas',
  soldadura: 'Certificación de soldadura',
  electricidad: 'Certificación eléctrica',
  otro: 'Certificación',
};

export function useDashboardAlerts() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dashboard-alerts', currentCompanyId],
    queryFn: async () => {
      const alerts: DashboardAlert[] = [];

      // Fetch employees from employees_v2 for the current company
      const { data: employees } = await supabase
        .from('employees_v2')
        .select('id, first_name, last_name, company_id')
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true);

      if (!employees || employees.length === 0) return alerts;

      const employeeIds = employees.map(e => e.id);
      const employeeMap = new Map(employees.map(e => [e.id, e]));

      // 1. Fetch expiring contracts (term-based only, not indefinite)
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          employee_id,
          end_date,
          contract_type,
          is_terminated,
          contract_extensions(id, end_date, extension_number)
        `)
        .in('employee_id', employeeIds)
        .eq('is_terminated', false)
        .neq('contract_type', 'indefinido');

      if (contracts) {
        for (const contract of contracts) {
          const employee = employeeMap.get(contract.employee_id);
          if (!employee) continue;

          // Calculate current end date considering extensions
          let currentEndDate = contract.end_date;
          if (contract.contract_extensions && contract.contract_extensions.length > 0) {
            const latestExtension = contract.contract_extensions.reduce(
              (latest: any, current: any) =>
                current.extension_number > latest.extension_number ? current : latest
            );
            currentEndDate = latestExtension.end_date;
          }

          const daysRemaining = calculateDaysRemaining(currentEndDate);
          if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30) {
            const hasExtensions = contract.contract_extensions && contract.contract_extensions.length > 0;
            
            alerts.push({
              id: `contract-${contract.id}`,
              type: hasExtensions ? 'extension' : 'contract',
              level: getAlertLevel(daysRemaining),
              title: hasExtensions ? 'Prórroga por vencer' : 'Contrato por vencer',
              description: hasExtensions 
                ? `Prórroga #${contract.contract_extensions!.length} vence en ${daysRemaining} días`
                : `Contrato a término fijo vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: contract.id,
            });
          }
        }
      }

      // 2. Fetch expiring medical exams (periodic and entry exams only)
      const { data: exams } = await supabase
        .from('medical_exams')
        .select('id, employee_id, exam_type, expiration_date')
        .in('employee_id', employeeIds)
        .not('expiration_date', 'is', null)
        .neq('exam_type', 'egreso');

      if (exams) {
        for (const exam of exams) {
          const employee = employeeMap.get(exam.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(exam.expiration_date);
          if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30) {
            const examTypeLabels: Record<string, string> = {
              ingreso: 'Examen de ingreso',
              periodico: 'Examen periódico',
              reintegro: 'Examen de reintegro',
            };
            
            alerts.push({
              id: `exam-${exam.id}`,
              type: 'medical',
              level: getAlertLevel(daysRemaining),
              title: 'Examen médico por vencer',
              description: `${examTypeLabels[exam.exam_type] || exam.exam_type} vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: exam.id,
            });
          }
        }
      }

      // 3. Fetch expiring dotation deliveries
      const { data: dotations } = await supabase
        .from('dotation_deliveries')
        .select('id, employee_id, item_name, expiration_date')
        .in('employee_id', employeeIds);

      if (dotations) {
        for (const dotation of dotations) {
          const employee = employeeMap.get(dotation.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(dotation.expiration_date);
          if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30) {
            alerts.push({
              id: `dotation-${dotation.id}`,
              type: 'dotation',
              level: getAlertLevel(daysRemaining),
              title: 'Dotación por vencer',
              description: `${dotation.item_name} vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: dotation.id,
            });
          }
        }
      }

      // 4. Fetch expiring certifications and licenses
      const { data: certifications } = await supabase
        .from('employee_certifications')
        .select('id, employee_id, certification_type, certification_name, license_category, expiry_date')
        .in('employee_id', employeeIds)
        .eq('is_valid', true)
        .not('expiry_date', 'is', null);

      if (certifications) {
        for (const cert of certifications) {
          const employee = employeeMap.get(cert.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(cert.expiry_date);
          
          // Include expired (negative days) and expiring (0-30 days)
          if (daysRemaining !== null && daysRemaining <= 30) {
            const typeName = certificationTypeLabels[cert.certification_type] || cert.certification_type;
            const displayName = cert.certification_name || typeName;
            const licenseInfo = cert.license_category ? ` (${cert.license_category})` : '';
            
            const isExpired = daysRemaining < 0;
            const level = isExpired ? 'critical' : getAlertLevel(daysRemaining);
            
            alerts.push({
              id: `cert-${cert.id}`,
              type: 'certification',
              level,
              title: isExpired ? 'Certificación vencida' : 'Certificación por vencer',
              description: isExpired 
                ? `${displayName}${licenseInfo} venció hace ${Math.abs(daysRemaining)} días`
                : `${displayName}${licenseInfo} vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: cert.employee_id, // Navigate to employee detail
            });
          }
        }
      }

      // Sort by days remaining (most urgent first, expired items at top)
      alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

      return alerts;
    },
    enabled: !!currentCompanyId,
  });
}
