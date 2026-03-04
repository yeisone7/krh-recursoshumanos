import jsPDF from 'jspdf';
import type { ManualSection, ManualContentItem, ModuleDoc } from '@/data/manualContent';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function exportManualToPdf(
  sections: ManualSection[],
  moduleDocs: ModuleDoc[],
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  // ── Cover page ──
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text('Manual de Usuario', PAGE_W / 2, 100, { align: 'center' });
  doc.setFontSize(14);
  doc.text('Sistema de Gestión de Recursos Humanos', PAGE_W / 2, 115, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, PAGE_W / 2, 135, { align: 'center' });

  // ── Table of contents ──
  doc.addPage();
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  y = MARGIN;
  doc.text('Tabla de Contenido', MARGIN, y);
  y += 12;
  doc.setFontSize(11);

  const allSections = buildFullSections(sections, moduleDocs);
  allSections.forEach((s, i) => {
    if (y > PAGE_H - 20) { doc.addPage(); y = MARGIN; }
    doc.text(`${i + 1}. ${s.title}`, MARGIN, y);
    y += 7;
  });

  // ── Content pages ──
  allSections.forEach((section, idx) => {
    doc.addPage();
    y = MARGIN;
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`${idx + 1}. ${section.title}`, MARGIN, y);
    y += 10;

    y = renderContentItems(doc, section.content, y);

    // Subsections
    section.subsections?.forEach((sub) => {
      if (y > PAGE_H - 40) { doc.addPage(); y = MARGIN; }
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text(sub.title, MARGIN, y);
      y += 8;
      y = renderContentItems(doc, sub.content, y);
    });
  });

  doc.save('Manual_de_Usuario.pdf');
}

function buildFullSections(sections: ManualSection[], moduleDocs: ModuleDoc[]): ManualSection[] {
  const before = sections.slice(0, 3); // intro, access, roles
  const after = sections.slice(3);

  // Build modules section
  const moduleSubsections: ManualSection[] = moduleDocs.map((m) => ({
    id: `mod-${m.moduleCode}`,
    title: m.title,
    icon: m.icon,
    content: buildModuleContent(m),
  }));

  const modulesSection: ManualSection = {
    id: 'modulos',
    title: 'Descripción de Módulos',
    icon: 'Layers',
    content: [{ type: 'paragraph', data: 'Descripción funcional de cada módulo del sistema al que tiene acceso.' }],
    subsections: moduleSubsections,
  };

  return [...before, modulesSection, ...after];
}

function buildModuleContent(m: ModuleDoc): ManualContentItem[] {
  const items: ManualContentItem[] = [
    { type: 'paragraph', data: m.description },
  ];
  if (m.actions.length) {
    items.push({ type: 'heading', data: 'Acciones disponibles' });
    items.push({ type: 'list', data: m.actions });
  }
  if (m.validations.length) {
    items.push({ type: 'heading', data: 'Validaciones' });
    items.push({ type: 'list', data: m.validations });
  }
  if (m.restrictions.length) {
    items.push({ type: 'heading', data: 'Restricciones' });
    items.push({ type: 'list', data: m.restrictions });
  }
  if (m.alerts.length) {
    items.push({ type: 'heading', data: 'Alertas' });
    items.push({ type: 'list', data: m.alerts });
  }
  if (m.dependencies.length) {
    items.push({ type: 'heading', data: 'Dependencias' });
    items.push({ type: 'list', data: m.dependencies });
  }
  return items;
}

function renderContentItems(doc: jsPDF, items: ManualContentItem[], startY: number): number {
  let y = startY;

  for (const item of items) {
    if (y > PAGE_H - 25) { doc.addPage(); y = MARGIN; }

    switch (item.type) {
      case 'heading':
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        y += 3;
        doc.text(item.data, MARGIN, y);
        y += 7;
        break;

      case 'paragraph':
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const lines = doc.splitTextToSize(item.data, CONTENT_W);
        for (const line of lines) {
          if (y > PAGE_H - 15) { doc.addPage(); y = MARGIN; }
          doc.text(line, MARGIN, y);
          y += 5;
        }
        y += 2;
        break;

      case 'list':
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        for (const li of item.data as string[]) {
          if (y > PAGE_H - 15) { doc.addPage(); y = MARGIN; }
          const wrapped = doc.splitTextToSize(`• ${li}`, CONTENT_W - 4);
          for (const wl of wrapped) {
            doc.text(wl, MARGIN + 4, y);
            y += 5;
          }
        }
        y += 2;
        break;

      case 'table':
        y = renderTable(doc, item.data, y);
        break;

      case 'formula':
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        if (y > PAGE_H - 30) { doc.addPage(); y = MARGIN; }
        doc.text(item.data.name, MARGIN, y);
        y += 5;
        doc.setTextColor(0, 100, 150);
        doc.text(item.data.formula, MARGIN + 4, y);
        y += 6;
        doc.setTextColor(80, 80, 80);
        if (item.data.example) {
          const exLines = doc.splitTextToSize(`Ejemplo: ${item.data.example}`, CONTENT_W - 4);
          for (const el of exLines) {
            doc.text(el, MARGIN + 4, y);
            y += 5;
          }
        }
        y += 3;
        break;

      case 'alert':
        doc.setFontSize(10);
        doc.setTextColor(150, 100, 0);
        if (y > PAGE_H - 20) { doc.addPage(); y = MARGIN; }
        doc.text(`⚠ ${item.data.title}: ${item.data.message}`, MARGIN, y, { maxWidth: CONTENT_W });
        const alertLines = doc.splitTextToSize(`⚠ ${item.data.title}: ${item.data.message}`, CONTENT_W);
        y += alertLines.length * 5 + 3;
        break;
    }
  }
  return y;
}

function renderTable(doc: jsPDF, data: { headers: string[]; rows: string[][] }, startY: number): number {
  let y = startY;
  const colW = CONTENT_W / data.headers.length;

  // Header
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y - 4, CONTENT_W, 7, 'F');
  data.headers.forEach((h, i) => {
    doc.text(h, MARGIN + i * colW + 2, y);
  });
  y += 6;

  // Rows
  doc.setTextColor(80, 80, 80);
  for (const row of data.rows) {
    if (y > PAGE_H - 15) { doc.addPage(); y = MARGIN; }
    row.forEach((cell, i) => {
      const wrapped = doc.splitTextToSize(cell, colW - 4);
      doc.text(wrapped[0] || '', MARGIN + i * colW + 2, y);
    });
    y += 5;
  }
  y += 3;
  return y;
}
