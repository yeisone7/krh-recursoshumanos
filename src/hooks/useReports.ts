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

export interface ContractsExpiringSoonRow {
  empleado: string;
  documento: string;
  cargo: string;
  centro: string;
  tipo_contrato: string;
  fecha_inicio: string;
  fecha_vencimiento: string;
  dias_restantes: number;
  prorroga_actual: number;
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

export function useContractsExpiringSoonReport(daysRange: number = 30) {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['report-contracts-expiring', currentCompanyId, daysRange],
    queryFn: async (): Promise<ContractsExpiringSoonRow[]> => {
      if (!currentCompanyId) return [];
      
      // Fetch employees from this company
      const { data: employees } = await supabase
        .from('employees_v2')
        .select('id, first_name, last_name, document_number')
        .eq('company_id', currentCompanyId)
        .eq('is_active', true);
      
      if (!employees?.length) return [];
      
      const employeeIds = employees.map(e => e.id);
      const employeesMap = new Map(employees.map(e => [e.id, e]));
      
      // Fetch work info
      const { data: workInfos } = await supabase
        .from('employee_work_info')
        .select('employee_id, position_name, operation_center_id, operation_centers(name)')
        .in('employee_id', employeeIds)
        .eq('is_current', true);
      
      const workInfoMap = new Map(workInfos?.map(w => [w.employee_id, w]) || []);
      
      // Fetch contracts with extensions (excluding indefinite)
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
            end_date
          )
        `)
        .in('employee_id', employeeIds)
        .neq('contract_type', 'indefinido')
        .eq('is_terminated', false);
      
      if (error) throw error;
      if (!contracts?.length) return [];
      
      const today = new Date();
      const rows: ContractsExpiringSoonRow[] = [];
      
      for (const contract of contracts) {
        const employee = employeesMap.get(contract.employee_id);
        if (!employee) continue;
        
        const workInfo = workInfoMap.get(contract.employee_id);
        
        // Determine effective end date (last extension or contract end date)
        let effectiveEndDate = contract.end_date ? new Date(contract.end_date) : null;
        let currentExtensionNumber = 0;
        
        if (contract.contract_extensions?.length) {
          const sortedExtensions = [...contract.contract_extensions].sort(
            (a, b) => b.extension_number - a.extension_number
          );
          effectiveEndDate = new Date(sortedExtensions[0].end_date);
          currentExtensionNumber = sortedExtensions[0].extension_number;
        }
        
        if (!effectiveEndDate) continue;
        
        // Calculate days remaining
        const daysRemaining = differenceInDays(effectiveEndDate, today);
        
        // Filter by range - only include if within the specified days range
        if (daysRemaining > daysRange || daysRemaining < 0) continue;
        
        // Determine status
        let estado = 'Vigente';
        if (daysRemaining <= 7) {
          estado = 'Crítico';
        } else if (daysRemaining <= 15) {
          estado = 'Urgente';
        } else if (daysRemaining <= 30) {
          estado = 'Por Vencer';
        }
        
        rows.push({
          empleado: `${employee.first_name} ${employee.last_name}`,
          documento: employee.document_number,
          cargo: workInfo?.position_name || '-',
          centro: (workInfo?.operation_centers as any)?.name || '-',
          tipo_contrato: contractTypeLabels[contract.contract_type] || contract.contract_type,
          fecha_inicio: format(new Date(contract.start_date), 'dd/MM/yyyy'),
          fecha_vencimiento: format(effectiveEndDate, 'dd/MM/yyyy'),
          dias_restantes: daysRemaining,
          prorroga_actual: currentExtensionNumber,
          estado,
        });
      }
      
      // Sort by days remaining (ascending - most urgent first)
      rows.sort((a, b) => a.dias_restantes - b.dias_restantes);
      
      return rows;
    },
    enabled: !!currentCompanyId,
  });
}

// ============ VACATION REPORT ============

export interface VacationReportRow {
  empleado: string;
  documento: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_habiles: number;
  estado: string;
}

export function useVacationReport(startDate?: Date, endDate?: Date) {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-vacations', currentCompanyId, startDate, endDate],
    queryFn: async (): Promise<VacationReportRow[]> => {
      if (!currentCompanyId) return [];
      let query = supabase
        .from('vacation_requests')
        .select(`*, employees_v2!inner(first_name, last_name, document_number)`)
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });
      if (startDate) query = query.gte('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) query = query.lte('start_date', format(endDate, 'yyyy-MM-dd'));
      const { data, error } = await query;
      if (error) throw error;
      const typeLabels: Record<string, string> = { disfrute: 'Disfrute', compensacion: 'Compensación' };
      const statusLabels: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado', interrumpido: 'Interrumpido' };
      return (data || []).map(v => ({
        empleado: `${v.employees_v2.first_name} ${v.employees_v2.last_name}`,
        documento: v.employees_v2.document_number,
        tipo: typeLabels[v.request_type] || v.request_type,
        fecha_inicio: format(new Date(v.start_date), 'dd/MM/yyyy'),
        fecha_fin: format(new Date(v.end_date), 'dd/MM/yyyy'),
        dias_habiles: v.business_days,
        estado: statusLabels[v.status] || v.status,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

// ============ LEAVES REPORT ============

export interface LeavesReportRow {
  empleado: string;
  documento: string;
  tipo_permiso: string;
  motivo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: string;
}

export function useLeavesReport(startDate?: Date, endDate?: Date) {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-leaves', currentCompanyId, startDate, endDate],
    queryFn: async (): Promise<LeavesReportRow[]> => {
      if (!currentCompanyId) return [];
      let query = supabase
        .from('leave_requests')
        .select(`*, employees_v2!inner(first_name, last_name, document_number)`)
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });
      if (startDate) query = query.gte('start_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) query = query.lte('start_date', format(endDate, 'yyyy-MM-dd'));
      const { data, error } = await query;
      if (error) throw error;
      const typeLabels: Record<string, string> = {
        calamidad_domestica: 'Calamidad Doméstica', cita_medica: 'Cita Médica',
        licencia_maternidad: 'Maternidad', licencia_paternidad: 'Paternidad',
        licencia_luto: 'Luto', permiso_sindical: 'Sindical',
        licencia_no_remunerada: 'No Remunerada', otro: 'Otro',
      };
      const statusLabels: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', cancelado: 'Cancelado' };
      return (data || []).map(l => ({
        empleado: `${l.employees_v2.first_name} ${l.employees_v2.last_name}`,
        documento: l.employees_v2.document_number,
        tipo_permiso: typeLabels[l.leave_type] || l.leave_type,
        motivo: l.reason || '-',
        fecha_inicio: format(new Date(l.start_date), 'dd/MM/yyyy'),
        fecha_fin: format(new Date(l.end_date), 'dd/MM/yyyy'),
        dias: l.total_days,
        estado: statusLabels[l.status] || l.status,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

// ============ OVERTIME REPORT ============

export interface OvertimeReportRow {
  empleado: string;
  documento: string;
  fecha: string;
  tipo: string;
  horas: number;
  recargo: number;
  valor: number;
  estado: string;
}

export function useOvertimeReport(startDate?: Date, endDate?: Date) {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-overtime', currentCompanyId, startDate, endDate],
    queryFn: async (): Promise<OvertimeReportRow[]> => {
      if (!currentCompanyId) return [];
      let query = supabase
        .from('overtime_records')
        .select(`*, employees_v2!inner(first_name, last_name, document_number)`)
        .eq('company_id', currentCompanyId)
        .order('work_date', { ascending: false });
      if (startDate) query = query.gte('work_date', format(startDate, 'yyyy-MM-dd'));
      if (endDate) query = query.lte('work_date', format(endDate, 'yyyy-MM-dd'));
      const { data, error } = await query;
      if (error) throw error;
      const typeLabels: Record<string, string> = {
        diurna: 'Diurna', nocturna: 'Nocturna',
        dominical_diurna: 'Dominical Diurna', dominical_nocturna: 'Dominical Nocturna',
        festiva_diurna: 'Festiva Diurna', festiva_nocturna: 'Festiva Nocturna',
      };
      const statusLabels: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado' };
      return (data || []).map(o => ({
        empleado: `${o.employees_v2.first_name} ${o.employees_v2.last_name}`,
        documento: o.employees_v2.document_number,
        fecha: format(new Date(o.work_date), 'dd/MM/yyyy'),
        tipo: typeLabels[o.overtime_type] || o.overtime_type,
        horas: o.total_hours,
        recargo: o.surcharge_percentage,
        valor: Number(o.total_value) || 0,
        estado: statusLabels[o.status] || o.status,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

// ============ TRAINING REPORT ============

export interface TrainingReportRow {
  curso: string;
  codigo: string;
  instructor: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion: string;
  cupo_max: number;
  estado: string;
}

export function useTrainingReport() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-training', currentCompanyId],
    queryFn: async (): Promise<TrainingReportRow[]> => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`*, course:training_courses(name)`)
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      const statusLabels: Record<string, string> = { programado: 'Programado', en_curso: 'En Curso', completado: 'Completado', cancelado: 'Cancelado' };
      return (data || []).map(t => ({
        curso: (t.course as any)?.name || '-',
        codigo: t.session_code || '-',
        instructor: t.instructor_name || '-',
        fecha_inicio: format(new Date(t.start_date), 'dd/MM/yyyy'),
        fecha_fin: format(new Date(t.end_date), 'dd/MM/yyyy'),
        ubicacion: t.location || '-',
        cupo_max: t.max_participants || 0,
        estado: statusLabels[t.status] || t.status,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

// ============ DISCIPLINARY REPORT ============

export interface DisciplinaryReportRow {
  caso: string;
  empleado: string;
  documento: string;
  tipo_falta: string;
  fecha_falta: string;
  fecha_apertura: string;
  sancion: string;
  dias_sancion: number;
  estado: string;
}

export function useDisciplinaryReport() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-disciplinary', currentCompanyId],
    queryFn: async (): Promise<DisciplinaryReportRow[]> => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('disciplinary_processes')
        .select(`*, employees_v2!inner(first_name, last_name, document_number)`)
        .eq('company_id', currentCompanyId)
        .order('opening_date', { ascending: false });
      if (error) throw error;
      const faultLabels: Record<string, string> = { leve: 'Leve', grave: 'Grave', gravisima: 'Gravísima' };
      const sanctionLabels: Record<string, string> = { amonestacion_verbal: 'Amonestación Verbal', amonestacion_escrita: 'Amonestación Escrita', suspension: 'Suspensión', terminacion: 'Terminación', absuelto: 'Absuelto' };
      const statusLabels: Record<string, string> = { apertura: 'Apertura', notificado: 'Notificado', descargos: 'Descargos', investigacion: 'Investigación', decision: 'Decisión', apelacion: 'Apelación', cerrado: 'Cerrado' };
      return (data || []).map(d => ({
        caso: d.case_number,
        empleado: `${d.employees_v2.first_name} ${d.employees_v2.last_name}`,
        documento: d.employees_v2.document_number,
        tipo_falta: faultLabels[d.fault_type] || d.fault_type,
        fecha_falta: format(new Date(d.fault_date), 'dd/MM/yyyy'),
        fecha_apertura: format(new Date(d.opening_date), 'dd/MM/yyyy'),
        sancion: d.sanction_type ? (sanctionLabels[d.sanction_type] || d.sanction_type) : 'Pendiente',
        dias_sancion: d.sanction_days || 0,
        estado: statusLabels[d.status] || d.status,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

// ============ MEDICAL EXAMS REPORT ============

export interface MedicalExamsReportRow {
  empleado: string;
  documento: string;
  tipo_examen: string;
  fecha_examen: string;
  proveedor: string;
  medico: string;
  concepto: string;
  resultado: string;
  vencimiento: string;
  estado: string;
}

export function useMedicalExamsReport() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['report-medical-exams', currentCompanyId],
    queryFn: async (): Promise<MedicalExamsReportRow[]> => {
      if (!currentCompanyId) return [];
      // medical_exams references old employees table, need to get company employees first
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, document_number')
        .eq('company_id', currentCompanyId);
      if (!employees?.length) return [];
      const empIds = employees.map(e => e.id);
      const empMap = new Map(employees.map(e => [e.id, e]));
      const { data, error } = await supabase
        .from('medical_exams')
        .select('*')
        .in('employee_id', empIds)
        .order('exam_date', { ascending: false });
      if (error) throw error;
      const typeLabels: Record<string, string> = { ingreso: 'Ingreso', periodico: 'Periódico', retiro: 'Retiro', reintegro: 'Reintegro', post_incapacidad: 'Post Incapacidad' };
      const resultLabels: Record<string, string> = { apto: 'Apto', apto_con_restricciones: 'Apto con Restricciones', no_apto: 'No Apto' };
      const today = new Date();
      return (data || []).map(e => {
        const emp = empMap.get(e.employee_id);
        let estado = 'Vigente';
        if (e.expiration_date) {
          const exp = new Date(e.expiration_date);
          const daysToExp = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysToExp < 0) estado = 'Vencido';
          else if (daysToExp <= 30) estado = 'Por Vencer';
        }
        return {
          empleado: emp ? `${emp.first_name} ${emp.last_name}` : '-',
          documento: emp?.document_number || '-',
          tipo_examen: typeLabels[e.exam_type] || e.exam_type,
          fecha_examen: format(new Date(e.exam_date), 'dd/MM/yyyy'),
          proveedor: e.provider,
          medico: e.doctor_name,
          concepto: e.concept,
          resultado: resultLabels[e.result] || e.result,
          vencimiento: e.expiration_date ? format(new Date(e.expiration_date), 'dd/MM/yyyy') : 'N/A',
          estado,
        };
      });
    },
    enabled: !!currentCompanyId,
  });
}

// ─── Selection Process Report ───

export interface SelectionProcessReportRow {
  vacante: string;
  candidato: string;
  documento: string;
  estado_candidato: string;
  prefiltro: string;
  entrevista_seleccion: string;
  entrevista_jefe: string;
  validacion_antecedentes: string;
  pruebas_psicotecnicas: string;
  pruebas_conocimiento: string;
  validacion_academica: string;
  validacion_referencias: string;
  examenes_medicos: string;
  etapas_aprobadas: string;
}

const stepStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  scheduled: 'Programado',
  passed: 'Aprobado',
  failed: 'No Aprobado',
  not_applicable: 'No Aplica',
  skipped: 'Omitido',
  completed: 'Completado',
};

const candidateStatusLabel: Record<string, string> = {
  applied: 'Postulado',
  in_interview: 'En Entrevista',
  in_psycho_test: 'Prueba Psicotécnica',
  in_technical_test: 'Prueba Técnica',
  in_validation: 'En Validación',
  in_medical: 'Examen Médico',
  selected: 'Seleccionado',
  not_selected: 'No Seleccionado',
  withdrawn: 'Retirado',
  hired: 'Contratado',
};

const ALL_STEP_TYPES = [
  'prefiltro',
  'entrevista_seleccion',
  'entrevista_jefe',
  'validacion_antecedentes',
  'pruebas_psicotecnicas',
  'pruebas_conocimiento',
  'validacion_academica',
  'validacion_referencias',
  'examenes_medicos',
] as const;

export function useSelectionProcessReport() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['report', 'selection_process', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          id, first_name, last_name, document_type, document_number, status,
          vacancies!inner(position_title, company_id),
          selection_steps(step_type, status, score)
        `)
        .eq('vacancies.company_id', currentCompanyId!)
        .order('application_date', { ascending: false });

