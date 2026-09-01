import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DisciplinaryProcessWithEmployee,
  disciplinaryStatusLabels,
  faultTypeLabels,
  sanctionTypeLabels,
  DisciplinaryStatus,
  FaultType,
  SanctionType,
} from '@/types/disciplinary';
import petrocasinosLogoFull from '@/assets/petrocasinos-logo-full.png';


const COLOR_LOGO_PATH = '/images/petrocasinos-logo-white.png';

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

interface DisciplinaryPdfData {
  process: DisciplinaryProcessWithEmployee;
  companyName?: string;
}

const HEADER_HEIGHT = 32;
const PAGE_WIDTH = 215.9; // Letter
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(date: string | null): string {
  if (!date) return '-';
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: es });
}

function formatDateShort(date: string | null): string {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
}

export async function generateDisciplinaryPdf(data: DisciplinaryPdfData) {
  const { process, companyName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageHeight = doc.internal.pageSize.getHeight();

  // Pre-load images
  let colorLogoDataUrl: string | null = null;
  try {
    colorLogoDataUrl = await loadImageAsDataUrl(COLOR_LOGO_PATH);
  } catch {
    // continue without images
  }

  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const headerCompanyName = (companyName || 'PETROCASINOS S.A.').toUpperCase();

  // ─── Helpers ────────────────────────────────────────────
  function drawHeader(d: jsPDF) {
    d.setFillColor(27, 38, 59); // Navy
    d.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');
    if (colorLogoDataUrl) {
      try { d.addImage(colorLogoDataUrl, 'PNG', PAGE_WIDTH - MARGIN - 38, 6, 36, 16); } catch { /* skip */ }
    }
    d.setTextColor(255, 255, 255);
    d.setFontSize(16);
    d.setFont('helvetica', 'bold');
    d.text(headerCompanyName, MARGIN, 14);
    d.setFontSize(10);
    d.setFont('helvetica', 'normal');
    d.text('INFORME DE PROCESO DISCIPLINARIO', MARGIN, 21);
    d.setFontSize(8);
    d.text(`Generado: ${dateStr}`, MARGIN, 27);
  }


  function drawFooter(d: jsPDF, pageNum: number, totalPages: number) {
    d.setFontSize(7);
    d.setTextColor(150, 150, 150);
    d.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH / 2, pageHeight - 8, { align: 'center' });
    d.text('Documento confidencial - Solo para uso interno', PAGE_WIDTH / 2, pageHeight - 4, { align: 'center' });
    d.setTextColor(0, 0, 0);
  }

  function checkNewPage(currentY: number, needed: number): number {
    if (currentY + needed > pageHeight - 20) {
      doc.addPage();
      drawHeader(doc);
      doc.setTextColor(0, 0, 0);
      return HEADER_HEIGHT + 10;
    }
    return currentY;
  }

  function sectionTitle(title: string, y: number): number {
    y = checkNewPage(y, 14);
    doc.setFillColor(27, 38, 59);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), MARGIN + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    return y + 12;
  }

  function infoRow(label: string, value: string, y: number, col2?: { label: string; value: string }): number {
    y = checkNewPage(y, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, MARGIN + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 50, y);
    if (col2) {
      doc.setFont('helvetica', 'bold');
      doc.text(col2.label, CONTENT_WIDTH / 2 + MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(col2.value, CONTENT_WIDTH / 2 + MARGIN + 40, y);
    }
    return y + 6;
  }

  // ─── Page 1: Header ─────────────────────────────────────
  drawHeader(doc);
  doc.setTextColor(0, 0, 0);
  let y = HEADER_HEIGHT + 10;

  // ─── Case identification card ──────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 2, 2, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(process.case_number, MARGIN + 4, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const employeeName = `${process.employee?.first_name || ''} ${process.employee?.last_name || ''}`.trim();
  doc.text(`Empleado: ${employeeName}`, MARGIN + 4, y + 15);
  doc.text(`Documento: ${process.employee?.document_number || '-'}`, MARGIN + 4, y + 21);

  // Status & Fault badges (right side)
  const statusText = disciplinaryStatusLabels[process.status];
  const faultText = faultTypeLabels[process.fault_type];

  // Status pill
  doc.setFillColor(27, 38, 59);
  const statusW = doc.getTextWidth(statusText) + 8;
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusW - 2, y + 3, statusW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, PAGE_WIDTH - MARGIN - statusW / 2 - 2, y + 7.5, { align: 'center' });

  // Fault pill
  const faultColors: Record<FaultType, [number, number, number]> = {
    leve: [234, 179, 8],
    grave: [234, 88, 12],
    gravisima: [220, 38, 38],
  };
  const fc = faultColors[process.fault_type] || [100, 100, 100];
  doc.setFillColor(fc[0], fc[1], fc[2]);
  const faultW = doc.getTextWidth(faultText) + 8;
  doc.roundedRect(PAGE_WIDTH - MARGIN - faultW - 2, y + 13, faultW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(faultText, PAGE_WIDTH - MARGIN - faultW / 2 - 2, y + 17.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  y += 34;

  // ─── Section: Información General ──────────────────────
  y = sectionTitle('Información General', y);
  y = infoRow('Fecha de los Hechos:', formatDateShort(process.fault_date), y, { label: 'Apertura:', value: formatDateShort(process.opening_date) });
  y = infoRow('Notificación:', formatDateShort(process.notification_date), y, { label: 'Audiencia:', value: process.hearing_date ? formatDateShort(process.hearing_date) : '-' });
  y = infoRow('Investigador:', process.investigator_name || '-', y, { label: 'Testigos:', value: process.witnesses || '-' });

  if (process.article_violated) {
    y = infoRow('Artículos Violados:', process.article_violated, y);
  }
  if (process.observations) {
    y = infoRow('Observaciones:', '', y);
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(process.observations, CONTENT_WIDTH - 4);
    y = checkNewPage(y, obsLines.length * 4 + 2);
    doc.text(obsLines, MARGIN + 2, y);
    y += obsLines.length * 4 + 4;
  }

  // ─── Section: Descripción de los Hechos ────────────────
  y = sectionTitle('Descripción de los Hechos', y);
  doc.setFontSize(9);
  const factsLines = doc.splitTextToSize(process.facts_description, CONTENT_WIDTH - 4);
  y = checkNewPage(y, factsLines.length * 4 + 4);
  doc.text(factsLines, MARGIN + 2, y);
  y += factsLines.length * 4 + 6;

  // ─── Section: Evidencias ───────────────────────────────
  if (process.evidence && process.evidence.length > 0) {
    y = sectionTitle(`Evidencias (${process.evidence.length})`, y);
    for (const ev of process.evidence) {
      y = checkNewPage(y, 16);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1, 1, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1, 1, 'S');
      doc.setDrawColor(0, 0, 0);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(ev.evidence_type, MARGIN + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha: ${formatDateShort(ev.collected_date)}${ev.collected_by ? ` | Por: ${ev.collected_by}` : ''}`, MARGIN + 3, y + 10);

      const descLines = doc.splitTextToSize(ev.description, CONTENT_WIDTH - 60);
      doc.text(descLines[0] || '', MARGIN + 60, y + 5);
      if (descLines[1]) doc.text(descLines[1], MARGIN + 60, y + 10);
      y += 17;
    }
    y += 2;
  }

  // ─── Section: Descargos ────────────────────────────────
  if (process.defenses && process.defenses.length > 0) {
    y = sectionTitle(`Descargos del Empleado (${process.defenses.length})`, y);
    for (const def of process.defenses) {
      const contentLines = doc.splitTextToSize(def.content, CONTENT_WIDTH - 6);
      const cardH = Math.max(16, contentLines.length * 4 + 10);
      y = checkNewPage(y, cardH + 4);

      doc.setFillColor(250, 250, 250);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 1, 1, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 1, 1, 'S');
      doc.setDrawColor(0, 0, 0);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${def.defense_type === 'escrito' ? 'Escrito' : 'Oral'} — ${formatDateShort(def.defense_date)}`, MARGIN + 3, y + 5);
      if (def.received_by) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Recibido por: ${def.received_by}`, CONTENT_WIDTH - 20, y + 5);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(contentLines, MARGIN + 3, y + 11);
      y += cardH + 4;
    }
    y += 2;
  }

  // ─── Section: Decisión ─────────────────────────────────
  if (process.sanction_type) {
    y = sectionTitle('Decisión', y);
    y = infoRow('Sanción:', sanctionTypeLabels[process.sanction_type as SanctionType] || process.sanction_type, y, { label: 'Fecha Decisión:', value: formatDateShort(process.decision_date) });
    if (process.sanction_days && process.sanction_days > 0) {
      y = infoRow('Días de Suspensión:', `${process.sanction_days} días`, y, { label: 'Período:', value: `${formatDateShort(process.sanction_start_date)} - ${formatDateShort(process.sanction_end_date)}` });
    }
    y = infoRow('Decidido por:', process.decision_maker_name || '-', y);

    if (process.decision_summary) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen de la Decisión:', MARGIN + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(process.decision_summary, CONTENT_WIDTH - 4);
      y = checkNewPage(y, summaryLines.length * 4 + 4);
      doc.text(summaryLines, MARGIN + 2, y);
      y += summaryLines.length * 4 + 6;
    }
  }

  // ─── Section: Apelación ────────────────────────────────
  if (process.has_appeal) {
    y = sectionTitle('Apelación', y);
    y = infoRow('Fecha de Apelación:', formatDateShort(process.appeal_date), y, { label: 'Decisión Apelación:', value: formatDateShort(process.appeal_decision_date) });
    if (process.appeal_resolution) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Resolución:', MARGIN + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const appealLines = doc.splitTextToSize(process.appeal_resolution, CONTENT_WIDTH - 4);
      y = checkNewPage(y, appealLines.length * 4 + 4);
      doc.text(appealLines, MARGIN + 2, y);
      y += appealLines.length * 4 + 6;
    }
  }

  // ─── Section: Línea de Tiempo ──────────────────────────
  if (process.timeline && process.timeline.length > 0) {
    y = sectionTitle('Línea de Tiempo', y);
    for (const entry of process.timeline) {
      y = checkNewPage(y, 14);

      // Dot
      doc.setFillColor(27, 38, 59);
      doc.circle(MARGIN + 4, y + 1, 1.5, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const statusLabel = entry.new_status ? disciplinaryStatusLabels[entry.new_status as DisciplinaryStatus] || entry.action_type : entry.action_type;
      doc.text(statusLabel, MARGIN + 9, y + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(formatDateShort(entry.action_date), CONTENT_WIDTH + MARGIN - 2, y + 2, { align: 'right' });

      const descLines = doc.splitTextToSize(entry.description, CONTENT_WIDTH - 14);
      doc.setFontSize(8);
      doc.text(descLines, MARGIN + 9, y + 6);
      y += 6 + descLines.length * 3.5 + 3;
    }
  }

  // ─── Watermark & Footers ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  // Save
  doc.save(`Proceso_Disciplinario_${process.case_number}.pdf`);
}

type LegalDocumentKind = 'citation' | 'defense_act';

const ORDINALS = ['PRIMERO', 'SEGUNDO', 'TERCERO', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO', 'NOVENO', 'DÉCIMO'];

function legalDate(value: string | null | undefined, includeTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  return format(date, includeTime ? "d 'de' MMMM 'de' yyyy, hh:mm a" : "d 'de' MMMM 'de' yyyy", { locale: es });
}

async function createLegalDocument(data: DisciplinaryPdfData, kind: LegalDocumentKind) {
  const { process, companyName } = data;
  const company = (companyName || 'PETROCASINOS S.A.').toUpperCase();
  const employee = `${process.employee?.first_name || ''} ${process.employee?.last_name || ''}`.trim().toUpperCase();
  const documentNumber = process.employee?.document_number || '-';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const height = doc.internal.pageSize.getHeight();
  let logo: string | null = null;
  try { logo = await loadImageAsDataUrl(petrocasinosLogoFull); } catch { /* logo is optional */ }

  const title = kind === 'citation' ? 'CITACIÓN PARA LA DILIGENCIA DE DESCARGOS' : `ACTA DE DESCARGOS – ${employee}`;
  let y = 42;

  const drawLegalHeader = () => {
    doc.setDrawColor(90, 90, 90);
    doc.rect(18, 12, 180, 24);
    if (logo) {
      try { doc.addImage(logo, 'PNG', 21, 16, 34, 14); } catch { /* skip */ }
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(kind === 'citation' ? 12 : 13);
    doc.text(title, 108, 22, { align: 'center', maxWidth: 100 });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(process.case_number, 194, 18, { align: 'right' });
    doc.text('Documento generado por la plataforma', 194, 25, { align: 'right' });
    doc.text(company, 194, 31, { align: 'right' });
  };

  const ensureSpace = (needed: number) => {
    if (y + needed <= height - 18) return;
    doc.addPage();
    drawLegalHeader();
    y = 43;
  };

  const paragraph = (text: string, options?: { boldLead?: string; center?: boolean; gap?: number }) => {
    const gap = options?.gap ?? 5;
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(text, 176);
    ensureSpace(lines.length * 5 + gap);
    if (options?.boldLead && text.startsWith(options.boldLead)) {
      doc.setFont('helvetica', 'bold');
    }
    doc.text(lines, options?.center ? 108 : 20, y, { align: options?.center ? 'center' : 'left', lineHeightFactor: 1.35 });
    doc.setFont('helvetica', 'normal');
    y += lines.length * 5 + gap;
  };

  const heading = (text: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(text.toUpperCase(), 108, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    y += 9;
  };

  drawLegalHeader();

  if (kind === 'citation') {
    paragraph(`${process.citation_place || 'Ciudad'}, ${legalDate(process.notification_date || new Date().toISOString())}`);
    paragraph(`Señor(a):\n${employee}\nC.C. ${documentNumber}`);
    heading('Notificación de apertura de proceso disciplinario y citación a diligencia de descargos');
    const mode = process.hearing_method === 'presencial'
      ? `de manera presencial en ${process.hearing_location || 'el lugar informado por la empresa'}`
      : process.hearing_method === 'escrito'
        ? 'mediante respuesta escrita a través del enlace seguro suministrado por la empresa'
        : `mediante videoconferencia por ${process.hearing_platform || 'la plataforma informada'}${process.hearing_link ? ` (${process.hearing_link})` : ''}`;
    paragraph(`Por medio de la presente, nos permitimos citarlo a diligencia de descargos el ${legalDate(process.hearing_date, true)}, la cual se llevará a cabo ${mode}, con el objetivo de escuchar sus aclaraciones sobre los hechos reportados y garantizar su derecho de defensa y contradicción.`);

    const facts = process.report_facts?.length
      ? process.report_facts
      : [{ title: 'Hecho reportado', description: process.facts_description }];
    for (const [index, fact] of facts.entries()) {
      const ordinal = ORDINALS[index] || `HECHO ${index + 1}`;
      const metadata = [fact.occurred_at ? legalDate(fact.occurred_at, true) : '', fact.location || ''].filter(Boolean).join(' · ');
      paragraph(`${ordinal}: ${fact.title}. ${metadata ? `${metadata}. ` : ''}${fact.description}`, { boldLead: `${ordinal}:` });
    }

    const photographicEvidence = (process.evidence || []).filter((item) => item.evidence_type === 'foto' && item.file_url);
    if (photographicEvidence.length) {
      heading('Registros fotográficos anexos');
      for (const evidence of photographicEvidence) {
        try {
          const imageData = await loadImageAsDataUrl(evidence.file_url!);
          const properties = doc.getImageProperties(imageData);
          const imageWidth = 82;
          const imageHeight = Math.min(75, imageWidth * properties.height / properties.width);
          ensureSpace(imageHeight + 14);
          doc.addImage(imageData, properties.fileType || 'PNG', 20, y, imageWidth, imageHeight);
          doc.setFontSize(8.5);
          doc.text(evidence.description, 106, y + 5, { maxWidth: 88 });
          y += imageHeight + 8;
        } catch {
          paragraph(`Anexo fotográfico: ${evidence.description}${evidence.file_name ? ` (${evidence.file_name})` : ''}`);
        }
      }
    }

    paragraph('Las anteriores conductas podrían constituir incumplimiento de las obligaciones contractuales, políticas internas y disposiciones del Reglamento Interno de Trabajo, razón por la cual se adelanta esta actuación sin prejuzgar sobre la responsabilidad del trabajador.');
    if (process.legal_basis?.length) {
      heading('Fundamentos normativos relacionados');
      process.legal_basis.forEach((basis, index) => paragraph(`${index + 1}. ${basis}`, { gap: 2 }));
    } else if (process.article_violated) {
      heading('Fundamentos normativos relacionados');
      paragraph(process.article_violated);
    }
    heading('Término para ejercer su defensa');
    paragraph(`El trabajador cuenta con ${process.defense_deadline_days || 5} días hábiles para ejercer su derecho de defensa, aportar las pruebas que pretenda hacer valer y solicitar las que considere pertinentes antes de la diligencia.`);
    heading('Traslado de pruebas');
    paragraph(process.proof_transfer || 'Se ponen en conocimiento del trabajador los informes y evidencias incorporados al expediente disciplinario.');
    paragraph('A la diligencia podrá asistir acompañado de un compañero de trabajo o testigo y presentar las pruebas que tenga en su poder para justificar su posición.');
    ensureSpace(34);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('EL NOTIFICADO', 22, y);
    doc.text('QUIEN NOTIFICA', 118, y);
    y += 18;
    doc.text(employee, 22, y);
    doc.text((process.citation_sender_name || 'RESPONSABLE JURÍDICO').toUpperCase(), 118, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(`C.C. ${documentNumber}`, 22, y);
    doc.text(process.citation_sender_role || 'Área Jurídica', 118, y, { maxWidth: 78 });
  } else {
    const defense = process.defenses?.[0];
    paragraph(`En ${process.citation_place || 'la ciudad indicada'}, el ${legalDate(defense?.defense_date || process.hearing_date)}, se reunieron el trabajador ${employee}, identificado con C.C. ${documentNumber}, y los representantes de ${company}, con el fin de rendir descargos dentro del proceso disciplinario ${process.case_number}.`);
    paragraph('Se informó al trabajador que, en garantía de su derecho de defensa y debido proceso, puede no declarar contra sí mismo, responder o no los cargos, exponer libremente su versión y aportar o solicitar pruebas que justifiquen, atenúen o demuestren su no participación en los hechos.');
    paragraph(defense?.rights_acknowledged ? 'El trabajador manifestó comprender sus derechos y aceptó continuar con la diligencia.' : 'Se deja constancia de la lectura de los derechos del trabajador.');

    const answers = defense?.answers || [];
    if (answers.length) {
      answers.forEach((answer) => {
        paragraph(`PREGUNTADO: ${answer.question}`, { boldLead: 'PREGUNTADO:', gap: 2 });
        paragraph(`RESPUESTA: ${answer.answer}`, { boldLead: 'RESPUESTA:', gap: 5 });
      });
    }
    heading('Manifestación libre del trabajador');
    paragraph(defense?.content || 'Sin contenido registrado.');
    if (defense?.witness_name) paragraph(`Acompañante o testigo: ${defense.witness_name}${defense.witness_document ? `, documento ${defense.witness_document}` : ''}.`);
    paragraph(`No siendo otro el objeto de la diligencia, se da por terminada el ${legalDate(defense?.hearing_end_at || new Date().toISOString(), true)}, una vez revisada y aprobada por quienes intervinieron.`);
    ensureSpace(48);
    y += 8;
    if (defense?.signature_data) {
      try { doc.addImage(defense.signature_data, 'PNG', 24, y, 58, 23); } catch { /* invalid legacy signature */ }
    }
    y += 26;
    doc.setFont('helvetica', 'bold');
    doc.text(employee, 22, y);
    doc.text((defense?.received_by || process.investigator_name || 'REPRESENTANTE DE LA EMPRESA').toUpperCase(), 118, y, { maxWidth: 76 });
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(`C.C. ${documentNumber}`, 22, y);
    doc.text(company, 118, y);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${page} de ${pages} · ${process.case_number}`, 108, height - 8, { align: 'center' });
    doc.setTextColor(0, 0, 0);
  }

  const suffix = kind === 'citation' ? 'citacion-descargos' : 'acta-descargos';
  doc.save(`${suffix}-${process.case_number}.pdf`);
}

export function generateCitationPdf(data: DisciplinaryPdfData) {
  return createLegalDocument(data, 'citation');
}

export function generateDefenseActPdf(data: DisciplinaryPdfData) {
  return createLegalDocument(data, 'defense_act');
}
