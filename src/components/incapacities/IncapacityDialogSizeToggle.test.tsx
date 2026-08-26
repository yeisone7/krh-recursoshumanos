import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { IncapacityDialogSizeToggle } from './IncapacityDialogSizeToggle';

describe('IncapacityDialogSizeToggle', () => {
  it('offers to maximize the dialog and triggers the toggle', () => {
    const onToggle = vi.fn();
    render(<IncapacityDialogSizeToggle isMaximized={false} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: 'Maximizar' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('offers to restore the dialog when it is maximized', () => {
    render(<IncapacityDialogSizeToggle isMaximized onToggle={() => undefined} />);

    expect(screen.getByRole('button', { name: 'Restablecer tamaño' })).toHaveAttribute('aria-pressed', 'true');
  });
});
