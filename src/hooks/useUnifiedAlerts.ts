import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedAlert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation' | 'certification' | 'incapacity' | 'vacation' | 'cesantias';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  daysRemaining: number;
  entityName: string;
  entityId: string;
  eventDate: string;
  createdAt: string;
  // For navigation
  navigateTo?: string;
  employeeId?: string;
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

export function useUnifiedAlerts() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['unified-alerts', currentCompanyId],
    queryFn: async () => {
      const alerts: UnifiedAlert[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
          created_at,
          contract_extensions(id, end_date, extension_number)
        `)
        .in('employee_id', employeeIds)
        .eq('is_terminated', false)
        .neq('contract_type', 'indefinido');

      if (contracts) {
        for (const contract of contracts) {
          const employee = employeeMap.get(contract.employee_id);
          if (!employee) continue;

          let currentEndDate = contract.end_date;
          if (contract.contract_extensions && contract.contract_extensions.length > 0) {
            const latestExtension = contract.contract_extensions.reduce(
              (latest: any, current: any) =>
                current.extension_number > latest.extension_number ? current : latest
            );
            currentEndDate = latestExtension.end_date;
          }

          const daysRemaining = calculateDaysRemaining(currentEndDate);
          if (daysRemaining !== null && daysRemaining >= -7 && daysRemaining <= 30) {
            const hasExtensions = contract.contract_extensions && contract.contract_extensions.length > 0;
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `contract-${contract.id}`,
              type: hasExtensions ? 'extension' : 'contract',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired 
                ? (hasExtensions ? 'Prórroga vencida' : 'Contrato vencido')
                : (hasExtensions ? 'Prórroga por vencer' : 'Contrato por vencer'),
              description: isExpired 
                ? `Venció hace ${Math.abs(daysRemaining)} días`
                : `Vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: contract.id,
              eventDate: currentEndDate || '',
              createdAt: contract.created_at,
              navigateTo: '/contratos',
              employeeId: employee.id,
            });
          }
        }
      }

      // 2. Fetch expiring medical exams
      const { data: exams } = await supabase
        .from('medical_exams')
        .select('id, employee_id, exam_type, expiration_date, created_at')
        .in('employee_id', employeeIds)
        .not('expiration_date', 'is', null)
        .neq('exam_type', 'egreso');

      if (exams) {
        const examTypeLabels: Record<string, string> = {
          ingreso: 'Examen de ingreso',
          periodico: 'Examen periódico',
          reintegro: 'Examen de reintegro',
        };

        for (const exam of exams) {
          const employee = employeeMap.get(exam.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(exam.expiration_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 30) {
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `exam-${exam.id}`,
              type: 'medical',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Examen médico vencido' : 'Examen médico por vencer',
              description: `${examTypeLabels[exam.exam_type] || exam.exam_type} ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: exam.id,
              eventDate: exam.expiration_date || '',
              createdAt: exam.created_at,
              navigateTo: '/examenes',
              employeeId: employee.id,
            });
          }
        }
      }

      // 3. Fetch expiring dotation deliveries
      const { data: dotations } = await supabase
        .from('dotation_deliveries')
        .select('id, employee_id, item_name, expiration_date, created_at')
        .in('employee_id', employeeIds);

      if (dotations) {
        for (const dotation of dotations) {
          const employee = employeeMap.get(dotation.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(dotation.expiration_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 30) {
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `dotation-${dotation.id}`,
              type: 'dotation',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Dotación vencida' : 'Dotación por vencer',
              description: `${dotation.item_name} ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: dotation.id,
              eventDate: dotation.expiration_date,
              createdAt: dotation.created_at,
              navigateTo: '/dotacion',
              employeeId: employee.id,
            });
          }
        }
      }

      // 4. Fetch expiring certifications and licenses
      const { data: certifications } = await supabase
        .from('employee_certifications')
        .select('id, employee_id, certification_type, certification_name, license_category, expiry_date, created_at')
        .in('employee_id', employeeIds)
        .eq('is_valid', true)
        .not('expiry_date', 'is', null);

      if (certifications) {
        for (const cert of certifications) {
          const employee = employeeMap.get(cert.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(cert.expiry_date);
          
          if (daysRemaining !== null && daysRemaining <= 30) {
            const typeName = certificationTypeLabels[cert.certification_type] || cert.certification_type;
            const displayName = cert.certification_name || typeName;
            const licenseInfo = cert.license_category ? ` (${cert.license_category})` : '';
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `cert-${cert.id}`,
              type: 'certification',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Certificación vencida' : 'Certificación por vencer',
              description: `${displayName}${licenseInfo} ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: cert.id,
              eventDate: cert.expiry_date || '',
              createdAt: cert.created_at,
              navigateTo: '/empleados',
              employeeId: employee.id,
            });
          }
        }
      }

      // 5. Fetch incapacity alerts
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('id, employee_id, end_date, recovery_status, total_days, diagnosis, created_at')
        .eq('company_id', currentCompanyId!);

      if (incapacities) {
        for (const inc of incapacities) {
          const employee = employeeMap.get(inc.employee_id);
          if (!employee) continue;

          const endDate = new Date(inc.end_date);
          endDate.setHours(0, 0, 0, 0);
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Alert for incapacities ending soon
          if (daysRemaining >= 0 && daysRemaining <= 5) {
            alerts.push({
              id: `inc-ending-${inc.id}`,
              type: 'incapacity',
              level: daysRemaining <= 2 ? 'critical' : 'warning',
              title: 'Incapacidad por vencer',
              description: `Finaliza en ${daysRemaining} día(s) - ${inc.diagnosis?.substring(0, 40)}...`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: inc.id,
              eventDate: inc.end_date,
              createdAt: inc.created_at,
              navigateTo: '/incapacidades',
              employeeId: employee.id,
            });
          }

          // Alert for pending recovery
          if (inc.recovery_status === 'pendiente' && daysRemaining < 0) {
            const daysSinceEnd = Math.abs(daysRemaining);
            alerts.push({
              id: `inc-recovery-${inc.id}`,
              type: 'incapacity',
              level: daysSinceEnd > 15 ? 'critical' : daysSinceEnd > 7 ? 'warning' : 'info',
              title: 'Recobro de incapacidad pendiente',
              description: `Finalizó hace ${daysSinceEnd} días sin radicar recobro`,
              daysRemaining: -daysSinceEnd,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: inc.id,
              eventDate: inc.end_date,
              createdAt: inc.created_at,
              navigateTo: '/incapacidades',
              employeeId: employee.id,
            });
          }
        }
      }

      // 6. Fetch vacation alerts
      const { data: vacationBalances } = await supabase
        .from('vacation_balances')
        .select('id, employee_id, days_pending, accumulation_expires, created_at')
        .eq('company_id', currentCompanyId!);

      if (vacationBalances) {
        for (const balance of vacationBalances) {
          const employee = employeeMap.get(balance.employee_id);
          if (!employee) continue;

          const pendingDays = Number(balance.days_pending);

          if (pendingDays > 30) {
            alerts.push({
              id: `vacation-${balance.id}`,
              type: 'vacation',
              level: pendingDays > 45 ? 'critical' : 'warning',
              title: 'Acumulación excesiva de vacaciones',
              description: `Tiene ${pendingDays} días de vacaciones pendientes`,
              daysRemaining: pendingDays,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: balance.id,
              eventDate: balance.accumulation_expires || '',
              createdAt: balance.created_at,
              navigateTo: '/vacaciones',
              employeeId: employee.id,
            });
          }

          if (balance.accumulation_expires) {
            const expiryDays = calculateDaysRemaining(balance.accumulation_expires);
            if (expiryDays !== null && expiryDays >= 0 && expiryDays <= 30) {
              alerts.push({
                id: `vacation-expiry-${balance.id}`,
                type: 'vacation',
                level: getAlertLevel(expiryDays),
                title: 'Vacaciones por vencer',
                description: `Período de acumulación vence en ${expiryDays} días`,
                daysRemaining: expiryDays,
                entityName: `${employee.first_name} ${employee.last_name}`,
                entityId: balance.id,
                eventDate: balance.accumulation_expires,
                createdAt: balance.created_at,
                navigateTo: '/vacaciones',
                employeeId: employee.id,
              });
            }
          }
        }
      }

      // 7. Fetch cesantías alerts (deposits and interest payments)
      const currentYear = new Date().getFullYear();
      
      // Pending deposits
      const { data: deposits } = await supabase
        .from('cesantias_deposits')
        .select('id, employee_id, year, due_date, status, created_at')
        .eq('company_id', currentCompanyId!)
        .in('status', ['pendiente', 'calculado']);

      if (deposits) {
        for (const deposit of deposits) {
          const employee = employeeMap.get(deposit.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(deposit.due_date);
          if (daysRemaining !== null && daysRemaining <= 30) {
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `cesantias-deposit-${deposit.id}`,
              type: 'cesantias',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Depósito de cesantías vencido' : 'Depósito de cesantías pendiente',
              description: `Año ${deposit.year} - ${isExpired ? 'Venció hace' : 'Vence en'} ${Math.abs(daysRemaining)} días (14 Feb)`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: deposit.id,
              eventDate: deposit.due_date,
              createdAt: deposit.created_at,
              navigateTo: '/cesantias',
              employeeId: employee.id,
            });
          }
        }
      }

      // Pending interest payments
      const { data: interests } = await supabase
        .from('cesantias_interest_payments')
        .select('id, employee_id, year, due_date, is_paid, created_at')
        .eq('company_id', currentCompanyId!)
        .eq('is_paid', false);

      if (interests) {
        for (const interest of interests) {
          const employee = employeeMap.get(interest.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(interest.due_date);
          if (daysRemaining !== null && daysRemaining <= 30) {
            const isExpired = daysRemaining < 0;
            
            alerts.push({
              id: `cesantias-interest-${interest.id}`,
              type: 'cesantias',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Pago de intereses vencido' : 'Pago de intereses pendiente',
              description: `Año ${interest.year} - ${isExpired ? 'Venció hace' : 'Vence en'} ${Math.abs(daysRemaining)} días (31 Ene)`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: interest.id,
              eventDate: interest.due_date,
              createdAt: interest.created_at,
              navigateTo: '/cesantias',
              employeeId: employee.id,
            });
          }
        }
      }

      // Sort by urgency (most urgent first, expired at top)
      alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

      return alerts;
    },
    enabled: !!currentCompanyId,
  });
}

export function useAlertStats(alerts: UnifiedAlert[] | undefined) {
  if (!alerts) {
    return {
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      totalActive: 0,
    };
  }

  return {
    criticalCount: alerts.filter(a => a.level === 'critical').length,
    warningCount: alerts.filter(a => a.level === 'warning').length,
    infoCount: alerts.filter(a => a.level === 'info').length,
    totalActive: alerts.length,
  };
}
