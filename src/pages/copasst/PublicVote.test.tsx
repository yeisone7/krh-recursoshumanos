import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import CopasstPublicVote from './PublicVote';

const copasstMocks = vi.hoisted(() => ({
  getCopasstBallot: vi.fn(),
  verifyCopasstVoter: vi.fn(),
  castCopasstVote: vi.fn(),
}));

vi.mock('@/lib/copasst', () => copasstMocks);

describe('COPASST public candidate photo zoom', () => {
  it('opens the enlarged photo without selecting the candidate', async () => {
    copasstMocks.getCopasstBallot.mockResolvedValue({
      valid: true,
      company: { name: 'Empresa', logo_url: null },
      election: {
        id: 'election-1', title: 'Elección', description: null, term_label: '2026–2028',
        seats: 1, allow_blank_vote: false, starts_at: '2026-09-01T12:00:00Z',
        ends_at: '2099-09-30T12:00:00Z', status: 'open',
      },
      candidates: [{
        id: 'candidate-1', election_id: 'election-1', employee_id: 'employee-1', ballot_order: 1,
        display_name: 'Ana Aspirante', position_name: 'Analista', operation_center_name: 'Centro',
        photo_url: 'https://example.com/ana.jpg',
      }],
    });
    copasstMocks.verifyCopasstVoter.mockResolvedValue({ eligible: true, already_voted: false, message: 'Habilitado' });

    render(<MemoryRouter initialEntries={['/copasst/votar?token=test-token']}><CopasstPublicVote /></MemoryRouter>);
    fireEvent.change(await screen.findByLabelText('Número de documento'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    const candidate = await screen.findByRole('radio');
    expect(candidate).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar foto de Ana Aspirante' }));

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(within(screen.getByRole('dialog')).getByRole('img', { name: 'Ana Aspirante' })).toHaveAttribute('src', 'https://example.com/ana.jpg');
    expect(candidate).not.toBeChecked();
  });
});