      if (error) throw error;

      return (data || []).map((c: any) => {
        const steps = (c.selection_steps || []) as { step_type: string; status: string; score: number | null }[];
        const stepMap: Record<string, string> = {};
        for (const s of steps) {
          let label = stepStatusLabel[s.status] || s.status;
          if (s.step_type === 'pruebas_conocimiento' && s.score != null) {
            label += ` (${s.score}%)`;
          }
          if (s.step_type === 'examenes_medicos' && s.status === 'passed') {
            label = 'Apto';
          } else if (s.step_type === 'examenes_medicos' && s.status === 'failed') {
            label = 'No Apto';
          }
          stepMap[s.step_type] = label;
        }

        const approved = steps.filter(s => s.status === 'passed' || s.status === 'not_applicable').length;

        const row: SelectionProcessReportRow = {
          vacante: c.vacancies?.position_title || '',
          candidato: `${c.first_name} ${c.last_name}`,
          documento: `${c.document_type}-${c.document_number}`,
          estado_candidato: candidateStatusLabel[c.status] || c.status,
          prefiltro: stepMap['prefiltro'] || 'Sin registrar',
          entrevista_seleccion: stepMap['entrevista_seleccion'] || 'Sin registrar',
          entrevista_jefe: stepMap['entrevista_jefe'] || 'Sin registrar',
          validacion_antecedentes: stepMap['validacion_antecedentes'] || 'Sin registrar',
          pruebas_psicotecnicas: stepMap['pruebas_psicotecnicas'] || 'Sin registrar',
          pruebas_conocimiento: stepMap['pruebas_conocimiento'] || 'Sin registrar',
          validacion_academica: stepMap['validacion_academica'] || 'Sin registrar',
          validacion_referencias: stepMap['validacion_referencias'] || 'Sin registrar',
          examenes_medicos: stepMap['examenes_medicos'] || 'Sin registrar',
          etapas_aprobadas: `${approved} / ${ALL_STEP_TYPES.length}`,
        };
        return row;
      });
    },
    enabled: !!currentCompanyId,
  });
}
