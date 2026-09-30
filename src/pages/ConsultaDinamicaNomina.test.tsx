import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConsultaDinamicaNomina from './ConsultaDinamicaNomina';
import {
  buildPayrollQueryRows,
  type PayrollQueryRow,
} from '@/lib/payrollDynamicQuery';
import {
  payrollQueryFixture,
  payrollQueryOptions,
} from '@/test/payrollQueryFixtures';

const state = vi.hoisted(() => ({
  auth: {
    user: { id: 'user-1' },
    currentCompanyId: 'company-1',
    assignedCenterIds: [] as string[],
    isAdmin: true,
    isSuperAdmin: false,
    permissionsLoaded: true,
    canView: (): boolean => true,
    canExport: (): boolean => true,
    companies: [{ id: 'company-1', name: 'Prueba' }],
  },
  data: [] as PayrollQueryRow[],
  error: false,
  loading: false,
  download: vi.fn(),
  refetch: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state.auth }));
vi.mock('@/lib/payrollControlCuts', () => ({
  colombiaToday: () => '2026-09-29',
}));
vi.mock('@/hooks/usePayrollDynamicQuery', () => ({
  usePayrollDynamicQuery: (period: unknown) => ({
    data: period ? state.data : undefined,
    isSuccess: !!period && !state.error,
    isError: state.error,
    isFetching: state.loading,
    error: new Error('Fuente no disponible'),
    dataUpdatedAt: 1,
    refetch: state.refetch,
  }),
}));
vi.mock('@/lib/payrollDynamicQueryExport', () => ({
  downloadPayrollQuery: state.download,
}));
beforeEach(() => {
  state.data = buildPayrollQueryRows(
    payrollQueryFixture(),
    payrollQueryOptions,
  );
  state.error = false;
  state.loading = false;
  state.auth.currentCompanyId = 'company-1';
  state.auth.canView = () => true;
  state.auth.canExport = () => true;
  state.download.mockReset();
  state.download.mockResolvedValue(undefined);
  state.refetch.mockReset();
});
afterEach(cleanup);
describe('Consulta Dinámica de Nómina', () => {
  it('exporta todos los campos aunque se hayan ocultado todas las columnas del grid', async () => {
    render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    fireEvent.click(screen.getByRole('button', { name: /^Limpiar$/ }));
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar todos los campos · Excel' }));
    await waitFor(() => expect(state.download).toHaveBeenCalledOnce());
    expect(state.download.mock.calls[0][0].columns.length).toBeGreaterThan(100);
    expect(state.download.mock.calls[0][0].rows[0].documentNumber).toBe('001234');
  });
  it('abre en detalle y mes de Colombia; consulta bajo demanda, cambia vistas y exporta todas las filas', async () => {
    render(<ConsultaDinamicaNomina />);
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-09-01');
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-09-30');
    expect(screen.getByRole('button', { name: 'Detalle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resumen' }));
    expect(screen.getByRole('table')).toHaveTextContent('TOTAL');
    fireEvent.click(screen.getByRole('button', { name: 'Pivote' }));
    expect(screen.getByRole('table')).toHaveTextContent('María Muñoz (001234)');
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }));
    fireEvent.click(screen.getByRole('button', { name: /^Excel$/ }));
    await waitFor(() => expect(state.download).toHaveBeenCalledOnce());
    expect(state.download.mock.calls[0][0].rows).toHaveLength(3);
    expect(state.download.mock.calls[0][0].metadata.Desde).toBe('2026-09-01');
  });
  it('pagina el grid pero exporta la consulta completa', async () => {
    state.data = Array.from({ length: 1501 }, (_, index) => ({
      ...state.data[0],
      id: `row-${index}`,
      values: { ...state.data[0].values, documentNumber: `00${index}` },
    }));
    render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getAllByRole('row')).toHaveLength(51);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('2 / 31')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^CSV$/ }));
    await waitFor(() => expect(state.download).toHaveBeenCalledOnce());
    expect(state.download.mock.calls[0][0].rows).toHaveLength(1501);
  });
  it('aplica filtros, ordena columnas y permite restaurarlas', () => {
    render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bajar Fecha' }));
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent(
      'Empleado',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Restaurar columnas iniciales' }),
    );
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('Fecha');
    fireEvent.change(screen.getByLabelText('Empleado o documento'), {
      target: { value: 'inexistente' },
    });
    expect(
      screen.getByText('No hay jornadas con los filtros actuales.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
  });
  it('bloquea exportación durante carga, error o cambio de período y muestra reintento', () => {
    const view = render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-09-29' },
    });
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    state.loading = true;
    view.rerender(<ConsultaDinamicaNomina />);
    expect(
      screen.getByText('Cargando jornadas y datos históricos…'),
    ).toBeInTheDocument();
    state.loading = false;
    state.error = true;
    view.rerender(<ConsultaDinamicaNomina />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se exportarán resultados parciales',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it('limpia consulta y filtros al cambiar empresa o alcance', () => {
    const view = render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    fireEvent.change(screen.getByLabelText('Empleado o documento'), {
      target: { value: 'María' },
    });
    state.auth.currentCompanyId = 'company-2';
    view.rerender(<ConsultaDinamicaNomina />);
    expect(screen.getByLabelText('Empleado o documento')).toHaveValue('');
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    expect(screen.queryByRole('table')).toBeNull();
  });
  it('respeta permisos de visualización y exportación', () => {
    state.auth.canExport = () => false;
    const view = render(<ConsultaDinamicaNomina />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Excel$/ })).toBeDisabled();
    state.auth.canView = () => false;
    view.rerender(<ConsultaDinamicaNomina />);
    expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso');
    expect(screen.queryByRole('table')).toBeNull();
  });
});
