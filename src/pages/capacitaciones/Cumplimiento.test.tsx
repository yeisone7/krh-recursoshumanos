import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useTrainingCompliance: vi.fn(), exportRows: vi.fn(), writeFile: vi.fn() }));
vi.mock('@/hooks/useTrainingCompliance', () => ({ useTrainingCompliance: mocks.useTrainingCompliance }));
vi.mock('@/components/training', () => ({ TrainingPeriodFilter: () => null }));
vi.mock('xlsx', () => ({ utils: { json_to_sheet: mocks.exportRows, book_new: () => ({}), book_append_sheet: vi.fn() }, writeFile: mocks.writeFile }));
import Cumplimiento from './Cumplimiento';

afterEach(cleanup);
describe('compliance report pagination', () => {
  it('limits rendered rows while searching and exporting the entire result set', async () => {
    const employees = Array.from({ length: 75 }, (_, i) => ({ id: String(i), first_name: 'Persona', last_name: String(i), document_number: `DOC-${i}`, operation_center_id: 'north', center_name: 'Norte' }));
    mocks.useTrainingCompliance.mockReturnValue({
      isLoading: false, centers: [{ id: 'north', name: 'Norte' }], courses: [{ id: 'course', name: 'Seguridad' }],
      complianceData: [{ center_id: 'north', center_name: 'Norte', totalEmployees: 75, courses: [{
        course_id: 'course', course_name: 'Seguridad', course_code: null, total: 75, completedCount: 0, percentage: 0, completed: [], pending: employees,
      }] }],
    });
    render(<Cumplimiento />);
    fireEvent.click(screen.getByRole('button', { name: 'Tabla' }));
    expect(screen.getAllByRole('row')).toHaveLength(51);
    expect(screen.queryByText('DOC-74')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.exportRows.mock.calls[0][0]).toHaveLength(75);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getAllByRole('row')).toHaveLength(26);
    expect(screen.getByText('DOC-74')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar centro, empleado o documento...'), { target: { value: 'DOC-74' } });
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(2));
    expect(screen.getByText('DOC-74')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  });
});
