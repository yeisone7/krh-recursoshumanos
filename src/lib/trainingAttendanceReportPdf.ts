import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { formatTrainingDuration } from '@/lib/trainingDuration';
import type { TrainingCompletion, TrainingCourseContent } from '@/types/training';

interface AttendanceReportCompany {
  name?: string | null;
  horizontal_logo_url?: string | null;
  logo_url?: string | null;
}

interface BuildAttendanceReportOptions {
  completions: TrainingCompletion[];
  company?: AttendanceReportCompany | null;
  centerName: string;
  courseName?: string;
  sourceLabel?: string;
}

const loadImageAsDataUrl = (src: string): Promise<string> => (
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('No se pudo procesar la imagen'));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject;
    image.src = src;
  })
);

const getImageSize = (src: string): Promise<{ width: number; height: number }> => (
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  })
);

const toValidDate = (value: string | null | undefined) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const drawContainedImage = async (
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 0,
) => {
  try {
    const image = await getImageSize(dataUrl);
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const ratio = Math.min(availableWidth / image.width, availableHeight / image.height);
    const renderWidth = image.width * ratio;
    const renderHeight = image.height * ratio;
    const renderX = x + (width - renderWidth) / 2;
    const renderY = y + (height - renderHeight) / 2;
    doc.addImage(dataUrl, 'PNG', renderX, renderY, renderWidth, renderHeight);
  } catch {
    // The report remains valid when a stored image cannot be rendered.
  }
};

const getEmployeePosition = (completion: TrainingCompletion) => {
  const workInfo = completion.employee?.employee_work_info?.find((info) => info.is_current)
    || completion.employee?.employee_work_info?.[0];
  return workInfo?.position_name || '-';
};

const getCourseObjective = (completion: TrainingCompletion) => {
  const course = completion.course;
  const content = course?.content as TrainingCourseContent | null | undefined;
  const objectives = Array.isArray(course?.objectives) ? course.objectives.join(' ') : course?.objectives;
  return course?.objective
    || objectives
    || content?.objetivos?.[0]
    || course?.description
    || 'Registrar la participacion y finalizacion de la capacitacion.';
};

const drawCellText = (
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { bold?: boolean; align?: 'left' | 'center'; size?: number } = {},
) => {
  doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
  doc.setFontSize(options.size || 8);
  doc.setTextColor(0, 0, 0);
  const safeValue = String(value || '-');
  const lines = doc.splitTextToSize(safeValue, width - 3).slice(0, Math.max(1, Math.floor(height / 4)));
  const lineHeight = (options.size || 8) * 0.36 + 1.5;
  const totalHeight = lines.length * lineHeight;
  const textY = y + Math.max((height - totalHeight) / 2 + lineHeight - 1, 4);
  const textX = options.align === 'center' ? x + width / 2 : x + 1.5;
  doc.text(lines, textX, textY, { align: options.align || 'left' });
};

const drawCheckbox = (doc: jsPDF, label: string, checked: boolean, x: number, y: number, width: number) => {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(label, x + 1, y + 5);
  doc.rect(x + width - 8, y + 1.5, 5, 5);
  if (checked) {
    doc.setLineWidth(0.8);
    doc.line(x + width - 7.2, y + 4, x + width - 5.9, y + 5.2);
    doc.line(x + width - 5.9, y + 5.2, x + width - 3.6, y + 2.4);
    doc.setLineWidth(0.2);
  }
};

