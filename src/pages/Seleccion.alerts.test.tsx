import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Seleccion from './Seleccion';

vi.mock('@/hooks/useVacancies', () => ({
  useVacancies: () => ({ data: [
    { id: 'v1', position_title: 'Auxiliar', status: 'open', positions_count: 1, open_date: '2020-01-01', candidates: [] },
    { id: 'v2', position_title: 'Analista', status: 'open', positions_count: 1, open_date: '2020-01-01', candidates: [{ id: 'c1' }] },
  ], isLoading: false, isError: false, refetch: vi.fn() }),
  useDeleteVacancy: () => ({ isPending: false }),
}));
vi.mock('@/hooks/useCandidates', () => ({
  useCandidates: () => ({ data: [{ id: 'c1', vacancy_id: 'v2', first_name: 'Ana', last_name: 'Pérez', status: 'in_interview', current_step: 'entrevista_seleccion', application_date: '2020-01-01', updated_at: '2020-01-01', vacancies: { position_title: 'Analista' } }], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useRequisitions', () => ({
  useRequisitions: () => ({ data: [{ id: 'r1', requisition_code: 'RQ-01', cargo_solicitado: 'Auxiliar', estado_requisicion: 'en_rrhh', fecha_ingreso_estimada: null, vacancies: [] }], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ canCreate: () => false, canDelete: () => false }) }));
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
