import jsPDF from 'jspdf';
import { addWatermark, addHeader } from './watermark';

export function generatePositionProfilePdf(profile: any, positionName: string, areaName?: string) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 10;

  const addPage = () => {
    doc.addPage();
    y = 10;
    addWatermark(doc);
    addHeader(doc);
    y = 35;
  };

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - 20) addPage();
  };

  // Header
  addWatermark(doc);
  addHeader(doc);
  y = 35;

  // Document title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text('PERFIL DEL CARGO', pageW / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: GT-FO-10  |  Versión: ${profile.version}  |  Fecha: ${profile.effective_date || ''}`, pageW / 2, y, { align: 'center' });
  y += 8;

  // Helper: draw a section header
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

  // Helper: draw a row
  const row = (label: string, value: string, labelW = 45) => {
    checkPage(8);
    const lines = doc.splitTextToSize(value || '—', contentW - labelW - 4);
    const rowH = Math.max(6, lines.length * 4 + 2);

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

  // Section 1: Identification
  sectionHeader('1. IDENTIFICACIÓN DEL CARGO');
  row('Cargo', positionName);
  row('Área', areaName || '—');
  row('Reporta a', profile.reports_to || '');
  row('Supervisa a', profile.supervises || '');
  row('N° de Cargos', String(profile.num_positions || 1));
  row('Objetivo del Cargo', profile.purpose || '');
  y += 4;

  // Section 2: Profile
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
    profile.specific_knowledge.forEach((k: any) => {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${k.topic} (${k.level})`, marginL + 4, y + 3);
      y += 5;
    });
  }

  if (profile.skills?.length) {
    checkPage(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Competencias:', marginL + 2, y + 4);
    y += 6;
    profile.skills.forEach((s: any) => {
      checkPage(6);
      doc.setFont('helvetica', 'normal');
      doc.text(`• ${s.name} (${s.level})`, marginL + 4, y + 3);
      y += 5;
    });
  }
  y += 4;

  // Section 3: Functions
  if (profile.functions?.length) {
    sectionHeader('3. FUNCIONES DEL CARGO');
    profile.functions.forEach((f: string, i: number) => {
      checkPage(8);
      const lines = doc.splitTextToSize(f, contentW - 10);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${i + 1}.`, marginL + 2, y + 3);
      doc.text(lines, marginL + 8, y + 3);
      y += lines.length * 4 + 2;
    });
    y += 4;
  }

  // Section 4: Responsibilities
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
    respItems.forEach(([label, value]) => row(label, value));
    y += 4;
  }

  // Section 5: Working conditions
  const cond = profile.working_conditions || {};
  const condItems: [string, string][] = [
    ['Esfuerzo Físico', cond.physical_effort],
    ['Esfuerzo Mental', cond.mental_effort],
    ['Ambiente de Trabajo', cond.work_environment],
    ['Riesgos', cond.risks],
  ].filter(([, v]) => v) as [string, string][];

  if (condItems.length) {
    sectionHeader('5. CONDICIONES DE TRABAJO');
    condItems.forEach(([label, value]) => row(label, value));
    y += 4;
  }

  // Section 6: Approvals
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

  doc.save(`Perfil_${positionName.replace(/\s+/g, '_')}_v${profile.version}.pdf`);
}
