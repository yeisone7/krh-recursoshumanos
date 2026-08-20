import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  EmployeeInformationCenterSummary,
  EmployeeInformationCompletionReportData,
} from './employeeInformationCompletion';

const COLORS = {
  navy: [20, 53, 70] as const,
  primary: [0, 123, 160] as const,
  primaryLight: [231, 244, 249] as const,
  surface: [247, 250, 252] as const,
  border: [219, 229, 235] as const,
  muted: [91, 112, 126] as const,
  success: [24, 142, 103] as const,
  warning: [205, 133, 21] as const,
  danger: [194, 63, 63] as const,
};

function getPercentageColor(value: number) {
  if (value >= 90) return COLORS.success;
  if (value >= 70) return COLORS.warning;
  return COLORS.danger;
}

function sanitizeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function exportEmployeeInformationCompletionPdf(
  report: EmployeeInformationCompletionReportData,
  companyName?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const generatedAt = new Date();

  const setTextColor = (color: readonly number[]) => doc.setTextColor(color[0], color[1], color[2]);
  const setFillColor = (color: readonly number[]) => doc.setFillColor(color[0], color[1], color[2]);
  const setDrawColor = (color: readonly number[]) => doc.setDrawColor(color[0], color[1], color[2]);

  function drawHeader(title: string, subtitle: string) {
    setFillColor(COLORS.navy);
    doc.rect(0, 0, pageWidth, 29, 'F');
    setFillColor(COLORS.primary);
    doc.rect(0, 27, pageWidth, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(title, margin, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(215, 235, 242);
    doc.text(subtitle, margin, 19);
    doc.text(
      `Generado ${format(generatedAt, "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}`,
      pageWidth - margin,
      12,
      { align: 'right' },
    );
    if (companyName) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(companyName, pageWidth - margin, 19, { align: 'right' });
    }
  }

  function drawFooter(pageNumber: number, totalPages: number) {
    setDrawColor(COLORS.border);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(COLORS.muted);
    doc.text('Indicador basado en seis bloques de información del perfil de empleados activos.', margin, pageHeight - 6);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  function drawProgressBar(x: number, y: number, width: number, value: number, height = 4) {
    setFillColor(COLORS.border);
    doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
    if (value > 0) {
      setFillColor(getPercentageColor(value));
      doc.roundedRect(x, y, Math.max(width * (value / 100), height), height, height / 2, height / 2, 'F');
    }
  }

  function drawMetricCard(x: number, y: number, width: number, label: string, value: string, accent: readonly number[]) {
    setFillColor(COLORS.surface);
    doc.roundedRect(x, y, width, 23, 3, 3, 'F');
    setDrawColor(COLORS.border);
    doc.roundedRect(x, y, width, 23, 3, 3, 'S');
    setFillColor(accent);
    doc.roundedRect(x + 4, y + 5, 3, 13, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setTextColor(COLORS.navy);
    doc.text(value, x + 11, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(COLORS.muted);
    doc.text(label.toUpperCase(), x + 11, y + 17);
  }

  function drawCenterHeader(y: number) {
    const columns = [72, 34, 34, 34, 38];
    const headers = ['Centro de operación', 'Empleados activos', 'Perfiles al 100%', 'Con información pendiente', 'Diligenciamiento'];
    setFillColor(COLORS.navy);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header, x + 3, y + 5.1, { maxWidth: columns[index] - 5 });
      x += columns[index];
    });
  }

  function drawCenterRow(center: EmployeeInformationCenterSummary, y: number, alternate: boolean) {
    const columns = [72, 34, 34, 34, 38];
    const rowHeight = 9;
    if (alternate) {
      setFillColor(COLORS.surface);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    setDrawColor(COLORS.border);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(COLORS.navy);
    let x = margin;
    const values = [
      center.centerName,
      String(center.totalEmployees),
      String(center.fullyCompletedEmployees),
      String(center.pendingEmployees),
    ];
    values.forEach((value, index) => {
      doc.text(value, x + 3, y + 5.7, { maxWidth: columns[index] - 5 });
      x += columns[index];
    });
    const color = getPercentageColor(center.percentage);
    setFillColor(color);
    doc.roundedRect(x + 3, y + 2, 17, 5, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${center.percentage}%`, x + 11.5, y + 5.5, { align: 'center' });
  }

  function drawDetailHeader(y: number) {
    const columns = [30, 52, 45, 20, 103];
    const headers = ['Documento', 'Empleado', 'Centro de operación', 'Estado', 'Información pendiente'];
    setFillColor(COLORS.navy);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header, x + 3, y + 5.1, { maxWidth: columns[index] - 5 });
      x += columns[index];
    });
  }

  drawHeader('Informe de diligenciamiento de información', 'Estado general de los perfiles de empleados activos, consolidado y por centro de operación');

  let y = 39;
  const cardGap = 4;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  drawMetricCard(margin, y, cardWidth, 'Empleados evaluados', String(report.totalEmployees), COLORS.primary);
  drawMetricCard(margin + (cardWidth + cardGap), y, cardWidth, 'Diligenciamiento general', `${report.overallPercentage}%`, getPercentageColor(report.overallPercentage));
  drawMetricCard(margin + (cardWidth + cardGap) * 2, y, cardWidth, 'Perfiles completos', String(report.fullyCompletedEmployees), COLORS.success);
  drawMetricCard(margin + (cardWidth + cardGap) * 3, y, cardWidth, 'Con información pendiente', String(report.pendingEmployees), COLORS.warning);

  y += 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(COLORS.navy);
  doc.text('Calidad por bloque de información', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(COLORS.muted);
  doc.text('Cada porcentaje corresponde a empleados que completaron el bloque completo.', margin, y + 5);
  y += 11;

  const sectionWidth = (contentWidth - 10) / 6;
  report.sections.forEach((section, index) => {
    const x = margin + index * (sectionWidth + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(COLORS.navy);
    const sectionLabel = doc.splitTextToSize(section.label, sectionWidth);
    doc.text(sectionLabel, x, y, { maxWidth: sectionWidth });
    doc.setFontSize(11);
    doc.text(`${section.percentage}%`, x, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setTextColor(COLORS.muted);
    doc.text(`${section.completedEmployees}/${report.totalEmployees} empleados`, x, y + 13.5, { maxWidth: sectionWidth });
    drawProgressBar(x, y + 17, sectionWidth, section.percentage, 3);
  });

  y += 31;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(COLORS.navy);
  doc.text('Resumen por centro de operación', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(COLORS.muted);
  doc.text('El porcentaje mide los seis bloques de información en el conjunto de empleados de cada centro.', margin, y + 5);
  y += 10;
  drawCenterHeader(y);
  y += 8;

  let alternate = false;
  report.centers.forEach((center) => {
    if (y + 9 > pageHeight - 17) {
      doc.addPage();
      drawHeader('Informe de diligenciamiento de información', 'Resumen por centro de operación');
      y = 39;
      drawCenterHeader(y);
      y += 8;
      alternate = false;
    }
    drawCenterRow(center, y, alternate);
    alternate = !alternate;
    y += 9;
  });

  doc.addPage();
  drawHeader('Informe de diligenciamiento de información', 'Detalle de perfiles con sus bloques pendientes');
  y = 39;
  drawDetailHeader(y);
  y += 8;
  alternate = false;

  const detailColumns = [30, 52, 45, 20, 103];
  report.employees.forEach((employee) => {
    const pending = employee.pendingSections.length > 0 ? employee.pendingSections.join(', ') : 'Perfil completo';
    const pendingLines = doc.splitTextToSize(pending, detailColumns[4] - 6);
    const rowHeight = Math.max(9, pendingLines.length * 3.5 + 4);
    if (y + rowHeight > pageHeight - 17) {
      doc.addPage();
      drawHeader('Informe de diligenciamiento de información', 'Detalle de perfiles con sus bloques pendientes');
      y = 39;
      drawDetailHeader(y);
      y += 8;
      alternate = false;
    }
    if (alternate) {
      setFillColor(COLORS.surface);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    setDrawColor(COLORS.border);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setTextColor(COLORS.navy);
    let x = margin;
    doc.text(employee.documentNumber, x + 3, y + 5.6, { maxWidth: detailColumns[0] - 5 });
    x += detailColumns[0];
    doc.text(employee.fullName, x + 3, y + 5.6, { maxWidth: detailColumns[1] - 5 });
    x += detailColumns[1];
    doc.text(employee.centerName, x + 3, y + 5.6, { maxWidth: detailColumns[2] - 5 });
    x += detailColumns[2];
    const statusColor = getPercentageColor(employee.percentage);
    setFillColor(statusColor);
    doc.roundedRect(x + 3, y + 2, 14, 5, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text(`${employee.percentage}%`, x + 10, y + 5.5, { align: 'center' });
    x += detailColumns[3];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setTextColor(employee.pendingSections.length > 0 ? COLORS.muted : COLORS.success);
    doc.text(pendingLines, x + 3, y + 5.2, { maxWidth: detailColumns[4] - 6 });
    alternate = !alternate;
    y += rowHeight;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  doc.save(`informe_diligenciamiento_empleados_${sanitizeFileName(format(generatedAt, 'yyyyMMdd_HHmm'))}.pdf`);
}
