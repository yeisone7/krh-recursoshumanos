import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CenterCompliance } from '@/hooks/useDotationCompliance';

const LOGO_PATH = '/images/petrocasinos-logo-white.png';
const WATERMARK_PATH = '/images/petrocasinos-watermark.png';

// ─── Excel Export ───────────────────────────────────────────

export function exportComplianceToExcel(compliance: CenterCompliance[]) {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const dateStr = format(now, "PPP 'a las' p", { locale: es });

  // ── Sheet 1: Resumen por Centro ──
  const summaryRows = compliance.map(c => ({
    'Centro de Operación': c.centerName,
    'Total Empleados': c.totalEmployees,
    '100% Cumplimiento': c.fullyCompliant,
    'Parcial': c.partiallyCompliant,
    'Sin Dotación': c.nonCompliant,
    '% Cumplimiento': `${c.percentage}%`,
  }));

  const totalEmployees = compliance.reduce((s, c) => s + c.totalEmployees, 0);
  const totalCompliant = compliance.reduce((s, c) => s + c.fullyCompliant, 0);
  const globalPct = totalEmployees > 0 ? Math.round((totalCompliant / totalEmployees) * 100) : 0;

  const summaryHeader = [
    ['Reporte de Cumplimiento de Dotación'],
    [`Generado: ${dateStr}`],
    [],
    [`Cumplimiento global: ${globalPct}% (${totalCompliant}/${totalEmployees} empleados al 100%)`],
    [],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryHeader);
  XLSX.utils.sheet_add_json(wsSummary, summaryRows, { origin: 'A6' });
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Centro');

  // ── Sheet 2: Detalle por Empleado ──
  const detailRows: any[] = [];
  for (const center of compliance) {
    for (const emp of center.employees) {
      const missingItems = emp.items.filter(i => i.isMissing).map(i => i.itemName);
      const deliveredItems = emp.items.filter(i => !i.isMissing && i.isRequired).map(i => i.itemName);
      detailRows.push({
        'Centro': center.centerName,
        'Empleado': emp.employeeName,
        'Cargo': emp.positionName,
        'Obligatorios': emp.totalRequired,
        'Entregados': emp.totalDelivered,
        'Faltantes': emp.missingRequired,
        '% Cumplimiento': `${emp.percentage}%`,
        'Artículos Entregados': deliveredItems.join(', ') || '-',
        'Artículos Faltantes': missingItems.join(', ') || '-',
      });
    }
  }

  const detailHeader = [
    ['Detalle de Cumplimiento por Empleado'],
    [`Generado: ${dateStr}`],
    [],
  ];

  const wsDetail = XLSX.utils.aoa_to_sheet(detailHeader);
  XLSX.utils.sheet_add_json(wsDetail, detailRows, { origin: 'A4' });
  wsDetail['!cols'] = [
    { wch: 24 }, { wch: 28 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle por Empleado');

  XLSX.writeFile(wb, `cumplimiento_dotacion_${format(now, 'yyyyMMdd_HHmmss')}.xlsx`);
}

// ─── PDF Export ─────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function exportComplianceToPDF(compliance: CenterCompliance[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const now = new Date();

  // Load assets
  let logoImg: HTMLImageElement | null = null;
  let watermarkImg: HTMLImageElement | null = null;
  try {
    [logoImg, watermarkImg] = await Promise.all([
      loadImage(LOGO_PATH),
      loadImage(WATERMARK_PATH),
    ]);
  } catch { /* proceed without branding */ }

  const totalEmployees = compliance.reduce((s, c) => s + c.totalEmployees, 0);
  const totalCompliant = compliance.reduce((s, c) => s + c.fullyCompliant, 0);
  const globalPct = totalEmployees > 0 ? Math.round((totalCompliant / totalEmployees) * 100) : 0;

  function addPageBranding() {
    // Watermark
    if (watermarkImg) {
      const canvas = document.createElement('canvas');
      canvas.width = watermarkImg.naturalWidth;
      canvas.height = watermarkImg.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.globalAlpha = 0.06;
      ctx.drawImage(watermarkImg, 0, 0);
      const wmData = canvas.toDataURL('image/png');
      const wmW = 97;
      const wmH = 54;
      doc.addImage(wmData, 'PNG', (pageWidth - wmW) / 2, (pageHeight - wmH) / 2, wmW, wmH);
    }

    // Header logo
    if (logoImg) {
      const canvas = document.createElement('canvas');
      canvas.width = logoImg.naturalWidth;
      canvas.height = logoImg.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(logoImg, 0, 0);
      const logoData = canvas.toDataURL('image/png');
      doc.addImage(logoData, 'PNG', margin, 5, 36, 16);
    }
  }

  addPageBranding();

  let yPos = logoImg ? 25 : margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte de Cumplimiento de Dotación', pageWidth / 2, yPos, { align: 'center' });
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generado: ${format(now, "PPP 'a las' p", { locale: es })}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Cumplimiento global: ${globalPct}% — ${totalCompliant} de ${totalEmployees} empleados al 100%`, pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0);
  yPos += 10;

  // ── Summary Table ──
  const summaryColumns = ['Centro', 'Empleados', '100%', 'Parcial', 'Sin Dotación', '% Cumplimiento'];
  const colWidths = [70, 30, 25, 25, 35, 35];
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableX = (pageWidth - tableWidth) / 2;

  // Header row
  doc.setFillColor(45, 55, 72);
  doc.rect(tableX, yPos, tableWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);

  let xOff = tableX;
  summaryColumns.forEach((col, i) => {
    doc.text(col, xOff + 2, yPos + 5.5);
    xOff += colWidths[i];
  });
  doc.setTextColor(0);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let alt = false;

  for (const center of compliance) {
    if (alt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, yPos, tableWidth, 7, 'F');
    }
    alt = !alt;

    const row = [
      center.centerName,
      String(center.totalEmployees),
      String(center.fullyCompliant),
      String(center.partiallyCompliant),
      String(center.nonCompliant),
      `${center.percentage}%`,
    ];

    xOff = tableX;
    row.forEach((val, i) => {
      doc.text(val, xOff + 2, yPos + 4.5, { maxWidth: colWidths[i] - 4 });
      xOff += colWidths[i];
    });

    doc.setDrawColor(226, 232, 240);
    doc.line(tableX, yPos + 7, tableX + tableWidth, yPos + 7);
    yPos += 7;
  }

  // ── Detail pages ──
  doc.addPage();
  addPageBranding();
  yPos = logoImg ? 25 : margin;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle por Empleado', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  const detCols = ['Centro', 'Empleado', 'Cargo', 'Obligatorios', 'Entregados', 'Faltantes', '%', 'Artículos Faltantes'];
  const detWidths = [40, 40, 35, 22, 22, 18, 14, 75];
  const detTableW = detWidths.reduce((a, b) => a + b, 0);
  const detX = (pageWidth - detTableW) / 2;

  function drawDetailHeader() {
    doc.setFillColor(45, 55, 72);
    doc.rect(detX, yPos, detTableW, 8, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);

    let x = detX;
    detCols.forEach((col, i) => {
      doc.text(col, x + 1.5, yPos + 5.5, { maxWidth: detWidths[i] - 3 });
      x += detWidths[i];
    });
    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    yPos += 8;
  }

  drawDetailHeader();
  alt = false;

  for (const center of compliance) {
    for (const emp of center.employees) {
      if (yPos + 7 > pageHeight - 15) {
        doc.addPage();
        addPageBranding();
        yPos = logoImg ? 25 : margin;
        drawDetailHeader();
        alt = false;
      }

      if (alt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(detX, yPos, detTableW, 7, 'F');
      }
      alt = !alt;

      const missingNames = emp.items.filter(i => i.isMissing).map(i => i.itemName).join(', ') || '-';
      const row = [
        center.centerName,
        emp.employeeName,
        emp.positionName,
        String(emp.totalRequired),
        String(emp.totalDelivered),
        String(emp.missingRequired),
        `${emp.percentage}%`,
        missingNames,
      ];

      let x = detX;
      row.forEach((val, i) => {
        doc.text(val, x + 1.5, yPos + 4.5, { maxWidth: detWidths[i] - 3 });
        x += detWidths[i];
      });

      doc.setDrawColor(226, 232, 240);
      doc.line(detX, yPos + 7, detX + detTableW, yPos + 7);
      yPos += 7;
    }
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  }

  doc.save(`cumplimiento_dotacion_${format(now, 'yyyyMMdd_HHmmss')}.pdf`);
}
