import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportData {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  generatedAt: Date;
  organization?: string;
  institutional?: boolean;
  summary?: ReportSummaryItem[];
  currencyKeys?: string[];
}

export interface ReportSummaryItem {
  label: string;
  value: string | number;
  format?: 'currency' | 'number';
  tone?: 'default' | 'positive' | 'warning';
}

const INSTITUTIONAL_COLORS = {
  navy: '0B2D3A',
  teal: '087EA0',
  paleTeal: 'E7F3F6',
  slate: '52697A',
  border: 'D7E2E8',
  soft: 'F5F8FA',
  positive: '15803D',
  warning: 'C25D00',
};

function formatCurrency(value: number): string {
  return `$ ${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)}`;
}

function formatSummaryValue(item: ReportSummaryItem): string {
  if (item.format === 'currency' && typeof item.value === 'number') return formatCurrency(item.value);
  if (item.format === 'number' && typeof item.value === 'number') return item.value.toLocaleString('es-CO');
  return String(item.value);
}

function getReportValue(report: ReportData, key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (value instanceof Date) return format(value, 'dd/MM/yyyy');
  if (report.currencyKeys?.includes(key) && typeof value === 'number') return formatCurrency(value);
  return String(value);
}

export function exportToExcel(report: ReportData, filename: string): void {
  // Create worksheet data
  const wsData: (string | number | null)[][] = [];
  
  // Add institutional identification and report metadata.
  if (report.institutional) {
    wsData.push([(report.organization || 'Gestión Humana').toUpperCase()]);
  }
  wsData.push([report.title]);
  if (report.subtitle) {
    wsData.push([report.subtitle]);
  }
  wsData.push([`Generado: ${format(report.generatedAt, "PPP 'a las' p", { locale: es })}`]);
  wsData.push([]); // Empty row

  if (report.institutional && report.summary?.length) {
    wsData.push(report.summary.map(item => item.label));
    wsData.push(report.summary.map(item => item.value));
    wsData.push([]);
  }
  
  // Add headers
  const headerRowIndex = wsData.length;
  wsData.push(report.columns.map(col => col.header));
  
  // Add data rows
  report.data.forEach(row => {
    wsData.push(report.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return format(value, 'yyyy-MM-dd');
      return report.institutional ? value : String(value);
    }));
  });
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = report.columns.map(col => ({ wch: col.width || 15 }));

  if (report.institutional) {
    const lastColumn = Math.max(0, report.columns.length - 1);
    const metadataRows = report.subtitle ? 4 : 3;
    ws['!merges'] = Array.from({ length: metadataRows }, (_, row) => ({
      s: { r: row, c: 0 },
      e: { r: row, c: lastColumn },
    }));
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: headerRowIndex, c: 0 }, e: { r: wsData.length - 1, c: lastColumn } }),
    };
    ws['!rows'] = wsData.map((_, row) => ({
      hpt: row === 0 ? 24 : row === 1 ? 30 : row === headerRowIndex ? 28 : row > headerRowIndex ? 22 : 20,
    }));

    const styleCell = (row: number, column: number, style: Record<string, unknown>) => {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = ws[address] as XLSX.CellObject & { s?: Record<string, unknown> };
      if (cell) cell.s = style;
    };

    styleCell(0, 0, {
      font: { bold: true, color: { rgb: INSTITUTIONAL_COLORS.teal }, sz: 11 },
      alignment: { vertical: 'center' },
    });
    styleCell(1, 0, {
      font: { bold: true, color: { rgb: INSTITUTIONAL_COLORS.navy }, sz: 18 },
      alignment: { vertical: 'center' },
    });

    for (let column = 0; column <= lastColumn; column += 1) {
      styleCell(headerRowIndex, column, {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
        fill: { patternType: 'solid', fgColor: { rgb: INSTITUTIONAL_COLORS.navy } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: { bottom: { style: 'thin', color: { rgb: INSTITUTIONAL_COLORS.teal } } },
      });
    }

    const summaryLabelRow = headerRowIndex - 3;
    const summaryValueRow = headerRowIndex - 2;
    report.summary?.forEach((item, column) => {
      styleCell(summaryLabelRow, column, {
        font: { bold: true, color: { rgb: INSTITUTIONAL_COLORS.slate }, sz: 9 },
        fill: { patternType: 'solid', fgColor: { rgb: INSTITUTIONAL_COLORS.soft } },
        alignment: { horizontal: 'center', vertical: 'center' },
      });
      styleCell(summaryValueRow, column, {
        font: {
          bold: true,
          color: {
            rgb: item.tone === 'positive'
              ? INSTITUTIONAL_COLORS.positive
              : item.tone === 'warning'
                ? INSTITUTIONAL_COLORS.warning
                : INSTITUTIONAL_COLORS.navy,
          },
          sz: 12,
        },
        fill: { patternType: 'solid', fgColor: { rgb: INSTITUTIONAL_COLORS.soft } },
        alignment: { horizontal: 'center', vertical: 'center' },
      });
      const address = XLSX.utils.encode_cell({ r: summaryValueRow, c: column });
      if (item.format === 'currency' && ws[address]) ws[address].z = '"$" #,##0.00';
      if (item.format === 'number' && ws[address]) ws[address].z = '#,##0';
    });

    report.data.forEach((_, dataIndex) => {
      const row = headerRowIndex + dataIndex + 1;
      report.columns.forEach((column, columnIndex) => {
        const address = XLSX.utils.encode_cell({ r: row, c: columnIndex });
        if (report.currencyKeys?.includes(column.key) && ws[address]) ws[address].z = '"$" #,##0.00';
        styleCell(row, columnIndex, {
          fill: dataIndex % 2 === 1 ? { patternType: 'solid', fgColor: { rgb: INSTITUTIONAL_COLORS.soft } } : undefined,
          font: { color: { rgb: INSTITUTIONAL_COLORS.navy }, sz: 9 },
          alignment: {
            vertical: 'center',
            wrapText: true,
            horizontal: report.currencyKeys?.includes(column.key) ? 'right' : 'left',
          },
          border: { bottom: { style: 'hair', color: { rgb: INSTITUTIONAL_COLORS.border } } },
        });
      });
    });
  }
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  
  // Save file
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

