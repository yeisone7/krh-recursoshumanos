import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ReportColumn, ReportData } from '@/lib/reportExporter';

const COLUMNS_PER_SECTION = 8;

function chunkColumns(columns: ReportColumn[]): ReportColumn[][] {
  const chunks: ReportColumn[][] = [];
  for (let index = 0; index < columns.length; index += COLUMNS_PER_SECTION) {
    chunks.push(columns.slice(index, index + COLUMNS_PER_SECTION));
  }
  return chunks;
}

function printableValue(report: ReportData, key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (value instanceof Date) return format(value, 'dd/MM/yyyy');
  if (report.currencyKeys?.includes(key) && typeof value === 'number') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return String(value);
}

export function exportGeneralEmployeeReportToPDF(report: ReportData, filename: string): void {
  const document = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 9;
  const tableWidth = pageWidth - margin * 2;
  const navy: [number, number, number] = [11, 45, 58];
  const teal: [number, number, number] = [8, 126, 160];
  const slate: [number, number, number] = [82, 105, 122];
  const border: [number, number, number] = [215, 226, 232];
  const soft: [number, number, number] = [245, 248, 250];
  const sections = chunkColumns(report.columns);
  let y = 0;
  let currentSection = 0;

  const drawHeader = (columns: ReportColumn[], continuation: boolean) => {
    if (!continuation) {
      document.setFillColor(...navy);
      document.rect(0, 0, pageWidth, 29, 'F');
      document.setFillColor(...teal);
      document.roundedRect(margin, 7, 14, 14, 3, 3, 'F');
      document.setTextColor(255, 255, 255);
      document.setFont('helvetica', 'bold');
      document.setFontSize(10);
      document.text('GH', margin + 7, 16.3, { align: 'center' });
      document.setFontSize(8);
      document.text((report.organization || 'Gestión Humana').toUpperCase(), margin + 19, 10.5);
      document.setFontSize(15);
      document.text(report.title, margin + 19, 18);
      document.setFont('helvetica', 'normal');
      document.setFontSize(8);
      document.setTextColor(220, 235, 241);
      document.text(report.subtitle || '', margin + 19, 23.5);
      document.text(
        `Generado: ${format(report.generatedAt, "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
        pageWidth - margin,
        11,
        { align: 'right' },
      );
      y = 34;
    } else {
      document.setFont('helvetica', 'bold');
      document.setFontSize(8);
      document.setTextColor(...teal);
      document.text((report.organization || 'Gestión Humana').toUpperCase(), margin, 9);
      document.setTextColor(...navy);
      document.text(`${report.title} · Bloque ${currentSection + 1} de ${sections.length}`, margin, 14);
      document.setDrawColor(...border);
      document.line(margin, 17, pageWidth - margin, 17);
      y = 21;
    }

    document.setFont('helvetica', 'bold');
    document.setFontSize(7);
    document.setTextColor(...slate);
    document.text(`CAMPOS ${currentSection * COLUMNS_PER_SECTION + 1}–${currentSection * COLUMNS_PER_SECTION + columns.length} DE ${report.columns.length}`, margin, y);
    y += 4;

    const widths = columns.map((column) => column.width || 18);
    const totalWidth = widths.reduce((total, width) => total + width, 0);
    const normalizedWidths = widths.map((width) => (width / totalWidth) * tableWidth);
    document.setFillColor(...navy);
    document.rect(margin, y, tableWidth, 11, 'F');
    let x = margin;
    columns.forEach((column, index) => {
      document.setFont('helvetica', 'bold');
      document.setFontSize(6.5);
      document.setTextColor(255, 255, 255);
      const lines = document.splitTextToSize(column.header.toUpperCase(), normalizedWidths[index] - 3).slice(0, 2);
      document.text(lines, x + 1.5, y + (lines.length > 1 ? 4 : 6.5));
      x += normalizedWidths[index];
    });
    y += 11;
    return normalizedWidths;
  };

  sections.forEach((columns, sectionIndex) => {
    currentSection = sectionIndex;
    if (sectionIndex > 0) document.addPage();
    let widths = drawHeader(columns, false);

    report.data.forEach((row, rowIndex) => {
      const values = columns.map((column, index) => {
        const value = printableValue(report, column.key, row[column.key]);
        const lines = document.splitTextToSize(value, widths[index] - 3);
        if (lines.length <= 3) return lines;
        const visible = lines.slice(0, 3);
        visible[2] = `${visible[2]}…`;
        return visible;
      });
      const rowHeight = Math.max(7.5, Math.max(...values.map((lines) => lines.length)) * 3.1 + 2.5);

      if (y + rowHeight > pageHeight - 13) {
        document.addPage();
        widths = drawHeader(columns, true);
      }

      if (rowIndex % 2 === 1) {
        document.setFillColor(...soft);
        document.rect(margin, y, tableWidth, rowHeight, 'F');
      }

      let x = margin;
      columns.forEach((column, index) => {
        const isCurrency = report.currencyKeys?.includes(column.key);
        document.setFont('helvetica', isCurrency ? 'bold' : 'normal');
        document.setFontSize(6.3);
        document.setTextColor(...navy);
        document.text(values[index], isCurrency ? x + widths[index] - 1.5 : x + 1.5, y + 4.4, {
          align: isCurrency ? 'right' : 'left',
          maxWidth: widths[index] - 3,
        });
        document.setDrawColor(...border);
        document.line(x + widths[index], y, x + widths[index], y + rowHeight);
        x += widths[index];
      });
      document.setDrawColor(...border);
      document.line(margin, y + rowHeight, margin + tableWidth, y + rowHeight);
      y += rowHeight;
    });
  });

  const pages = document.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    document.setPage(page);
    document.setDrawColor(...border);
    document.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
    document.setFont('helvetica', 'normal');
    document.setFontSize(7);
    document.setTextColor(...slate);
    document.text('Centro de Reportes | Gestión Humana', margin, pageHeight - 5);
    document.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  document.setProperties({
    title: report.title,
    subject: report.subtitle || 'Informe general de empleados',
    author: report.organization || 'Gestión Humana',
    creator: 'Centro de Reportes',
  });
  document.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}