const drawAttendanceReportPage = async (
  doc: jsPDF,
  pageRows: TrainingCompletion[],
  pageNumber: number,
  totalPages: number,
  logoDataUrl: string | null,
  centerName: string,
  courseName: string,
  dateText: string,
  companyName: string,
  sourceLabel: string,
  isLastPage: boolean,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const course = pageRows[0]?.course;
  const category = (course?.category || '').toLowerCase();
  const legal = (course?.legal_framework || '').toLowerCase();
  const audience = (course?.target_audience || '').toLowerCase();
  const modality = course?.modality === 'mixto' ? 'Hibrida' : course?.modality || '-';

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, 8, contentWidth, 22);
  doc.line(margin + 43, 8, margin + 43, 30);
  doc.line(pageWidth - margin - 34, 8, pageWidth - margin - 34, 30);
  if (logoDataUrl) await drawContainedImage(doc, logoDataUrl, margin + 2, 10, 39, 18, 1);
  drawCellText(doc, 'Registro de Asistencia', margin + 43, 8, contentWidth - 77, 22, { bold: true, align: 'center', size: 11 });
  drawCellText(doc, 'Codigo GH FO 36', pageWidth - margin - 34, 8, 34, 7, { align: 'center', size: 8 });
  doc.line(pageWidth - margin - 34, 15.3, pageWidth - margin, 15.3);
  drawCellText(doc, 'VERSION 02', pageWidth - margin - 34, 15.3, 34, 7, { align: 'center', size: 8 });
  doc.line(pageWidth - margin - 34, 22.6, pageWidth - margin, 22.6);
  drawCellText(doc, `No Paginas ${pageNumber}/${totalPages}`, pageWidth - margin - 34, 22.6, 34, 7.4, { align: 'center', size: 8 });

  let y = 34;
  doc.rect(margin, y, contentWidth, 25);
  drawCellText(doc, 'De acuerdo con la actividad por favor marcar', margin, y, contentWidth, 6, { bold: true, align: 'center', size: 8 });
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  const activityCellWidth = contentWidth / 2;
  ['Induccion', 'Reunion', 'Charla informativa'].forEach((label, index) => {
    drawCheckbox(doc, label, category.includes(label.toLowerCase().split(' ')[0]), margin, y + 6 + index * 6.3, activityCellWidth);
    doc.line(margin, y + 12.3 + index * 6.3, margin + activityCellWidth, y + 12.3 + index * 6.3);
  });
  [
    ['Capacitacion', !category.includes('induccion') && !category.includes('reinduccion') && !category.includes('charla')],
    ['Reinduccion', category.includes('reinduccion')],
    ['Entrenamiento grupal', category.includes('entren')],
  ].forEach(([label, checked], index) => {
    drawCheckbox(doc, label as string, Boolean(checked), margin + activityCellWidth, y + 6 + index * 6.3, activityCellWidth);
    doc.line(margin + activityCellWidth, y + 12.3 + index * 6.3, pageWidth - margin, y + 12.3 + index * 6.3);
  });

  y += 28;
  doc.rect(margin, y, contentWidth, 27);
  drawCellText(doc, 'Departamento/area/proceso responsable', margin, y, contentWidth, 6, { bold: true, align: 'center', size: 8 });
  doc.line(margin, y + 6, pageWidth - margin, y + 6);
  const areas: Array<[string, boolean]> = [
    ['Talento Humano', audience.includes('talento') || audience.includes('humano')],
    ['Bienestar y Desarrollo', audience.includes('bienestar')],
    ['SGI', category.includes('calidad') || legal.includes('iso')],
    ['SST', category.includes('hseq') || legal.includes('sst')],
    ['Ambiental', category.includes('ambiental')],
    ['Seguridad Alimentaria', category.includes('alimenta')],
    ['Juridica', category.includes('jurid')],
    ['PESV', legal.includes('pesv')],
    ['Otras', true],
  ];
  const areaWidth = contentWidth / 4;
  areas.slice(0, 8).forEach(([label, checked], index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    drawCheckbox(doc, label, checked, margin + column * areaWidth, y + 6 + row * 7, areaWidth);
  });
  doc.line(margin, y + 20, pageWidth - margin, y + 20);
  drawCellText(doc, `Cual: ${course?.target_audience || course?.category || '-'}`, margin, y + 20, contentWidth, 7, { size: 7 });

  y += 31;
  doc.rect(margin, y, contentWidth, 8);
  drawCellText(doc, `Contrato/ Sede/ Ciudad: ${centerName}`, margin, y, contentWidth * 0.58, 8, { bold: true, size: 8 });
  doc.line(margin + contentWidth * 0.58, y, margin + contentWidth * 0.58, y + 8);
  drawCellText(doc, `Fecha de ejecucion: ${dateText}`, margin + contentWidth * 0.58, y, contentWidth * 0.42, 8, { bold: true, size: 8 });

  y += 8;
  doc.rect(margin, y, contentWidth, 17);
  doc.line(margin + 35, y, margin + 35, y + 17);
  drawCellText(doc, 'Tematica', margin, y, 35, 17, { align: 'center', size: 8 });
  drawCellText(doc, courseName, margin + 35, y, contentWidth - 35, 17, { align: 'center', size: 12 });

  y += 17;
  doc.rect(margin, y, contentWidth, 8);
  doc.line(margin + 35, y, margin + 35, y + 8);
  drawCellText(doc, 'Duracion', margin, y, 35, 8, { align: 'center', size: 8 });
  drawCellText(doc, formatTrainingDuration(course?.duration_hours), margin + 35, y, contentWidth - 35, 8, { size: 8 });

  y += 10;
  doc.rect(margin, y, contentWidth, 18);
  doc.line(margin + 35, y, margin + 35, y + 18);
  drawCellText(doc, 'Objetivo', margin, y, 35, 18, { align: 'center', size: 8 });
  drawCellText(doc, getCourseObjective(pageRows[0]), margin + 35, y, contentWidth - 35, 18, { size: 8 });

  y += 23;
  doc.rect(margin, y, contentWidth, 7);
  drawCellText(doc, 'ASISTENTES', margin, y, contentWidth, 7, { bold: true, align: 'center', size: 9 });
  y += 7;
  const columns = [10, 71, 27, 42, 40];
  const headers = ['No', 'NOMBRE', 'CEDULA', 'CARGO', 'FIRMA'];
  let x = margin;
  headers.forEach((header, index) => {
    doc.rect(x, y, columns[index], 8);
    drawCellText(doc, header, x, y, columns[index], 8, { bold: true, align: 'center', size: 8 });
    x += columns[index];
  });

  y += 8;
  const rowHeight = 14;
  for (const [index, completion] of pageRows.entries()) {
    x = margin;
    const globalIndex = (pageNumber - 1) * 8 + index + 1;
    const values = [
      String(globalIndex),
      completion.operator_name,
      completion.operator_cedula || completion.employee?.document_number || '-',
      getEmployeePosition(completion),
    ];
    values.forEach((value, columnIndex) => {
      doc.rect(x, y, columns[columnIndex], rowHeight);
      drawCellText(doc, value, x, y, columns[columnIndex], rowHeight, { align: columnIndex === 0 ? 'center' : 'left', size: columnIndex === 1 ? 7.5 : 7 });
      x += columns[columnIndex];
    });
    doc.rect(x, y, columns[4], rowHeight);
    if (completion.signature_data) await drawContainedImage(doc, completion.signature_data, x, y, columns[4], rowHeight, 1);
    y += rowHeight;
  }

  if (isLastPage) {
    y += 3;
    doc.rect(margin, y, contentWidth, 14);
    doc.line(margin + 30, y, margin + 30, y + 14);
    drawCellText(doc, 'Realizada por:', margin, y, 30, 14, { align: 'center', size: 8 });
    const infoColumns = [42, 38, 40, 40];
    const infoHeaders = ['NOMBRE', 'FIRMA', 'PROFESION', 'MODALIDAD'];
    x = margin + 30;
    infoHeaders.forEach((header, index) => {
      doc.rect(x, y, infoColumns[index], 6);
      drawCellText(doc, header, x, y, infoColumns[index], 6, { bold: true, align: 'center', size: 7 });
      doc.rect(x, y + 6, infoColumns[index], 8);
      x += infoColumns[index];
    });
    drawCellText(doc, course?.provider || companyName || 'Sistema KRH', margin + 30, y + 6, infoColumns[0], 8, { align: 'center', size: 7 });
    drawCellText(doc, modality, margin + 30 + infoColumns[0] + infoColumns[1] + infoColumns[2], y + 6, infoColumns[3], 8, { align: 'center', size: 7 });

    y += 17;
    doc.rect(margin, y, contentWidth, 18);
    drawCellText(doc, `Observaciones: Informe generado desde ${sourceLabel} el ${format(new Date(), 'dd/MM/yyyy HH:mm')}.`, margin, y, contentWidth, 18, { size: 8 });
  }
};

