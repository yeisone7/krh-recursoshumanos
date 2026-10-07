import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ company: 'company-a', request: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentCompanyId: state.company,
    user: { id: 'user' },
    companies: [
      { id: 'company-a', name: 'Empresa A' },
      { id: 'company-b', name: 'Empresa B' },
    ],
  }),
}));
vi.mock('@/lib/reporting', () => ({ reportRequest: state.request }));
vi.mock('./ReportResults', () => ({
  ReportResults: ({
    report,
    onRefine,
  }: {
    report: { title: string };
    onRefine: (q: string) => void;
  }) => (
    <div>
      {report.title}
      <button onClick={() => onRefine('Agrúpalo por centro')}>
        Refinar prueba
      </button>
    </div>
  ),
}));
import { ReportWorkspace } from './ReportWorkspace';
const library = {
  version: 2,
  sources: [],
  centers: [],
  recent: [],
  favorites: [],
  provider: 'openai',
};
const result = {
  version: 2,
  id: 'report-1',
  title: 'Resultado verificado',
  question: 'Empleados activos',
  filters: {},
};
beforeEach(() => {
  state.company = 'company-a';
  state.request.mockReset();
  state.request.mockImplementation(async (_c, action) =>
    action === 'bootstrap' ? library : result,
  );
});
afterEach(cleanup);
describe('report workspace', () => {
  it('keeps the question after provider failures', async () => {
    render(<ReportWorkspace />);
    await waitFor(() =>
      expect(
        screen.queryByText('Cargando tus fuentes y reportes…'),
      ).not.toBeInTheDocument(),
    );
    state.request.mockRejectedValueOnce(new Error('Cuota agotada'));
    fireEvent.change(screen.getByLabelText('¿Qué te gustaría conocer?'), {
      target: { value: 'Empleados activos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    await screen.findByText('Cuota agotada');
    expect(screen.getByLabelText('¿Qué te gustaría conocer?')).toHaveValue(
      'Empleados activos',
    );
  });
  it('shows clarification without manufacturing results', async () => {
    render(<ReportWorkspace />);
    await waitFor(() =>
      expect(
        screen.queryByText('Cargando tus fuentes y reportes…'),
      ).not.toBeInTheDocument(),
    );
    state.request.mockResolvedValueOnce({
      status: 'clarification',
      message: '¿Qué periodo deseas analizar?',
    });
    fireEvent.change(screen.getByLabelText('¿Qué te gustaría conocer?'), {
      target: { value: 'Compara ausencias' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    await screen.findByText('¿Qué periodo deseas analizar?');
    expect(screen.queryByText('Resultado verificado')).not.toBeInTheDocument();
  });
  it('passes the parent execution and explicit period on refinement', async () => {
    render(<ReportWorkspace />);
    await waitFor(() =>
      expect(
        screen.queryByText('Cargando tus fuentes y reportes…'),
      ).not.toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('¿Qué te gustaría conocer?'), {
      target: { value: 'Empleados activos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    await screen.findByText('Resultado verificado');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Generar reporte' }),
      ).toBeEnabled(),
    );
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-10-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refinar prueba' }));
    await waitFor(() =>
      expect(state.request).toHaveBeenCalledWith(
        'company-a',
        'generate',
        expect.objectContaining({
          parentId: 'report-1',
          filters: { startDate: '2026-10-01' },
        }),
        expect.anything(),
      ),
    );
  });
  it('clears a previous tenant result and question on company change', async () => {
    const view = render(<ReportWorkspace />);
    await waitFor(() =>
      expect(
        screen.queryByText('Cargando tus fuentes y reportes…'),
      ).not.toBeInTheDocument(),
    );
    fireEvent.change(screen.getByLabelText('¿Qué te gustaría conocer?'), {
      target: { value: 'Empleados activos' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generar reporte' }));
    await screen.findByText('Resultado verificado');
    state.company = 'company-b';
    view.rerender(<ReportWorkspace />);
    expect(screen.queryByText('Resultado verificado')).not.toBeInTheDocument();
    expect(screen.getByLabelText('¿Qué te gustaría conocer?')).toHaveValue('');
    await waitFor(() =>
      expect(state.request).toHaveBeenCalledWith(
        'company-b',
        'bootstrap',
        {},
        expect.anything(),
      ),
    );
  });
});
