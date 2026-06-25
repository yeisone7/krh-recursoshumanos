import { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Trash2, Eye, Download, List, FolderTree, Files, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrainingCompletions, useDeleteCompletion, useBulkDeleteCompletions, useTrainingCourses } from '@/hooks/useTraining';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import PizZip from 'pizzip';
import type { TrainingCompletion, TrainingCourseContent } from '@/types/training';
import EvidenciasTreeView from '@/components/training/EvidenciasTreeView';

export default function Evidencias() {
  const { currentCompanyId, companies } = useAuth();
  const { data: selectedCompany } = useCompany(currentCompanyId || undefined);
  const { data: completions = [], isLoading: isLoadingCompletions, isFetching: isFetchingCompletions } = useTrainingCompletions();
  const { data: courses = [], isLoading: isLoadingCourses } = useTrainingCourses();
  const deleteCompletion = useDeleteCompletion();
  const bulkDelete = useBulkDeleteCompletions();
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [signatureView, setSignatureView] = useState<string | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkCenter, setBulkCenter] = useState('');
  const [bulkCourse, setBulkCourse] = useState('');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isAttendanceReportGenerating, setIsAttendanceReportGenerating] = useState(false);

  const currentCompany = selectedCompany || companies.find(company => company.id === currentCompanyId);
  const isInitialLoading = isLoadingCompletions || isLoadingCourses;
  const isRefreshing = isFetchingCompletions && !isLoadingCompletions;

  const filtered = useMemo(() => {
    return (completions as TrainingCompletion[]).filter(c => {
      const matchSearch = c.operator_name.toLowerCase().includes(search.toLowerCase()) || (c.operator_cedula || '').includes(search);
      const matchCourse = filterCourse === 'all' || c.course_id === filterCourse;
      return matchSearch && matchCourse;
    });
  }, [completions, search, filterCourse]);

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(prev => prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)));

  const getCompletionCenter = (completion: TrainingCompletion) => ({
    id: (completion as any).token?.center?.id || (completion as any).token?.operation_center_id || 'sin-centro',
    name: (completion as any).token?.center?.name || 'Sin centro',
  });

  const centerOptions = useMemo(() => {
    const map = new Map<string, string>();
    (completions as TrainingCompletion[]).forEach((completion) => {
      const center = getCompletionCenter(completion);
      map.set(center.id, center.name);
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [completions]);

  const bulkCourseOptions = useMemo(() => {
    const source = (completions as TrainingCompletion[]).filter((completion) => {
      if (!bulkCenter) return true;
      return getCompletionCenter(completion).id === bulkCenter;
    });
    const map = new Map<string, string>();
    source.forEach((completion) => {
      map.set(completion.course_id, completion.course?.name || 'Sin capacitacion');
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bulkCenter, completions]);

  const bulkCandidates = useMemo(() => {
    if (!bulkCenter || !bulkCourse) return [];
    return (completions as TrainingCompletion[])
      .filter((completion) => getCompletionCenter(completion).id === bulkCenter && completion.course_id === bulkCourse)
      .sort((a, b) => a.operator_name.localeCompare(b.operator_name));
  }, [bulkCenter, bulkCourse, completions]);

  const selectedBulkCompletions = useMemo(
    () => bulkCandidates.filter((completion) => bulkSelected.has(completion.id)),
    [bulkCandidates, bulkSelected]
  );

  useEffect(() => {
    if (!bulkDialogOpen || !bulkCenter || bulkCourse || bulkCourseOptions.length === 0) return;
    setBulkCourse(bulkCourseOptions[0].id);
  }, [bulkCenter, bulkCourse, bulkCourseOptions, bulkDialogOpen]);

  useEffect(() => {
    if (!bulkDialogOpen || !bulkCourse) return;
    setBulkSelected(new Set(bulkCandidates.map((completion) => completion.id)));
  }, [bulkCandidates, bulkCourse, bulkDialogOpen]);

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBulkAll = () => {
    setBulkSelected(prev => (
      bulkCandidates.length > 0 && prev.size === bulkCandidates.length
        ? new Set()
        : new Set(bulkCandidates.map((completion) => completion.id))
    ));
  };

  const handleDelete = async (id: string) => { try { await deleteCompletion.mutateAsync(id); toast.success('Eliminado'); } catch { toast.error('Error'); } };
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    try { await bulkDelete.mutateAsync([...selected]); setSelected(new Set()); toast.success(`${selected.size} registros eliminados`); } catch { toast.error('Error'); }
  };

  const loadImageAsDataUrl = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject();
      img.src = src;
    });
  };

  const getImageSize = (src: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      img.onerror = () => reject();
      img.src = src;
    });
  };

  const drawContainedImage = async (
    doc: jsPDF,
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
    padding = 1.5
  ) => {
    try {
      const image = await getImageSize(dataUrl);
      const maxWidth = Math.max(width - padding * 2, 1);
      const maxHeight = Math.max(height - padding * 2, 1);
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const renderWidth = image.width * ratio;
      const renderHeight = image.height * ratio;
      const renderX = x + (width - renderWidth) / 2;
      const renderY = y + (height - renderHeight) / 2;
      doc.addImage(dataUrl, 'PNG', renderX, renderY, renderWidth, renderHeight);
    } catch {
      // Keep the report usable even if a stored signature cannot be rendered.
    }
  };

  const getEmployeePosition = (completion: TrainingCompletion) => {
    const currentWorkInfo = completion.employee?.employee_work_info?.find(info => info.is_current) || completion.employee?.employee_work_info?.[0];
    return currentWorkInfo?.position_name || '-';
  };

  const getCourseObjective = (completion: TrainingCompletion) => {
    const course = completion.course;
    const content = course?.content as TrainingCourseContent | null | undefined;
    return course?.objective
      || course?.objectives
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
    options: { bold?: boolean; align?: 'left' | 'center'; size?: number } = {}
  ) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(options.size || 8);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(value || '-', width - 3).slice(0, Math.max(1, Math.floor(height / 4)));
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
    isLastPage: boolean
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
    const activityCellW = contentWidth / 2;
    doc.line(margin + activityCellW, y + 6, margin + activityCellW, y + 25);
    ['Induccion', 'Reunion', 'Charla informativa'].forEach((label, idx) => {
      drawCheckbox(doc, label, category.includes(label.toLowerCase().split(' ')[0]), margin, y + 6 + idx * 6.3, activityCellW);
      doc.line(margin, y + 12.3 + idx * 6.3, margin + activityCellW, y + 12.3 + idx * 6.3);
    });
    [
      ['Capacitacion', !category.includes('induccion') && !category.includes('reinduccion') && !category.includes('charla')],
      ['Reinduccion', category.includes('reinduccion')],
      ['Entrenamiento grupal', category.includes('entren')],
    ].forEach(([label, checked], idx) => {
      drawCheckbox(doc, label as string, Boolean(checked), margin + activityCellW, y + 6 + idx * 6.3, activityCellW);
      doc.line(margin + activityCellW, y + 12.3 + idx * 6.3, pageWidth - margin, y + 12.3 + idx * 6.3);
    });

    y += 28;
    doc.rect(margin, y, contentWidth, 20);
    drawCellText(doc, 'Departamento/area/proceso responsable', margin, y, contentWidth, 6, { bold: true, align: 'center', size: 8 });
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    const areas = [
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
    const areaW = contentWidth / 4;
    areas.slice(0, 8).forEach(([label, checked], idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      drawCheckbox(doc, label as string, Boolean(checked), margin + col * areaW, y + 6 + row * 7, areaW);
    });
    drawCellText(doc, `Cual: ${course?.target_audience || course?.category || '-'}`, margin + areaW, y + 13, areaW * 3, 7, { size: 7 });

    y += 24;
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
    drawCellText(doc, course?.duration_hours ? formatDuration(course.duration_hours) : '-', margin + 35, y, contentWidth - 35, 8, { size: 8 });

    y += 10;
    doc.rect(margin, y, contentWidth, 18);
    doc.line(margin + 35, y, margin + 35, y + 18);
    drawCellText(doc, 'Objetivo', margin, y, 35, 18, { align: 'center', size: 8 });
    drawCellText(doc, getCourseObjective(pageRows[0]), margin + 35, y, contentWidth - 35, 18, { size: 8 });

    y += 23;
    doc.rect(margin, y, contentWidth, 7);
    drawCellText(doc, 'ASISTENTES', margin, y, contentWidth, 7, { bold: true, align: 'center', size: 9 });
    y += 7;
    const cols = [10, 71, 27, 42, 40];
    const headers = ['No', 'NOMBRE', 'CEDULA', 'CARGO', 'FIRMA'];
    let x = margin;
    headers.forEach((header, idx) => {
      doc.rect(x, y, cols[idx], 8);
      drawCellText(doc, header, x, y, cols[idx], 8, { bold: true, align: 'center', size: 8 });
      x += cols[idx];
    });

    y += 8;
    const rowHeight = 14;
    for (const [idx, completion] of pageRows.entries()) {
      x = margin;
      const globalIndex = (pageNumber - 1) * 8 + idx + 1;
      const rowValues = [
        String(globalIndex),
        completion.operator_name,
        completion.operator_cedula || completion.employee?.document_number || '-',
        getEmployeePosition(completion),
      ];
      rowValues.forEach((value, colIdx) => {
        doc.rect(x, y, cols[colIdx], rowHeight);
        drawCellText(doc, value, x, y, cols[colIdx], rowHeight, { align: colIdx === 0 ? 'center' : 'left', size: colIdx === 1 ? 7.5 : 7 });
        x += cols[colIdx];
      });
      doc.rect(x, y, cols[4], rowHeight);
      if (completion.signature_data) await drawContainedImage(doc, completion.signature_data, x, y, cols[4], rowHeight, 1);
      y += rowHeight;
    }

    if (isLastPage) {
      y += 3;
      doc.rect(margin, y, contentWidth, 14);
      doc.line(margin + 30, y, margin + 30, y + 14);
      drawCellText(doc, 'Realizada por:', margin, y, 30, 14, { align: 'center', size: 8 });
      const infoCols = [42, 38, 40, 40];
      const infoHeaders = ['NOMBRE', 'FIRMA', 'PROFESION', 'MODALIDAD'];
      x = margin + 30;
      infoHeaders.forEach((header, idx) => {
        doc.rect(x, y, infoCols[idx], 6);
        drawCellText(doc, header, x, y, infoCols[idx], 6, { bold: true, align: 'center', size: 7 });
        doc.rect(x, y + 6, infoCols[idx], 8);
        x += infoCols[idx];
      });
      drawCellText(doc, course?.provider || currentCompany?.name || 'Sistema KRH', margin + 30, y + 6, infoCols[0], 8, { align: 'center', size: 7 });
      drawCellText(doc, modality, margin + 30 + infoCols[0] + infoCols[1] + infoCols[2], y + 6, infoCols[3], 8, { align: 'center', size: 7 });

      y += 17;
      doc.rect(margin, y, contentWidth, 18);
      drawCellText(doc, `Observaciones: Informe generado desde evidencias el ${format(new Date(), 'dd/MM/yyyy HH:mm')}.`, margin, y, contentWidth, 18, { size: 8 });
    }
  };

  const buildAttendanceReportPdf = async (reportCompletions: TrainingCompletion[]) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const sorted = [...reportCompletions].sort((a, b) => a.operator_name.localeCompare(b.operator_name));
    const rowsPerPage = 8;
    const pages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
    const centerName = centerOptions.find(center => center.id === bulkCenter)?.name || getCompletionCenter(sorted[0]).name;
    const courseName = bulkCourseOptions.find(course => course.id === bulkCourse)?.name || sorted[0]?.course?.name || 'Capacitacion';
    const dates = sorted.map(c => parseISO(c.completed_at)).sort((a, b) => a.getTime() - b.getTime());
    const dateText = dates.length > 1
      ? `${format(dates[0], 'dd/MM/yyyy')} - ${format(dates[dates.length - 1], 'dd/MM/yyyy')}`
      : dates[0] ? format(dates[0], 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');
    const logoUrl = currentCompany?.horizontal_logo_url || currentCompany?.logo_url || null;
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
        courseName,
        dateText,
        page === pages - 1
      );
    }

    return doc;
  };

  const buildCertificatePdf = async (completion: TrainingCompletion) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // --- Navy blue header bar ---
    doc.setFillColor(15, 30, 60);
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Orange accent line under header
    doc.setFillColor(237, 137, 54);
    doc.rect(0, 38, pageWidth, 3, 'F');

    // Logo top-right on header
    try {
      const logoDataUrl = await loadImageAsDataUrl('/images/petrocasinos-logo-white.png');
      const tmpImg = new Image();
      tmpImg.src = logoDataUrl;
      await new Promise(r => { tmpImg.onload = r; });
      const logoH = 14;
      const logoW = (tmpImg.naturalWidth / tmpImg.naturalHeight) * logoH;
      doc.addImage(logoDataUrl, 'PNG', pageWidth - margin - logoW, 9, logoW, logoH);
    } catch { /* skip logo */ }

    // Company name in header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('PETROCASINOS S.A.', margin, 18);

    // Document title in header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 210, 230);
    doc.text('Constancia de Capacitación', margin, 28);

    // Document number / date on the right
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text(`Fecha de generación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, 28, { align: 'right' });

    // --- Certificate title ---
    let y = 56;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 30, 60);
    doc.text('CONSTANCIA DE CAPACITACIÓN', pageWidth / 2, y, { align: 'center' });

    // Decorative line under title
    y += 4;
    doc.setDrawColor(237, 137, 54);
    doc.setLineWidth(1.5);
    doc.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);

    // --- Body text ---
    y += 14;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const bodyText = `Se hace constar que el/la participante identificado(a) a continuación completó satisfactoriamente la capacitación indicada, cumpliendo con los requisitos de evaluación y asistencia establecidos.`;
    const bodyLines = doc.splitTextToSize(bodyText, contentWidth);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 6 + 10;

    // --- Information card ---
    const cardStartY = y;
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 60, 3, 3, 'FD');

    y += 10;
    const labelX = margin + 10;
    const valueX = margin + 55;

    const drawField = (label: string, value: string, yPos: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      doc.text(label, labelX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(value, valueX, yPos);
    };

    drawField('Participante:', completion.operator_name, y);
    y += 10;
    drawField('Cédula:', completion.operator_cedula || 'N/A', y);
    y += 10;
    drawField('Capacitación:', completion.course?.name || 'N/A', y);
    y += 10;
    drawField('Fecha:', format(parseISO(completion.completed_at), "dd 'de' MMMM 'de' yyyy - HH:mm", { locale: es }), y);
    y += 10;
    if (completion.quiz_score !== null && completion.quiz_score !== undefined) {
      drawField('Calificación:', `${completion.quiz_score}%`, y);
    }

    y = cardStartY + 60 + 15;

    // --- Signature section ---
    if (completion.signature_data) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 110, 130);
      doc.text('Firma del participante:', pageWidth / 2, y, { align: 'center' });
      y += 5;

      // Signature box
      const sigWidth = 100;
      const sigHeight = 40;
      const sigX = (pageWidth - sigWidth) / 2;
      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.roundedRect(sigX, y, sigWidth, sigHeight, 2, 2, 'S');

      try {
        doc.addImage(completion.signature_data, 'PNG', sigX + 5, y + 2, sigWidth - 10, sigHeight - 4);
      } catch { /* skip */ }

      y += sigHeight + 5;
      // Name under signature
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(completion.operator_name, pageWidth / 2, y, { align: 'center' });
      y += 4;
      doc.text(`C.C. ${completion.operator_cedula || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
    }

    // --- Footer ---
    // Orange line
    doc.setFillColor(237, 137, 54);
    doc.rect(0, pageHeight - 18, pageWidth, 2, 'F');

    // Footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text('Este documento es una constancia de capacitación generada electrónicamente por el sistema de gestión RRHH.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('PETROCASINOS S.A. — Sistema de Gestión de Capacitaciones', pageWidth / 2, pageHeight - 5, { align: 'center' });

    return doc;
  };

  const sanitizeFileName = (value: string) => (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'constancia'
  );

  const exportPdf = async (completion: TrainingCompletion) => {
    const doc = await buildCertificatePdf(completion);
    doc.save(`constancia-${sanitizeFileName(completion.operator_name)}.pdf`);
  };

  const handleOpenBulkDialog = () => {
    setBulkDialogOpen(true);
    if (!bulkCenter && centerOptions[0]) setBulkCenter(centerOptions[0].id);
  };

  const handleBulkGenerate = async () => {
    if (selectedBulkCompletions.length === 0) return;
    setIsBulkGenerating(true);
    try {
      const zip = new PizZip();
      for (const completion of selectedBulkCompletions) {
        const doc = await buildCertificatePdf(completion);
        const fileName = [
          'constancia',
          sanitizeFileName(completion.course?.name || 'capacitacion'),
          sanitizeFileName(completion.operator_name),
          sanitizeFileName(completion.operator_cedula || completion.id),
        ].join('-');
        zip.file(`${fileName}.pdf`, doc.output('arraybuffer'));
      }

      const blob = zip.generate({ type: 'blob', compression: 'DEFLATE' });
      const centerName = centerOptions.find((center) => center.id === bulkCenter)?.name || 'centro';
      const courseName = bulkCourseOptions.find((course) => course.id === bulkCourse)?.name || 'capacitacion';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `constancias-${sanitizeFileName(centerName)}-${sanitizeFileName(courseName)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${selectedBulkCompletions.length} constancias generadas`);
      setBulkDialogOpen(false);
    } catch {
      toast.error('No se pudieron generar las constancias');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleAttendanceReportGenerate = async () => {
    if (selectedBulkCompletions.length === 0) return;
    setIsAttendanceReportGenerating(true);
    try {
      const doc = await buildAttendanceReportPdf(selectedBulkCompletions);
      const centerName = centerOptions.find((center) => center.id === bulkCenter)?.name || 'centro';
      const courseName = bulkCourseOptions.find((course) => course.id === bulkCourse)?.name || 'capacitacion';
      doc.save(`registro-asistencia-${sanitizeFileName(centerName)}-${sanitizeFileName(courseName)}.pdf`);
      toast.success('Informe de asistencia generado');
    } catch {
      toast.error('No se pudo generar el informe de asistencia');
    } finally {
      setIsAttendanceReportGenerating(false);
    }
  };

  const FiltersSkeleton = () => (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-background border border-border/50 rounded-[2rem] p-4 shadow-sm mb-6">
      <div className="relative flex-1 w-full sm:max-w-md">
        <Skeleton className="h-12 w-full rounded-xl bg-muted/70" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl bg-muted/70 sm:w-64" />
    </div>
  );

  const TreeSkeleton = () => (
    <div className="rounded-md border bg-card p-4">
      <div className="space-y-4">
        {Array.from({ length: 11 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-3.5 rounded-sm bg-muted/70" />
            <Skeleton className="h-4 w-4 rounded-sm bg-muted/70" />
            <Skeleton className="h-4 bg-muted/70" style={{ width: `${150 + (index % 4) * 34}px` }} />
          </div>
        ))}
      </div>
    </div>
  );

  const TableSkeleton = () => (
    <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="space-y-0">
          <div className="grid grid-cols-[48px_1fr_140px_220px_150px_120px] gap-4 border-b bg-background px-4 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-4 bg-muted/70" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-[48px_1fr_140px_220px_150px_120px] gap-4 border-b px-4 py-4 last:border-b-0">
              <Skeleton className="h-5 w-5 rounded bg-muted/70" />
              <Skeleton className="h-4 w-3/4 bg-muted/70" />
              <Skeleton className="h-4 w-24 bg-muted/70" />
              <Skeleton className="h-6 w-44 rounded-full bg-muted/70" />
              <Skeleton className="h-4 w-28 bg-muted/70" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
                <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
                <Skeleton className="h-8 w-8 rounded-lg bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border border-border/50 rounded-[2rem] shadow-sm mb-8">
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Evidencias</h1>
            <p className="text-muted-foreground font-medium mt-1">Registro de capacitaciones completadas con firma digital</p>
          </div>
          <div className="flex gap-1 bg-background border border-border/50 rounded-xl p-1 shadow-inner shrink-0">
            <Button variant="ghost" className="h-10 rounded-lg px-3 text-xs font-bold uppercase tracking-wider" onClick={handleOpenBulkDialog} title="Exportar evidencias">
              <Files className="mr-2 h-4 w-4" />
              Exportar evidencias
            </Button>
            <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg ${viewMode === 'table' ? 'shadow-md' : ''}`} onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
            <Button variant={viewMode === 'tree' ? 'default' : 'ghost'} size="icon" className={`h-10 w-10 rounded-lg ${viewMode === 'tree' ? 'shadow-md' : ''}`} onClick={() => setViewMode('tree')}><FolderTree className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      {isInitialLoading ? (
        <FiltersSkeleton />
      ) : (
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-background border border-border/50 rounded-[2rem] p-4 shadow-sm mb-6">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o cédula..." className="pl-12 h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-full sm:w-64 h-12 rounded-xl border-border/50 bg-background shadow-inner text-sm">
            <SelectValue placeholder="Capacitación" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">Todas</SelectItem>
            {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.size > 0 && <Button variant="destructive" className="h-12 px-6 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-destructive/20 w-full sm:w-auto" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-2" /> Eliminar ({selected.size})</Button>}
      </div>
      )}

      {isInitialLoading ? (
        viewMode === 'tree' ? <TreeSkeleton /> : <TableSkeleton />
      ) : viewMode === 'tree' ? (
        <div className={`transition-opacity ${isRefreshing ? 'opacity-70' : ''}`}>
          <EvidenciasTreeView
            completions={filtered}
            onViewSignature={setSignatureView}
            onExportPdf={exportPdf}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <Card className={`rounded-[2rem] border-border/50 shadow-sm overflow-hidden transition-opacity ${isRefreshing ? 'opacity-70' : ''}`}>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-background">
                <TableRow>
                  <TableHead className="w-10 h-12"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Nombre</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Cédula</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Capacitación</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12">Fecha</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground h-12 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-16 h-32">No hay evidencias registradas</TableCell></TableRow>
                ) : filtered.map(c => (
                  <TableRow key={c.id} className="hover:bg-background /10 transition-colors">
                    <TableCell><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} /></TableCell>
                    <TableCell className="font-bold text-sm">{c.operator_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-medium">{c.operator_cedula || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-primary border-primary/20">{c.course?.name || '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{format(parseISO(c.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setSignatureView(c.signature_data)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => exportPdf(c)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!signatureView} onOpenChange={() => setSignatureView(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Firma Digital</DialogTitle></DialogHeader>
          {signatureView && <div className="bg-white rounded-lg p-4 border"><img src={signatureView} alt="Firma" className="w-full" /></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Exportar evidencias por centro y capacitacion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                value={bulkCenter}
                onValueChange={(value) => {
                  setBulkCenter(value);
                  setBulkCourse('');
                  setBulkSelected(new Set());
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Centro de operacion" />
                </SelectTrigger>
                <SelectContent>
                  {centerOptions.map((center) => (
                    <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={bulkCourse}
                onValueChange={(value) => {
                  setBulkCourse(value);
                  setBulkSelected(new Set());
                }}
                disabled={!bulkCenter}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Capacitacion" />
                </SelectTrigger>
                <SelectContent>
                  {bulkCourseOptions.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-border/60">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">Empleados capacitados</p>
                  <p className="text-xs text-muted-foreground">{selectedBulkCompletions.length} de {bulkCandidates.length} seleccionados</p>
                </div>
                <Button variant="outline" size="sm" onClick={toggleBulkAll} disabled={bulkCandidates.length === 0}>
                  {bulkSelected.size === bulkCandidates.length && bulkCandidates.length > 0 ? 'Limpiar' : 'Seleccionar todos'}
                </Button>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {bulkCandidates.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Selecciona un centro y una capacitacion con evidencias registradas.
                  </div>
                ) : (
                  bulkCandidates.map((completion) => (
                    <label key={completion.id} className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0 hover:bg-muted/40">
                      <Checkbox checked={bulkSelected.has(completion.id)} onCheckedChange={() => toggleBulkSelect(completion.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{completion.operator_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {completion.operator_cedula || 'Sin cedula'} - {format(parseISO(completion.completed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          {completion.quiz_score != null ? ` - ${completion.quiz_score}%` : ''}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={isBulkGenerating || isAttendanceReportGenerating}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={handleAttendanceReportGenerate}
                disabled={selectedBulkCompletions.length === 0 || isBulkGenerating || isAttendanceReportGenerating}
              >
                {isAttendanceReportGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                Informe asistencia
              </Button>
              <Button onClick={handleBulkGenerate} disabled={selectedBulkCompletions.length === 0 || isBulkGenerating || isAttendanceReportGenerating}>
                {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generar ZIP ({selectedBulkCompletions.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
