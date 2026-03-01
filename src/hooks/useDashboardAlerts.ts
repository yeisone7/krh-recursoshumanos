import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardAlert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation' | 'certification' | 'incapacity' | 'vacation' | 'preaviso' | 'inventory_low_stock';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  daysRemaining: number;
  entityName: string;
  entityId: string;
  isPreaviso?: boolean;
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
          if (daysRemaining === null) continue;
          
          const hasExtensions = contract.contract_extensions && contract.contract_extensions.length > 0;
          const employeeName = `${employee.first_name} ${employee.last_name}`;
          
          // Alerta de PREAVISO: 35-31 días antes del vencimiento
          // Art. 46 CST: Se requiere preaviso de 30 días para no renovación
          if (daysRemaining > 30 && daysRemaining <= 35) {
            alerts.push({
              id: `preaviso-${contract.id}`,
              type: 'preaviso',
              level: 'warning',
              title: '⚖️ Período de Preaviso Activo',
              description: hasExtensions 
                ? `Prórroga #${contract.contract_extensions!.length}: Decide antes de ${daysRemaining - 30} día(s) si será pactada o automática`
                : `Contrato: Decide antes de ${daysRemaining - 30} día(s) si será prórroga pactada o automática`,
              daysRemaining,
              entityName: employeeName,
              entityId: contract.id,
              isPreaviso: true,
            });
          }
          
          // Alerta normal de vencimiento: ≤30 días
          if (daysRemaining >= 0 && daysRemaining <= 30) {
            alerts.push({
              id: `contract-${contract.id}`,
              type: hasExtensions ? 'extension' : 'contract',
              level: getAlertLevel(daysRemaining),
              title: hasExtensions ? 'Prórroga por vencer' : 'Contrato por vencer',
              description: hasExtensions 
                ? `Prórroga #${contract.contract_extensions!.length} vence en ${daysRemaining} días`
                : `Contrato a término fijo vence en ${daysRemaining} días`,
              daysRemaining,
              entityName: employeeName,
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

      // 5. Fetch incapacity alerts (pending recovery and ending soon)
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('id, employee_id, end_date, recovery_status, total_days, diagnosis')
        .eq('company_id', currentCompanyId!);

      if (incapacities) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const inc of incapacities) {
          const employee = employeeMap.get(inc.employee_id);
          if (!employee) continue;

          const endDate = new Date(inc.end_date);
          endDate.setHours(0, 0, 0, 0);
          const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          // Alert for incapacities ending soon (may need extension)
          if (daysRemaining >= 0 && daysRemaining <= 5) {
            alerts.push({
              id: `inc-ending-${inc.id}`,
              type: 'incapacity',
              level: daysRemaining <= 2 ? 'critical' : 'warning',
              title: 'Incapacidad por vencer',
              description: `Finaliza en ${daysRemaining} día(s) - ${inc.diagnosis?.substring(0, 30)}...`,
              daysRemaining,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: inc.id,
            });
          }

          // Alert for pending recovery (incapacity ended but not filed)
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
            });
          }
        }
      }

      // 6. Fetch vacation alerts (excessive accumulation)
      const { data: vacationBalances } = await supabase
        .from('vacation_balances')
        .select('id, employee_id, days_pending, accumulation_expires')
        .eq('company_id', currentCompanyId!);

      if (vacationBalances) {
        for (const balance of vacationBalances) {
          const employee = employeeMap.get(balance.employee_id);
          if (!employee) continue;

          const pendingDays = Number(balance.days_pending);

          // Alert for excessive accumulation (>30 days)
          if (pendingDays > 30) {
            alerts.push({
              id: `vacation-${balance.id}`,
              type: 'vacation',
              level: pendingDays > 45 ? 'critical' : 'warning',
              title: 'Acumulación excesiva de vacaciones',
              description: `Tiene ${pendingDays} días de vacaciones pendientes`,
              daysRemaining: pendingDays,
              entityName: `${employee.first_name} ${employee.last_name}`,
              entityId: balance.employee_id,
            });
          }

          // Alert for expiring accumulation
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
                entityId: balance.employee_id,
              });
            }
          }
        }
      }

      // 7. Fetch low-stock inventory alerts
      const { data: inventoryItems } = await supabase
        .from('dotation_inventory')
        .select('id, item_name, item_type, size, quantity_available, minimum_stock, operation_centers(name)')
        .eq('company_id', currentCompanyId!)
        .gt('minimum_stock', 0);

      if (inventoryItems) {
        for (const item of inventoryItems) {
          if (item.quantity_available <= item.minimum_stock) {
            const isOut = item.quantity_available === 0;
            const center = (item.operation_centers as any)?.name || 'General';
            alerts.push({
              id: `inv-low-${item.id}`,
              type: 'inventory_low_stock',
              level: isOut ? 'critical' : 'warning',
              title: isOut ? 'Sin stock' : 'Stock bajo',
              description: `${item.item_name}${item.size ? ` (${item.size})` : ''} — ${item.quantity_available}/${item.minimum_stock} uds. en ${center}`,
              daysRemaining: isOut ? -1 : 0,
              entityName: item.item_name,
              entityId: item.id,
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
