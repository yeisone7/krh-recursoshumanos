import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, subMonths, format, startOfYear } from 'date-fns';

export interface TurnoverData {
  month: string;
  hires: number;
  terminations: number;
  turnoverRate: number;
}

export interface AbsenteeismData {
  month: string;
  incapacityDays: number;
  leaveDays: number;
  totalDays: number;
  rate: number;
}

export interface TrainingComplianceData {
  areaName: string;
  totalEmployees: number;
  trainedEmployees: number;
  complianceRate: number;
}

export interface EvaluationData {
  areaName: string;
  totalEmployees: number;
  evaluatedEmployees: number;
  averageScore: number;
  complianceRate: number;
}

export interface AreaMetrics {
  name: string;
  employees: number;
  avgTenure: number;
  turnoverRate: number;
  absenteeismRate: number;
  trainingCompliance: number;
}

export interface HRAnalytics {
  totalEmployees: number;
  activeEmployees: number;
  newHiresYTD: number;
  terminationsYTD: number;
  yearlyTurnoverRate: number;
  monthlyTurnoverRate: number;
  avgTenureMonths: number;
  absenteeismRate: number;
  trainingComplianceRate: number;
  evaluationComplianceRate: number;
  turnoverTrend: TurnoverData[];
  absenteeismTrend: AbsenteeismData[];
  trainingByArea: TrainingComplianceData[];
  evaluationsByArea: EvaluationData[];
  areaMetrics: AreaMetrics[];
  byContractType: { name: string; value: number; color: string }[];
  byGender: { name: string; value: number; color: string }[];
  byCenter: { name: string; count: number }[];
  avgIncapacityDaysPerEmployee: number;
  pendingEvaluations: number;
  upcomingTrainingSessions: number;
  certificationExpiringCount: number;
}

const COLORS = {
  primary: 'hsl(220, 70%, 45%)',
  accent: 'hsl(160, 70%, 40%)',
  warning: 'hsl(38, 95%, 50%)',
  info: 'hsl(200, 90%, 50%)',
  muted: 'hsl(215, 15%, 50%)',
};

