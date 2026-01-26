import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInMonths, differenceInDays } from 'date-fns';

export interface EmployeeReportRow {
  documento: string;
  nombre: string;
  cargo: string;
  area: string;
  centro: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  salario: number;
  eps: string;
  afp: string;
  estado: string;
}

export interface IncapacityReportRow {
  empleado: string;
  documento: string;
  diagnostico: string;
  origen: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  estado_recobro: string;
  monto_total: number;
  monto_recuperado: number;
  pendiente: number;
}

export interface CesantiasReportRow {
  empleado: string;
  documento: string;
  año: number;
  fondo: string;
  monto_cesantias: number;
  fecha_limite: string;
  fecha_deposito: string;
  estado: string;
  intereses_pagados: string;
  monto_intereses: number;
}

export interface DotationReportRow {
  empleado: string;
  documento: string;
  centro: string;
  articulo: string;
  tipo: string;
  cantidad: number;
  talla: string;
  fecha_entrega: string;
  fecha_vencimiento: string;
  estado: string;
}

export interface ContractExtensionReportRow {
  empleado: string;
  documento: string;
  tipo_contrato: string;
  inicio_contrato: string;
  numero_prorroga: number;
  tipo_prorroga: string;
  inicio_prorroga: string;
  fin_prorroga: string;
  dias: number;
  tiempo_acumulado: string;
  limite_4_años: string;
  estado: string;
}

export function useEmployeeReport() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['report-employees', currentCompanyId],
    queryFn: async (): Promise<EmployeeReportRow[]> => {
      if (!currentCompanyId) return [];
      
      // Fetch employees with work info
      const { data: employees, error } = await supabase
        .from('employees_v2')
        .select(`
          id,
          first_name,
          last_name,
          document_number,
          is_active
        `)
        .eq('company_id', currentCompanyId);
      if (error) throw error;
      if (!employees?.length) return [];
      
      // Fetch work info for all employees
      const employeeIds = employees.map(e => e.id);
      
      const { data: workInfos } = await supabase
        .from('employee_work_info')
        .select('employee_id, position_name, hire_date')
        .in('employee_id', employeeIds)
        .eq('is_current', true);
      
      const { data: socialSecurities } = await supabase
        .from('employee_social_security')
        .select('employee_id, eps, afp')
        .in('employee_id', employeeIds)
        .eq('is_current', true);
      
      // Fetch areas
      const { data: areas } = await supabase
        .from('areas')
        .select('id, name')
        .eq('company_id', currentCompanyId);
      
      const areasMap = new Map(areas?.map(a => [a.id, a.name]) || []);
      const workInfoMap = new Map(workInfos?.map(w => [w.employee_id, w]) || []);
      const socialSecMap = new Map(socialSecurities?.map(s => [s.employee_id, s]) || []);
      
      return employees.map(emp => {
        const workInfo = workInfoMap.get(emp.id);
        const socialSec = socialSecMap.get(emp.id);
        
        return {
          documento: emp.document_number,
          nombre: `${emp.first_name} ${emp.last_name}`,
          cargo: workInfo?.position_name || '-',
          area: '-',
          centro: '-',
          fecha_ingreso: workInfo?.hire_date ? format(new Date(workInfo.hire_date), 'dd/MM/yyyy') : '-',
          tipo_contrato: '-',
          salario: 0,
          eps: socialSec?.eps || '-',
          afp: socialSec?.afp || '-',
          estado: emp.is_active ? 'Activo' : 'Inactivo',
        };
      });
    },
    enabled: !!currentCompanyId,
  });
}

