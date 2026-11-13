import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { supabase } from '@/integrations/supabase/client';
import { amendmentFields, conditionLabel, type AmendmentData, type AmendmentField, type EmployeeAmendment } from '@/types/amendment';

export function amendmentTemplateData(data: Pick<AmendmentData, 'identity' | 'contract'>, record: Pick<EmployeeAmendment, 'number' | 'effective_on' | 'reason' | 'changes' | 'before_values' | 'contract_id'>, employerSigner: string, employeeSigner: string) {
  return {
    empresa: data.identity.company_name, nit: data.identity.company_nit,
    empleado: data.identity.employee_name, documento: data.identity.employee_document,
    contrato: data.contract?.number || record.contract_id, fecha_inicio_contrato: data.contract?.start_date || '',
    consecutivo: String(record.number), vigencia: record.effective_on, motivo: record.reason,
    firmante_empresa: employerSigner, firmante_empleado: employeeSigner || data.identity.employee_name,
    cambios: Object.entries(record.changes).map(([key, value]) => ({
      campo: amendmentFields[key as AmendmentField], anterior: conditionLabel(key as AmendmentField, record.before_values[key as AmendmentField]),
      nuevo: conditionLabel(key as AmendmentField, value),
    })),
  };
}
export async function generateAmendmentDocument(data: AmendmentData, record: EmployeeAmendment, employerSigner: string, employeeSigner: string) {
  if (!data.template) throw new Error('Configure una plantilla Word o cargue un PDF firmado externo.');
  const { data: template, error } = await supabase.storage.from('amendments').download(data.template.path);
  if (error) throw error;
  const doc = new Docxtemplater(new PizZip(await template.arrayBuffer()), { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render(amendmentTemplateData(data, record, employerSigner, employeeSigner));
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
