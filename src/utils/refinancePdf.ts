import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

interface RefinanceData {
  employeeName: string;
  documentNumber: string;
  loanType: string;
  refinanceDate: string;
  previous: {
    totalAmount: number;
    interestRate: number;
    totalWithInterest: number;
    installments: number;
    installmentAmount: number;
    paidInstallments: number;
    paidAmount: number;
    remainingBalance: number;
  };
  newTerms: {
    totalAmount: number;
    interestRate: number;
    totalWithInterest: number;
    installments: number;
    installmentAmount: number;
    startDate: string;
  };
  reason: string;
  companyName?: string;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', vivienda: 'Vivienda', educacion: 'Educación',
  calamidad: 'Calamidad', libranza: 'Libranza', anticipo: 'Anticipo', otro: 'Otro',
};

export function generateRefinancePDF(data: RefinanceData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  const addLine = (text: string, fontSize = 10, style: 'normal' | 'bold' = 'normal', align: 'left' | 'center' = 'left') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    if (align === 'center') {
      doc.text(text, pageW / 2, y, { align: 'center' });
    } else {
      doc.text(text, marginL, y);
    }
    y += fontSize * 0.45;
  };

  const addRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(label, marginL + 5, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, marginL + contentW * 0.55, y);
    y += 5;
  };

  const drawSectionHeader = (title: string) => {
    doc.setFillColor(240, 240, 245);
    doc.rect(marginL, y - 4, contentW, 7, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 80);
    doc.text(title, marginL + 3, y);
    doc.setTextColor(0);
    y += 8;
  };

  // === Header ===
  if (data.companyName) {
    addLine(data.companyName, 14, 'bold', 'center');
    y += 2;
  }
  addLine('DOCUMENTO DE REFINANCIAMIENTO DE PRÉSTAMO', 13, 'bold', 'center');
  y += 2;

  // Horizontal line
  doc.setDrawColor(100, 100, 150);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // === Document info ===
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${format(new Date(data.refinanceDate), "d 'de' MMMM 'de' yyyy", { locale: es })}`, marginL, y);
  y += 8;

  // === Employee Info ===
  drawSectionHeader('DATOS DEL EMPLEADO');
  addRow('Nombre completo:', data.employeeName);
  addRow('Documento de identidad:', data.documentNumber);
  addRow('Tipo de préstamo:', LOAN_TYPE_LABELS[data.loanType] || data.loanType);
  y += 5;

  // === Previous Terms ===
  drawSectionHeader('CONDICIONES ANTERIORES');
  addRow('Monto original:', formatCurrency(data.previous.totalAmount));
  addRow('Tasa de interés:', `${data.previous.interestRate}%`);
  addRow('Total con interés:', formatCurrency(data.previous.totalWithInterest));
  addRow('Cuotas pactadas:', String(data.previous.installments));
  addRow('Valor cuota:', formatCurrency(data.previous.installmentAmount));
  addRow('Cuotas pagadas:', `${data.previous.paidInstallments} de ${data.previous.installments}`);
  addRow('Monto pagado:', formatCurrency(data.previous.paidAmount));
  addRow('Saldo pendiente:', formatCurrency(data.previous.remainingBalance));
  y += 5;

  // === New Terms ===
  drawSectionHeader('NUEVAS CONDICIONES (REFINANCIAMIENTO)');
  addRow('Monto refinanciado:', formatCurrency(data.newTerms.totalAmount));
  addRow('Nueva tasa de interés:', `${data.newTerms.interestRate}%`);
  addRow('Nuevo total con interés:', formatCurrency(data.newTerms.totalWithInterest));
  addRow('Nuevas cuotas:', String(data.newTerms.installments));
  addRow('Nuevo valor cuota:', formatCurrency(data.newTerms.installmentAmount));
  addRow('Fecha de inicio:', format(new Date(data.newTerms.startDate), "d 'de' MMMM 'de' yyyy", { locale: es }));
  y += 5;

  // === Reason ===
  if (data.reason) {
    drawSectionHeader('OBSERVACIONES');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(data.reason, contentW - 10);
    doc.text(lines, marginL + 5, y);
    y += lines.length * 4.5;
    y += 5;
  }

  // === Installment table (new schedule preview) ===
  drawSectionHeader('PLAN DE PAGOS PROYECTADO');
  
  // Table header
  const cols = [marginL + 2, marginL + 22, marginL + 65, marginL + 110];
  doc.setFillColor(230, 230, 240);
  doc.rect(marginL, y - 4, contentW, 6, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('No.', cols[0], y);
  doc.text('Fecha Estimada', cols[1], y);
  doc.text('Valor Cuota', cols[2], y);
  doc.text('Saldo Después', cols[3], y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  let balance = data.newTerms.totalWithInterest;
  const maxRows = Math.min(data.newTerms.installments, 24); // Limit to avoid page overflow
  
  for (let i = 0; i < maxRows; i++) {
    if (y > 250) {
      doc.addPage();
      y = 25;
    }
    balance -= data.newTerms.installmentAmount;
    const monthDate = new Date(data.newTerms.startDate);
    monthDate.setMonth(monthDate.getMonth() + i);
    
    doc.text(String(i + 1), cols[0], y);
    doc.text(format(monthDate, 'MMM yyyy', { locale: es }), cols[1], y);
    doc.text(formatCurrency(data.newTerms.installmentAmount), cols[2], y);
    doc.text(formatCurrency(Math.max(0, balance)), cols[3], y);
    y += 4.5;
  }

  if (data.newTerms.installments > 24) {
    y += 2;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`... y ${data.newTerms.installments - 24} cuotas más`, marginL + 5, y);
    y += 5;
  }

  // === Signatures ===
  y = Math.max(y + 15, 220);
  if (y > 240) {
    doc.addPage();
    y = 60;
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.3);

  // Employee signature
  doc.line(marginL, y, marginL + 65, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeName, marginL, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`C.C. ${data.documentNumber}`, marginL, y);
  doc.text('Empleado', marginL, y + 4);

  // Company signature
  const sigX = pageW / 2 + 10;
  doc.line(sigX, y - 9, sigX + 65, y - 9);
  doc.setFont('helvetica', 'bold');
  doc.text('Representante Legal', sigX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName || 'La Empresa', sigX, y + 4);

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120);
  doc.text(
    `Documento generado el ${format(new Date(), "d/MM/yyyy 'a las' HH:mm", { locale: es })}`,
    pageW / 2, pageH - 10, { align: 'center' }
  );

  return doc;
}
