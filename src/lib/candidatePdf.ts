import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { supabase } from '@/integrations/supabase/client';

interface CandidateForPdf {
  id: string;
  first_name: string;
  last_name: string;
  document_type: string;
  identification_type_name?: string;
  document_number: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  department?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  gender_identity?: string | null;
  gender_identity_other?: string | null;
  marital_status?: string | null;
  blood_type?: string | null;
  document_issue_date?: string | null;
  document_issue_city?: string | null;
  education_level?: string | null;
  profession?: string | null;
  experience_years?: number | null;
  current_company?: string | null;
  current_position?: string | null;
  salary_expectation?: number | null;
  ethnic_group?: string | null;
  disability_type?: string | null;
  is_first_job?: boolean | null;
  is_head_of_household?: boolean | null;
  is_conflict_victim?: boolean | null;
  is_demobilized?: boolean | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  general_notes?: string | null;
  status: string;
  application_date: string;
  vacancies?: any;
}

const genderMap: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
const maritalMap: Record<string, string> = {
  soltero: 'Soltero/a', casado: 'Casado/a', union_libre: 'Unión Libre',
  divorciado: 'Divorciado/a', viudo: 'Viudo/a',
};
const statusMap: Record<string, string> = {
  applied: 'Aplicado', in_process: 'En Proceso', selected: 'Seleccionado',
  hired: 'Contratado', not_selected: 'No Seleccionado', withdrawn: 'Retirado',
};

