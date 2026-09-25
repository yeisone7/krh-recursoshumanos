import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button type="button" onClick={() => onSelect(new Date(2026, 10, 24))}>Elegir 24 de noviembre de 2026</button>
  ),
}));

import { ExtensionFormDialog } from './ExtensionFormDialog';

afterEach(cleanup);

describe('extension of an expired contract', () => {
  it('lets the user choose a new end date for an agreed extension', async () => {
    const submit = vi.fn();
    render(<ExtensionFormDialog
      open onOpenChange={vi.fn()} contractId="contract" employeeName="Yurley Atuesta"
      currentEndDate={new Date(2026, 8, 24)} contractStartDate={new Date(2026, 7, 24)}
      originalEndDate={new Date(2026, 8, 24)} extensionNumber={1} contractType="fijo"
      existingExtensions={[]} onSubmit={submit}
    />);

    fireEvent.click(screen.getByRole('button', { name: /Agregar nueva fecha fin/ }));
    expect(screen.getByText('Seleccione la nueva fecha fin acordada por escrito.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar Prórroga' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Elegir 24 de noviembre de 2026' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar Prórroga' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Prórroga' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      contractId: 'contract', extensionType: 'pactada', endDate: new Date(2026, 10, 24),
    })));
  });
});
