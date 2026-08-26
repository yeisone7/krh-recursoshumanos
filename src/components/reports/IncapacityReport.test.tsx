import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IncapacityReport } from './IncapacityReport';

const mocks = vi.hoisted(() => ({
  exportToExcel: vi.fn(),
  exportToPDF: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentCompanyId: 'company-1',
    companies: [{ id: 'company-1', name: 'Petrocasinos S.A.' }],
  }),
}));

vi.mock('@/hooks/useReports', () => ({
  useIncapacityReport: () => ({
    isLoading: false,
    data: [{
      empleado: 'María Rodríguez',
      documento: '10000001',
      codigo_diagnostico: 'M75.1',
      diagnostico: 'Síndrome del manguito rotatorio',
      origen: 'Común',
      fecha_inicio: '01/08/2026',
      fecha_fin: '03/08/2026',
      dias_totales: 3,
      estado_recobro: 'Pendiente',
      monto_total: 180000,
      monto_recuperado: 60000,
      pendiente: 120000,
    }],
  }),
}));

vi.mock('@/lib/reportExporter', () => ({
  exportToExcel: mocks.exportToExcel,
  exportToPDF: mocks.exportToPDF,
}));

vi.mock('./ReportCard', () => ({
  ReportCard: ({ children, onExportExcel, onExportPDF }: {
    children: React.ReactNode;
    onExportExcel: () => void;
    onExportPDF: () => void;
  }) => (
    <div>
      {children}
      <button onClick={onExportExcel}>Exportar Excel</button>
      <button onClick={onExportPDF}>Exportar PDF</button>
    </div>
  ),
}));

describe('IncapacityReport', () => {
  beforeEach(() => {
    mocks.exportToExcel.mockClear();
    mocks.exportToPDF.mockClear();
  });

  it.each([
    ['Exportar Excel', mocks.exportToExcel],
    ['Exportar PDF', mocks.exportToPDF],
  ])('incluye el código diagnóstico y el formato institucional al %s', (button, exporter) => {
    render(<IncapacityReport />);

    fireEvent.click(screen.getByRole('button', { name: button }));

    expect(exporter).toHaveBeenCalledTimes(1);
    const report = exporter.mock.calls[0][0];
    expect(report.institutional).toBe(true);
    expect(report.organization).toBe('Petrocasinos S.A.');
    expect(report.columns).toContainEqual(expect.objectContaining({
      header: 'Código del Diagnóstico',
      key: 'codigo_diagnostico',
    }));
    expect(report.data[0].codigo_diagnostico).toBe('M75.1');
    expect(report.currencyKeys).toEqual(['monto_total', 'monto_recuperado', 'pendiente']);
    expect(report.summary).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Valor total', value: 180000 }),
      expect.objectContaining({ label: 'Recuperado', value: 60000 }),
      expect.objectContaining({ label: 'Pendiente', value: 120000 }),
    ]));
  });
});
