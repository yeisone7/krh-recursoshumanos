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
  const socialSecurity = report.sections.find((section) => section.key === 'socialSecurity');
  const bank = report.sections.find((section) => section.key === 'bank');

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
    doc.text('Indicadores agregados por centro de operación. No incluye detalle individual de empleados.', margin, pageHeight - 6);
    doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: 'right' });
  }

  function drawMetricCard(
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
    detail: string,
    accent: readonly number[],
  ) {
    setFillColor(COLORS.surface);
    doc.roundedRect(x, y, width, 24, 3, 3, 'F');
    setDrawColor(COLORS.border);
    doc.roundedRect(x, y, width, 24, 3, 3, 'S');
    setFillColor(accent);
    doc.roundedRect(x + 4, y + 5, 3, 14, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    setTextColor(COLORS.navy);
    doc.text(value, x + 11, y + 11);
    doc.setFontSize(7.3);
    doc.text(label.toUpperCase(), x + 11, y + 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    setTextColor(COLORS.muted);
    doc.text(detail, x + 11, y + 20.3);
  }

  function drawCenterHeader(y: number) {
    const columns = [72, 37, 37, 42, 37, 44];
    const headers = ['Centro de operación', 'Empleados analizados', 'Ficha completa', 'Seguridad social', 'Datos bancarios', 'Perfiles al 100%'];
    setFillColor(COLORS.navy);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header, x + 3, y + 5.1, { maxWidth: columns[index] - 5 });
      x += columns[index];
    });
  }

  function drawPercentageCell(x: number, y: number, value: number, count?: number) {
    const color = getPercentageColor(value);
    setFillColor(color);
    doc.roundedRect(x + 3, y + 2, 16, 5, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);
    doc.text(`${value}%`, x + 11, y + 5.5, { align: 'center' });
    if (count !== undefined) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      setTextColor(COLORS.muted);
      doc.text(`${count}`, x + 22, y + 5.5);
    }
  }

  function drawCenterRow(center: EmployeeInformationCenterSummary, y: number, alternate: boolean) {
    const columns = [72, 37, 37, 42, 37, 44];
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
    doc.text(center.centerName, x + 3, y + 5.7, { maxWidth: columns[0] - 5 });
    x += columns[0];
    doc.text(String(center.totalEmployees), x + 3, y + 5.7);
    x += columns[1];
    drawPercentageCell(x, y, center.percentage);
    x += columns[2];
    drawPercentageCell(x, y, center.socialSecurityPercentage, center.socialSecurityCompletedEmployees);
    x += columns[3];
    drawPercentageCell(x, y, center.bankPercentage, center.bankCompletedEmployees);
    x += columns[4];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setTextColor(COLORS.navy);
    doc.text(`${center.fullyCompletedEmployees}/${center.totalEmployees}`, x + 3, y + 5.7);
  }

  drawHeader(
    'Informe de diligenciamiento por centro de operación',
    'Estado agregado de la calidad de la información de empleados activos',
  );

  let y = 39;
  const cardGap = 5;
  const cardWidth = (contentWidth - cardGap) / 2;
  const socialPercentage = socialSecurity?.percentage || 0;
  const socialEmployees = socialSecurity?.completedEmployees || 0;
  const bankPercentage = bank?.percentage || 0;
  const bankEmployees = bank?.completedEmployees || 0;

  drawMetricCard(margin, y, cardWidth, 'Empleados analizados', String(report.totalEmployees), `${report.totalEmployees} activos`, COLORS.primary);
  drawMetricCard(margin + cardWidth + cardGap, y, cardWidth, 'Ficha completa', `${report.overallPercentage}%`, 'Promedio de calidad de datos', getPercentageColor(report.overallPercentage));
  y += 29;
  drawMetricCard(margin, y, cardWidth, 'Seguridad social completa', `${socialPercentage}%`, `${socialEmployees} empleados`, getPercentageColor(socialPercentage));
  drawMetricCard(margin + cardWidth + cardGap, y, cardWidth, 'Datos bancarios', `${bankPercentage}%`, `${bankEmployees} con banco`, getPercentageColor(bankPercentage));

  y += 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setTextColor(COLORS.navy);
  doc.text('Resumen consolidado por centro de operación', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setTextColor(COLORS.muted);
  doc.text('Los porcentajes se calculan sobre los empleados activos de cada centro.', margin, y + 5);
  y += 10;

  if (report.unavailableSections.length) {
    setFillColor([255, 248, 230]);
    doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
    doc.setFontSize(7.5);
    setTextColor(COLORS.warning);
    doc.text(`Bloques no disponibles en esta consulta: ${report.unavailableSections.join(', ')}.`, margin + 3, y + 5);
    y += 12;
  }

  drawCenterHeader(y);
  y += 8;
  let alternate = false;
  report.centers.forEach((center) => {
    if (y + 9 > pageHeight - 17) {
      doc.addPage();
      drawHeader('Informe de diligenciamiento por centro de operación', 'Resumen consolidado por centro de operación');
      y = 39;
      drawCenterHeader(y);
      y += 8;
      alternate = false;
    }
    drawCenterRow(center, y, alternate);
    alternate = !alternate;
    y += 9;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  doc.save(`informe_diligenciamiento_por_centro_${sanitizeFileName(format(generatedAt, 'yyyyMMdd_HHmm'))}.pdf`);
}
