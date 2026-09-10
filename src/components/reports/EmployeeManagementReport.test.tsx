import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmployeeManagementReport } from '@/components/reports/EmployeeManagementReport';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  excel: vi.fn(),
  pdf: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  currentCompanyId: 'company-1' as string | null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentCompanyId: mocks.currentCompanyId,
    companies: [{ id: 'company-1', name: 'Cosecharte' }],
  }),
}));

vi.mock('@/hooks/useGeneralEmployeeReport', () => ({
  useGeneralEmployeeReport: () => ({ data: [], isFetching: false, refetch: mocks.refetch }),
}));

vi.mock('@/lib/employeeManagementReport', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/employeeManagementReport')>();
  return { ...original, exportEmployeeManagementReportToExcel: mocks.excel };
});

vi.mock('@/lib/reportExporter', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/reportExporter')>();
  return { ...original, exportToPDF: mocks.pdf };
});

vi.mock('sonner', () => ({
  toast: { success: mocks.success, error: mocks.error, info: mocks.info },
}));

const row = {
  employee_id: 'employee-1', documento: '10001', nombre_completo: 'Ana Pérez',
  estado: 'Activo', activo: 'Sí', centro: 'Norte', area: 'Operaciones', cargo: 'Supervisora',
  sexo_biologico: 'Femenino', tipo_discapacidad: '-', tipo_contrato: 'Indefinido',
};

describe('EmployeeManagementReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentCompanyId = 'company-1';
    mocks.refetch.mockResolvedValue({ data: [row], error: null });
  });

  it('genera el Excel con la empresa actualmente seleccionada', async () => {
    render(<EmployeeManagementReport />);
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(mocks.excel).toHaveBeenCalledWith([row], 'Cosecharte'));
    expect(mocks.success).toHaveBeenCalledWith('Informe integral exportado a Excel.');
  });

  it('genera el resumen PDF', async () => {
    render(<EmployeeManagementReport />);
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));

    await waitFor(() => expect(mocks.pdf).toHaveBeenCalledOnce());
    expect(mocks.success).toHaveBeenCalledWith('Resumen de gestión exportado a PDF.');
  });

  it('informa cuando la empresa no tiene empleados', async () => {
    mocks.refetch.mockResolvedValue({ data: [], error: null });
    render(<EmployeeManagementReport />);
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(mocks.info).toHaveBeenCalled());
    expect(mocks.excel).not.toHaveBeenCalled();
  });

  it('muestra el error de consulta sin exportar', async () => {
    mocks.refetch.mockResolvedValue({ data: undefined, error: new Error('Sin conexión') });
    render(<EmployeeManagementReport />);
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Sin conexión'));
    expect(mocks.excel).not.toHaveBeenCalled();
  });

  it('exige una empresa seleccionada', async () => {
    mocks.currentCompanyId = null;
    render(<EmployeeManagementReport />);
    fireEvent.click(screen.getByRole('button', { name: /excel/i }));

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecciona una empresa para generar el informe.'));
    expect(mocks.refetch).not.toHaveBeenCalled();
  });
});
