import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import CopasstCompliance from './Compliance';

const mocks = vi.hoisted(() => ({
  listCopasstElections: vi.fn(),
  getCopasstCompliance: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentCompanyId: 'company-1', canExport: () => false }),
}));

vi.mock('@/lib/copasst', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/copasst')>();
  return {
    ...original,
    listCopasstElections: mocks.listCopasstElections,
    getCopasstCompliance: mocks.getCopasstCompliance,
  };
});

vi.mock('@/components/copasst/CopasstElectionSelect', () => ({
  CopasstElectionSelect: ({ onChange }: { onChange: (value: string) => void }) => (
    <button type="button" onClick={() => onChange('election-1')}>Seleccionar elección</button>
  ),
}));

vi.mock('@/components/copasst/CopasstKpis', () => ({ CopasstKpis: () => null }));

describe('COPASST compliance groups', () => {
  it('renders pending and participated groups collapsed by default', async () => {
    mocks.listCopasstElections.mockResolvedValue([]);
    mocks.getCopasstCompliance.mockResolvedValue({
      summary: { eligible: 2, voted: 1, pending: 1, participation_rate: 50 },
      electors: [
        { id: 'pending-1', display_name: 'Persona Pendiente', document_number: '1', gender: null, operation_center_name: null, area_name: null, position_name: null, voted_at: null },
        { id: 'voted-1', display_name: 'Persona Participante', document_number: '2', gender: 'F', operation_center_name: null, area_name: null, position_name: null, voted_at: '2026-09-03T12:00:00Z' },
      ],
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><CopasstCompliance /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar elección' }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Pendientes/ })).toHaveAttribute('aria-expanded', 'false'));
    expect(screen.getByRole('button', { name: /Participaron/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Persona Pendiente')).not.toBeInTheDocument();
    expect(screen.queryByText('Persona Participante')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pendientes/ }));
    expect(await screen.findByText('Persona Pendiente')).toBeInTheDocument();
  });
});
