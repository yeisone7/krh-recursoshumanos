import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ExamOrderData {
  candidate: {
    first_name: string;
    last_name: string;
    document_type: string;
    document_number: string;
    birth_date?: string | null;
    gender?: string | null;
    email?: string | null;
    mobile?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    department?: string | null;
  };
  vacancy: {
    position_title: string;
    operation_center_id?: string;
    operation_centers?: { name: string };
  };
  step: {
    provider?: string | null;
    doctor_name?: string | null;
    scheduled_date?: string | null;
    exam_profesiograma_items?: any[] | null;
    notes?: string | null;
  };
  companyId: string;
}

const genderLabels: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };

export async function generateExamOrderPdf(data: ExamOrderData) {
  // Fetch company info
  const { data: company } = await supabase
    .from('companies')
    .select('name, nit, address, phone, email, logo_url')
    .eq('id', data.companyId)
    .single();

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

  // ── Header with company logo area ──
  // Company logo placeholder
  if (company?.logo_url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = company.logo_url!;
      });
      doc.addImage(img, 'PNG', marginL, y, 36, 16);
    } catch {
      // Skip logo if it fails
    }
  }

  // Company name right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(33, 33, 33);
  doc.text(company?.name || 'Empresa', pageW - marginR, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  if (company?.nit) {
    doc.text(`NIT: ${company.nit}`, pageW - marginR, y + 11, { align: 'right' });
  }
  if (company?.address) {
    doc.text(company.address, pageW - marginR, y + 15, { align: 'right' });
  }
  y += 22;

  // Separator line
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('ORDEN DE EXAMEN MÉDICO OCUPACIONAL', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('EXAMEN DE INGRESO - Resolución 2346 de 2007', pageW / 2, y, { align: 'center' });
  y += 8;

  // ── Order info ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(33, 33, 33);
  const orderDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const orderNumber = `ORD-${format(new Date(), 'yyyyMMdd')}-${data.candidate.document_number.slice(-4)}`;

  doc.setFont('helvetica', 'bold');
  doc.text('No. Orden:', marginL, y);
  doc.setFont('helvetica', 'normal');
  doc.text(orderNumber, marginL + 22, y);
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', pageW / 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(orderDate, pageW / 2 + 14, y);
  y += 8;

  // ── Section: Datos del Candidato ──
  const drawSectionHeader = (title: string) => {
    checkPage(12);
    doc.setFillColor(59, 130, 246);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, marginL + 3, y + 5);
    y += 10;
    doc.setTextColor(33, 33, 33);
  };

  const drawField = (label: string, value: string | null | undefined, x: number, w: number) => {
    if (!value) value = '_______________';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(33, 33, 33);
    doc.text(value, x + w, y);
  };

  drawSectionHeader('1. DATOS DEL TRABAJADOR / CANDIDATO');

  drawField('Nombres y Apellidos', `${data.candidate.first_name} ${data.candidate.last_name}`, marginL + 2, 38);
  y += 6;

  drawField('Tipo Doc.', data.candidate.document_type, marginL + 2, 20);
  drawField('No. Documento', data.candidate.document_number, pageW / 2, 28);
  y += 6;

  drawField('Fecha Nacimiento', data.candidate.birth_date ? format(new Date(data.candidate.birth_date), 'dd/MM/yyyy') : null, marginL + 2, 32);
  drawField('Sexo', genderLabels[data.candidate.gender || ''] || data.candidate.gender, pageW / 2, 12);
  y += 6;

  drawField('Dirección', data.candidate.address, marginL + 2, 20);
  y += 6;

  drawField('Ciudad', data.candidate.city, marginL + 2, 15);
  drawField('Departamento', data.candidate.department, pageW / 2, 28);
  y += 6;

  drawField('Teléfono', data.candidate.mobile || data.candidate.phone, marginL + 2, 18);
  drawField('Email', data.candidate.email, pageW / 2, 12);
  y += 8;

  // ── Section: Datos del Cargo ──
  drawSectionHeader('2. DATOS DEL CARGO');

  drawField('Cargo al que aspira', data.vacancy.position_title, marginL + 2, 38);
  y += 6;

  drawField('Centro de Operación', data.vacancy.operation_centers?.name || 'N/A', marginL + 2, 38);
  y += 6;

  drawField('Tipo de Examen', 'INGRESO', marginL + 2, 30);
  y += 8;

  // ── Section: Proveedor / IPS ──
  drawSectionHeader('3. PROVEEDOR DE SERVICIOS DE SALUD');

  drawField('IPS / Proveedor', data.step.provider, marginL + 2, 30);
  y += 6;

  drawField('Médico', data.step.doctor_name, marginL + 2, 18);
  y += 6;

  if (data.step.scheduled_date) {
    drawField('Fecha Programada', format(new Date(data.step.scheduled_date), 'dd/MM/yyyy'), marginL + 2, 32);
    y += 6;
  }
  y += 4;

  // ── Section: Exámenes Solicitados ──
  drawSectionHeader('4. EXÁMENES SOLICITADOS');

  const exams = data.step.exam_profesiograma_items;
  if (exams && exams.length > 0) {
    // Table header
    doc.setFillColor(240, 244, 248);
    doc.rect(marginL, y - 1, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text('No.', marginL + 3, y + 4);
    doc.text('Examen', marginL + 15, y + 4);
    doc.text('Obligatorio', pageW - marginR - 25, y + 4);
    y += 8;

    exams.forEach((exam: any, idx: number) => {
      checkPage(7);
      // Alternating row bg
      if (idx % 2 === 0) {
        doc.setFillColor(250, 250, 252);
        doc.rect(marginL, y - 1, contentW, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(33, 33, 33);
      doc.text(`${idx + 1}`, marginL + 3, y + 3);
      doc.text(exam.name || 'Examen', marginL + 15, y + 3);

      // Checkbox
      const checkX = pageW - marginR - 18;
      doc.setDrawColor(150, 150, 150);
      doc.rect(checkX, y - 0.5, 4, 4);
      if (exam.is_required) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 130, 246);
        doc.text('✓', checkX + 0.5, y + 3);
        doc.setTextColor(33, 33, 33);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(exam.is_required ? 'Sí' : 'No', checkX + 6, y + 3);

      y += 6;
    });
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('No se han especificado exámenes del profesiograma.', marginL + 3, y + 3);
    y += 6;

    // Empty lines for manual entry
    for (let i = 0; i < 5; i++) {
      y += 7;
      checkPage(7);
      doc.setDrawColor(200, 200, 200);
      doc.line(marginL + 5, y, pageW - marginR - 5, y);
    }
  }

  y += 6;

  // ── Section: Observaciones ──
  drawSectionHeader('5. OBSERVACIONES');

  if (data.step.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(33, 33, 33);
    const lines = doc.splitTextToSize(data.step.notes, contentW - 6);
    lines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, marginL + 3, y);
      y += 4;
    });
  } else {
    // Empty lines
    for (let i = 0; i < 3; i++) {
      y += 7;
      checkPage(7);
      doc.setDrawColor(200, 200, 200);
      doc.line(marginL + 5, y, pageW - marginR - 5, y);
    }
  }

  y += 10;

  // ── Signatures ──
  checkPage(35);
  doc.setDrawColor(33, 33, 33);
  doc.setLineWidth(0.3);

  // Left signature
  const sigY = y + 15;
  doc.line(marginL + 5, sigY, marginL + 75, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(33, 33, 33);
  doc.text('Firma Responsable de RRHH', marginL + 15, sigY + 5);

  // Right signature
  doc.line(pageW / 2 + 10, sigY, pageW - marginR - 5, sigY);
  doc.text('Firma del Candidato', pageW / 2 + 25, sigY + 5);

  // Candidate info under right signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.candidate.first_name} ${data.candidate.last_name}`, pageW / 2 + 25, sigY + 9);
  doc.text(`${data.candidate.document_type} ${data.candidate.document_number}`, pageW / 2 + 25, sigY + 13);

  y = sigY + 18;

  // ── Footer ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este documento se genera conforme a la Resolución 2346 de 2007 del Ministerio de la Protección Social.',
    pageW / 2, 270, { align: 'center' }
  );
  doc.text(
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")} | ${company?.name || ''}`,
    pageW / 2, 274, { align: 'center' }
  );

  // Save
  const fileName = `Orden_Examen_${data.candidate.last_name}_${data.candidate.first_name}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
