import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertType = 
  | 'contract' 
  | 'extension' 
  | 'medical' 
  | 'dotation' 
  | 'certification' 
  | 'incapacity' 
  | 'vacation' 
  | 'cesantias'
  | 'document';

export interface Employee360Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  description: string;
  daysRemaining: number;
  eventDate: string;
  actionLabel?: string;
  navigateTo?: string;
}

function calculateDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    return differenceInDays(date, new Date());
  } catch {
    return null;
  }
}

function getAlertLevel(daysRemaining: number): AlertLevel {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}

export function useEmployee360Alerts(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_360_alerts', employeeId],
    queryFn: async (): Promise<Employee360Alert[]> => {
      if (!employeeId) return [];

      const alerts: Employee360Alert[] = [];

      // Fetch all data in parallel
      const [
        contractsRes,
        examsRes,
        dotationsRes,
        certificationsRes,
        incapacitiesRes,
        vacationBalancesRes,
        documentsRes,
      ] = await Promise.all([
        // Contracts & Extensions
        supabase
          .from('contracts')
          .select('id, end_date, contract_type, is_terminated, contract_extensions(id, end_date, extension_number)')
          .eq('employee_id', employeeId)
          .eq('is_terminated', false)
          .neq('contract_type', 'indefinido'),
        
        // Medical Exams
        supabase
          .from('medical_exams')
          .select('id, exam_type, expiration_date')
          .eq('employee_id', employeeId)
          .not('expiration_date', 'is', null)
          .neq('exam_type', 'egreso'),
        
        // Dotation
        supabase
          .from('dotation_deliveries')
          .select('id, item_name, expiration_date')
          .eq('employee_id', employeeId),
        
        // Certifications
        supabase
          .from('employee_certifications')
          .select('id, certification_type, certification_name, expiry_date, license_category')
          .eq('employee_id', employeeId)
          .eq('is_valid', true)
          .not('expiry_date', 'is', null),
        
        // Incapacities
        supabase
          .from('employee_incapacities')
          .select('id, end_date, diagnosis, recovery_status, total_amount, recovered_amount')
          .eq('employee_id', employeeId),
        
        // Vacation Balances
        supabase
          .from('vacation_balances')
          .select('id, year, days_pending, expiration_date')
          .eq('employee_id', employeeId) as any,
        
        // Documents with expiry
        supabase
          .from('employee_documents')
          .select('id, document_type, document_name, expiry_date')
          .eq('employee_id', employeeId)
          .eq('is_valid', true)
          .not('expiry_date', 'is', null),
      ]);

      // Process Contracts
      if (contractsRes.data) {
        for (const contract of contractsRes.data) {
          let currentEndDate = contract.end_date;
          const extensions = contract.contract_extensions as any[] | null;
          
          if (extensions && extensions.length > 0) {
            const latestExtension = extensions.reduce((latest: any, current: any) =>
              current.extension_number > latest.extension_number ? current : latest
            );
            currentEndDate = latestExtension.end_date;
          }

          const daysRemaining = calculateDaysRemaining(currentEndDate);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 60) {
            const hasExtensions = extensions && extensions.length > 0;
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
                : `Vence el ${format(parseISO(currentEndDate!), "d 'de' MMMM", { locale: es })}`,
              daysRemaining,
              eventDate: currentEndDate || '',
              actionLabel: 'Ver contrato',
              navigateTo: '/contratos',
            });
          }
        }
      }

      // Process Medical Exams
      if (examsRes.data) {
        const examTypeLabels: Record<string, string> = {
          ingreso: 'Examen de ingreso',
          periodico: 'Examen periódico',
          reintegro: 'Examen de reintegro',
        };

        for (const exam of examsRes.data) {
          const daysRemaining = calculateDaysRemaining(exam.expiration_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 60) {
            const isExpired = daysRemaining < 0;

            alerts.push({
              id: `exam-${exam.id}`,
              type: 'medical',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Examen médico vencido' : 'Examen médico por vencer',
              description: `${examTypeLabels[exam.exam_type] || exam.exam_type} - ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              eventDate: exam.expiration_date || '',
              actionLabel: 'Ver examen',
              navigateTo: '/examenes',
            });
          }
        }
      }

      // Process Dotation
      if (dotationsRes.data) {
        for (const dotation of dotationsRes.data) {
          const daysRemaining = calculateDaysRemaining(dotation.expiration_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 60) {
            const isExpired = daysRemaining < 0;

            alerts.push({
              id: `dotation-${dotation.id}`,
              type: 'dotation',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Dotación vencida' : 'Dotación por vencer',
              description: `${dotation.item_name} - ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              eventDate: dotation.expiration_date,
              actionLabel: 'Ver dotación',
              navigateTo: '/dotacion',
            });
          }
        }
      }

      // Process Certifications
      if (certificationsRes.data) {
        const certTypeLabels: Record<string, string> = {
          licencia_conduccion: 'Licencia de conducción',
          trabajo_alturas: 'Trabajo en alturas',
          manipulacion_alimentos: 'Manipulación de alimentos',
          montacargas: 'Operación de montacargas',
          otro: 'Certificación',
        };

        for (const cert of certificationsRes.data) {
          const daysRemaining = calculateDaysRemaining(cert.expiry_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 60) {
            const isExpired = daysRemaining < 0;
            const label = certTypeLabels[cert.certification_type] || cert.certification_name || 'Certificación';

            alerts.push({
              id: `cert-${cert.id}`,
              type: 'certification',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Certificación vencida' : 'Certificación por vencer',
              description: `${label}${cert.license_category ? ` (${cert.license_category})` : ''} - ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              eventDate: cert.expiry_date || '',
              actionLabel: 'Ver certificaciones',
            });
          }
        }
      }

      // Process Incapacities - ending soon or pending recovery
      if (incapacitiesRes.data) {
        for (const inc of incapacitiesRes.data) {
          // Incapacity ending soon
          const daysRemaining = calculateDaysRemaining(inc.end_date);
          if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 5) {
            alerts.push({
              id: `inc-end-${inc.id}`,
              type: 'incapacity',
              level: daysRemaining <= 2 ? 'warning' : 'info',
              title: 'Incapacidad próxima a terminar',
              description: `${inc.diagnosis.substring(0, 40)}... - Termina en ${daysRemaining} días`,
              daysRemaining,
              eventDate: inc.end_date,
              actionLabel: 'Ver incapacidad',
              navigateTo: '/incapacidades',
            });
          }

          // Pending recovery (recobro)
          if (inc.recovery_status === 'pendiente' && inc.total_amount > 0) {
            const pendingAmount = inc.total_amount - (inc.recovered_amount || 0);
            if (pendingAmount > 0) {
              alerts.push({
                id: `inc-recovery-${inc.id}`,
                type: 'incapacity',
                level: 'warning',
                title: 'Recobro pendiente',
                description: `$${pendingAmount.toLocaleString()} por recuperar`,
                daysRemaining: 0,
                eventDate: inc.end_date,
                actionLabel: 'Gestionar recobro',
                navigateTo: '/incapacidades',
              });
            }
          }
        }
      }

      // Process Vacation Balances
      if (vacationBalancesRes.data) {
        for (const balance of vacationBalancesRes.data as any[]) {
          // Excessive accumulation
          if (balance.days_pending > 30) {
            alerts.push({
              id: `vac-accum-${balance.id}`,
              type: 'vacation',
              level: balance.days_pending > 45 ? 'critical' : 'warning',
              title: 'Acumulación excesiva de vacaciones',
              description: `${balance.days_pending} días pendientes del período ${balance.year}`,
              daysRemaining: 0,
              eventDate: '',
              actionLabel: 'Programar vacaciones',
              navigateTo: '/vacaciones',
            });
          }

          // Expiring vacation period
          if (balance.expiration_date) {
            const daysRemaining = calculateDaysRemaining(balance.expiration_date);
            if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 60 && balance.days_pending > 0) {
              alerts.push({
                id: `vac-exp-${balance.id}`,
                type: 'vacation',
                level: daysRemaining <= 30 ? 'critical' : 'warning',
                title: 'Vacaciones por vencer',
                description: `${balance.days_pending} días del ${balance.year} vencen en ${daysRemaining} días`,
                daysRemaining,
                eventDate: balance.expiration_date,
                actionLabel: 'Programar vacaciones',
                navigateTo: '/vacaciones',
              });
            }
          }
        }
      }

      // Process Documents with expiry
      if (documentsRes.data) {
        const docTypeLabels: Record<string, string> = {
          cedula: 'Cédula',
          libreta_militar: 'Libreta militar',
          pasaporte: 'Pasaporte',
          visa: 'Visa',
          permiso_trabajo: 'Permiso de trabajo',
        };

        for (const doc of documentsRes.data) {
          const daysRemaining = calculateDaysRemaining(doc.expiry_date);
          if (daysRemaining !== null && daysRemaining >= -30 && daysRemaining <= 60) {
            const isExpired = daysRemaining < 0;
            const label = docTypeLabels[doc.document_type] || doc.document_name || 'Documento';

            alerts.push({
              id: `doc-${doc.id}`,
              type: 'document',
              level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
              title: isExpired ? 'Documento vencido' : 'Documento por vencer',
              description: `${label} - ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
              daysRemaining,
              eventDate: doc.expiry_date || '',
              actionLabel: 'Ver documentos',
            });
          }
        }
      }

      // Sort alerts: critical first, then by days remaining
      return alerts.sort((a, b) => {
        const levelOrder = { critical: 0, warning: 1, info: 2 };
        if (levelOrder[a.level] !== levelOrder[b.level]) {
          return levelOrder[a.level] - levelOrder[b.level];
        }
        return a.daysRemaining - b.daysRemaining;
      });
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