export async function generateCandidatePdf(candidate: CandidateForPdf) {
  // Fetch family members
  const { data: familyMembers } = await supabase
    .from('candidate_family_members' as any)
    .select('*')
    .eq('candidate_id', candidate.id)
    .order('created_at', { ascending: true });

  // Fetch selection steps
  const { data: steps } = await supabase
    .from('selection_steps')
    .select('*')
    .eq('candidate_id', candidate.id)
    .order('created_at', { ascending: true });

  const doc = new jsPDF('p', 'mm', 'letter');
  const pageW = 216;
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 15;

  const checkPage = (needed: number) => {
    if (y + needed > 265) {
      doc.addPage();
      y = 15;
    }
  };

  const drawSectionTitle = (title: string) => {
    checkPage(12);
    doc.setFillColor(59, 130, 246);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, marginL + 3, y + 5);
    y += 10;
    doc.setTextColor(33, 33, 33);
  };

  const drawRow = (label: string, value: string | null | undefined) => {
    if (!value) return;
    checkPage(7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', marginL + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(value, marginL + 55, y + 4);
    y += 6;
  };

  const drawTwoCol = (l1: string, v1: string | null | undefined, l2: string, v2: string | null | undefined) => {
    if (!v1 && !v2) return;
    checkPage(7);
    const halfW = contentW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    if (v1) {
      doc.text(l1 + ':', marginL + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(v1, marginL + 45, y + 4);
    }
    if (v2) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(l2 + ':', marginL + halfW + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(33, 33, 33);
      doc.text(v2, marginL + halfW + 45, y + 4);
    }
    y += 6;
  };

  // ── HEADER ──
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DEL CANDIDATO', marginL, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, marginL, 22);
  doc.text(`Vacante: ${candidate.vacancies?.position_title || 'N/A'}`, pageW / 2, 22);
  y = 35;

  // ── Nombre y Estado ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 64, 175);
  doc.text(`${candidate.first_name} ${candidate.last_name}`, marginL, y);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Estado: ${statusMap[candidate.status] || candidate.status}`, pageW - marginR - 40, y);
  y += 10;

  // ── DATOS PERSONALES ──
  const docTypeLabel = (candidate as any).identification_types?.name || candidate.identification_type_name || candidate.document_type;
  drawSectionTitle('DATOS PERSONALES');
  drawTwoCol('Documento', `${docTypeLabel} ${candidate.document_number}`, 'Expedido en', candidate.document_issue_city);
  drawTwoCol(
    'Fecha Expedición',
    candidate.document_issue_date ? format(new Date(candidate.document_issue_date), 'dd/MM/yyyy') : null,
    'Fecha Nacimiento',
    candidate.birth_date ? formatDateOnly(candidate.birth_date, 'dd/MM/yyyy') : null,
  );
  drawTwoCol('Sexo Biológico', genderMap[candidate.gender || ''] || candidate.gender, 'Estado Civil', maritalMap[candidate.marital_status || ''] || candidate.marital_status);
  drawTwoCol('Tipo Sangre', candidate.blood_type, 'Grupo Étnico', candidate.ethnic_group);
  if (candidate.gender_identity) {
    drawRow('Sexo Identificación', candidate.gender_identity === 'otro' ? `Otro: ${candidate.gender_identity_other || ''}` : genderMap[candidate.gender_identity] || candidate.gender_identity);
  }

  // ── CONTACTO ──
  drawSectionTitle('INFORMACIÓN DE CONTACTO');
  drawTwoCol('Teléfono', candidate.phone, 'Celular', candidate.mobile);
  drawRow('Correo', candidate.email);
  drawRow('Dirección', candidate.address);
  drawTwoCol('Barrio', candidate.neighborhood, 'Ciudad', candidate.city);
  drawRow('Departamento', candidate.department);

  // ── EMERGENCIA ──
  if (candidate.emergency_contact_name) {
    drawSectionTitle('CONTACTO DE EMERGENCIA');
    drawTwoCol('Nombre', candidate.emergency_contact_name, 'Teléfono', candidate.emergency_contact_phone);
    drawRow('Parentesco', candidate.emergency_contact_relationship);
  }

  // ── ESPECIFICACIONES ──
  drawSectionTitle('ESPECIFICACIONES DE LA PERSONA');
  drawTwoCol('Primer Empleo', candidate.is_first_job ? 'Sí' : 'No', 'Cabeza de Familia', candidate.is_head_of_household ? 'Sí' : 'No');
  drawTwoCol('Víctima Conflicto', candidate.is_conflict_victim ? 'Sí' : 'No', 'Desmovilizado', candidate.is_demobilized ? 'Sí' : 'No');
  drawRow('Discapacidad', candidate.disability_type || 'Ninguna');

  // ── FORMACIÓN Y EXPERIENCIA ──
  drawSectionTitle('FORMACIÓN Y EXPERIENCIA');
  drawTwoCol('Nivel Educativo', candidate.education_level, 'Profesión', candidate.profession);
  drawTwoCol('Años Experiencia', candidate.experience_years?.toString(), 'Empresa Actual', candidate.current_company);
  drawTwoCol('Cargo Actual', candidate.current_position, 'Aspiración Salarial', candidate.salary_expectation ? `$${candidate.salary_expectation.toLocaleString('es-CO')}` : null);

  // ── NUCLEO FAMILIAR ──
  if (familyMembers && familyMembers.length > 0) {
    drawSectionTitle(`NÚCLEO FAMILIAR (${familyMembers.length} personas a cargo)`);
    
    // Table header
    checkPage(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(marginL, y, contentW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const cols = [marginL + 2, marginL + 35, marginL + 95, marginL + 115, marginL + 140];
    doc.text('Parentesco', cols[0], y + 4);
    doc.text('Nombre Completo', cols[1], y + 4);
    doc.text('Edad', cols[2], y + 4);
    doc.text('Sexo', cols[3], y + 4);
    doc.text('Observaciones', cols[4], y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    const gMap: Record<string, string> = { M: 'M', F: 'F' };
    for (const fm of familyMembers as any[]) {
      checkPage(7);
      doc.text(fm.relationship || '', cols[0], y + 4);
      doc.text(fm.full_name || '', cols[1], y + 4);
      doc.text(fm.age != null ? fm.age.toString() : '', cols[2], y + 4);
      doc.text(gMap[fm.gender] || '', cols[3], y + 4);
      doc.text((fm.observations || '').substring(0, 30), cols[4], y + 4);
      y += 6;
    }
    y += 2;
  }

  // ── ETAPAS DE SELECCIÓN ──
  if (steps && steps.length > 0) {
    drawSectionTitle('ETAPAS DE SELECCIÓN');
    
    const stepTypeLabel: Record<string, string> = {
      prefiltro: 'Pre-filtro', entrevista_seleccion: 'Entrevista Selección',
      entrevista_jefe: 'Entrevista Jefe', validacion_antecedentes: 'Antecedentes',
      pruebas_psicotecnicas: 'Pruebas Psicotécnicas', pruebas_conocimiento: 'Pruebas Conocimiento',
      validacion_academica: 'Validación Académica', validacion_referencias: 'Referencias',
      examenes_medicos: 'Exámenes Médicos',
    };
    const stepStatusLabel: Record<string, string> = {
      pending: 'Pendiente', in_progress: 'En Progreso', passed: 'Aprobado',
      failed: 'No Aprobado', not_applicable: 'N/A',
    };

    checkPage(10);
    doc.setFillColor(240, 240, 240);
    doc.rect(marginL, y, contentW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const sCols = [marginL + 2, marginL + 50, marginL + 85, marginL + 110];
    doc.text('Etapa', sCols[0], y + 4);
    doc.text('Estado', sCols[1], y + 4);
    doc.text('Puntaje', sCols[2], y + 4);
    doc.text('Fecha', sCols[3], y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    for (const s of steps) {
      checkPage(7);
      doc.text(stepTypeLabel[s.step_type] || s.step_type, sCols[0], y + 4);
      doc.text(stepStatusLabel[s.status] || s.status, sCols[1], y + 4);
      doc.text(s.score != null ? `${s.score}%` : '-', sCols[2], y + 4);
      doc.text(s.completed_date ? formatDateOnly(s.completed_date, 'dd/MM/yy') : '-', sCols[3], y + 4);
      y += 6;
    }
  }

  // ── NOTAS ──
  if (candidate.general_notes) {
    drawSectionTitle('OBSERVACIONES GENERALES');
    checkPage(15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(candidate.general_notes, contentW - 4);
    doc.text(lines, marginL + 2, y + 4);
    y += lines.length * 4 + 4;
  }

  // ── FOOTER ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Ficha Candidato - ${candidate.first_name} ${candidate.last_name}`, marginL, 273);
    doc.text(`Pág ${i} de ${pageCount}`, pageW - marginR - 20, 273);
  }

  doc.save(`Ficha_Candidato_${candidate.first_name}_${candidate.last_name}.pdf`);
}