export function useIncapacityReport(startDate?: Date, endDate?: Date) {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['report-incapacities', currentCompanyId, startDate, endDate],
    queryFn: async (): Promise<IncapacityReportRow[]> => {
      if (!currentCompanyId) return [];
      
      let query = supabase
        .from('employee_incapacities')
        .select(`
          *,
          employees_v2!inner(first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });
      
      if (startDate) {
        query = query.gte('start_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('end_date', format(endDate, 'yyyy-MM-dd'));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(inc => ({
        empleado: `${inc.employees_v2.first_name} ${inc.employees_v2.last_name}`,
        documento: inc.employees_v2.document_number,
        diagnostico: inc.diagnosis,
        origen: inc.origin === 'comun' ? 'Común' : inc.origin === 'laboral' ? 'Laboral' : 'Accidente',
        fecha_inicio: format(new Date(inc.start_date), 'dd/MM/yyyy'),
        fecha_fin: format(new Date(inc.end_date), 'dd/MM/yyyy'),
        dias_totales: inc.total_days,
        estado_recobro: inc.recovery_status === 'pendiente' ? 'Pendiente' : 
                        inc.recovery_status === 'radicado' ? 'Radicado' : 
                        inc.recovery_status === 'pagado' ? 'Pagado' : 'No Aplica',
        monto_total: Number(inc.total_amount) || 0,
        monto_recuperado: Number(inc.recovered_amount) || 0,
        pendiente: (Number(inc.total_amount) || 0) - (Number(inc.recovered_amount) || 0),
      }));
    },
    enabled: !!currentCompanyId,
  });
}

export function useCesantiasReport(year?: number) {
  const { currentCompanyId } = useAuth();
  const currentYear = new Date().getFullYear();
  
  return useQuery({
    queryKey: ['report-cesantias', currentCompanyId, year],
    queryFn: async (): Promise<CesantiasReportRow[]> => {
      if (!currentCompanyId) return [];
      
      // Fetch deposits
      const { data: deposits, error: depositsError } = await supabase
        .from('cesantias_deposits')
        .select(`
          *,
          employees_v2!inner(first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId)
        .eq('year', year || currentYear);
      
      if (depositsError) throw depositsError;
      
      // Fetch interest payments
      const { data: interests, error: interestsError } = await supabase
        .from('cesantias_interest_payments')
        .select('employee_id, is_paid, interest_amount')
        .eq('company_id', currentCompanyId)
        .eq('year', year || currentYear);
      
      if (interestsError) throw interestsError;
      
      const interestsMap = new Map(interests?.map(i => [i.employee_id, i]));
      
      return (deposits || []).map(dep => {
        const interest = interestsMap.get(dep.employee_id);
        
        return {
          empleado: `${dep.employees_v2.first_name} ${dep.employees_v2.last_name}`,
          documento: dep.employees_v2.document_number,
          año: dep.year,
          fondo: dep.fund_name,
          monto_cesantias: Number(dep.cesantias_amount),
          fecha_limite: format(new Date(dep.due_date), 'dd/MM/yyyy'),
          fecha_deposito: dep.deposit_date ? format(new Date(dep.deposit_date), 'dd/MM/yyyy') : 'Pendiente',
          estado: dep.status === 'depositado' ? 'Depositado' : 
                  dep.status === 'calculado' ? 'Calculado' : 
                  dep.is_late ? 'Extemporáneo' : 'Pendiente',
          intereses_pagados: interest?.is_paid ? 'Sí' : 'No',
          monto_intereses: Number(interest?.interest_amount) || 0,
        };
      });
    },
    enabled: !!currentCompanyId,
  });
}

export function useDotationReport(startDate?: Date, endDate?: Date) {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['report-dotation', currentCompanyId, startDate, endDate],
    queryFn: async (): Promise<DotationReportRow[]> => {
      if (!currentCompanyId) return [];
      
      // First get employees from this company
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number, operation_center_id')
        .eq('company_id', currentCompanyId);
      
      if (!employees?.length) return [];
      
      const employeeIds = employees.map(e => e.id);
      const employeesMap = new Map(employees.map(e => [e.id, e]));
      
      let query = supabase
        .from('dotation_deliveries')
        .select('*')
        .in('employee_id', employeeIds)
        .order('delivery_date', { ascending: false });
      
      if (startDate) {
        query = query.gte('delivery_date', format(startDate, 'yyyy-MM-dd'));
      }
      if (endDate) {
        query = query.lte('delivery_date', format(endDate, 'yyyy-MM-dd'));
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const today = new Date();
      
      return (data || []).map(dot => {
        const employee = employeesMap.get(dot.employee_id);
        const expDate = new Date(dot.expiration_date);
        const daysToExpire = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let estado = 'Vigente';
        if (daysToExpire < 0) estado = 'Vencido';
        else if (daysToExpire <= 30) estado = 'Por Vencer';
        
        return {
          empleado: employee ? `${employee.first_name} ${employee.last_name}` : '-',
          documento: employee?.document_number || '-',
          centro: employee?.operation_center_id || '-',
          articulo: dot.item_name,
          tipo: dot.item_type,
          cantidad: dot.quantity,
          talla: dot.size || '-',
          fecha_entrega: format(new Date(dot.delivery_date), 'dd/MM/yyyy'),
          fecha_vencimiento: format(expDate, 'dd/MM/yyyy'),
          estado,
        };
      });
    },
    enabled: !!currentCompanyId,
  });
}

