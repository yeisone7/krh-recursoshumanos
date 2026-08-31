import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Seleccion from './Seleccion';

const mocks = vi.hoisted(() => ({
  companyId: 'company-a',
  vacancies: [
    { id: 'v1', position_title: 'Auxiliar', status: 'open', positions_count: 1, open_date: '2020-01-01', candidates: [] as { id: string }[] },
    { id: 'v2', position_title: 'Analista', status: 'open', positions_count: 1, open_date: '2020-01-01', candidates: [{ id: 'c1' }] },
  ],
}));

vi.mock('@/hooks/useVacancies', () => ({
  useVacancies: () => ({ data: mocks.vacancies, isLoading: false, isError: false, refetch: vi.fn() }),
  useDeleteVacancy: () => ({ isPending: false }),
}));
vi.mock('@/hooks/useCandidates', () => ({
  useCandidates: () => ({ data: [{ id: 'c1', vacancy_id: 'v2', first_name: 'Ana', last_name: 'Pérez', status: 'in_interview', current_step: 'entrevista_seleccion', application_date: '2020-01-01', updated_at: '2020-01-01', vacancies: { position_title: 'Analista' } }], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useRequisitions', () => ({
  useRequisitions: () => ({ data: [{ id: 'r1', requisition_code: 'RQ-01', cargo_solicitado: 'Auxiliar', estado_requisicion: 'en_rrhh', fecha_ingreso_estimada: null, vacancies: [] }], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: mocks.companyId, canCreate: () => false, canDelete: () => false }) }));
vi.mock('@/components/vacancies/VacancyFormDialog', () => ({ VacancyFormDialog: () => null }));
vi.mock('@/components/vacancies/CandidateFormDialog', () => ({ CandidateFormDialog: () => null }));
vi.mock('@/components/vacancies/VacancyDetailDialog', () => ({ VacancyDetailDialog: ({ open, vacancyId }: { open: boolean; vacancyId: string }) => open ? <div data-testid="vacancy-detail">{vacancyId}</div> : null }));
vi.mock('@/components/selection/CandidateDetailDialog', () => ({ CandidateDetailDialog: ({ open, candidateId }: { open: boolean; candidateId: string }) => open ? <div data-testid="candidate-detail">{candidateId}</div> : null }));
vi.mock('@/components/requisitions/RequisitionDetailDialog', () => ({ RequisitionDetailDialog: ({ open, requisitionId }: { open: boolean; requisitionId: string }) => open ? <div data-testid="requisition-detail">{requisitionId}</div> : null }));

afterEach(cleanup);

describe('Selección module alerts integration', () => {
  it.each([
    { description: /Ver detalle: RQ-01/, detail: 'requisition-detail', id: 'r1' },
    { description: /Ver detalle: Auxiliar/, detail: 'vacancy-detail', id: 'v1' },
    { description: /Ver detalle: Ana Pérez/, detail: 'candidate-detail', id: 'c1' },
  ])('opens the $detail from the module sidebar', ({ description, detail, id }) => {
    render(<MemoryRouter><Seleccion /></MemoryRouter>);
    const sidebar = screen.getByRole('complementary', { name: 'Alertas de requisiciones y selección' });
    expect(within(sidebar).getByText('3 alertas (0 críticas)')).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole('button', { name: description }));
    expect(screen.getByTestId(detail)).toHaveTextContent(id);
  });
  it('keeps alerts visible independently of the vacancy search', () => {
    render(<MemoryRouter><Seleccion /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText('Buscar por cargo, área o requisición...'), { target: { value: 'sin coincidencias' } });
    expect(screen.getByText('Sin vacantes registradas')).toBeInTheDocument();
    expect(screen.getByText('3 alertas (0 críticas)')).toBeInTheDocument();
  });
});

describe('Selección vacancy pagination', () => {
  beforeEach(() => {
    mocks.companyId = 'company-a';
    mocks.vacancies = Array.from({ length: 26 }, (_, index) => ({
      id: `v${index + 1}`,
      position_title: `Cargo ${String(index + 1).padStart(2, '0')}`,
      status: 'open', positions_count: 1, open_date: '2020-01-01', candidates: [],
    }));
  });

  const renderPage = () => render(<MemoryRouter><Seleccion /></MemoryRouter>);
  const navigation = () => within(screen.getByRole('navigation', { name: 'Paginación de vacantes' }));
  const next = () => fireEvent.click(navigation().getByRole('button', { name: 'Siguiente' }));

  it('limits desktop rows and mobile cards to 10 without reducing alerts or KPIs', () => {
    renderPage();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByText('Cargo 01')).toHaveLength(2);
    expect(screen.queryByText('Cargo 11')).not.toBeInTheDocument();
    expect(navigation().getByText('Mostrando 1–10 de 26 vacantes')).toBeInTheDocument();
    expect(navigation().getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByText('26')).toBeInTheDocument();
    expect(screen.getByText('27 alertas (0 críticas)')).toBeInTheDocument();
  });

  it('navigates through all pages with working row details and boundary buttons', () => {
    renderPage();
    next();
    expect(navigation().getByText('Página 2 de 3')).toBeInTheDocument();
    expect(screen.queryByText('Cargo 01')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('table')).getByText('Cargo 11'));
    expect(screen.getByTestId('vacancy-detail')).toHaveTextContent('v11');
    next();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(7);
    expect(navigation().getByText('Mostrando 21–26 de 26 vacantes')).toBeInTheDocument();
    expect(navigation().getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(navigation().getByRole('button', { name: 'Anterior' }));
    expect(navigation().getByText('Página 2 de 3')).toBeInTheDocument();
  });

  it('searches the full list and resets to the first page', () => {
    renderPage();
    next();
    fireEvent.change(screen.getByPlaceholderText('Buscar por cargo, área o requisición...'), { target: { value: 'Cargo 26' } });
    expect(navigation().getByText('Mostrando 1–1 de 1 vacantes')).toBeInTheDocument();
    expect(screen.getAllByText('Cargo 26')).toHaveLength(2);
    fireEvent.change(screen.getByPlaceholderText('Buscar por cargo, área o requisición...'), { target: { value: '' } });
    expect(navigation().getByText('Página 1 de 3')).toBeInTheDocument();
  });

  it('changes page size and returns to the first page', () => {
    renderPage();
    next();
    next();
    fireEvent.change(screen.getByRole('combobox', { name: 'Vacantes por página' }), { target: { value: '25' } });
    expect(navigation().getByText('Mostrando 1–25 de 26 vacantes')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    fireEvent.change(screen.getByRole('combobox', { name: 'Vacantes por página' }), { target: { value: '50' } });
    expect(navigation().getByText('Página 1 de 1')).toBeInTheDocument();
    expect(navigation().getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('resets to page one when the status filter changes', () => {
    mocks.vacancies[25].status = 'closed';
    renderPage();
    next();
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Filtrar vacantes por estado' }), { key: 'Enter' });
    fireEvent.click(screen.getByRole('option', { name: 'Cerrada' }));
    expect(navigation().getByText('Mostrando 1–1 de 1 vacantes')).toBeInTheDocument();
    expect(screen.getAllByText('Cargo 26')).toHaveLength(2);
  });

  it('clamps the page after records disappear and handles an empty list', () => {
    const view = renderPage();
    next();
    next();
    mocks.vacancies = mocks.vacancies.slice(0, 11);
    view.rerender(<MemoryRouter><Seleccion /></MemoryRouter>);
    expect(navigation().getByText('Mostrando 11–11 de 11 vacantes')).toBeInTheDocument();
    mocks.vacancies = [];
    view.rerender(<MemoryRouter><Seleccion /></MemoryRouter>);
    expect(screen.getByText('Sin vacantes registradas')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Paginación de vacantes' })).not.toBeInTheDocument();
  });

  it('resets pagination when the active company changes', () => {
    const view = renderPage();
    next();
    mocks.companyId = 'company-b';
    view.rerender(<MemoryRouter><Seleccion /></MemoryRouter>);
    expect(navigation().getByText('Página 1 de 3')).toBeInTheDocument();
  });
});