export async function buildTrainingAttendanceReportPdf({
  completions,
  company,
  centerName,
  courseName,
  sourceLabel = 'evidencias',
}: BuildAttendanceReportOptions) {
  if (!completions.length) throw new Error('No hay finalizaciones para generar el informe');

  const doc = new jsPDF('p', 'mm', 'a4');
  const sorted = [...completions].sort((a, b) => a.operator_name.localeCompare(b.operator_name));
  const rowsPerPage = 8;
  const pages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const resolvedCourseName = courseName || sorted[0]?.course?.name || 'Capacitacion';
  const dates = sorted
    .map((completion) => toValidDate(completion.completed_at))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());
  const dateText = dates.length > 1
    ? `${format(dates[0], 'dd/MM/yyyy')} - ${format(dates[dates.length - 1], 'dd/MM/yyyy')}`
    : dates[0] ? format(dates[0], 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
  const logoUrl = company?.horizontal_logo_url || company?.logo_url || null;
  let logoDataUrl: string | null = null;

  if (logoUrl) {
    try {
      logoDataUrl = await loadImageAsDataUrl(logoUrl);
    } catch {
      logoDataUrl = null;
    }
  }

  for (let page = 0; page < pages; page += 1) {
    if (page > 0) doc.addPage();
    await drawAttendanceReportPage(
      doc,
      sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
      page + 1,
      pages,
      logoDataUrl,
      centerName,
      resolvedCourseName,
      dateText,
      company?.name || 'Sistema KRH',
      sourceLabel,
      page === pages - 1,
    );
  }

  return doc;
}

export function sanitizeTrainingReportFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'capacitacion';
}
