import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, subMonths, format } from 'date-fns';

export interface EmployeeKPIs {
  // Core counts
  totalActiveEmployees: number;
  totalInactiveEmployees: number;
  newHiresThisMonth: number;
  terminationsThisMonth: number;
  
  // Trends
  employeeTrend: number; // percentage change vs last month
  
  // By status
  employeesInRetirement: number;
  
  // Contracts
  expiringContractsCount: number;
  
  // Certifications
  expiringCertificationsCount: number;
  expiredCertificationsCount: number;
  
  // Incapacities
  activeIncapacitiesCount: number;
  pendingRecoveryCount: number;
  incapacityDaysThisMonth: number;
  
  // Candidates
  activeCandidatesCount: number;
  candidatesInFinalStage: number;
  
  // Alerts
  criticalAlertsCount: number;
  warningAlertsCount: number;
  
  // Demographics
  byGender: { male: number; female: number; other: number };
  byContractType: { indefinido: number; fijo: number; obra: number; other: number };
  byArea: Array<{ name: string; count: number }>;
  byCenter: Array<{ name: string; count: number }>;
  
  // Retention (simplified calculation)
  retentionRate: number;
  averageTenureMonths: number;
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

export function useEmployeeKPIs() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee-kpis', currentCompanyId],
    queryFn: async (): Promise<EmployeeKPIs> => {
      const now = new Date();
      const startOfCurrentMonth = startOfMonth(now);
      const startOfLastMonth = startOfMonth(subMonths(now, 1));
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      // 1. Get all employees for the company
      const { data: employees } = await supabase
        .from('employees_v2')
        .select(`
          id, 
          is_active, 
          gender,
          created_at
        `)
        .eq('company_id', currentCompanyId!);

      const activeEmployees = employees?.filter(e => e.is_active) || [];
      const inactiveEmployees = employees?.filter(e => !e.is_active) || [];
      
      const employeeIds = employees?.map(e => e.id) || [];
      const activeEmployeeIds = activeEmployees.map(e => e.id);

      // 2. Get work info for area/center breakdown and hire dates
      const { data: workInfos } = await supabase
        .from('employee_work_info')
        .select(`
          employee_id,
          hire_date,
          link_type,
          termination_date,
          operation_center_id,
          area_id,
          operation_centers(name),
          areas(name)
        `)
        .eq('company_id', currentCompanyId!)
        .eq('is_current', true);

      // Calculate new hires this month
      const newHiresThisMonth = workInfos?.filter(w => {
        const hireDate = new Date(w.hire_date);
        return hireDate >= startOfCurrentMonth && activeEmployeeIds.includes(w.employee_id);
      }).length || 0;

      // Calculate new hires last month for trend
      const newHiresLastMonth = workInfos?.filter(w => {
        const hireDate = new Date(w.hire_date);
        return hireDate >= startOfLastMonth && hireDate < startOfCurrentMonth;
      }).length || 0;

      // Calculate employee trend
      const employeeTrend = newHiresLastMonth > 0 
        ? ((newHiresThisMonth - newHiresLastMonth) / newHiresLastMonth) * 100 
        : newHiresThisMonth > 0 ? 100 : 0;

      // 3. Get terminations this month
      const { data: terminations } = await supabase
        .from('employee_terminations')
        .select('id, effective_date, is_completed')
        .eq('company_id', currentCompanyId!)
        .gte('effective_date', format(startOfCurrentMonth, 'yyyy-MM-dd'));

      const terminationsThisMonth = terminations?.length || 0;
      const employeesInRetirement = terminations?.filter(t => !t.is_completed).length || 0;

      // 4. Get expiring contracts (next 30 days)
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          employee_id,
          end_date,
          contract_type,
          is_terminated,
          contract_extensions(end_date, extension_number)
        `)
        .eq('company_id', currentCompanyId!)
        .eq('is_terminated', false)
        .neq('contract_type', 'indefinido');

      let expiringContractsCount = 0;
      let criticalCount = 0;
      let warningCount = 0;

      if (contracts) {
        for (const contract of contracts) {
          let currentEndDate = contract.end_date;
          if (contract.contract_extensions && contract.contract_extensions.length > 0) {
            const latest = contract.contract_extensions.reduce((a: any, b: any) => 
              a.extension_number > b.extension_number ? a : b
            );
            currentEndDate = latest.end_date;
          }
          const days = calculateDaysRemaining(currentEndDate);
          if (days !== null && days >= 0 && days <= 30) {
            expiringContractsCount++;
            if (days <= 7) criticalCount++;
            else if (days <= 15) warningCount++;
          }
        }
      }

      // 5. Get expiring certifications
      const { data: certifications } = await supabase
        .from('employee_certifications')
        .select('id, employee_id, expiry_date')
        .eq('company_id', currentCompanyId!)
        .eq('is_valid', true)
        .not('expiry_date', 'is', null);

      let expiringCertificationsCount = 0;
      let expiredCertificationsCount = 0;

      if (certifications) {
        for (const cert of certifications) {
          const days = calculateDaysRemaining(cert.expiry_date);
          if (days !== null) {
            if (days < 0) {
              expiredCertificationsCount++;
              criticalCount++;
            } else if (days <= 30) {
              expiringCertificationsCount++;
              if (days <= 7) criticalCount++;
              else if (days <= 15) warningCount++;
            }
          }
        }
      }

      // 6. Get medical exams alerts
      const { data: exams } = await supabase
        .from('medical_exams')
        .select('id, expiration_date')
        .eq('company_id', currentCompanyId!)
        .not('expiration_date', 'is', null)
        .neq('exam_type', 'egreso');

      if (exams) {
        for (const exam of exams) {
          const days = calculateDaysRemaining(exam.expiration_date);
          if (days !== null && days >= 0 && days <= 30) {
            if (days <= 7) criticalCount++;
            else if (days <= 15) warningCount++;
          }
        }
      }

      // 7. Get candidates stats
      const { data: candidates } = await supabase
        .from('candidates')
        .select('id, status, current_step')
        .eq('company_id', currentCompanyId!)
        .in('status', ['applied', 'in_interview', 'in_psycho_test', 'in_technical_test', 'in_medical', 'in_validation', 'selected']);

      const activeCandidatesCount = candidates?.length || 0;
      const candidatesInFinalStage = candidates?.filter(c => c.status === 'selected').length || 0;

      // 8. Calculate demographics
      const byGender = {
        male: activeEmployees.filter(e => e.gender === 'M').length,
        female: activeEmployees.filter(e => e.gender === 'F').length,
        other: activeEmployees.filter(e => e.gender === 'O').length,
      };

      // Contract type breakdown
      const byContractType = {
        indefinido: 0,
        fijo: 0,
        obra: 0,
        other: 0,
      };

      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        switch (w.link_type) {
          case 'indefinido': byContractType.indefinido++; break;
          case 'fijo': byContractType.fijo++; break;
          case 'obra_labor': byContractType.obra++; break;
          default: byContractType.other++; break;
        }
      });

      // Area breakdown
      const areaMap = new Map<string, number>();
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const areaName = (w.areas as any)?.name || 'Sin área';
        areaMap.set(areaName, (areaMap.get(areaName) || 0) + 1);
      });
      const byArea = Array.from(areaMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Center breakdown
      const centerMap = new Map<string, number>();
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const centerName = (w.operation_centers as any)?.name || 'Sin centro';
        centerMap.set(centerName, (centerMap.get(centerName) || 0) + 1);
      });
      const byCenter = Array.from(centerMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // 9. Calculate retention rate (simplified: active / total this year)
      const totalEmployeesEver = employees?.length || 1;
      const retentionRate = totalEmployeesEver > 0 
        ? (activeEmployees.length / totalEmployeesEver) * 100 
        : 100;

      // 10. Calculate average tenure
      let totalTenureMonths = 0;
      let tenureCount = 0;
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const hireDate = new Date(w.hire_date);
        const monthsDiff = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        totalTenureMonths += monthsDiff;
        tenureCount++;
      });
      const averageTenureMonths = tenureCount > 0 ? Math.round(totalTenureMonths / tenureCount) : 0;

      // 11. Get incapacity stats
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('id, employee_id, start_date, end_date, total_days, recovery_status')
        .eq('company_id', currentCompanyId!);

      let activeIncapacitiesCount = 0;
      let pendingRecoveryCount = 0;
      let incapacityDaysThisMonth = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (incapacities) {
        for (const inc of incapacities) {
          const startDate = new Date(inc.start_date);
          const endDate = new Date(inc.end_date);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          // Active incapacities
          if (startDate <= today && endDate >= today) {
            activeIncapacitiesCount++;
          }
          
          // Pending recovery
          if (inc.recovery_status === 'pendiente' && endDate < today) {
            pendingRecoveryCount++;
            criticalCount++; // Add to critical alerts
          }
          
          // Days this month
          if (startDate >= startOfCurrentMonth || endDate >= startOfCurrentMonth) {
            incapacityDaysThisMonth += inc.total_days;
          }
        }
      }

      return {
        totalActiveEmployees: activeEmployees.length,
        totalInactiveEmployees: inactiveEmployees.length,
        newHiresThisMonth,
        terminationsThisMonth,
        employeeTrend: Math.round(employeeTrend * 10) / 10,
        employeesInRetirement,
        expiringContractsCount,
        expiringCertificationsCount,
        expiredCertificationsCount,
        activeIncapacitiesCount,
        pendingRecoveryCount,
        incapacityDaysThisMonth,
        activeCandidatesCount,
        candidatesInFinalStage,
        criticalAlertsCount: criticalCount,
        warningAlertsCount: warningCount,
        byGender,
        byContractType,
        byArea,
        byCenter,
        retentionRate: Math.round(retentionRate * 10) / 10,
        averageTenureMonths,
      };
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
