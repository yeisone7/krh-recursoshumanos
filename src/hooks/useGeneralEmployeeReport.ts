import { useQuery } from '@tanstack/react-query';
import { differenceInYears, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { fetchAllAnalyticsRows } from '@/lib/employeeAnalyticsData';
import type { GeneralEmployeeReportRow } from '@/lib/generalEmployeeReport';
import {
  accountTypeLabels,
  certificationTypeLabels,
  employeeDocumentTypeLabels,
  familyRelationshipLabels,
  genderLabels,
  linkTypeLabels,
  maritalStatusLabels,
  payrollTypeLabels,
  riskLevelLabels,
  vaccineTypeLabels,
} from '@/types/employee';

type Tables = Database['public']['Tables'];
type Employee = Tables['employees_v2']['Row'];
type EmploymentCycle = Tables['employee_employment_cycles']['Row'];
type Contact = Tables['employee_contact']['Row'];
type Family = Tables['employee_family']['Row'];
type FamilyMember = Tables['employee_family_members']['Row'];
type WorkInfo = Tables['employee_work_info']['Row'];
type SocialSecurity = Tables['employee_social_security']['Row'];
type BankInfo = Tables['employee_bank_info']['Row'];
type Schedule = Tables['employee_schedule']['Row'];
type TimeConfig = Tables['employee_time_config']['Row'];
type CenterAssignment = Tables['employee_operation_center_assignments']['Row'];
type Contract = Tables['contracts']['Row'];
type EmployeeDocument = Tables['employee_documents']['Row'];
type Certification = Tables['employee_certifications']['Row'];
type Vaccination = Tables['employee_vaccinations']['Row'];

type EmployeeRelated = {
  employee_id: string;
  employment_cycle_id?: string | null;
  is_current?: boolean | null;
  is_active?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
  valid_from?: string | null;
  start_date?: string | null;
};

function groupByEmployee<T extends { employee_id: string }>(rows: T[]): Map<string, T[]> {
  return rows.reduce((map, row) => {
    const group = map.get(row.employee_id) || [];
    group.push(row);
    map.set(row.employee_id, group);
    return map;
  }, new Map<string, T[]>());
}

function getCycleRows<T extends EmployeeRelated>(rows: T[], cycleId?: string | null): T[] {
  if (!rows.length) return [];
  if (cycleId) {
    const cycleRows = rows.filter((row) => row.employment_cycle_id === cycleId);
    if (cycleRows.length) return cycleRows;
  }
  const legacyRows = rows.filter((row) => !row.employment_cycle_id);
  return legacyRows.length ? legacyRows : rows;
}

function pickCurrent<T extends EmployeeRelated>(rows: T[], cycleId?: string | null): T | undefined {
  const cycleRows = getCycleRows(rows, cycleId);
  const currentRows = cycleRows.filter((row) => row.is_current === true || row.is_active === true);
  const candidates = currentRows.length ? currentRows : cycleRows;

  return [...candidates].sort((left, right) => {
    const leftDate = left.updated_at || left.valid_from || left.start_date || left.created_at || '';
    const rightDate = right.updated_at || right.valid_from || right.start_date || right.created_at || '';
    return rightDate.localeCompare(leftDate);
  })[0];
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'dd/MM/yyyy', { locale: es });
}

function yesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return value ? 'Sí' : 'No';
}

function text(value: string | number | null | undefined): string | number {
  return value === null || value === undefined || value === '' ? '-' : value;
}

function enumLabel<T extends string>(labels: Partial<Record<T, string>>, value: T | null | undefined): string {
  return value ? labels[value] || value : '-';
}

function getFullName(employee: Employee): string {
  return [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name]
    .filter(Boolean)
    .join(' ');
}

