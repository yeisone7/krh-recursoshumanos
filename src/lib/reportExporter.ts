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
}

export function exportToExcel(report: ReportData, filename: string): void {
  // Create worksheet data
  const wsData: (string | number | null)[][] = [];
  
  // Add title row
  wsData.push([report.title]);
  if (report.subtitle) {
    wsData.push([report.subtitle]);
  }
  wsData.push([`Generado: ${format(report.generatedAt, "PPP 'a las' p", { locale: es })}`]);
  wsData.push([]); // Empty row
  
  // Add headers
  wsData.push(report.columns.map(col => col.header));
  
  // Add data rows
  report.data.forEach(row => {
    wsData.push(report.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (value instanceof Date) return format(value, 'yyyy-MM-dd');
      return String(value);
    }));
  });
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = report.columns.map(col => ({ wch: col.width || 15 }));
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  
  // Save file
  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

export function exportToPDF(report: ReportData, filename: string): void {
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
