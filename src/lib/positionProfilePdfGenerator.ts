import jsPDF from 'jspdf';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function generatePositionProfilePdf(profile: any, positionName: string, areaName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 10;

  // Preload images
  let logoImg: HTMLImageElement | null = null;
  let wmImg: HTMLImageElement | null = null;
  try { logoImg = await loadImage('/images/petrocasinos-watermark.png'); } catch { /* optional */ }
  try { wmImg = await loadImage('/images/petrocasinos-watermark.png'); } catch { /* optional */ }

  const HEADER_BOTTOM = 38; // y after header ends

  const drawHeader = () => {
    // Watermark
    if (wmImg) {
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
      doc.addImage(wmImg, 'PNG', (pageW - 97) / 2, (pageH - 54) / 2, 97, 54);
      doc.restoreGraphicsState();
    }
    // Logo
    if (logoImg) {
      doc.addImage(logoImg, 'PNG', marginL, 10, 36, 16);
    }
    // Title
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('PERFIL DEL CARGO', pageW / 2, 30, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Código: GT-FO-10  |  Versión: ${profile.version}  |  Fecha: ${profile.effective_date || ''}`, pageW / 2, 34, { align: 'center' });
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, 36, pageW - marginR, 36);
  };

  // Draw header on first page
  drawHeader();
  y = HEADER_BOTTOM + 2;

  const addPage = () => {
    doc.addPage();
    drawHeader();
    y = HEADER_BOTTOM + 2;
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) addPage();
  };

  const sectionHeader = (title: string) => {
    checkPage(12);
    doc.setFillColor(41, 128, 185);
    doc.rect(marginL, y, contentW, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, marginL + 2, y + 4.2);
    y += 8;
    doc.setTextColor(40, 40, 40);
  };

  const row = (label: string, value: string, labelW = 45) => {
    const lines = doc.splitTextToSize(value || '—', contentW - labelW - 4);
    const rowH = Math.max(6, lines.length * 4 + 2);
    checkPage(rowH);

    doc.setDrawColor(200, 200, 200);
    doc.rect(marginL, y, labelW, rowH);
    doc.rect(marginL + labelW, y, contentW - labelW, rowH);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginL + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, marginL + labelW + 2, y + 4);
    y += rowH;
  };

  // Section 1
  sectionHeader('1. IDENTIFICACIÓN DEL CARGO');
  row('Cargo', positionName);
  row('Área', areaName || '—');
  row('Reporta a', profile.reports_to || '');
  row('Supervisa a', profile.supervises || '');
  row('N° de Cargos', String(profile.num_positions || 1));
  row('Objetivo del Cargo', profile.purpose || '');
  y += 4;

  // Section 2
  sectionHeader('2. PERFIL DEL CARGO');
  row('Nivel de Educación', profile.education_level || '');
  row('Formación', profile.education_detail || '');
  row('Experiencia', profile.experience || '');

  if (profile.specific_knowledge?.length) {
    checkPage(10);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Conocimientos Específicos:', marginL + 2, y + 4);
    y += 6;
    for (const k of profile.specific_knowledge) {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${k.topic} (${k.level})`, marginL + 4, y + 3);
      y += 5;
    }
  }

  if (profile.skills?.length) {
    checkPage(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Competencias:', marginL + 2, y + 4);
    y += 6;
    for (const s of profile.skills) {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${s.name} (${s.level})`, marginL + 4, y + 3);
      y += 5;
    }
  }
  y += 4;

  // Section 3
  if (profile.functions?.length) {
    sectionHeader('3. FUNCIONES DEL CARGO');
    for (let i = 0; i < profile.functions.length; i++) {
      const f = profile.functions[i];
      const lines = doc.splitTextToSize(f, contentW - 10);
      checkPage(lines.length * 4 + 4);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}.`, marginL + 2, y + 3);
      doc.text(lines, marginL + 8, y + 3);
      y += lines.length * 4 + 2;
    }
    y += 4;
  }

  // Section 4
  const resp = profile.responsibilities || {};
  const respItems: [string, string][] = [
    ['Equipos', resp.equipment],
    ['Materiales', resp.materials],
    ['Dinero', resp.money],
    ['Información', resp.information],
    ['Relaciones Internas', resp.internal_relationships],
    ['Relaciones Externas', resp.external_relationships],
  ].filter(([, v]) => v) as [string, string][];

  if (respItems.length) {
    sectionHeader('4. RESPONSABILIDADES');
    for (const [label, value] of respItems) row(label, value);
    y += 4;
  }

  // Section 5
  const cond = profile.working_conditions || {};
  const condItems: [string, string][] = [
    ['Esfuerzo Físico', cond.physical_effort],
    ['Esfuerzo Mental', cond.mental_effort],
    ['Ambiente de Trabajo', cond.work_environment],
    ['Riesgos', cond.risks],
  ].filter(([, v]) => v) as [string, string][];

  if (condItems.length) {
    sectionHeader('5. CONDICIONES DE TRABAJO');
    for (const [label, value] of condItems) row(label, value);
    y += 4;
  }

  // Section 6
  sectionHeader('6. APROBACIONES');
  checkPage(20);
  const colW = contentW / 3;
  ['Elaborado por', 'Revisado por', 'Aprobado por'].forEach((title, i) => {
    const x = marginL + colW * i;
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, colW, 16);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(title, x + colW / 2, y + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    const val = i === 0 ? profile.elaborated_by : i === 1 ? profile.reviewed_by : profile.approved_by;
    doc.text(val || '—', x + colW / 2, y + 10, { align: 'center' });
  });

  // Add page numbers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(`Pág ${i} de ${totalPages}`, pageW - marginR, pageH - 10, { align: 'right' });
  }

  doc.save(`Perfil_${positionName.replace(/\s+/g, '_')}_v${profile.version}.pdf`);
}