export function useHRAnalytics() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['hr-analytics', currentCompanyId],
    queryFn: async (): Promise<HRAnalytics> => {
      const now = new Date();
      const startOfCurrentYear = startOfYear(now);
      const sixMonthsAgo = subMonths(now, 6);

      // 1. Get all employees
      const { data: employees } = await supabase
        .from('employees_v2')
        .select('id, is_active, gender, created_at')
        .eq('company_id', currentCompanyId!);

      const activeEmployees = employees?.filter(e => e.is_active) || [];
      const activeEmployeeIds = activeEmployees.map(e => e.id);
      const allEmployeeIds = employees?.map(e => e.id) || [];

      // 2. Get work info for area/center breakdown
      const { data: workInfos } = await supabase
        .from('employee_work_info')
        .select(`
          employee_id,
          hire_date,
          link_type,
          operation_center_id,
          area_id,
          operation_centers(name),
          areas(name)
        `)
        .in('employee_id', allEmployeeIds.length > 0 ? allEmployeeIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('is_current', true);

      // 3. Get terminations for turnover
      const { data: terminations } = await supabase
        .from('employee_terminations')
        .select('id, employee_id, effective_date, is_completed')
        .eq('company_id', currentCompanyId!)
        .gte('effective_date', format(sixMonthsAgo, 'yyyy-MM-dd'));

      // 4. Get incapacities for absenteeism
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('id, employee_id, start_date, end_date, total_days')
        .eq('company_id', currentCompanyId!)
        .gte('start_date', format(sixMonthsAgo, 'yyyy-MM-dd'));

      // 5. Get training sessions
      const { data: trainingSessions } = await supabase
        .from('training_sessions')
        .select(`
          id,
          course_id,
          start_date,
          status,
          training_courses(name, is_mandatory)
        `)
        .eq('company_id', currentCompanyId!);

      // Get training attendance separately
      const sessionIds = trainingSessions?.map(s => s.id) || [];
      const { data: trainingAttendance } = await supabase
        .from('training_attendance')
        .select('id, session_id, employee_id, attendance_status, score')
        .in('session_id', sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']);

      // 6. Get evaluation cycles
      const { data: evaluationCycles } = await supabase
        .from('evaluation_cycles')
        .select('id, name, start_date, end_date, status')
        .eq('company_id', currentCompanyId!);

      // 7. Get certifications expiring
      const { data: certifications } = await supabase
        .from('employee_certifications')
        .select('id, employee_id, expiry_date')
        .in('employee_id', activeEmployeeIds.length > 0 ? activeEmployeeIds : ['00000000-0000-0000-0000-000000000000'])
        .eq('is_valid', true)
        .not('expiry_date', 'is', null);

      // Calculate metrics
      const totalEmployees = employees?.length || 0;
      const activeCount = activeEmployees.length;

      // New hires YTD
      const newHiresYTD = workInfos?.filter(w => {
        const hireDate = new Date(w.hire_date);
        return hireDate >= startOfCurrentYear && activeEmployeeIds.includes(w.employee_id);
      }).length || 0;

      // Terminations YTD
      const terminationsYTD = terminations?.filter(t => {
        const effDate = new Date(t.effective_date);
        return effDate >= startOfCurrentYear;
      }).length || 0;

      // Calculate turnover rates
      const avgHeadcount = activeCount > 0 ? activeCount : 1;
      const yearlyTurnoverRate = avgHeadcount > 0 
        ? (terminationsYTD / avgHeadcount) * 100 
        : 0;
      
      const currentMonthTerminations = terminations?.filter(t => {
        const effDate = new Date(t.effective_date);
        return effDate >= startOfMonth(now);
      }).length || 0;
      const monthlyTurnoverRate = avgHeadcount > 0 
        ? (currentMonthTerminations / avgHeadcount) * 100 
        : 0;

      // Average tenure
      let totalTenureMonths = 0;
      let tenureCount = 0;
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const hireDate = new Date(w.hire_date);
        const monthsDiff = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        totalTenureMonths += monthsDiff;
        tenureCount++;
      });
      const avgTenureMonths = tenureCount > 0 ? Math.round(totalTenureMonths / tenureCount) : 0;

      // Calculate turnover trend (last 6 months)
      const turnoverTrend: TurnoverData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        const monthName = format(monthStart, 'MMM');

        const monthHires = workInfos?.filter(w => {
          const hireDate = new Date(w.hire_date);
          return hireDate >= monthStart && hireDate < monthEnd;
        }).length || 0;

        const monthTerminations = terminations?.filter(t => {
          const effDate = new Date(t.effective_date);
          return effDate >= monthStart && effDate < monthEnd;
        }).length || 0;

        const turnoverRate = avgHeadcount > 0 
          ? (monthTerminations / avgHeadcount) * 100 
          : 0;

        turnoverTrend.push({
          month: monthName,
          hires: monthHires,
          terminations: monthTerminations,
          turnoverRate: Math.round(turnoverRate * 10) / 10,
        });
      }

      // Calculate absenteeism trend
      const absenteeismTrend: AbsenteeismData[] = [];
      let totalIncapacityDays = 0;
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = startOfMonth(subMonths(now, i - 1));
        const monthName = format(monthStart, 'MMM');

        const monthIncapacityDays = incapacities?.filter(inc => {
          const startDate = new Date(inc.start_date);
          return startDate >= monthStart && startDate < monthEnd;
        }).reduce((sum, inc) => sum + inc.total_days, 0) || 0;

        totalIncapacityDays += monthIncapacityDays;

        const workingDays = activeCount * 22;
        const rate = workingDays > 0 ? (monthIncapacityDays / workingDays) * 100 : 0;

        absenteeismTrend.push({
          month: monthName,
          incapacityDays: monthIncapacityDays,
          leaveDays: 0,
          totalDays: monthIncapacityDays,
          rate: Math.round(rate * 10) / 10,
        });
      }

      const avgIncapacityDaysPerEmployee = activeCount > 0 
        ? Math.round((totalIncapacityDays / activeCount) * 10) / 10 
        : 0;

      const totalWorkingDays = activeCount * 22 * 6;
      const absenteeismRate = totalWorkingDays > 0 
        ? Math.round((totalIncapacityDays / totalWorkingDays) * 100 * 10) / 10 
        : 0;

      // Training compliance by area
      const areaMap = new Map<string, { total: number; trained: Set<string> }>();
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const areaName = (w.areas as any)?.name || 'Sin área';
        if (!areaMap.has(areaName)) {
          areaMap.set(areaName, { total: 0, trained: new Set() });
        }
        areaMap.get(areaName)!.total++;
      });

      // Check who has completed mandatory training
      const trainedEmployees = new Set<string>();
      const mandatorySessions = trainingSessions?.filter(s => 
        (s.training_courses as any)?.is_mandatory
      ) || [];
      
      mandatorySessions.forEach(session => {
        const sessionAttendance = trainingAttendance?.filter(a => a.session_id === session.id) || [];
        sessionAttendance.forEach(att => {
          // Check for attendance (asistio is not in enum, use available values)
          if (att.attendance_status === 'inscrito' || att.score !== null) {
            trainedEmployees.add(att.employee_id);
          }
        });
      });

      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const areaName = (w.areas as any)?.name || 'Sin área';
        if (trainedEmployees.has(w.employee_id)) {
          areaMap.get(areaName)?.trained.add(w.employee_id);
        }
      });

      const trainingByArea: TrainingComplianceData[] = Array.from(areaMap.entries())
        .map(([name, data]) => ({
          areaName: name,
          totalEmployees: data.total,
          trainedEmployees: data.trained.size,
          complianceRate: data.total > 0 
            ? Math.round((data.trained.size / data.total) * 100) 
            : 0,
        }))
        .sort((a, b) => b.totalEmployees - a.totalEmployees)
        .slice(0, 8);

      const overallTrainingCompliance = activeCount > 0 
        ? Math.round((trainedEmployees.size / activeCount) * 100) 
        : 0;

      // Evaluations by area
      const evalAreaMap = new Map<string, { total: number; evaluated: number; totalScore: number }>();
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const areaName = (w.areas as any)?.name || 'Sin área';
        if (!evalAreaMap.has(areaName)) {
          evalAreaMap.set(areaName, { total: 0, evaluated: 0, totalScore: 0 });
        }
        evalAreaMap.get(areaName)!.total++;
      });

      // Use evaluation cycles status - check by date range for current year
      const currentYearCycles = evaluationCycles?.filter(c => {
        const cycleStart = new Date(c.start_date);
        return cycleStart.getFullYear() === now.getFullYear();
      }) || [];

      const completedCyclesThisYear = currentYearCycles.filter(c => 
        c.status === 'completed'
      ).length;
      const totalCyclesThisYear = currentYearCycles.length;

      const evaluationComplianceRate = totalCyclesThisYear > 0 
        ? Math.round((completedCyclesThisYear / totalCyclesThisYear) * 100)
        : 0;

      const evaluationsByArea: EvaluationData[] = Array.from(evalAreaMap.entries())
        .map(([name, data]) => ({
          areaName: name,
          totalEmployees: data.total,
          evaluatedEmployees: Math.round(data.total * (evaluationComplianceRate / 100)),
          averageScore: 0,
          complianceRate: evaluationComplianceRate,
        }))
        .sort((a, b) => b.totalEmployees - a.totalEmployees)
        .slice(0, 8);

      // Area comprehensive metrics
      const areaMetrics: AreaMetrics[] = Array.from(areaMap.entries())
        .map(([name, data]) => {
          const areaEmployeeIds = workInfos
            ?.filter(w => (w.areas as any)?.name === name)
            .map(w => w.employee_id) || [];
          
          const areaTerminations = terminations?.filter(t => 
            areaEmployeeIds.includes(t.employee_id)
          ).length || 0;
          
          const areaIncapacityDays = incapacities?.filter(inc => 
            areaEmployeeIds.includes(inc.employee_id)
          ).reduce((sum, inc) => sum + inc.total_days, 0) || 0;

          let areaTenure = 0;
          let areaTenureCount = 0;
          workInfos?.forEach(w => {
            if ((w.areas as any)?.name === name && activeEmployeeIds.includes(w.employee_id)) {
              const hireDate = new Date(w.hire_date);
              areaTenure += (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
              areaTenureCount++;
            }
          });

          const areaWorkingDays = data.total * 22 * 6;

          return {
            name,
            employees: data.total,
            avgTenure: areaTenureCount > 0 ? Math.round(areaTenure / areaTenureCount) : 0,
            turnoverRate: data.total > 0 
              ? Math.round((areaTerminations / data.total) * 100 * 10) / 10 
              : 0,
            absenteeismRate: areaWorkingDays > 0 
              ? Math.round((areaIncapacityDays / areaWorkingDays) * 100 * 10) / 10 
              : 0,
            trainingCompliance: trainingByArea.find(t => t.areaName === name)?.complianceRate || 0,
          };
        })
        .sort((a, b) => b.employees - a.employees)
        .slice(0, 10);

      // Distribution by contract type
      const contractTypeCounts = { indefinido: 0, fijo: 0, obra: 0, other: 0 };
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        switch (w.link_type) {
          case 'indefinido': contractTypeCounts.indefinido++; break;
          case 'fijo': contractTypeCounts.fijo++; break;
          case 'obra_labor': contractTypeCounts.obra++; break;
          default: contractTypeCounts.other++; break;
        }
      });

      const byContractType = [
        { name: 'Indefinido', value: contractTypeCounts.indefinido, color: COLORS.primary },
        { name: 'Fijo', value: contractTypeCounts.fijo, color: COLORS.accent },
        { name: 'Obra/Labor', value: contractTypeCounts.obra, color: COLORS.warning },
        { name: 'Otro', value: contractTypeCounts.other, color: COLORS.muted },
      ].filter(item => item.value > 0);

      // Distribution by gender
      const byGender = [
        { name: 'Masculino', value: activeEmployees.filter(e => e.gender === 'M').length, color: COLORS.primary },
        { name: 'Femenino', value: activeEmployees.filter(e => e.gender === 'F').length, color: COLORS.accent },
        { name: 'Otro', value: activeEmployees.filter(e => e.gender === 'O').length, color: COLORS.info },
      ].filter(item => item.value > 0);

      // Distribution by center
      const centerMap = new Map<string, number>();
      workInfos?.forEach(w => {
        if (!activeEmployeeIds.includes(w.employee_id)) return;
        const centerName = (w.operation_centers as any)?.name || 'Sin centro';
        centerMap.set(centerName, (centerMap.get(centerName) || 0) + 1);
      });
      const byCenter = Array.from(centerMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Upcoming training sessions
      const upcomingTrainingSessions = trainingSessions?.filter(s => {
        const schedDate = new Date(s.start_date);
        return schedDate >= now && s.status === 'programado';
      }).length || 0;

      // Pending evaluations (cycles in progress)
      const pendingEvaluations = currentYearCycles.filter(c => 
        c.status === 'active' || c.status === 'draft'
      ).length;

      // Certifications expiring in next 30 days
      const thirtyDaysFromNow = new Date(now);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const certificationExpiringCount = certifications?.filter(c => {
        const expiryDate = new Date(c.expiry_date!);
        return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
      }).length || 0;

      return {
        totalEmployees,
        activeEmployees: activeCount,
        newHiresYTD,
        terminationsYTD,
        yearlyTurnoverRate: Math.round(yearlyTurnoverRate * 10) / 10,
        monthlyTurnoverRate: Math.round(monthlyTurnoverRate * 10) / 10,
        avgTenureMonths,
        absenteeismRate,
        trainingComplianceRate: overallTrainingCompliance,
        evaluationComplianceRate,
        turnoverTrend,
        absenteeismTrend,
        trainingByArea,
        evaluationsByArea,
        areaMetrics,
        byContractType,
        byGender,
        byCenter,
        avgIncapacityDaysPerEmployee,
        pendingEvaluations,
        upcomingTrainingSessions,
        certificationExpiringCount,
      };
    },
    enabled: !!currentCompanyId,
    staleTime: 5 * 60 * 1000,
  });
}
