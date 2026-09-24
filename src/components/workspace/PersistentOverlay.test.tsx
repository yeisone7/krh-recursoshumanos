import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import { WorkspacePaneContext } from './WorkspacePaneContext';

const pane = { id: '/contratos', active: true, desktop: true, registerDirty: vi.fn(), registerResume: vi.fn() };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function Editor({ onSave }: { onSave: (date: string) => void }) {
  const [open, setOpen] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 8, 24));
  return <WorkspacePaneContext.Provider value={pane}>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Editar contrato</DialogTitle><DialogDescription>Fechas del contrato</DialogDescription>
        <form onSubmit={event => { event.preventDefault(); onSave(format(date!, 'yyyy-MM-dd')); setOpen(false); }}>
          <input aria-label="Observaciones" defaultValue="Pendiente" />
          <Popover>
            <PopoverTrigger asChild><button type="button">Fecha de inicio: {date && format(date, 'yyyy-MM-dd')}</button></PopoverTrigger>
            <PopoverContent aria-label="Calendario">
              <DatePickerWithDropdowns selected={date} onSelect={setDate} fromYear={2020} toYear={2030} />
            </PopoverContent>
          </Popover>
          <button type="submit">Guardar cambios</button>
        </form>
      </DialogContent>
    </Dialog>
  </WorkspacePaneContext.Provider>;
}

// Radix installs its document pointer listener on the next task. A click-only
// test skips that listener and cannot reproduce an accidental outside dismissal.
async function waitForPointerListener() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

describe('persistent dialog interactions', () => {
  it('keeps the form open when clicking an input inside its persistent body', async () => {
    render(<Editor onSave={vi.fn()} />);
    await waitForPointerListener();
    fireEvent.pointerDown(screen.getByLabelText('Observaciones'), { pointerType: 'mouse' });
    expect(screen.getByRole('dialog', { name: 'Editar contrato' })).toBeInTheDocument();
  });

  it('selects a date in the nested portal and saves only on explicit submission', async () => {
    const save = vi.fn();
    render(<Editor onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /Fecha de inicio/ }));
    await waitForPointerListener();
    const day = within(screen.getByRole('dialog', { name: 'Calendario' })).getByRole('gridcell', { name: '25' });
    fireEvent.pointerDown(day, { pointerType: 'mouse' });
    fireEvent.click(day);
    expect(screen.getByRole('dialog', { name: 'Editar contrato' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fecha de inicio: 2026-09-25' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.keyDown(day, { key: 'Escape' });
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Guardar cambios' }), { pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(save).toHaveBeenCalledWith('2026-09-25');
    expect(screen.queryByRole('dialog', { name: 'Editar contrato' })).toBeNull();
  });

  it('still dismisses on a real outside click and on Escape', async () => {
    const first = render(<Editor onSave={vi.fn()} />);
    await waitForPointerListener();
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    expect(screen.queryByRole('dialog', { name: 'Editar contrato' })).toBeNull();
    first.unmount();
    render(<Editor onSave={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Editar contrato' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Editar contrato' })).toBeNull();
  });
});