export function exportToPDF(report: ReportData, filename: string): void {
  if (report.institutional) {
    exportInstitutionalPDF(report, filename);
    return;
  }

  const doc = new jsPDF({
    orientation: report.columns.length > 6 ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(report.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;
  
  // Subtitle
  if (report.subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(report.subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
  }
  
  // Generated date
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generado: ${format(report.generatedAt, "PPP 'a las' p", { locale: es })}`,
    pageWidth / 2,
    yPos,
    { align: 'center' }
  );
  doc.setTextColor(0);
  yPos += 10;
  
  // Calculate column widths
  const tableWidth = pageWidth - 2 * margin;
  const colCount = report.columns.length;
  const colWidth = tableWidth / colCount;
  
  // Table header
  doc.setFillColor(45, 55, 72);
  doc.rect(margin, yPos, tableWidth, 8, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  
  report.columns.forEach((col, i) => {
    const xPos = margin + i * colWidth + 2;
    doc.text(col.header, xPos, yPos + 5.5, { maxWidth: colWidth - 4 });
  });
  
  doc.setTextColor(0);
  yPos += 8;
  
  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  
  const rowHeight = 7;
  let alternateRow = false;
  
  report.data.forEach((row) => {
    // Check if we need a new page
    if (yPos + rowHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      
      // Repeat header on new page
      doc.setFillColor(45, 55, 72);
      doc.rect(margin, yPos, tableWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255);
      
      report.columns.forEach((col, i) => {
        const xPos = margin + i * colWidth + 2;
        doc.text(col.header, xPos, yPos + 5.5, { maxWidth: colWidth - 4 });
      });
      
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      yPos += 8;
      alternateRow = false;
    }
    
    // Alternate row background
    if (alternateRow) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, yPos, tableWidth, rowHeight, 'F');
    }
    alternateRow = !alternateRow;
    
    // Draw row data
    report.columns.forEach((col, i) => {
      const xPos = margin + i * colWidth + 2;
      let value = row[col.key];
      if (value === null || value === undefined) value = '-';
      if (value instanceof Date) value = format(value, 'dd/MM/yyyy');
      doc.text(String(value), xPos, yPos + 4.5, { maxWidth: colWidth - 4 });
    });
    
    // Draw row border
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos + rowHeight, margin + tableWidth, yPos + rowHeight);
    
    yPos += rowHeight;
  });
  
  // Footer with page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // Save file
  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}

function exportInstitutionalPDF(report: ReportData, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const tableWidth = pageWidth - margin * 2;
  const weights = report.columns.map(column => column.width || 15);
  const totalWeight = weights.reduce((sum, width) => sum + width, 0);
  const columnWidths = weights.map(width => (width / totalWeight) * tableWidth);
  const generatedLabel = format(report.generatedAt, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
  const navy: [number, number, number] = [11, 45, 58];
  const teal: [number, number, number] = [8, 126, 160];
  const slate: [number, number, number] = [82, 105, 122];
  const border: [number, number, number] = [215, 226, 232];
  const soft: [number, number, number] = [245, 248, 250];
  let yPos = 0;

  const drawBrandHeader = (firstPage: boolean) => {
    if (firstPage) {
      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, 29, 'F');
      doc.setFillColor(...teal);
      doc.roundedRect(margin, 7, 14, 14, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('GH', margin + 7, 16.3, { align: 'center' });
      doc.setFontSize(8);
      doc.text((report.organization || 'Gestión Humana').toUpperCase(), margin + 19, 10.5);
      doc.setFontSize(16);
      doc.text(report.title, margin + 19, 18);
      if (report.subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(220, 235, 241);
        doc.text(report.subtitle, margin + 19, 23.5);
      }
      doc.setFontSize(7.5);
      doc.setTextColor(220, 235, 241);
      doc.text(`Generado: ${generatedLabel}`, pageWidth - margin, 11, { align: 'right' });
      doc.text('DOCUMENTO DE USO INTERNO', pageWidth - margin, 17, { align: 'right' });
      yPos = 34;
      return;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...teal);
    doc.text((report.organization || 'Gestión Humana').toUpperCase(), margin, 9);
    doc.setTextColor(...navy);
    doc.text(report.title, margin, 14);
    doc.setDrawColor(...border);
    doc.line(margin, 17, pageWidth - margin, 17);
    yPos = 21;
  };

  const drawSummary = () => {
    if (!report.summary?.length) return;
    const gap = 3;
    const cardWidth = (tableWidth - gap * (report.summary.length - 1)) / report.summary.length;
    report.summary.forEach((item, index) => {
      const x = margin + index * (cardWidth + gap);
      doc.setFillColor(...soft);
      doc.setDrawColor(...border);
      doc.roundedRect(x, yPos, cardWidth, 17, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...slate);
      doc.text(item.label.toUpperCase(), x + 4, yPos + 5.5);
      doc.setFontSize(11);
      doc.setTextColor(...(
        item.tone === 'positive' ? [21, 128, 61]
          : item.tone === 'warning' ? [194, 93, 0]
            : navy
      ) as [number, number, number]);
      doc.text(formatSummaryValue(item), x + 4, yPos + 12.5);
    });
    yPos += 22;
  };

  const drawTableHeader = () => {
    const headerHeight = 11;
    doc.setFillColor(...navy);
    doc.rect(margin, yPos, tableWidth, headerHeight, 'F');
    let xPos = margin;
    report.columns.forEach((column, index) => {
      const width = columnWidths[index];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.3);
      doc.setTextColor(255, 255, 255);
      const lines = doc.splitTextToSize(column.header.toUpperCase(), width - 3).slice(0, 2);
      doc.text(lines, xPos + 1.5, yPos + (lines.length > 1 ? 4 : 6.5), { maxWidth: width - 3 });
      xPos += width;
    });
    yPos += headerHeight;
  };

  const addContinuationPage = () => {
    doc.addPage();
    drawBrandHeader(false);
    drawTableHeader();
  };

  drawBrandHeader(true);
  drawSummary();
  drawTableHeader();

  if (!report.data.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...slate);
    doc.text('No se encontraron registros para el período seleccionado.', pageWidth / 2, yPos + 12, { align: 'center' });
  }

  report.data.forEach((row, rowIndex) => {
    const values = report.columns.map((column, index) => {
      const text = getReportValue(report, column.key, row[column.key]);
      const lines = doc.splitTextToSize(text, columnWidths[index] - 3);
      if (lines.length <= 3) return lines;
      const visible = lines.slice(0, 3);
      visible[2] = `${visible[2].replace(/\.{3}$/, '')}...`;
      return visible;
    });
    const maxLines = Math.max(1, ...values.map(lines => lines.length));
    const rowHeight = Math.max(7.5, maxLines * 3.2 + 2.5);

    if (yPos + rowHeight > pageHeight - 13) addContinuationPage();

    if (rowIndex % 2 === 1) {
      doc.setFillColor(...soft);
      doc.rect(margin, yPos, tableWidth, rowHeight, 'F');
    }

    let xPos = margin;
    report.columns.forEach((column, index) => {
      const width = columnWidths[index];
      const isCurrency = report.currencyKeys?.includes(column.key);
      doc.setFont('helvetica', isCurrency ? 'bold' : 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(...navy);
      doc.text(values[index], isCurrency ? xPos + width - 1.5 : xPos + 1.5, yPos + 4.4, {
        align: isCurrency ? 'right' : 'left',
        maxWidth: width - 3,
      });
      doc.setDrawColor(...border);
      doc.line(xPos + width, yPos, xPos + width, yPos + rowHeight);
      xPos += width;
    });
    doc.setDrawColor(...border);
    doc.line(margin, yPos + rowHeight, margin + tableWidth, yPos + rowHeight);
    yPos += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...border);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...slate);
    doc.text('Centro de Reportes | Gestión Humana', margin, pageHeight - 5);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  doc.setProperties({
    title: report.title,
    subject: report.subtitle || 'Reporte institucional',
    author: report.organization || 'Gestión Humana',
    creator: 'Centro de Reportes',
  });
  doc.save(`${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`);
}
