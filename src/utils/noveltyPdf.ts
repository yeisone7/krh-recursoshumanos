import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { NOVELTY_TYPE_LABELS, type NoveltyType } from '@/types/payroll';

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const generateNoveltyPDF = async (novelty: any, userName: string, logoUrl?: string) => {
  const pageWidth = 80 * 2.83465;
  const pageHeight = 400 * 2.83465; 
  const doc = new jsPDF({
    unit: 'pt',
    format: [pageWidth, pageHeight]
  });

  const margin = 20;
  let cursorY = 25;

  // Header / Logo area
  if (logoUrl) {
    try {
      const logoBase64 = await loadImage(logoUrl);
      const imgWidth = (pageWidth - (margin * 2)) * 0.55; // Reduced width by 45% total
      const imgHeight = (imgWidth * 40) / 150; 
      doc.addImage(logoBase64, 'PNG', margin + ((pageWidth - margin * 2 - imgWidth) / 2), cursorY, imgWidth, imgHeight);
      cursorY += imgHeight + 10; // Increased space to lower the title
    } catch (e) {
      cursorY += 8;
    }
  }

  // Dashed Line Top
  doc.setLineDashPattern([3, 3], 0);
  doc.setLineWidth(0.5);
  doc.setDrawColor(150);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 8; // Increased space

  // Title
  doc.setFontSize(8); 
  doc.setFont('helvetica', 'bolditalic');
  doc.text('SOPORTE DE NOVEDAD LABORAL', pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 6; // Reduced space

  // Dashed Line Bottom
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10; // Reduced space

  // Employee Name
  const employee = novelty.employees_v2;
  const empName = `${employee?.first_name} ${employee?.last_name}`.toUpperCase();
  doc.setFontSize(8); 
  doc.setFont('helvetica', 'bolditalic');
  doc.text(empName, margin, cursorY);
  cursorY += 10; // Reduced space

  // Dates
  doc.setFontSize(7); 
  doc.setFont('helvetica', 'normal');
  const reportDate = formatDateOnly(novelty.novelty_date, 'dd/MM/yyyy');
  const genDate = novelty.created_at ? format(new Date(novelty.created_at), 'dd/MM/yyyy HH:mm:ss') : format(new Date(), 'dd/MM/yyyy HH:mm:ss');
  
  doc.text('Fecha Reporte:', margin, cursorY);
  doc.text(reportDate, margin + 80, cursorY);
  cursorY += 8; // Reduced space
  
  doc.text('Fecha Generada:', margin, cursorY);
  doc.text(genDate, margin + 80, cursorY);
  cursorY += 10; // Reduced space

  // Novelty Type
  doc.text('Novedad Reportada:', margin, cursorY);
  cursorY += 8; // Reduced space
  doc.setFont('helvetica', 'bold');
  const typeLabel = (NOVELTY_TYPE_LABELS[novelty.novelty_type as NoveltyType] || novelty.novelty_type).toUpperCase();
  doc.text(typeLabel, margin + 15, cursorY);
  cursorY += 12; // Reduced space

  // Specific Reason
  const specificReason = (novelty as any).novelty_reasons?.name || novelty.notes || 'N/A';
  doc.setFont('helvetica', 'normal');
  doc.text('Motivo Específico:', margin, cursorY);
  cursorY += 8; // Reduced space
  doc.setFont('helvetica', 'bold');
  
  // Wrap text for notes if long
  const reasonLines = doc.splitTextToSize(specificReason.toUpperCase(), pageWidth - margin * 3);
  doc.text(reasonLines, margin + 15, cursorY);
  cursorY += (reasonLines.length * 7) + 5; 

  // Hours
  doc.setFont('helvetica', 'normal');
  doc.text('Horas Reportadas:', margin, cursorY);
  cursorY += 30; // Reduced space
  
  doc.setFontSize(45); 
  doc.setFont('helvetica', 'bold');
  const hoursVal = novelty.hours?.toString() || '0';
  doc.text(hoursVal, pageWidth / 2, cursorY, { align: 'center' });
  
  // Underline for hours
  const hoursWidth = doc.getTextWidth(hoursVal);
  doc.setLineDashPattern([], 0); // Solid line
  doc.setLineWidth(2);
  doc.line((pageWidth / 2) - (hoursWidth / 2) - 5, cursorY + 4, (pageWidth / 2) + (hoursWidth / 2) + 5, cursorY + 4);
  cursorY += 20; // Reduced space

  // Reporter
  const reporterName = typeof userName === 'string' ? userName : (userName as any)?.full_name || (userName as any)?.name || 'N/A';
  doc.setFontSize(7); 
  doc.setFont('helvetica', 'normal');
  doc.text('Reportó:', margin, cursorY);
  cursorY += 10; // Reduced space
  doc.setFont('helvetica', 'bold');
  doc.text(reporterName.toUpperCase(), pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 20; // Reduced space

  // Footer Grid
  doc.setFontSize(5); 
  doc.setFont('helvetica', 'bold');
  doc.text('Impresión:', margin, cursorY);
  doc.text('Imprimió:', margin + 90, cursorY);
  cursorY += 8; // Reduced space
  
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(), 'dd/MM/yyyy HH:mm:ss'), margin, cursorY);
  doc.text(reporterName.toUpperCase(), margin + 90, cursorY, { maxWidth: 60 });
  
  return { doc, fileName: `NOVEDAD_${employee?.document_number}_${novelty.novelty_date}.pdf` };
};

export const exportNoveltyToPDF = async (novelty: any, userName: string, logoUrl?: string) => {
  const { doc, fileName } = await generateNoveltyPDF(novelty, userName, logoUrl);
  doc.save(fileName);
};

export const printNoveltyTicket = async (novelty: any, userName: string, logoUrl?: string) => {
  const { doc } = await generateNoveltyPDF(novelty, userName, logoUrl);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl as any, '_blank');
};
