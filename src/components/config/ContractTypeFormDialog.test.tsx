import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ContractTypeFormDialog } from './ContractTypeFormDialog';
import type { ContractTypeConfig } from '@/hooks/useContractTypes';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const editItem: ContractTypeConfig = {
  id: 'contract-type-1',
  company_id: 'company-1',
  contract_type: 'indefinido',
  display_name: 'Indefinido',
  description: null,
  max_duration_months: null,
  max_extensions: null,
  requires_end_date: false,
  default_trial_days: 0,
  is_active: true,
  template_url: null,
  template_file_name: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('ContractTypeFormDialog', () => {
  it('permite editar el ID técnico de un tipo de contrato existente', () => {
    render(
      <ContractTypeFormDialog
        open
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        editItem={editItem}
      />,
    );

    const technicalIdInput = screen.getByLabelText('ID Técnico del Sistema *');

    expect(technicalIdInput).toBeEnabled();
    fireEvent.change(technicalIdInput, { target: { value: 'termino_fijo' } });
    expect(technicalIdInput).toHaveValue('termino_fijo');
  });
});
