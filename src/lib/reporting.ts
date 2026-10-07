import { supabase } from '@/integrations/supabase/client';
import type {
  Cell,
  Field,
  ReportResult,
  Row,
} from '../../supabase/functions/_shared/reporting/types';
export type * from '../../supabase/functions/_shared/reporting/types';

export async function reportRequest<T>(
  companyId: string,
  action: string,
  payload: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-data-assistant', {
    body: { ...payload, version: 2, companyId, action },
    signal,
  });
  if (error) {
    let detail: { error?: string; code?: string } = {};
    try {
      detail = await error.context?.json();
    } catch {
      /* Network errors have no response body. */
    }
    throw Object.assign(
      new Error(
        detail?.error ||
          'No se pudo conectar con el asistente. Inténtalo nuevamente.',
      ),
      { code: detail?.code },
    );
  }
  if (data?.error)
    throw Object.assign(new Error(data.error), { code: data.code });
  return data as T;
}
export function formatReportCell(value: Cell, field: Field): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (field.type === 'number' && Number.isFinite(Number(value))) {
    return (
      new Intl.NumberFormat(
        'es-CO',
        field.unit === 'COP'
          ? { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }
          : { maximumFractionDigits: 2 },
      ).format(Number(value)) + (field.unit === 'percent' ? ' %' : '')
    );
  }
  if (field.type === 'date' || field.type === 'datetime') {
    const date = new Date(
      field.type === 'date'
        ? `${String(value).slice(0, 10)}T12:00:00Z`
        : String(value),
    );
    if (!Number.isNaN(date.getTime()))
      return new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        dateStyle: 'medium',
        ...(field.type === 'datetime' ? { timeStyle: 'short' as const } : {}),
      }).format(date);
  }
  return String(value);
}
export const safeCsv = (value: unknown) => {
  const text =
    typeof value === 'number'
      ? String(value)
      : String(value ?? '').replace(/^[\s]*[=+\-@]/, "'$&");
  return `"${text.replace(/"/g, '""')}"`;
};
export async function collectReportRows(
  fetchPage: (offset: number) => Promise<ReportResult>,
  signal: AbortSignal,
  progress: (loaded: number, total: number) => void,
): Promise<Row[]> {
  const rows: Row[] = [];
  let total: number | undefined;
  do {
    if (signal.aborted)
      throw new DOMException('Descarga cancelada', 'AbortError');
    const page = await fetchPage(rows.length);
    if (signal.aborted)
      throw new DOMException('Descarga cancelada', 'AbortError');
    if (total !== undefined && total !== page.totalRows)
      throw new Error('El resultado cambió. Vuelve a ejecutar el reporte.');
    total = page.totalRows;
    if (total > 50000)
      throw new Error(
        'La exportación admite hasta 50.000 filas. Reduce el alcance del reporte.',
      );
    if (
      page.offset !== rows.length ||
      (!page.rows.length && rows.length < total)
    )
      throw new Error('La descarga quedó incompleta. Inténtalo nuevamente.');
    rows.push(...page.rows);
    progress(rows.length, total);
  } while (rows.length < total);
  if (rows.length !== total)
    throw new Error('La descarga contiene un número inesperado de filas.');
  return rows;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportReport(
  format: 'csv' | 'xlsx' | 'pdf',
  report: ReportResult,
  rows: Row[],
  company: string,
  signal: AbortSignal,
  chart?: HTMLElement | null,
) {
  if (signal.aborted)
    throw new DOMException('Descarga cancelada', 'AbortError');
  const name =
    report.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'Reporte';
  if (format === 'csv') {
    const csv = [
      report.columns.map((c) => safeCsv(c.label)).join(';'),
      ...rows.map((r) =>
        report.columns.map((c) => safeCsv(r[c.key])).join(';'),
      ),
    ].join('\r\n');
    download(
      new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
      `${name}.csv`,
    );
    return;
  }
  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    if (signal.aborted)
      throw new DOMException('Descarga cancelada', 'AbortError');
    const ws = XLSX.utils.aoa_to_sheet([
      report.columns.map((c) => c.label),
      ...rows.map((r) => report.columns.map((c) => r[c.key] ?? '')),
    ]);
    ws['!cols'] = report.columns.map((c) => ({
      wch: Math.min(40, Math.max(18, c.label.length + 2)),
    }));
    ws['!autofilter'] = { ref: ws['!ref'] || 'A1' };
    rows.forEach((_, rowIndex) =>
      report.columns.forEach((column, columnIndex) => {
        const cell =
          ws[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
        if (!cell || column.type !== 'number') return;
        cell.z =
          column.unit === 'COP'
            ? '"$" #,##0;[Red]-"$" #,##0'
            : column.unit === 'percent'
              ? '0.00"%"'
              : '#,##0.##';
      }),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Empresa', company],
        ['Consulta', report.question],
        ['Generado', report.createdAt],
        ['Fuentes', report.sources.map((s) => s.label).join(', ')],
        [
          'Filtros',
          (report.effectiveFilters || [])
            .map((f) => f.label + ': ' + f.value)
            .join('; '),
        ],
        ['Resumen', report.summary],
      ]),
      'Contexto',
    );
    XLSX.writeFile(wb, `${name}.xlsx`);
    return;
  }
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const width = 277;
  let y = 16;
  const line = (text: string, size = 10) => {
    pdf.setFontSize(size);
    for (const part of pdf.splitTextToSize(text, width)) {
      if (y > 190) {
        pdf.addPage();
        y = 16;
      }
      pdf.text(part, 10, y);
      y += size * 0.45 + 1;
    }
  };
  line(report.title, 18);
  line(company, 12);
  line(`Consulta: ${report.question}`);
  line(
    `Fecha: ${new Date(report.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`,
  );
  line(`Fuentes: ${report.sources.map((s) => s.label).join(', ')}`);
  line(
    `Periodo: ${report.filters.startDate || 'Sin inicio'} a ${report.filters.endDate || 'Sin fin'}`,
  );
  line(
    `Filtros interpretados: ${(report.effectiveFilters || []).map((f) => `${f.label}: ${f.value}`).join('; ') || 'Sin filtros adicionales'}`,
  );
  line(report.summary);
  report.indicators.forEach((i) =>
    line(
      `${i.label}: ${formatReportCell(i.value, { key: '', label: i.label, type: 'number', unit: i.unit })}`,
    ),
  );
  if (chart) {
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(chart, {
      backgroundColor: '#ffffff',
      scale: 1.5,
    });
    if (signal.aborted)
      throw new DOMException('Descarga cancelada', 'AbortError');
    if (y + 65 > 190) {
      pdf.addPage();
      y = 16;
    }
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, y, 160, 60);
    y += 65;
  }
  // Horizontal bands preserve every column instead of squeezing or dropping wide tables.
  for (let start = 0; start < report.columns.length; start += 6) {
    const cols = report.columns.slice(start, start + 6),
      cellWidth = width / cols.length;
    pdf.addPage();
    y = 15;
    const header = () => {
      pdf.setFillColor(6, 107, 140);
      pdf.rect(10, y - 5, width, 10, 'F');
      pdf.setTextColor(255);
      pdf.setFontSize(8);
      cols.forEach((c, i) =>
        pdf.text(
          pdf.splitTextToSize(c.label, cellWidth - 4).slice(0, 2),
          12 + i * cellWidth,
          y,
        ),
      );
      pdf.setTextColor(30);
      y += 10;
    };
    header();
    for (let index = 0; index < rows.length; index++) {
      if (index % 100 === 0) {
        await new Promise((r) => setTimeout(r, 0));
        if (signal.aborted)
          throw new DOMException('Descarga cancelada', 'AbortError');
      }
      const cells = cols.map((c) =>
        pdf.splitTextToSize(
          formatReportCell(rows[index][c.key], c),
          cellWidth - 4,
        ),
      );
      const maxLines = Math.max(...cells.map((c) => c.length));
      for (let chunk = 0; chunk < maxLines; chunk += 35) {
        const height = Math.min(35, maxLines - chunk) * 4 + 3;
        if (y + height > 194) {
          pdf.addPage();
          y = 15;
          header();
        }
        if (index % 2 === 0) {
          pdf.setFillColor(245, 248, 250);
          pdf.rect(10, y - 3, width, height, 'F');
        }
        pdf.setFontSize(8);
        cells.forEach((parts, i) =>
          pdf.text(parts.slice(chunk, chunk + 35), 12 + i * cellWidth, y),
        );
        y += height;
      }
    }
  }
  if (signal.aborted)
    throw new DOMException('Descarga cancelada', 'AbortError');
  for (let p = 1; p <= pdf.getNumberOfPages(); p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.text(`${company} · ${p} / ${pdf.getNumberOfPages()}`, 10, 204);
  }
  pdf.save(`${name}.pdf`);
}
