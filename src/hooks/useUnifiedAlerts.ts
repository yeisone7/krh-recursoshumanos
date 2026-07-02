import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { employeeDocumentTypeLabels, type EmployeeDocumentType } from '@/types/employee';

export interface UnifiedAlert {
  id: string;
  type: 'contract' | 'extension' | 'medical' | 'dotation' | 'certification' | 'incapacity' | 'vacation' | 'cesantias' | 'inventory_low_stock' | 'dotation_renewal' | 'document' | 'labor_disconnection';
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
  status?: 'pendiente' | 'notificada' | 'cerrada';
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

type LooseDbError = { message?: string };
type LooseQueryResult<T = unknown> = PromiseLike<{ data: T | null; error: LooseDbError | null }>;
type LooseQueryBuilder = {
  select: (columns?: string) => LooseQueryBuilder;
  eq: (column: string, value: unknown) => LooseQueryBuilder;
  ilike: (column: string, value: string) => LooseQueryBuilder;
  neq: (column: string, value: unknown) => LooseQueryBuilder;
  in: (column: string, values: readonly unknown[]) => LooseQueryBuilder;
  limit: (count: number) => LooseQueryBuilder;
  maybeSingle: <T = unknown>() => LooseQueryResult<T>;
};
type LooseSupabaseClient = {
  from: (table: string) => LooseQueryBuilder;
};
type DisconnectionPolicyAlertRow = {
  id: string;
  enabled: boolean;
  policy_name: string | null;
  next_review_date: string | null;
  created_at: string | null;
};
type ComplianceObligationAlertRow = {
  id: string;
  status: string;
};
type ComplianceEvidenceAlertRow = {
  id: string;
};

export function useUnifiedAlerts() {
  const { currentCompanyId } = useAuth();
  const looseSupabase = supabase as unknown as LooseSupabaseClient;

  return useQuery({
    queryKey: ['unified-alerts', currentCompanyId],
    queryFn: async () => {
      const alerts: UnifiedAlert[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: disconnectionPolicy } = await looseSupabase
        .from('labor_disconnection_policies')
        .select('id, enabled, policy_name, next_review_date, created_at')
        .eq('company_id', currentCompanyId!)
        .maybeSingle<DisconnectionPolicyAlertRow>();

      if (disconnectionPolicy?.enabled) {
        const reviewDays = calculateDaysRemaining(disconnectionPolicy.next_review_date);
        let hasMissingEvidence = false;

        const { data: obligations, error: obligationsError } = await looseSupabase
          .from('compliance_obligations')
          .select('id, status')
          .eq('company_id', currentCompanyId!)
          .eq('domain', 'juridico_laboral')
          .ilike('title', '%desconexion laboral%')
          .neq('status', 'no_aplica') as { data: ComplianceObligationAlertRow[] | null; error: LooseDbError | null };

        if (!obligationsError) {
          const obligationIds = (obligations || []).map((item) => item.id);
          if (obligationIds.length === 0) {
            hasMissingEvidence = true;
          } else {
            const { data: evidences, error: evidencesError } = await looseSupabase
              .from('compliance_evidences')
              .select('id')
              .eq('company_id', currentCompanyId!)
              .in('obligation_id', obligationIds)
              .limit(1) as { data: ComplianceEvidenceAlertRow[] | null; error: LooseDbError | null };

            hasMissingEvidence = !evidencesError && (!evidences || evidences.length === 0);
          }
        }

        const reviewNeedsAttention = reviewDays !== null && reviewDays <= 15;
        if (reviewNeedsAttention || hasMissingEvidence) {
          const daysRemaining = reviewDays ?? 0;
          const isExpired = reviewDays !== null && reviewDays < 0;
          const title = isExpired
            ? 'Revision de desconexion laboral vencida'
            : hasMissingEvidence
              ? 'Evidencia de desconexion laboral pendiente'
              : 'Revision de desconexion laboral proxima';

          alerts.push({
            id: `labor-disconnection-${disconnectionPolicy.id}`,
            type: 'labor_disconnection',
            level: isExpired ? 'critical' : 'warning',
            title,
            description: isExpired
              ? `La politica requiere revision desde hace ${Math.abs(daysRemaining)} dias`
              : hasMissingEvidence
                ? 'Registra la obligacion y evidencia de socializacion en cumplimiento laboral'
                : `La politica requiere revision en ${daysRemaining} dias`,
            daysRemaining,
            entityName: disconnectionPolicy.policy_name || 'Politica de desconexion laboral',
            entityId: disconnectionPolicy.id,
            eventDate: disconnectionPolicy.next_review_date || '',
            createdAt: disconnectionPolicy.created_at || new Date().toISOString(),
            navigateTo: '/cumplimiento-laboral',
          });
        }
      }

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
        .eq('company_id', currentCompanyId!)
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
        .eq('company_id', currentCompanyId!)
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
        .eq('company_id', currentCompanyId!);

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
        .eq('company_id', currentCompanyId!)
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

      // 4B. Fetch employee document expiry alerts with workflow status
      const { data: documentAlerts } = await supabase
        .from('document_expiry_alerts')
        .select('id, employee_id, document_id, expires_at, status, created_at, employee_documents(document_type, document_name, file_name)')
        .eq('company_id', currentCompanyId!)
        .neq('status', 'cerrada');

      if (documentAlerts) {
        for (const docAlert of documentAlerts as any[]) {
          const employee = employeeMap.get(docAlert.employee_id);
          if (!employee) continue;

          const daysRemaining = calculateDaysRemaining(docAlert.expires_at);
          if (daysRemaining === null || daysRemaining > 30) continue;

          const isExpired = daysRemaining < 0;
          const doc = docAlert.employee_documents;
          const docType = doc?.document_type as EmployeeDocumentType | undefined;
          const docName = doc?.document_name || (docType ? employeeDocumentTypeLabels[docType] : null) || doc?.file_name || 'Documento';

          alerts.push({
            id: `document-${docAlert.id}`,
            type: 'document',
            level: isExpired ? 'critical' : getAlertLevel(daysRemaining),
            title: isExpired ? 'Documento vencido' : 'Documento por vencer',
            description: `${docName} ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRemaining)} días`,
            daysRemaining,
            entityName: `${employee.first_name} ${employee.last_name}`,
            entityId: docAlert.document_id,
            eventDate: docAlert.expires_at,
            createdAt: docAlert.created_at,
            navigateTo: `/empleados/${docAlert.employee_id}/360?tab=documents`,
            employeeId: employee.id,
            status: docAlert.status,
          });
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

      // 8. Fetch low-stock inventory alerts
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
              eventDate: '',
              createdAt: new Date().toISOString(),
              navigateTo: '/dotacion',
            });
          }
        }
      }

      // 9. Profesiograma-based renewal alerts
      // For each employee with a profesiograma, check if any required item's last delivery is expired or about to expire
      const { data: profs } = await supabase
        .from('dotation_profesiograma' as any)
        .select('id, operation_center_id, position_id')
        .eq('company_id', currentCompanyId!);

      if (profs && (profs as any[]).length > 0) {
        const profIds = (profs as any[]).map((p: any) => p.id);
        const { data: profItems } = await supabase
          .from('dotation_profesiograma_items' as any)
          .select('profesiograma_id, dotation_item_type_id, is_required, dotation_item_types(id, name)')
          .eq('company_id', currentCompanyId!);

        // Build profMap: centerId|positionId -> required item names
        const profMap = new Map<string, { itemTypeId: string; itemName: string }[]>();
        for (const p of profs as any[]) {
          const key = `${p.operation_center_id}|${p.position_id}`;
          const items = ((profItems as any[]) || [])
            .filter((i: any) => i.profesiograma_id === p.id && i.is_required !== false)
            .map((i: any) => ({ itemTypeId: i.dotation_item_type_id, itemName: i.dotation_item_types?.name || 'Artículo' }));
          profMap.set(key, items);
        }

        // Get work info for employees
        const { data: workInfos } = await supabase
          .from('employee_work_info')
          .select('employee_id, operation_center_id, position_id')
          .eq('company_id', currentCompanyId!)
          .eq('is_current', true);

        if (workInfos) {
          // Get all deliveries for date checking
          const { data: allDeliveries } = await supabase
            .from('dotation_deliveries')
            .select('employee_id, item_name, expiration_date')
            .eq('company_id', currentCompanyId!);

          const deliveryByEmpItem = new Map<string, string>(); // emp|itemName -> latest expiration
          for (const d of (allDeliveries || []) as any[]) {
            const key = `${d.employee_id}|${d.item_name}`;
            const existing = deliveryByEmpItem.get(key);
            if (!existing || d.expiration_date > existing) {
              deliveryByEmpItem.set(key, d.expiration_date);
            }
          }

          for (const wi of workInfos as any[]) {
            if (!wi.operation_center_id || !wi.position_id) continue;
            const profKey = `${wi.operation_center_id}|${wi.position_id}`;
            const requiredItems = profMap.get(profKey);
            if (!requiredItems) continue;

            const employee = employeeMap.get(wi.employee_id);
            if (!employee) continue;

            for (const item of requiredItems) {
              const lastExp = deliveryByEmpItem.get(`${wi.employee_id}|${item.itemName}`);
              if (!lastExp) {
                // Never delivered — critical alert
                alerts.push({
                  id: `renewal-${wi.employee_id}-${item.itemTypeId}`,
                  type: 'dotation_renewal',
                  level: 'critical',
                  title: 'Dotación nunca entregada',
                  description: `${item.itemName} — artículo obligatorio sin entrega registrada`,
                  daysRemaining: -999,
                  entityName: `${employee.first_name} ${employee.last_name}`,
                  entityId: wi.employee_id,
                  eventDate: '',
                  createdAt: new Date().toISOString(),
                  navigateTo: '/dotacion',
                  employeeId: employee.id,
                });
              } else {
                const daysRem = calculateDaysRemaining(lastExp);
                if (daysRem !== null && daysRem <= 30) {
                  const isExpired = daysRem < 0;
                  alerts.push({
                    id: `renewal-${wi.employee_id}-${item.itemTypeId}`,
                    type: 'dotation_renewal',
                    level: isExpired ? 'critical' : getAlertLevel(daysRem),
                    title: isExpired ? 'Renovación de dotación vencida' : 'Renovación de dotación próxima',
                    description: `${item.itemName} ${isExpired ? 'venció hace' : 'vence en'} ${Math.abs(daysRem)} días (profesiograma)`,
                    daysRemaining: daysRem,
                    entityName: `${employee.first_name} ${employee.last_name}`,
                    entityId: wi.employee_id,
                    eventDate: lastExp,
                    createdAt: new Date().toISOString(),
                    navigateTo: '/dotacion',
                    employeeId: employee.id,
                  });
                }
              }
            }
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
