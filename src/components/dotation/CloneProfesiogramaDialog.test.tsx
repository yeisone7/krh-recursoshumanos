import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CloneProfesiogramaDialog } from './CloneProfesiogramaDialog';

vi.mock('@/hooks/useDotationProfesiograma', () => ({
  useCreateProfesiograma: () => ({ mutateAsync: vi.fn() }),
  useProfesiogramas: () => ({ data: [] }),
}));

describe('CloneProfesiogramaDialog', () => {
  it('renders the clone dialog without a runtime error', () => {
    render(
      <CloneProfesiogramaDialog
        open
        onOpenChange={vi.fn()}
        centers={[{ id: 'center-1', name: 'Centro principal' }]}
        positions={[{ id: 'position-1', name: 'Operario' }]}
        sourceData={{
          id: 'profesiograma-1',
          company_id: 'company-1',
          operation_center_id: 'center-1',
          position_id: 'position-1',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          items: [],
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Clonación Masiva' })).toBeInTheDocument();
  });
});
