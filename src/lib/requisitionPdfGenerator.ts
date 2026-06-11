import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonnelRequisition } from '@/hooks/useRequisitions';
import {
  requisitionStatusLabels,
  requisitionReasonLabels,
  dayOfWeekLabels,
  recruitmentTypeLabels,
  autorizaLabels,
  RequisitionStatus,
  RequisitionReason,
  DayOfWeek,
  RecruitmentType,
  AutorizaType,
} from '@/types/requisition';

// ─── Brand palette ──────────────────────────────────────────────────────────
const NAVY      = [30, 41, 66]   as [number, number, number];
const NAVY_MID  = [50, 67, 107]  as [number, number, number];
const HEADER_BG = [226, 232, 240] as [number, number, number];
const HEADER_TEXT = [15, 23, 42] as [number, number, number];
const HEADER_MUTED = [71, 85, 105] as [number, number, number];
const ORANGE    = [230, 90, 20]  as [number, number, number];
const ORANGE_LT = [245, 130, 60] as [number, number, number];
const SLATE     = [71, 85, 105]  as [number, number, number];
const SLATE_LT  = [148, 163, 184]as [number, number, number];
const RULE      = [226, 232, 240]as [number, number, number];
const BG_LIGHT  = [248, 250, 252]as [number, number, number];
const WHITE     = [255, 255, 255]as [number, number, number];
const GREEN     = [22, 163, 74]  as [number, number, number];
const RED       = [220, 38, 38]  as [number, number, number];
const GRAY_MID  = [203, 213, 225]as [number, number, number];

type RequisitionPdfOptions = {
  logoUrl?: string | null;
};

// ─── Page metrics ───────────────────────────────────────────────────────────
const PW   = 216;   // Letter width mm
const PH   = 279;   // Letter height mm
const ML   = 14;    // Left margin
const MR   = 14;    // Right margin
const CW   = PW - ML - MR; // Content width

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return format(new Date(d), "dd/MM/yyyy", { locale: es });
}
function fmtLong(d: string | null | undefined) {
  if (!d) return '—';
  return format(new Date(d), "dd 'de' MMMM 'de' yyyy", { locale: es });
}
function fmtCOP(n: number | null | undefined) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
}
function val(v: string | null | undefined) { return v || '—'; }

function yesNo(v: boolean | null | undefined) {
  if (v === true) return 'Sí';
  if (v === false) return 'No';
  return 'No definido';
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
}
function shiftLabel(req: PersonnelRequisition): string {
  if (req.shifts?.name && req.shifts?.code) return `${req.shifts.name} (${req.shifts.code})`;
  if (req.shifts?.name) return req.shifts.name;
  if (req.shifts?.code) return req.shifts.code;
  return '—';
}

async function toBase64(src: string): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      res(c.toDataURL('image/png'));
    };
    img.onerror = rej;
    img.src = src;
  });
}

// ─── Section header ─────────────────────────────────────────────────────────
function section(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...NAVY_MID);
  doc.rect(ML, y, CW, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(title, ML + 4, y + 5);
  return y + 7;
}

