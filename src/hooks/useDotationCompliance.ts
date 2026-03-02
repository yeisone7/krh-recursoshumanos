import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmployeeComplianceItem {
  itemTypeId: string;
  itemName: string;
  requiredQty: number;
  deliveredQty: number;
  isRequired: boolean;
  isMissing: boolean;
}

export interface EmployeeCompliance {
  employeeId: string;
  employeeName: string;
  centerId: string;
  centerName: string;
  positionId: string;
  positionName: string;
  totalRequired: number;
  totalDelivered: number;
  missingRequired: number;
  percentage: number;
  items: EmployeeComplianceItem[];
}

export interface CenterCompliance {
  centerId: string;
  centerName: string;
  totalEmployees: number;
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  percentage: number;
  employees: EmployeeCompliance[];
}

export function useDotationCompliance() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_compliance', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // 1. Get all profesiogramas with items
      const { data: profs } = await supabase
        .from('dotation_profesiograma' as any)
        .select('id, operation_center_id, position_id')
        .eq('company_id', currentCompanyId);

      if (!profs || profs.length === 0) return [];

      const profIds = (profs as any[]).map((p: any) => p.id);

      const { data: profItems } = await supabase
        .from('dotation_profesiograma_items' as any)
        .select('profesiograma_id, dotation_item_type_id, quantity, is_required, dotation_item_types(id, name)')
        .in('profesiograma_id', profIds);

      // Build profesiograma map: centerId|positionId -> items[]
      const profMap = new Map<string, { itemTypeId: string; itemName: string; quantity: number; isRequired: boolean }[]>();
      for (const p of profs as any[]) {
        const key = `${p.operation_center_id}|${p.position_id}`;
        const items = ((profItems as any[]) || [])
          .filter((i: any) => i.profesiograma_id === p.id)
          .map((i: any) => ({
            itemTypeId: i.dotation_item_type_id,
            itemName: i.dotation_item_types?.name || 'Artículo',
            quantity: i.quantity,
            isRequired: i.is_required !== false,
          }));
        profMap.set(key, items);
      }

      // 2. Get active employees with work info
      const { data: employees } = await supabase
        .from('employee_work_info')
        .select('employee_id, operation_center_id, position_id, employees_v2!inner(id, first_name, last_name, company_id, is_active)')
        .eq('is_current', true)
        .eq('employees_v2.company_id', currentCompanyId)
        .eq('employees_v2.is_active', true);

      if (!employees || employees.length === 0) return [];

      // Filter employees that have a profesiograma
      const relevantEmployees = (employees as any[]).filter(e =>
        e.operation_center_id && e.position_id &&
        profMap.has(`${e.operation_center_id}|${e.position_id}`)
      );

      if (relevantEmployees.length === 0) return [];

      // 3. Get all active deliveries for these employees
      const empIds = relevantEmployees.map(e => e.employee_id);
      const { data: deliveries } = await supabase
        .from('dotation_deliveries')
        .select('employee_id, dotation_item_type_id')
        .in('employee_id', empIds);

      // Count deliveries per employee per item type
      const deliveryMap = new Map<string, number>();
      for (const d of (deliveries || []) as any[]) {
        if (!d.dotation_item_type_id) continue;
        const key = `${d.employee_id}|${d.dotation_item_type_id}`;
        deliveryMap.set(key, (deliveryMap.get(key) || 0) + 1);
      }

      // 4. Get center and position names
      const centerIds = [...new Set(relevantEmployees.map(e => e.operation_center_id))];
      const positionIds = [...new Set(relevantEmployees.map(e => e.position_id))];

      const [{ data: centers }, { data: positions }] = await Promise.all([
        supabase.from('operation_centers').select('id, name').in('id', centerIds),
        supabase.from('positions').select('id, name').in('id', positionIds),
      ]);

      const centerNameMap = new Map((centers || []).map(c => [c.id, c.name]));
      const positionNameMap = new Map((positions || []).map(p => [p.id, p.name]));

      // 5. Build compliance per employee
      const employeeCompliances: EmployeeCompliance[] = relevantEmployees.map(emp => {
        const key = `${emp.operation_center_id}|${emp.position_id}`;
        const profItems = profMap.get(key) || [];
        const requiredItems = profItems.filter(i => i.isRequired);

        const items: EmployeeComplianceItem[] = profItems.map(item => {
          const delivered = deliveryMap.get(`${emp.employee_id}|${item.itemTypeId}`) || 0;
          return {
            itemTypeId: item.itemTypeId,
            itemName: item.itemName,
            requiredQty: item.quantity,
            deliveredQty: delivered,
            isRequired: item.isRequired,
            isMissing: item.isRequired && delivered < item.quantity,
          };
        });

        const totalRequired = requiredItems.length;
        const missingRequired = items.filter(i => i.isMissing).length;
        const totalDelivered = totalRequired - missingRequired;
        const percentage = totalRequired > 0 ? Math.round((totalDelivered / totalRequired) * 100) : 100;

        return {
          employeeId: emp.employee_id,
          employeeName: `${emp.employees_v2.first_name} ${emp.employees_v2.last_name}`,
          centerId: emp.operation_center_id,
          centerName: centerNameMap.get(emp.operation_center_id) || 'Desconocido',
          positionId: emp.position_id,
          positionName: positionNameMap.get(emp.position_id) || 'Desconocido',
          totalRequired,
          totalDelivered,
          missingRequired,
          percentage,
          items,
        };
      });

      // 6. Group by center
      const byCenterMap = new Map<string, CenterCompliance>();
      for (const ec of employeeCompliances) {
        if (!byCenterMap.has(ec.centerId)) {
          byCenterMap.set(ec.centerId, {
            centerId: ec.centerId,
            centerName: ec.centerName,
            totalEmployees: 0,
            fullyCompliant: 0,
            partiallyCompliant: 0,
            nonCompliant: 0,
            percentage: 0,
            employees: [],
          });
        }
        const center = byCenterMap.get(ec.centerId)!;
        center.totalEmployees++;
        center.employees.push(ec);

        if (ec.percentage === 100) center.fullyCompliant++;
        else if (ec.percentage > 0) center.partiallyCompliant++;
        else center.nonCompliant++;
      }

      // Calculate center-level percentage
      const result: CenterCompliance[] = [];
      for (const center of byCenterMap.values()) {
        center.percentage = center.totalEmployees > 0
          ? Math.round((center.fullyCompliant / center.totalEmployees) * 100)
          : 0;
        center.employees.sort((a, b) => a.percentage - b.percentage);
        result.push(center);
      }

      return result.sort((a, b) => a.centerName.localeCompare(b.centerName));
    },
    enabled: !!currentCompanyId,
  });
}

/** Returns flat list of employees with missing required items (for alerts) */
export function useDotationComplianceAlerts() {
  const { data: compliance } = useDotationCompliance();

  const alerts = (compliance || []).flatMap(center =>
    center.employees
      .filter(emp => emp.missingRequired > 0)
      .map(emp => ({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        centerName: emp.centerName,
        positionName: emp.positionName,
        missingItems: emp.items.filter(i => i.isMissing).map(i => i.itemName),
        missingCount: emp.missingRequired,
        totalRequired: emp.totalRequired,
      }))
  );

  return alerts;
}