const contractTypeLabels: Record<string, string> = {
  fijo: 'Término Fijo',
  indefinido: 'Indefinido',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
  servicios: 'Prestación de Servicios',
};

export function useContractExtensionsReport() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['report-contract-extensions', currentCompanyId],
    queryFn: async (): Promise<ContractExtensionReportRow[]> => {
      if (!currentCompanyId) return [];
      
      // Fetch employees from this company
      const { data: employees } = await supabase
        .from('employees_v2')
        .select('id, first_name, last_name, document_number')
        .eq('company_id', currentCompanyId);
      
      if (!employees?.length) return [];
      
      const employeeIds = employees.map(e => e.id);
      const employeesMap = new Map(employees.map(e => [e.id, e]));
      
      // Fetch contracts with extensions (excluding indefinite contracts)
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          employee_id,
          contract_type,
          start_date,
          end_date,
          is_terminated,
          contract_extensions(
            id,
            extension_number,
            extension_type,
            start_date,
            end_date,
            created_at
          )
        `)
        .in('employee_id', employeeIds)
        .neq('contract_type', 'indefinido');
      
      if (error) throw error;
      if (!contracts?.length) return [];
      
      const MAX_YEARS = 4;
      const MAX_MONTHS = MAX_YEARS * 12;
      const rows: ContractExtensionReportRow[] = [];
      
      for (const contract of contracts) {
        if (!contract.contract_extensions?.length) continue;
        
        const employee = employeesMap.get(contract.employee_id);
        if (!employee) continue;
        
        const contractStart = new Date(contract.start_date);
        
        // Sort extensions by number
        const sortedExtensions = [...contract.contract_extensions].sort(
          (a, b) => a.extension_number - b.extension_number
        );
        
        for (const ext of sortedExtensions) {
          const extStart = new Date(ext.start_date);
          const extEnd = new Date(ext.end_date);
          const days = differenceInDays(extEnd, extStart);
          
          // Calculate accumulated time from contract start to extension end
          const totalMonths = differenceInMonths(extEnd, contractStart);
          const years = Math.floor(totalMonths / 12);
          const months = totalMonths % 12;
          
          // Calculate remaining time before 4-year limit
          const remainingMonths = MAX_MONTHS - totalMonths;
          const remainingYears = Math.floor(Math.max(0, remainingMonths) / 12);
          const remainingMo = Math.max(0, remainingMonths) % 12;
          
          // Determine status
          let estado = 'Vigente';
          const today = new Date();
          if (contract.is_terminated) {
            estado = 'Terminado';
          } else if (extEnd < today) {
            estado = 'Vencido';
          } else if (totalMonths >= MAX_MONTHS) {
            estado = 'Límite alcanzado';
          } else if (remainingMonths <= 6) {
            estado = 'Próximo al límite';
          }
          
          rows.push({
            empleado: `${employee.first_name} ${employee.last_name}`,
            documento: employee.document_number,
            tipo_contrato: contractTypeLabels[contract.contract_type] || contract.contract_type,
            inicio_contrato: format(contractStart, 'dd/MM/yyyy'),
            numero_prorroga: ext.extension_number,
            tipo_prorroga: ext.extension_type === 'automatica' ? 'Automática' : 'Pactada',
            inicio_prorroga: format(extStart, 'dd/MM/yyyy'),
            fin_prorroga: format(extEnd, 'dd/MM/yyyy'),
            dias: days,
            tiempo_acumulado: `${years}a ${months}m`,
            limite_4_años: remainingMonths <= 0 ? 'Alcanzado' : `${remainingYears}a ${remainingMo}m restantes`,
            estado,
          });
        }
      }
      
      // Sort by employee name and extension number
      rows.sort((a, b) => {
        const nameCompare = a.empleado.localeCompare(b.empleado);
        if (nameCompare !== 0) return nameCompare;
        return a.numero_prorroga - b.numero_prorroga;
      });
      
      return rows;
    },
    enabled: !!currentCompanyId,
  });
}