// ─── Two-col label/value row ─────────────────────────────────────────────────
function row2(
  doc: jsPDF,
  y: number,
  l1: string, v1: string,
  l2: string, v2: string,
  rowH = 8
): number {
  const half = CW / 2;
  // left cell
  doc.setFillColor(...BG_LIGHT);
  doc.rect(ML, y, half, rowH, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(ML, y, half, rowH, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_LT);
  doc.text(l1, ML + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(v1, ML + 3, y + 6.5);

  // right cell
  const rx = ML + half;
  doc.setFillColor(...BG_LIGHT);
  doc.rect(rx, y, half, rowH, 'F');
  doc.rect(rx, y, half, rowH, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_LT);
  doc.text(l2, rx + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(v2, rx + 3, y + 6.5);

  return y + rowH;
}

// ─── Single full-width row ───────────────────────────────────────────────────
function row1(doc: jsPDF, y: number, label: string, value: string, rowH = 8): number {
  doc.setFillColor(...BG_LIGHT);
  doc.rect(ML, y, CW, rowH, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(ML, y, CW, rowH, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_LT);
  doc.text(label, ML + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(value, ML + 3, y + 6.5);
  return y + rowH;
}

// ─── Multiline text row ──────────────────────────────────────────────────────
function rowText(doc: jsPDF, y: number, label: string, text: string, maxH = 20): number {
  const lines = doc.splitTextToSize(text || '—', CW - 10);
  const h = Math.min(Math.max(lines.length * 4 + 6, 10), maxH);
  doc.setFillColor(...BG_LIGHT);
  doc.rect(ML, y, CW, h, 'F');
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.25);
  doc.rect(ML, y, CW, h, 'S');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_LT);
  doc.text(label, ML + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(lines, ML + 3, y + 7.5);
  return y + h;
}

// ─── Check new page ──────────────────────────────────────────────────────────
function checkPage(doc: jsPDF, y: number, needed = 30): number {
  if (y + needed > PH - 20) {
    doc.addPage();
    return 18;
  }
  return y;
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function addFooter(doc: jsPDF, companyName: string, pageNum: number) {
  const fy = PH - 10;
  doc.setFillColor(...NAVY);
  doc.rect(0, PH - 14, PW, 14, 'F');
  doc.setFillColor(...ORANGE);
  doc.rect(0, PH - 14, PW, 1.5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...WHITE);
  doc.text(companyName.toUpperCase(), ML, fy);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, PW / 2, fy, { align: 'center' });
  doc.text(`Pág. ${pageNum}`, PW - MR, fy, { align: 'right' });
}

// ─── Main generator ──────────────────────────────────────────────────────────
export async function generateRequisitionPDF(
  req: PersonnelRequisition,
  companyName: string,
  options: RequisitionPdfOptions = {}
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

  // ── HEADER BLOCK ──────────────────────────────────────────────────────────
  // Header band
  doc.setFillColor(...HEADER_BG);
  doc.rect(0, 0, PW, 40, 'F');
  // Orange bottom stripe
  doc.setFillColor(...ORANGE);
  doc.rect(0, 40, PW, 3, 'F');

  // Company logo from configuration
  try {
    if (!options.logoUrl) throw new Error('No company logo configured');
    const logoB64 = await toBase64(options.logoUrl);
    doc.addImage(logoB64, imageFormat(logoB64), ML, 7, 52, 25, undefined, 'FAST');
  } catch {
    doc.setTextColor(...HEADER_TEXT);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName.toUpperCase(), ML, 22);
  }

  // Divider vertical line
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(ML + 58, 8, ML + 58, 36);

  // Document title
  doc.setTextColor(...HEADER_TEXT);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUISICIÓN DE PERSONAL', ML + 64, 18);

  // Doc meta (code + version + date)
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...HEADER_MUTED);
  doc.text('Código: GT FO 218   Versión: 04', ML + 64, 25);
  const fechaReq = req.fecha_requisicion
    ? format(new Date(req.fecha_requisicion), 'dd/MM/yyyy')
    : '___/___/______';
  doc.text(`Fecha: ${fechaReq}`, ML + 64, 31);

  // Status pill top-right
  const status = req.estado_requisicion as RequisitionStatus;
  const statusLabel = (requisitionStatusLabels[status] || status).toUpperCase();
  let sc: [number, number, number] = ORANGE;
  if (status === 'aprobada') sc = GREEN;
  else if (status === 'rechazada') sc = RED;
  else if (status === 'borrador') sc = SLATE_LT;
  const pillW = doc.getTextWidth(statusLabel) + 8;
  doc.setFillColor(...sc);
  doc.roundedRect(PW - MR - pillW, 8, pillW, 7, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, PW - MR - pillW / 2, 12.8, { align: 'center' });

  // Number of vacancies pill
  const vacLabel = `${req.cantidad_vacantes_requeridas || '?'} VACANTE${(req.cantidad_vacantes_requeridas || 0) > 1 ? 'S' : ''}`;
  const vacW = doc.getTextWidth(vacLabel) + 8;
  doc.setFillColor(...SLATE);
  doc.roundedRect(PW - MR - vacW, 18, vacW, 7, 1.5, 1.5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(7);
  doc.text(vacLabel, PW - MR - vacW / 2, 22.8, { align: 'center' });

  let y = 50;

  // ── CARGO HIGHLIGHT ───────────────────────────────────────────────────────
  doc.setFillColor(240, 244, 255);
  doc.setDrawColor(...NAVY_MID);
  doc.setLineWidth(0.4);
  doc.rect(ML, y, CW, 12, 'FD');
  doc.setFillColor(...ORANGE);
  doc.rect(ML, y, 3, 12, 'F');
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`${val(req.requisition_code)} - ${val(req.cargo_solicitado)}`, ML + 7, y + 8);
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE);
  doc.text(val(req.operation_centers?.name), PW - MR - 6, y + 8, { align: 'right' });
  y += 16;

  // ── 1. DATOS DEL SOLICITANTE ──────────────────────────────────────────────
  y = section(doc, '1.  DATOS DEL SOLICITANTE', y);
  y = row2(doc, y, 'Nombre del Solicitante', val(req.solicitante_nombre), 'Cargo del Solicitante', val(req.cargo_solicitante));
  y = row2(doc, y, 'Centro de Operación', val(req.operation_centers?.name), 'Área', val(req.areas?.name));
  y = row2(doc, y, 'Fecha de la Requisición', fmt(req.fecha_requisicion), 'Fecha de Ingreso Estimada', fmtLong(req.fecha_ingreso_estimada));

  // ── 2. INFORMACIÓN DEL CARGO ──────────────────────────────────────────────
  y = checkPage(doc, y, 40);
  y += 3;
  y = section(doc, '2.  INFORMACIÓN DEL CARGO SOLICITADO', y);
  y = row2(doc, y, 'Codigo de Requisicion', val(req.requisition_code), 'Estado', statusLabel);
  y = row2(doc, y, 'Cargo Solicitado', val(req.cargo_solicitado), 'N.º de Vacantes', String(req.cantidad_vacantes_requeridas ?? '—'));
  y = row2(doc, y, 'Tipo de Turno', shiftLabel(req), 'Horario de Trabajo', val(req.horario_trabajo));
  y = row2(doc, y, 'Motivo de la Solicitud', val(req.motivo_solicitud ? (requisitionReasonLabels[req.motivo_solicitud as RequisitionReason] || req.motivo_solicitud) : null), 'Autoriza', val(req.autoriza ? (autorizaLabels[req.autoriza as AutorizaType] || req.autoriza) : null));
  y = row2(doc, y, 'Persona a Reemplazar', val(req.persona_a_reemplazar), 'Cargo a Reemplazar', val(req.cargo_a_reemplazar));
  if (req.observaciones_motivo_solicitud) {
    y = rowText(doc, y, 'Observaciones del Motivo', req.observaciones_motivo_solicitud);
  }

  // ── 3. CONDICIONES LABORALES ─────────────────────────────────────────────
  y = checkPage(doc, y, 40);
  y += 3;
  y = section(doc, '3.  CONDICIONES LABORALES', y);
  y = row2(doc, y, 'Salario Propuesto', fmtCOP(req.salario_propuesto), 'Tipo de Contrato', val(req.tipo_contrato_solicitado));
  y = row2(doc, y, 'Horario de Trabajo', val(req.horario_trabajo), 'Día de Descanso', val(req.dia_descanso_obligatorio ? (dayOfWeekLabels[req.dia_descanso_obligatorio as DayOfWeek] || req.dia_descanso_obligatorio) : null));
  const auxilio = req.rrhh_incluye_auxilio_transporte === true
    ? 'Sí tiene derecho al auxilio de transporte'
    : 'No tiene derecho al auxilio de transporte';
  const herramienta = req.requiere_herramienta_trabajo === true ? 'Sí' : req.requiere_herramienta_trabajo === false ? 'No' : '—';
  const trayecto = req.incluye_desplazamiento === true && req.trayecto_desplazamiento
    ? `Sí - ${req.trayecto_desplazamiento}`
    : yesNo(req.incluye_desplazamiento);
  y = row1(doc, y, 'Auxilio de Transporte', auxilio);
  y = row1(doc, y, 'Trayecto Incluido', trayecto);
  y = row1(doc, y, 'Requiere Herramientas de Trabajo', herramienta);

  // ── 4. DEFINICIONES RRHH ─────────────────────────────────────────────────
  y = checkPage(doc, y, 40);
  y += 3;
  y = section(doc, '4.  DEFINICIONES DE RECURSOS HUMANOS', y);
  y = row2(doc, y, 'Asignación Salarial RRHH', fmtCOP(req.rrhh_asignacion_salarial), 'Nivel Política Salarial', val(req.rrhh_nivel_politica_salarial));
  y = row1(doc, y, 'Tipo de Convocatoria', val(req.rrhh_tipo_convocatoria ? (recruitmentTypeLabels[req.rrhh_tipo_convocatoria as RecruitmentType] || req.rrhh_tipo_convocatoria) : null));

  // ── 5. DEFINICIONES JURÍDICAS ────────────────────────────────────────────
  y = checkPage(doc, y, 35);
  y += 3;
  y = section(doc, '5.  DEFINICIONES JURÍDICAS', y);
  y = row2(doc, y, 'Tipo de Contrato', val(req.juridico_tipo_contrato), 'Duración', val(req.juridico_duracion));
  if (req.juridico_observaciones) y = rowText(doc, y, 'Observaciones Jurídicas', req.juridico_observaciones);

  // ── 6. DEFINICIONES SELECCIÓN ────────────────────────────────────────────
  y = checkPage(doc, y, 30);
  y += 3;
  y = section(doc, '6.  DEFINICIONES DE SELECCIÓN', y);
  y = row1(doc, y, 'Fecha de Inicio del Proceso', fmtLong(req.seleccion_fecha_inicio_proceso));
  if (req.seleccion_observaciones) y = rowText(doc, y, 'Observaciones de Selección', req.seleccion_observaciones);

  // ── 7. FLUJO DE APROBACIONES ─────────────────────────────────────────────
  y = checkPage(doc, y, 70);
  y += 4;
  y = section(doc, '7.  FLUJO DE APROBACIONES', y);
  y += 3;

  const approvals = [
    { title: 'Coordinadores', approved: req.coordinadores_aprobado, who: req.coordinadores_quien_aprobo, date: req.coordinadores_fecha_aprobacion },
    { title: 'RRHH',       approved: req.rrhh_aprobado,       who: req.rrhh_quien_aprobo,       date: req.rrhh_fecha_aprobacion },
    { title: 'Jurídico',   approved: req.juridico_aprobado,   who: req.juridico_quien_aprobo,   date: req.juridico_fecha_aprobacion },
    { title: 'Operaciones',approved: req.operaciones_aprobado,who: req.operaciones_quien_aprobo, date: req.operaciones_fecha_aprobacion },
    { title: 'Gerencia',   approved: req.gerencia_aprobado,   who: req.gerencia_quien_aprobo,   date: req.gerencia_fecha_aprobacion },
    { title: 'Selección',  approved: req.seleccion_aprobado,  who: req.seleccion_quien_aprobo,  date: req.seleccion_fecha_aprobacion },
  ];

  const boxW = CW / approvals.length;
  const boxH = 46;
  const signH = 12;

  approvals.forEach((ap, i) => {
    const bx = ML + i * boxW;

    // Box background
    doc.setFillColor(...BG_LIGHT);
    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.3);
    doc.rect(bx, y, boxW, boxH, 'FD');

    // Status strip at top
    let stripC: [number, number, number] = GRAY_MID;
    if (ap.approved === true) stripC = GREEN;
    else if (ap.approved === false) stripC = RED;
    doc.setFillColor(...stripC);
    doc.rect(bx, y, boxW, 4, 'F');

    // Title
    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(ap.title, bx + boxW / 2, y + 10, { align: 'center' });

    // Status text
    doc.setFontSize(7);
    if (ap.approved === true) {
      doc.setTextColor(...GREEN);
      doc.text('✓ APROBADO', bx + boxW / 2, y + 17, { align: 'center' });
    } else if (ap.approved === false) {
      doc.setTextColor(...RED);
      doc.text('✗ RECHAZADO', bx + boxW / 2, y + 17, { align: 'center' });
    } else {
      doc.setTextColor(...SLATE_LT);
      doc.text('PENDIENTE', bx + boxW / 2, y + 17, { align: 'center' });
    }

    // Approver name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...SLATE);
    const whoText = ap.who ? (ap.who.length > 18 ? ap.who.substring(0, 18) + '…' : ap.who) : '________________________';
    doc.text(whoText, bx + boxW / 2, y + 24, { align: 'center' });

    // Date
    doc.setFontSize(6);
    doc.setTextColor(...SLATE_LT);
    doc.text(ap.date ? fmt(ap.date) : '___/___/______', bx + boxW / 2, y + 30, { align: 'center' });

    // Signature line
    doc.setDrawColor(...SLATE_LT);
    doc.setLineWidth(0.3);
    const sigY = y + boxH - signH;
    doc.line(bx + 4, sigY, bx + boxW - 4, sigY);
    doc.setFontSize(5.5);
    doc.setTextColor(...SLATE_LT);
    doc.text('Firma', bx + boxW / 2, sigY + 4, { align: 'center' });
  });

  y += boxH + 6;

  // ── OBSERVACIONES FINALES ────────────────────────────────────────────────
  const allObs = [req.operaciones_observaciones, req.gerencia_observaciones].filter(Boolean).join(' / ');
  if (allObs) {
    y = checkPage(doc, y, 25);
    y += 2;
    y = section(doc, '8.  OBSERVACIONES GENERALES', y);
    y = rowText(doc, y, 'Observaciones', allObs, 30);
  }

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    addFooter(doc, companyName, p);
  }

  return doc;
}

export async function exportRequisitionToPDF(
  requisition: PersonnelRequisition,
  companyName: string,
  options: RequisitionPdfOptions = {}
): Promise<void> {
  const doc = await generateRequisitionPDF(requisition, companyName, options);
  const code = (requisition.requisition_code || 'RQ').replace(/\s+/g, '_');
  const cargo = (requisition.cargo_solicitado || 'Requisicion').replace(/\s+/g, '_');
  doc.save(`Requisicion_${code}_${cargo}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