function getAge(birthDate: string | null): number | string {
  if (!birthDate) return '-';
  const date = new Date(`${birthDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : differenceInYears(new Date(), date);
}

function statusLabel(employee: Employee): string {
  if (employee.status === 'en_retiro') return 'En retiro';
  if (employee.status === 'retired') return 'Retirado';
  if (employee.status === 'suspended') return 'Suspendido';
  return employee.is_active ? 'Activo' : 'Inactivo';
}

function joinDetails(values: Array<string | null | undefined>): string {
  const cleanValues = values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return cleanValues.length ? cleanValues.join('; ') : '-';
}

export function useGeneralEmployeeReport() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['report-general-employees', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async (): Promise<GeneralEmployeeReportRow[]> => {
      if (!currentCompanyId) return [];

      const companyId = currentCompanyId;
      const [
        employees,
        cycles,
        contacts,
        families,
        familyMembers,
        workInfos,
        socialSecurities,
        bankInfos,
        schedules,
        timeConfigs,
        centerAssignments,
        contracts,
        documents,
        certifications,
        vaccinations,
        centersResult,
        areasResult,
        positionsResult,
        identificationTypesResult,
        professionsResult,
        educationLevelsResult,
        workSchedulesResult,
        shiftCyclesResult,
      ] = await Promise.all([
        fetchAllAnalyticsRows((from, to) => supabase.from('employees_v2').select('*').eq('company_id', companyId).order('id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_employment_cycles').select('*').eq('company_id', companyId).order('employee_id').order('start_date', { ascending: false }).range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_contact').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_family').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_family_members').select('*').eq('company_id', companyId).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_work_info').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_social_security').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_bank_info').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_schedule').select('*').eq('company_id', companyId).eq('is_current', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_time_config').select('*').eq('company_id', companyId).eq('is_active', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_operation_center_assignments').select('*').eq('company_id', companyId).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('contracts').select('*').eq('company_id', companyId).order('employee_id').order('start_date', { ascending: false }).range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_documents').select('*').eq('company_id', companyId).eq('is_valid', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_certifications').select('*').eq('company_id', companyId).eq('is_valid', true).order('employee_id').range(from, to)),
        fetchAllAnalyticsRows((from, to) => supabase.from('employee_vaccinations').select('*').eq('company_id', companyId).order('employee_id').range(from, to)),
        supabase.from('operation_centers').select('id, name').eq('company_id', companyId),
        supabase.from('areas').select('id, name').eq('company_id', companyId),
        supabase.from('positions').select('id, name').eq('company_id', companyId),
        supabase.from('identification_types').select('id, name, code').eq('company_id', companyId),
        supabase.from('professions').select('id, name').eq('company_id', companyId),
        supabase.from('education_levels').select('id, name').eq('company_id', companyId),
        supabase.from('work_schedules').select('id, name').eq('company_id', companyId),
        supabase.from('shift_cycles').select('id, name, code').eq('company_id', companyId),
      ]);

      const catalogResults = [
        centersResult,
        areasResult,
        positionsResult,
        identificationTypesResult,
        professionsResult,
        educationLevelsResult,
        workSchedulesResult,
        shiftCyclesResult,
      ];
      const catalogError = catalogResults.find((result) => result.error)?.error;
      if (catalogError) throw catalogError;

      const cyclesMap = groupByEmployee(cycles as EmploymentCycle[]);
      const contactsMap = groupByEmployee(contacts as Contact[]);
      const familiesMap = groupByEmployee(families as Family[]);
      const familyMembersMap = groupByEmployee(familyMembers as FamilyMember[]);
      const workInfoMap = groupByEmployee(workInfos as WorkInfo[]);
      const socialSecurityMap = groupByEmployee(socialSecurities as SocialSecurity[]);
      const bankInfoMap = groupByEmployee(bankInfos as BankInfo[]);
      const scheduleMap = groupByEmployee(schedules as Schedule[]);
      const timeConfigMap = groupByEmployee(timeConfigs as TimeConfig[]);
      const assignmentMap = groupByEmployee(centerAssignments as CenterAssignment[]);
      const contractMap = groupByEmployee(contracts as Contract[]);
      const documentMap = groupByEmployee(documents as EmployeeDocument[]);
      const certificationMap = groupByEmployee(certifications as Certification[]);
      const vaccinationMap = groupByEmployee(vaccinations as Vaccination[]);

      const centers = new Map((centersResult.data || []).map((item) => [item.id, item.name]));
      const areas = new Map((areasResult.data || []).map((item) => [item.id, item.name]));
      const positions = new Map((positionsResult.data || []).map((item) => [item.id, item.name]));
      const identificationTypes = new Map((identificationTypesResult.data || []).map((item) => [item.id, item.name || item.code]));
      const professions = new Map((professionsResult.data || []).map((item) => [item.id, item.name]));
      const educationLevels = new Map((educationLevelsResult.data || []).map((item) => [item.id, item.name]));
      const workSchedules = new Map((workSchedulesResult.data || []).map((item) => [item.id, item.name]));
      const shiftCycles = new Map((shiftCyclesResult.data || []).map((item) => [item.id, `${item.name}${item.code ? ` (${item.code})` : ''}`]));

      return (employees as Employee[]).map((employee) => {
        const employeeCycles = cyclesMap.get(employee.id) || [];
        const activeCycle = employeeCycles.find((cycle) => cycle.status === 'active')
          || [...employeeCycles].sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
        const cycleId = activeCycle?.id;
        const contact = pickCurrent(contactsMap.get(employee.id) || [], cycleId);
        const family = pickCurrent(familiesMap.get(employee.id) || [], cycleId);
        const work = pickCurrent(workInfoMap.get(employee.id) || [], cycleId);
        const socialSecurity = pickCurrent(socialSecurityMap.get(employee.id) || [], cycleId);
        const bank = pickCurrent(bankInfoMap.get(employee.id) || [], cycleId);
        const schedule = pickCurrent(scheduleMap.get(employee.id) || [], cycleId);
        const timeConfig = pickCurrent(timeConfigMap.get(employee.id) || [], cycleId);
        const employeeContracts = getCycleRows(contractMap.get(employee.id) || [], cycleId);
        const contract = [...employeeContracts]
          .sort((left, right) => {
            if (left.is_terminated !== right.is_terminated) return left.is_terminated ? 1 : -1;
            return right.start_date.localeCompare(left.start_date);
          })[0];
        const relatives = getCycleRows(familyMembersMap.get(employee.id) || [], cycleId);
        const employeeAssignments = getCycleRows(assignmentMap.get(employee.id) || [], cycleId);
        const employeeDocuments = getCycleRows(documentMap.get(employee.id) || [], cycleId);
        const employeeCertifications = certificationMap.get(employee.id) || [];
        const employeeVaccinations = vaccinationMap.get(employee.id) || [];

        const centerName = work?.operation_center_id ? centers.get(work.operation_center_id) : undefined;
        const additionalCenters = Array.from(new Set(employeeAssignments
          .map((assignment) => centers.get(assignment.operation_center_id))
          .filter((name): name is string => Boolean(name) && name !== centerName)));
        const genderIdentity = employee.gender_identity === 'otro'
          ? employee.gender_identity_other
          : employee.gender_identity;

        return {
          employee_id: employee.id,
          tipo_identificacion: employee.identification_type_id
            ? identificationTypes.get(employee.identification_type_id) || employee.document_type
            : employee.document_type,
          documento: employee.document_number,
          ciudad_expedicion: text(employee.document_issue_city),
          fecha_expedicion: formatDate(employee.document_issue_date),
          primer_nombre: employee.first_name,
          segundo_nombre: text(employee.middle_name),
          primer_apellido: employee.last_name,
          segundo_apellido: text(employee.second_last_name),
          nombre_completo: getFullName(employee),
          pais_nacimiento: text(employee.birth_country),
          departamento_nacimiento: text(employee.birth_department),
          ciudad_nacimiento: text(employee.birth_city),
          fecha_nacimiento: formatDate(employee.birth_date),
          edad: getAge(employee.birth_date),
          sexo_biologico: enumLabel(genderLabels, employee.gender),
          identidad_genero: text(genderIdentity),
          grupo_sanguineo: text(employee.blood_type),
          estado_civil: enumLabel(maritalStatusLabels, employee.marital_status),
          nivel_educativo: employee.education_level_id ? text(educationLevels.get(employee.education_level_id)) : '-',
          profesion: employee.profession_id ? text(professions.get(employee.profession_id)) : '-',
          primer_empleo: yesNo(employee.is_first_job),
          cabeza_hogar: yesNo(employee.is_head_of_household),
          tipo_discapacidad: text(employee.disability_type),
          proceso_exclusivo_pcd: yesNo(employee.proceso_exclusivo_pcd),
          grupo_etnico: text(employee.ethnic_group),
          victima_conflicto: yesNo(employee.is_conflict_victim),
          desmovilizado: yesNo(employee.is_demobilized),
          departamento_residencia: text(contact?.residence_department),
          ciudad_residencia: text(contact?.residence_city),
          direccion_residencia: text(contact?.residence_address),
          barrio_residencia: text(contact?.residence_neighborhood),
          correo_corporativo: text(contact?.email),
          correo_personal: text(contact?.personal_email),
          telefono: text(contact?.phone),
          celular: text(contact?.mobile),
          contacto_emergencia: text(contact?.emergency_contact_name),
          telefono_emergencia: text(contact?.emergency_contact_phone),
          parentesco_emergencia: text(contact?.emergency_contact_relationship),
          vencimiento_carta_residencia: formatDate(contact?.residence_letter_expiry),
          estado: statusLabel(employee),
          activo: yesNo(employee.is_active),
          ciclo_laboral: activeCycle?.cycle_number ?? '-',
          inicio_ciclo: formatDate(activeCycle?.start_date),
          fin_ciclo: formatDate(activeCycle?.end_date),
          centro: text(centerName),
          centros_adicionales: joinDetails(additionalCenters),
          centro_costos: text(work?.cost_center),
          area: work?.area_id ? text(areas.get(work.area_id)) : '-',
          cargo: text(work?.position_id ? positions.get(work.position_id) || work.position_name : work?.position_name),
          ciudad_trabajo: text(work?.work_city),
          fecha_ingreso: formatDate(work?.hire_date),
          fecha_retiro: formatDate(work?.termination_date),
          tipo_vinculacion: enumLabel(linkTypeLabels, work?.link_type),
          observaciones_laborales: text(work?.observations),
          numero_contrato: text(contract?.contract_number),
          tipo_contrato: text(contract?.contract_type),
          inicio_contrato: formatDate(contract?.start_date),
          fin_contrato: formatDate(contract?.end_date),
          salario: contract?.salary ?? 0,
          tipo_salario: text(contract?.salary_type),
          auxilio_transporte: contract?.transport_allowance ?? 0,
          otros_auxilios: contract?.other_allowances ?? 0,
          periodo_prueba_dias: contract?.trial_period_days ?? 0,
          fin_periodo_prueba: formatDate(contract?.trial_end_date),
          direccion_trabajo_contrato: text(contract?.work_address),
          ciudad_trabajo_contrato: text(contract?.work_city),
          labor_contratada: text(contract?.work_labor_description),
          clausula_confidencialidad: yesNo(contract?.has_confidentiality_clause),
          clausula_no_competencia: yesNo(contract?.has_non_compete_clause),
          clausulas_especiales: text(contract?.special_clauses),
          contrato_aprobado: yesNo(contract?.is_approved),
          nivel_riesgo: enumLabel(riskLevelLabels, socialSecurity?.risk_level),
          eps: text(socialSecurity?.eps),
          afp: text(socialSecurity?.afp),
          arl: text(socialSecurity?.arl),
          ccf: text(socialSecurity?.ccf),
          afc: text(socialSecurity?.afc),
          ips: text(socialSecurity?.ips),
          banco: text(bank?.bank_name),
          tipo_cuenta: enumLabel(accountTypeLabels, bank?.account_type),
          numero_cuenta: text(bank?.account_number),
          cuenta_registrada: yesNo(bank?.account_registered),
          tipo_nomina: enumLabel(payrollTypeLabels, schedule?.payroll_type),
          horario_oficina: yesNo(schedule?.is_office_schedule),
          dia_descanso: text(schedule?.rest_day),
          modalidad_tiempo: timeConfig?.mode === 'administrative' ? 'Administrativa' : timeConfig?.mode === 'shift' ? 'Turnos' : '-',
          horario_o_ciclo: timeConfig?.mode === 'administrative'
            ? text(timeConfig.work_schedule_id ? workSchedules.get(timeConfig.work_schedule_id) : undefined)
            : text(timeConfig?.shift_cycle_id ? shiftCycles.get(timeConfig.shift_cycle_id) : undefined),
          inicio_modalidad: formatDate(timeConfig?.start_date),
          notas_modalidad: text(timeConfig?.notes),
          conyuge: text(family?.spouse_name),
          sexo_conyuge: enumLabel(genderLabels, family?.spouse_gender),
          nacimiento_conyuge: formatDate(family?.spouse_birth_date),
          conyuge_trabaja: yesNo(family?.spouse_works),
          numero_hijos: family?.children_count ?? relatives.filter((relative) => relative.relationship === 'hijo').length,
          numero_parientes: relatives.length,
          detalle_parientes: joinDetails(relatives.map((relative) => {
            const relationship = familyRelationshipLabels[relative.relationship] || relative.relationship;
            const age = relative.age === null ? '' : `, ${relative.age} años`;
            const observations = relative.observations ? `, ${relative.observations}` : '';
            return `${relationship}: ${relative.full_name}${age}${observations}`;
          })),
          numero_documentos: employeeDocuments.length,
          detalle_documentos: joinDetails(employeeDocuments.map((document) => {
            const type = employeeDocumentTypeLabels[document.document_type] || document.document_type;
            return `${type}: ${document.document_name || document.file_name || 'Documento'}${document.expiry_date ? ` (vence ${formatDate(document.expiry_date)})` : ''}`;
          })),
          numero_certificaciones: employeeCertifications.length,
          detalle_certificaciones: joinDetails(employeeCertifications.map((certification) => {
            const type = certificationTypeLabels[certification.certification_type] || certification.certification_type;
            return `${type}: ${certification.certification_name || 'Certificación'}${certification.expiry_date ? ` (vence ${formatDate(certification.expiry_date)})` : ''}`;
          })),
          numero_vacunas: employeeVaccinations.length,
          detalle_vacunas: joinDetails(employeeVaccinations.map((vaccination) => {
            const type = vaccineTypeLabels[vaccination.vaccine_type] || vaccination.vaccine_type;
            return `${type}: dosis ${vaccination.dose_number}, ${formatDate(vaccination.application_date)}`;
          })),
        } satisfies GeneralEmployeeReportRow;
      });
    },
  });
}
